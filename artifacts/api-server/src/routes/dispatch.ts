import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, dispatchAttemptsTable, driverProfilesTable, usersTable, orderStatusHistoryTable, deliveryConfirmationsTable, customerProfilesTable, restaurantsTable, fraudFlagsTable, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth";
import { createNotification } from "../lib/notifications";

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

  // Get orders in pending_dispatch or dispatching_driver states
  const orders = await db.select({
    order: ordersTable,
    restaurantName: restaurantsTable.name,
    restaurantAddress: restaurantsTable.address,
  })
    .from(ordersTable)
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .where(and(
      eq(ordersTable.status, "pending_dispatch"),
    ))
    .orderBy(ordersTable.createdAt)
    .limit(10);

  res.json(orders.map(({ order, restaurantName, restaurantAddress }) => ({
    orderId: order.id,
    orderNumber: order.orderNumber,
    restaurantName: restaurantName ?? "Restaurant",
    restaurantAddress: restaurantAddress ?? "N/A",
    deliveryAddress: order.deliveryAddress,
    estimatedDistance: 3.5,
    estimatedEarnings: Number(order.deliveryFee),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  })));
});

router.post("/driver/missions/:orderId/accept", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (order.driverId && order.driverId !== user.id) {
    res.status(409).json({ error: "Order already assigned" }); return;
  }

  const [updated] = await db.update(ordersTable)
    .set({ driverId: user.id, status: "awaiting_customer_confirmation" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  await addStatusHistory(orderId, "driver_assigned", "Livreur a accepté la mission", `driver:${user.id}`);
  await addStatusHistory(orderId, "awaiting_customer_confirmation", "En attente de confirmation client", `driver:${user.id}`);

  await db.insert(dispatchAttemptsTable).values({ orderId, driverId: user.id, result: "accepted" });

  await createNotification({
    userId: order.customerId,
    type: "driver_assigned",
    title: "Livreur assigné",
    message: `Votre livreur est en route pour confirmer votre commande ${order.orderNumber}.`,
    relatedOrderId: orderId,
  });

  res.json({ ...updated, subtotal: Number(updated.subtotal), deliveryFee: Number(updated.deliveryFee), total: Number(updated.total), restaurantName: "", driverName: user.name, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.post("/driver/missions/:orderId/reject", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  await db.insert(dispatchAttemptsTable).values({ orderId, driverId: user.id, result: "rejected" });
  res.json({ success: true, message: "Mission rejected" });
});

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

  // Update driver delivery count
  const [profile] = await db.select().from(driverProfilesTable).where(eq(driverProfilesTable.userId, user.id));
  if (profile) {
    await db.update(driverProfilesTable)
      .set({ totalDeliveries: profile.totalDeliveries + 1 })
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

router.get("/driver/stats", authenticate, requireRole("driver"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const [profile] = await db.select().from(driverProfilesTable).where(eq(driverProfilesTable.userId, user.id));
  res.json({
    totalDeliveries: profile?.totalDeliveries ?? 0,
    completedToday: 0,
    avgRating: Number(profile?.avgRating ?? 0),
    acceptanceRate: Number(profile?.acceptanceRate ?? 0),
    failedConfirmations: profile?.failedConfirmations ?? 0,
    earningsToday: 0,
    earningsTotal: Number(profile?.earningsTotal ?? 0),
  });
});

export default router;
