import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, dispatchAttemptsTable, driverProfilesTable, usersTable, orderStatusHistoryTable, deliveryConfirmationsTable, customerProfilesTable, restaurantsTable, fraudFlagsTable, notificationsTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth";
import { createNotification } from "../lib/notifications";
import { lockDriverAssignment, retryPendingDispatch } from "../lib/dispatch-engine";

const router = Router();

async function addStatusHistory(orderId: number, status: string, note?: string, createdBy?: string) {
  await db.insert(orderStatusHistoryTable).values({ orderId, status: status as any, note: note ?? null, createdBy: createdBy ?? null });
}

// DISPATCH
router.post("/dispatch/:orderId/assign", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const { driverId } = req.body;
  if (!driverId) { res.status(400).json({ error: "driverId required" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, driverId));
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }

  const [updated] = await db.update(ordersTable)
    .set({ driverId, status: "driver_assigned" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  await addStatusHistory(orderId, "driver_assigned", `Livreur ${driver.name} assigné manuellement`, "admin");
  await db.insert(dispatchAttemptsTable).values({ orderId, driverId, result: "accepted" });

  await createNotification({
    userId: driverId,
    type: "driver_assigned",
    title: "Mission assignée",
    message: `Vous avez été assigné à la commande ${order.orderNumber}.`,
    relatedOrderId: orderId,
  });

  res.json({ ...updated, subtotal: Number(updated.subtotal), deliveryFee: Number(updated.deliveryFee), total: Number(updated.total), restaurantName: "", driverName: driver.name, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.get("/dispatch/:orderId/attempts", authenticate, async (req, res): Promise<void> => {
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const attempts = await db.select({
    attempt: dispatchAttemptsTable,
    driverName: usersTable.name,
  })
    .from(dispatchAttemptsTable)
    .leftJoin(usersTable, eq(dispatchAttemptsTable.driverId, usersTable.id))
    .where(eq(dispatchAttemptsTable.orderId, orderId))
    .orderBy(desc(dispatchAttemptsTable.attemptedAt));

  res.json(attempts.map(({ attempt, driverName }) => ({
    id: attempt.id,
    orderId: attempt.orderId,
    driverId: attempt.driverId ?? null,
    driverName: driverName ?? null,
    result: attempt.result,
    attemptedAt: attempt.attemptedAt.toISOString(),
    respondedAt: attempt.respondedAt?.toISOString() ?? null,
  })));
});

// DRIVER OPERATIONS
router.get("/driver/missions/available", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;

  // If driver already has an ACTIVE mission, return empty — they must finish it first
  const activeMissionStatuses = [
    "driver_assigned", "awaiting_customer_confirmation", "needs_update",
    "confirmation_failed", "confirmed_for_preparation", "preparing",
    "ready_for_pickup", "picked_up", "on_the_way", "arriving_soon",
  ];
  const [activeMission] = await db.select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.driverId, user.id),
      inArray(ordersTable.status, activeMissionStatuses as any),
    ))
    .limit(1);

  if (activeMission) {
    res.json([]); // Driver is busy — no new missions until current delivery complete
    return;
  }

  // Get driver's cityId to filter by wilaya
  const [driverProfile] = await db.select({ cityId: driverProfilesTable.cityId })
    .from(driverProfilesTable)
    .where(eq(driverProfilesTable.userId, user.id));
  const driverCityId = driverProfile?.cityId ?? null;

  // Get orders where this driver has a pending dispatch attempt (was specifically notified)
  const pendingAttempts = await db.select({ orderId: dispatchAttemptsTable.orderId })
    .from(dispatchAttemptsTable)
    .where(and(
      eq(dispatchAttemptsTable.driverId, user.id),
      eq(dispatchAttemptsTable.result, "pending" as any),
    ));
  const pendingAttemptOrderIds = pendingAttempts.map(a => a.orderId).filter((id): id is number => id !== null);

  if (pendingAttemptOrderIds.length === 0) {
    res.json([]);
    return;
  }

  const orders = await db.select({
    order: ordersTable,
    restaurantName: restaurantsTable.name,
    restaurantAddress: restaurantsTable.address,
  })
    .from(ordersTable)
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .where(and(
      inArray(ordersTable.id, pendingAttemptOrderIds),
      inArray(ordersTable.status, ["pending_dispatch", "dispatching_driver"] as any),
    ))
    .orderBy(ordersTable.createdAt)
    .limit(5);

  res.json(orders.map(({ order, restaurantName, restaurantAddress }) => ({
    orderId: order.id,
    orderNumber: order.orderNumber,
    restaurantName: restaurantName ?? "Restaurant",
    restaurantAddress: restaurantAddress ?? "N/A",
    deliveryAddress: order.deliveryAddress,
    estimatedDistance: 3.5,
    estimatedEarnings: Number(order.deliveryFee) || 200,
    expiresAt: new Date(Date.now() + 90000).toISOString(),
  })));
});

router.post("/driver/missions/:orderId/accept", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  // Use atomic lock to prevent race conditions (first driver wins)
  const locked = await lockDriverAssignment(orderId, user.id);
  if (!locked) {
    res.status(409).json({ error: "Mission déjà prise par un autre livreur" }); return;
  }

  const [updated] = await db.update(ordersTable)
    .set({ driverId: user.id, status: "driver_assigned" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  await addStatusHistory(orderId, "driver_assigned", `Livreur ${user.name} a accepté la mission`, `driver:${user.id}`);

  await createNotification({
    userId: order.customerId,
    type: "driver_assigned",
    title: "Livreur assigné ! 🛵",
    message: `${user.name} a accepté votre commande ${order.orderNumber} et est en route.`,
    relatedOrderId: orderId,
  });

  // Notify restaurant too
  const [restaurant] = await db.select({ userId: restaurantsTable.userId, name: restaurantsTable.name })
    .from(restaurantsTable).where(eq(restaurantsTable.id, order.restaurantId));
  if (restaurant) {
    await createNotification({
      userId: restaurant.userId,
      type: "driver_assigned",
      title: "Livreur assigné",
      message: `${user.name} a été assigné à la commande ${order.orderNumber}.`,
      relatedOrderId: orderId,
    });
  }

  res.json({ ...updated, subtotal: Number(updated.subtotal), deliveryFee: Number(updated.deliveryFee), total: Number(updated.total), restaurantName: restaurant?.name ?? "", driverName: user.name, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.post("/driver/missions/:orderId/reject", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);

  // Update existing pending attempt to rejected (don't insert a duplicate)
  const updated = await db.update(dispatchAttemptsTable)
    .set({ result: "rejected" as any, respondedAt: new Date() })
    .where(and(
      eq(dispatchAttemptsTable.orderId, orderId),
      eq(dispatchAttemptsTable.driverId, user.id),
      eq(dispatchAttemptsTable.result, "pending" as any),
    ));

  res.json({ success: true, message: "Mission refusée" });
});

// DRIVER CANCEL an accepted mission
router.post("/driver/missions/:orderId/cancel", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const { reason } = req.body;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Commande introuvable" }); return; }
  if (order.driverId !== user.id) { res.status(403).json({ error: "Ce n'est pas votre mission" }); return; }

  const cancellableByDriver = ["driver_assigned", "awaiting_customer_confirmation", "needs_update", "confirmation_failed"];
  if (!cancellableByDriver.includes(order.status)) {
    res.status(400).json({ error: "Vous ne pouvez plus annuler cette mission (commande déjà en préparation ou livrée)" });
    return;
  }

  // Release driver from order — put back to pending_dispatch for re-dispatch
  const [updated] = await db.update(ordersTable)
    .set({ driverId: null, status: "pending_dispatch" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  // Mark driver's accepted attempt as cancelled
  await db.update(dispatchAttemptsTable)
    .set({ result: "rejected" as any, respondedAt: new Date() })
    .where(and(
      eq(dispatchAttemptsTable.orderId, orderId),
      eq(dispatchAttemptsTable.driverId, user.id),
    ));

  await addStatusHistory(orderId, "pending_dispatch", `Annulé par le livreur: ${reason ?? "Aucune raison"}`, `driver:${user.id}`);

  await createNotification({
    userId: order.customerId,
    type: "cancelled",
    title: "Livreur a annulé",
    message: `Votre livreur a annulé la mission. Nous recherchons un nouveau livreur pour votre commande ${order.orderNumber}.`,
    relatedOrderId: orderId,
  });

  res.json({ success: true, message: "Mission annulée — la commande sera re-dispatchée" });
});

// Step 1: driver heads to restaurant, will now call the customer → set awaiting_customer_confirmation
router.post("/driver/missions/:orderId/start-confirmation", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Commande introuvable" }); return; }
  if (order.driverId !== user.id) { res.status(403).json({ error: "Ce n'est pas votre mission" }); return; }
  if (order.status !== "driver_assigned") { res.status(400).json({ error: "Statut incorrect" }); return; }

  const [updated] = await db.update(ordersTable)
    .set({ status: "awaiting_customer_confirmation" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  await addStatusHistory(orderId, "awaiting_customer_confirmation", "Livreur en route — confirmation client en cours", `driver:${user.id}`);

  // Notify customer
  await createNotification({
    userId: order.customerId,
    type: "driver_assigned",
    title: "Votre livreur arrive bientôt 🛵",
    message: `${user.name} se dirige vers le restaurant. Il vous contactera pour confirmer votre adresse.`,
    relatedOrderId: orderId,
  });

  // Notify restaurant
  const [restaurant] = await db.select({ userId: restaurantsTable.userId }).from(restaurantsTable).where(eq(restaurantsTable.id, order.restaurantId));
  if (restaurant) {
    await createNotification({
      userId: restaurant.userId,
      type: "driver_assigned",
      title: "Livreur en route vers vous",
      message: `Le livreur se dirige vers votre restaurant pour la commande ${order.orderNumber}.`,
      relatedOrderId: orderId,
    });
  }

  res.json({ ...updated, subtotal: Number(updated.subtotal), deliveryFee: Number(updated.deliveryFee), total: Number(updated.total), driverName: user.name, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

// Step 2: driver confirms/fails address with customer
router.post("/driver/confirm/:orderId", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const { result, notes } = req.body;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }

  await db.insert(deliveryConfirmationsTable).values({ orderId, driverId: user.id, result, notes: notes ?? null });

  let newStatus: string;
  let notifTitle: string;
  let notifMessage: string;

  if (result === "confirmed") {
    newStatus = "confirmed_for_preparation";
    notifTitle = "Commande confirmée";
    notifMessage = `Commande ${order.orderNumber} confirmée. La préparation peut commencer.`;
  } else if (result === "needs_correction") {
    newStatus = "needs_update";
    notifTitle = "Correction requise";
    notifMessage = `La commande ${order.orderNumber} nécessite une correction.`;
  } else {
    newStatus = "confirmation_failed";
    notifTitle = "Confirmation échouée";
    notifMessage = `Impossible de joindre le client pour la commande ${order.orderNumber}.`;
    // Update customer unreachable count
    const [cp] = await db.select().from(customerProfilesTable).where(eq(customerProfilesTable.userId, order.customerId));
    if (cp) {
      await db.update(customerProfilesTable)
        .set({ unreachableCount: cp.unreachableCount + 1 })
        .where(eq(customerProfilesTable.userId, order.customerId));
    }
  }

  const [updated] = await db.update(ordersTable).set({ status: newStatus as any }).where(eq(ordersTable.id, orderId)).returning();
  await addStatusHistory(orderId, newStatus, notes ?? null, `driver:${user.id}`);

  // Notify restaurant
  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, order.restaurantId));
  if (restaurant) {
    await createNotification({
      userId: restaurant.userId,
      type: result === "confirmed" ? "confirmation_complete" : "correction_needed",
      title: notifTitle,
      message: notifMessage,
      relatedOrderId: orderId,
    });
  }

  res.json({ ...updated, subtotal: Number(updated.subtotal), deliveryFee: Number(updated.deliveryFee), total: Number(updated.total), restaurantName: "", driverName: user.name, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.post("/driver/pickup/:orderId", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  if (order.status !== "ready_for_pickup") { res.status(400).json({ error: "Order not ready for pickup" }); return; }

  const [updated] = await db.update(ordersTable).set({ status: "picked_up" }).where(eq(ordersTable.id, orderId)).returning();
  await addStatusHistory(orderId, "picked_up", "Commande récupérée", `driver:${user.id}`);

  await createNotification({
    userId: order.customerId,
    type: "picked_up",
    title: "Commande récupérée",
    message: `Votre commande ${order.orderNumber} a été récupérée par le livreur.`,
    relatedOrderId: orderId,
  });

  res.json({ ...updated, subtotal: Number(updated.subtotal), deliveryFee: Number(updated.deliveryFee), total: Number(updated.total), restaurantName: "", driverName: user.name, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.post("/driver/on-the-way/:orderId", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const [updated] = await db.update(ordersTable).set({ status: "on_the_way" }).where(eq(ordersTable.id, orderId)).returning();
  await addStatusHistory(orderId, "on_the_way", "En route", `driver:${user.id}`);

  // Notify customer
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (order) {
    await createNotification({
      userId: order.customerId,
      type: "on_the_way",
      title: "Votre commande est en route",
      message: `Votre livreur est en route avec la commande ${order.orderNumber}.`,
      relatedOrderId: orderId,
    });
  }

  res.json({ ...updated, subtotal: Number(updated.subtotal), deliveryFee: Number(updated.deliveryFee), total: Number(updated.total), restaurantName: "", driverName: user.name, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.post("/driver/arriving/:orderId", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const [updated] = await db.update(ordersTable).set({ status: "arriving_soon" }).where(eq(ordersTable.id, orderId)).returning();
  await addStatusHistory(orderId, "arriving_soon", "Presque arrivé", `driver:${user.id}`);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (order) {
    await createNotification({
      userId: order.customerId,
      type: "arriving_soon",
      title: "Livreur proche",
      message: `Votre livreur arrive bientôt avec la commande ${order.orderNumber}.`,
      relatedOrderId: orderId,
    });
  }

  res.json({ ...updated, subtotal: Number(updated.subtotal), deliveryFee: Number(updated.deliveryFee), total: Number(updated.total), restaurantName: "", driverName: user.name, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.post("/driver/deliver/:orderId", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  if (!["on_the_way", "arriving_soon", "picked_up"].includes(order.status)) {
    res.status(400).json({ error: "Order not in deliverable state" }); return;
  }

  const [updated] = await db.update(ordersTable).set({ status: "delivered" }).where(eq(ordersTable.id, orderId)).returning();
  await addStatusHistory(orderId, "delivered", "Livraison effectuée", `driver:${user.id}`);

  // Update driver delivery count + earnings
  const [profile] = await db.select().from(driverProfilesTable).where(eq(driverProfilesTable.userId, user.id));
  if (profile) {
    const earned = Number(updated.deliveryFee) || 0;
    await db.update(driverProfilesTable)
      .set({
        totalDeliveries: profile.totalDeliveries + 1,
        earningsTotal: sql`earnings_total + ${earned}`,
      })
      .where(eq(driverProfilesTable.userId, user.id));
  }

  await createNotification({
    userId: order.customerId,
    type: "delivered",
    title: "Commande livrée",
    message: `Votre commande ${order.orderNumber} a été livrée. Bon appétit!`,
    relatedOrderId: orderId,
  });

  res.json({ ...updated, subtotal: Number(updated.subtotal), deliveryFee: Number(updated.deliveryFee), total: Number(updated.total), restaurantName: "", driverName: user.name, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.patch("/driver/status", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { isOnline } = req.body;
  await db.update(driverProfilesTable).set({ isOnline: isOnline, availability: isOnline ? "available" : "offline" }).where(eq(driverProfilesTable.userId, user.id));
  res.json({ success: true, message: `Status updated to ${isOnline ? "online" : "offline"}` });
});

router.get("/driver/history", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orders = await db.select({
    order: ordersTable,
    restaurantName: restaurantsTable.name,
  })
    .from(ordersTable)
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .where(and(eq(ordersTable.driverId, user.id), eq(ordersTable.status, "delivered")))
    .orderBy(desc(ordersTable.createdAt))
    .limit(50);

  res.json(orders.map(({ order, restaurantName }) => ({
    ...order,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    restaurantName: restaurantName ?? "Unknown",
    driverName: null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  })));
});

// Admin: retry dispatch for all pending orders
router.post("/dispatch/retry-all", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const retried = await retryPendingDispatch();
  res.json({ success: true, retried, message: `${retried} commande(s) re-dispatchée(s)` });
});

router.get("/driver/stats", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const [profile] = await db.select().from(driverProfilesTable).where(eq(driverProfilesTable.userId, user.id));

  // Earnings today: sum deliveryFee of orders delivered today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrders = await db.select({ deliveryFee: ordersTable.deliveryFee })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.driverId, user.id),
      eq(ordersTable.status, "delivered"),
      sql`${ordersTable.updatedAt} >= ${todayStart.toISOString()}`,
    ));
  const earningsToday = todayOrders.reduce((s, o) => s + Number(o.deliveryFee || 0), 0);
  const completedToday = todayOrders.length;

  res.json({
    totalDeliveries: profile?.totalDeliveries ?? 0,
    completedToday,
    avgRating: Number(profile?.avgRating ?? 0),
    acceptanceRate: Number(profile?.acceptanceRate ?? 0),
    failedConfirmations: profile?.failedConfirmations ?? 0,
    earningsToday,
    earningsTotal: Number(profile?.earningsTotal ?? 0),
    isOnline: profile?.isOnline ?? false,
    availability: profile?.availability ?? "offline",
  });
});

export default router;
