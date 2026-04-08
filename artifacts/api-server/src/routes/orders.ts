import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable, orderItemsTable, orderStatusHistoryTable, qrDeliveryTokensTable,
  restaurantsTable, usersTable, dispatchAttemptsTable, driverProfilesTable,
  customerProfilesTable, cartTable, cartItemsTable, paymentsTable, productsTable,
  fraudFlagsTable, zonesTable, platformSettingsTable,
} from "@workspace/db";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth";
import { createNotification } from "../lib/notifications";
import { canTransition, STATUS_LABELS } from "../lib/state-machine";
import { dispatchOrder } from "../lib/dispatch-engine";
import crypto from "crypto";

const router = Router();

function formatOrder(o: any) {
  return {
    ...o,
    subtotal: Number(o.subtotal),
    deliveryFee: Number(o.deliveryFee),
    total: Number(o.total),
    createdAt: o.createdAt?.toISOString?.() ?? o.createdAt,
    updatedAt: o.updatedAt?.toISOString?.() ?? o.updatedAt,
  };
}

async function addStatusHistory(orderId: number, status: string, note?: string, createdBy?: string) {
  await db.insert(orderStatusHistoryTable).values({ orderId, status: status as any, note: note ?? null, createdBy: createdBy ?? null });
}

async function transitionOrder(orderId: number, newStatus: string, note?: string, createdBy?: string) {
  const [order] = await db.update(ordersTable).set({ status: newStatus as any }).where(eq(ordersTable.id, orderId)).returning();
  await addStatusHistory(orderId, newStatus, note, createdBy);
  return order;
}

router.get("/orders", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { status, customerId, restaurantId, driverId, cityId, page = 1, limit = 20 } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  // Role-based scoping
  if (user.role === "customer") conditions.push(eq(ordersTable.customerId, user.id));
  else if (user.role === "restaurant") {
    const [r] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.userId, user.id));
    if (r) conditions.push(eq(ordersTable.restaurantId, r.id));
  } else if (user.role === "driver") conditions.push(eq(ordersTable.driverId, user.id));

  if (status) conditions.push(eq(ordersTable.status, status as any));
  if (customerId) conditions.push(eq(ordersTable.customerId, Number(customerId)));
  if (restaurantId) conditions.push(eq(ordersTable.restaurantId, Number(restaurantId)));
  if (driverId) conditions.push(eq(ordersTable.driverId, Number(driverId)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orders = await db.select({
    order: ordersTable,
    restaurantName: restaurantsTable.name,
    driverName: usersTable.name,
  })
    .from(ordersTable)
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .leftJoin(usersTable, eq(ordersTable.driverId, usersTable.id))
    .where(whereClause)
    .orderBy(desc(ordersTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [{ total }] = await db.select({ total: count() }).from(ordersTable).where(whereClause);

  res.json({
    orders: orders.map(({ order, restaurantName, driverName }) => ({
      ...formatOrder(order),
      restaurantName: restaurantName ?? "Unknown",
      driverName: driverName ?? null,
    })),
    total: Number(total),
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(Number(total) / limitNum),
  });
});

router.post("/orders", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { restaurantId, deliveryAddress, deliveryLandmark, deliveryFloor, deliveryInstructions, deliveryPhone, zoneId, paymentMethod, items } = req.body;

  if (!restaurantId || !deliveryAddress || !paymentMethod || !items?.length) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, restaurantId));
  if (!restaurant) { res.status(404).json({ error: "Restaurant not found" }); return; }

  let subtotal = 0;
  const orderItemsData: any[] = [];
  for (const item of items) {
    subtotal += item.price ?? 0;
    orderItemsData.push(item);
  }

  const orderNumber = `TC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Zone-based delivery fee: zone fee → platform default → 350 DA fallback
  let deliveryFee = 350;
  if (zoneId) {
    const [zone] = await db.select().from(zonesTable).where(eq(zonesTable.id, Number(zoneId)));
    if (zone?.deliveryFee) deliveryFee = Number(zone.deliveryFee);
  }
  if (deliveryFee === 350) {
    const [setting] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, "default_delivery_fee"));
    if (setting?.value) deliveryFee = Number(setting.value) || 350;
  }

  const total = subtotal + deliveryFee;

  const [order] = await db.insert(ordersTable).values({
    orderNumber,
    customerId: user.id,
    restaurantId,
    deliveryAddress,
    deliveryLandmark: deliveryLandmark ?? null,
    deliveryFloor: deliveryFloor ?? null,
    deliveryInstructions: deliveryInstructions ?? null,
    deliveryPhone: deliveryPhone ?? null,
    zoneId: zoneId ?? null,
    subtotal: subtotal.toFixed(2),
    deliveryFee: deliveryFee.toFixed(2),
    total: total.toFixed(2),
    paymentMethod: paymentMethod as any,
    paymentStatus: paymentMethod === "cash_on_delivery" ? "cash_on_delivery" : "pending",
    status: "pending_dispatch",
    estimatedDeliveryMinutes: 45,
  }).returning();

  // Insert order items - compute from products
  for (const item of items) {
    await db.insert(orderItemsTable).values({
      orderId: order.id,
      productId: item.productId,
      productName: item.productName ?? "Product",
      quantity: item.quantity,
      price: (item.price ?? 0).toFixed(2),
      notes: item.notes ?? null,
    });
  }

  // Create payment record
  await db.insert(paymentsTable).values({
    orderId: order.id,
    amount: total.toFixed(2),
    method: paymentMethod,
    status: paymentMethod === "cash_on_delivery" ? "cash_on_delivery" : "pending",
  });

  // Generate QR token
  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(qrDeliveryTokensTable).values({ orderId: order.id, token });

  await addStatusHistory(order.id, "pending_dispatch", "Order placed", `user:${user.id}`);

  // Update customer stats
  await db.update(customerProfilesTable)
    .set({ totalOrders: sql`total_orders + 1` })
    .where(eq(customerProfilesTable.userId, user.id));

  // Notify restaurant
  await createNotification({
    userId: restaurant.userId,
    type: "order_placed",
    title: "Nouvelle commande",
    message: `Commande ${orderNumber} reçue. En attente de l'assignation d'un livreur.`,
    relatedOrderId: order.id,
  });

  // Clear cart
  const [cart] = await db.select().from(cartTable).where(eq(cartTable.userId, user.id));
  if (cart) {
    await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));
    await db.update(cartTable).set({ restaurantId: null }).where(eq(cartTable.id, cart.id));
  }

  // Trigger auto-dispatch asynchronously (don't block the response)
  dispatchOrder(order.id).catch((err) => console.error("Dispatch failed:", err));

  res.status(201).json(formatOrder({ ...order, restaurantName: restaurant.name, driverName: null }));
});

router.get("/orders/:orderId", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);

  const [result] = await db.select({
    order: ordersTable,
    restaurantName: restaurantsTable.name,
    driverName: usersTable.name,
  })
    .from(ordersTable)
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .leftJoin(usersTable, eq(ordersTable.driverId, usersTable.id))
    .where(eq(ordersTable.id, id));

  if (!result) { res.status(404).json({ error: "Order not found" }); return; }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  const statusHistory = await db.select().from(orderStatusHistoryTable).where(eq(orderStatusHistoryTable.orderId, id)).orderBy(orderStatusHistoryTable.createdAt);
  const [qr] = await db.select().from(qrDeliveryTokensTable).where(eq(qrDeliveryTokensTable.orderId, id));

  res.json({
    ...formatOrder(result.order),
    restaurantName: result.restaurantName ?? "Unknown",
    driverName: result.driverName ?? null,
    items: items.map(i => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      price: Number(i.price),
      notes: i.notes ?? null,
    })),
    statusHistory: statusHistory.map(h => ({
      id: h.id,
      orderId: h.orderId,
      status: h.status,
      note: h.note ?? null,
      createdBy: h.createdBy ?? null,
      createdAt: h.createdAt.toISOString(),
    })),
    qrToken: qr?.token ?? null,
  });
});

router.post("/orders/:orderId/cancel", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const { reason } = req.body;
  const user = (req as any).user;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }

  const cancellableStatuses = ["pending_dispatch", "dispatching_driver", "driver_assigned"];
  if (!cancellableStatuses.includes(order.status)) {
    res.status(400).json({ error: "Cannot cancel order in current status" }); return;
  }

  const updated = await transitionOrder(id, "cancelled", reason ?? "Annulé par l'utilisateur", `user:${user.id}`);

    // Update customer cancellation count + auto-fraud flag
  if (user.role === "customer") {
    const [cp] = await db.select().from(customerProfilesTable)
      .where(eq(customerProfilesTable.userId, user.id));
    const newCount = (cp?.cancellationCount ?? 0) + 1;
    await db.update(customerProfilesTable)
      .set({ cancellationCount: newCount })
      .where(eq(customerProfilesTable.userId, user.id));

    // Auto-create fraud flag if cancellation threshold exceeded
    if (newCount >= 3) {
      const severity = newCount >= 6 ? "high" : newCount >= 4 ? "medium" : "low";
      await db.insert(fraudFlagsTable).values({
        userId: user.id,
        type: "repeated_cancellations",
        severity: severity as any,
        description: `Client a annulé ${newCount} commandes. Comportement suspect détecté.`,
        relatedOrderId: id,
      }).onConflictDoNothing();
    }
  }

  // Notify restaurant if order was in progress
  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, order.restaurantId));
  if (restaurant) {
    await createNotification({
      userId: restaurant.userId,
      type: "cancelled",
      title: "Commande annulée",
      message: `La commande ${order.orderNumber} a été annulée.`,
      relatedOrderId: id,
    });
  }

  res.json(formatOrder({ ...updated, restaurantName: "", driverName: null }));
});

router.post("/orders/:orderId/start-preparing", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const user = (req as any).user;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }

  if (order.status !== "confirmed_for_preparation") {
    res.status(400).json({ error: "Préparation verrouillée — en attente de confirmation" }); return;
  }

  const updated = await transitionOrder(id, "preparing", "Préparation commencée", `restaurant:${user.id}`);
  res.json(formatOrder({ ...updated, restaurantName: "", driverName: null }));
});

router.post("/orders/:orderId/mark-ready", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const user = (req as any).user;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }

  if (order.status !== "preparing") {
    res.status(400).json({ error: "Order must be in preparing state" }); return;
  }

  const updated = await transitionOrder(id, "ready_for_pickup", "Prête pour le pickup", `restaurant:${user.id}`);

  // Notify driver
  if (order.driverId) {
    await createNotification({
      userId: order.driverId,
      type: "ready_for_pickup",
      title: "Commande prête",
      message: `La commande ${order.orderNumber} est prête pour le pickup.`,
      relatedOrderId: id,
    });
  }

  res.json(formatOrder({ ...updated, restaurantName: "", driverName: null }));
});

router.get("/orders/:orderId/status-history", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const history = await db.select().from(orderStatusHistoryTable)
    .where(eq(orderStatusHistoryTable.orderId, id))
    .orderBy(orderStatusHistoryTable.createdAt);
  res.json(history.map(h => ({
    id: h.id,
    orderId: h.orderId,
    status: h.status,
    note: h.note ?? null,
    createdBy: h.createdBy ?? null,
    createdAt: h.createdAt.toISOString(),
  })));
});

// Customer updates delivery info when order needs correction (status: needs_update)
router.patch("/orders/:orderId/update-info", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const user = (req as any).user;
  const { deliveryAddress, deliveryLandmark, deliveryFloor, deliveryInstructions, deliveryPhone } = req.body;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Not found" }); return; }

  // Only the customer who owns the order or an admin can update
  if (user.role !== "admin" && order.customerId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  if (order.status !== "needs_update") {
    res.status(400).json({ error: "Order info can only be updated when status is needs_update" }); return;
  }

  const updateData: any = { updatedAt: new Date() };
  if (deliveryAddress) updateData.deliveryAddress = deliveryAddress;
  if (deliveryLandmark !== undefined) updateData.deliveryLandmark = deliveryLandmark;
  if (deliveryFloor !== undefined) updateData.deliveryFloor = deliveryFloor;
  if (deliveryInstructions !== undefined) updateData.deliveryInstructions = deliveryInstructions;
  if (deliveryPhone) updateData.deliveryPhone = deliveryPhone;

  // Transition back to awaiting_customer_confirmation so driver can re-confirm
  updateData.status = "awaiting_customer_confirmation";

  const [updated] = await db.update(ordersTable).set(updateData).where(eq(ordersTable.id, id)).returning();
  await addStatusHistory(id, "awaiting_customer_confirmation", "Infos mises à jour par le client — reconfirmation requise", `customer:${user.id}`);

  // Notify driver
  if (order.driverId) {
    await createNotification({
      userId: order.driverId,
      type: "order_updated",
      title: "Infos mises à jour",
      message: `Le client a mis à jour ses infos pour la commande ${order.orderNumber}. Veuillez reconfirmer.`,
      relatedOrderId: id,
    });
  }

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, order.restaurantId));
  res.json({ ...formatOrder(updated), restaurantName: restaurant?.name ?? "", driverName: null });
});

// Admin: trigger manual dispatch or re-dispatch
router.post("/orders/:orderId/dispatch", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const result = await dispatchOrder(id);
  res.json({ success: result.dispatched, candidates: result.candidates, message: result.dispatched ? `${result.candidates} livreur(s) notifié(s)` : "Aucun livreur disponible" });
});

router.get("/orders/:orderId/qr", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const [qr] = await db.select().from(qrDeliveryTokensTable).where(eq(qrDeliveryTokensTable.orderId, id));
  if (!qr) {
    const token = crypto.randomBytes(32).toString("hex");
    const [newQr] = await db.insert(qrDeliveryTokensTable).values({ orderId: id, token }).returning();
    res.json({ token: newQr.token, orderId: id, expiresAt: null });
    return;
  }
  res.json({ token: qr.token, orderId: id, expiresAt: qr.expiresAt?.toISOString() ?? null });
});

// Driver verifies delivery via QR token
router.post("/orders/:orderId/verify-qr", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const user = (req as any).user;
  const { token } = req.body;

  if (!token) { res.status(400).json({ error: "token required" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const deliverableStatuses = ["on_the_way", "arriving_soon", "picked_up", "driver_at_restaurant"];
  if (!deliverableStatuses.includes(order.status)) {
    res.status(400).json({ error: "Order is not in a deliverable state", status: order.status }); return;
  }

  const [qr] = await db.select().from(qrDeliveryTokensTable)
    .where(eq(qrDeliveryTokensTable.orderId, id));

  if (!qr) { res.status(404).json({ error: "QR token not found for this order" }); return; }
  if (qr.isUsed) { res.status(409).json({ error: "QR code has already been used" }); return; }
  if (qr.expiresAt && new Date() > qr.expiresAt) {
    res.status(410).json({ error: "QR code has expired" }); return;
  }
  if (qr.token !== token) { res.status(401).json({ error: "Invalid QR token" }); return; }

  // Mark QR as used
  await db.update(qrDeliveryTokensTable).set({ isUsed: true }).where(eq(qrDeliveryTokensTable.id, qr.id));

  // Transition order to delivered
  const [updated] = await db.update(ordersTable)
    .set({ status: "delivered", paymentStatus: order.paymentMethod === "cash_on_delivery" ? "paid" : order.paymentStatus })
    .where(eq(ordersTable.id, id))
    .returning();
  await addStatusHistory(id, "delivered", "Livré — QR code vérifié", `driver:${user.id}`);

  // Update payment record if COD
  if (order.paymentMethod === "cash_on_delivery") {
    await db.update(paymentsTable).set({ status: "paid" }).where(eq(paymentsTable.orderId, id));
  }

  // Update driver stats
  if (user.role === "driver") {
    await db.update(driverProfilesTable)
      .set({ totalDeliveries: sql`total_deliveries + 1` })
      .where(eq(driverProfilesTable.userId, user.id));
  }

  // Notify customer
  await createNotification({
    userId: order.customerId,
    type: "delivered",
    title: "Commande livrée !",
    message: `Votre commande ${order.orderNumber} a été livrée avec succès. Bon appétit !`,
    relatedOrderId: id,
  });

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, order.restaurantId));
  res.json({
    success: true,
    message: "Livraison confirmée par QR code",
    order: formatOrder({ ...updated, restaurantName: restaurant?.name ?? "", driverName: user.name }),
  });
});

export default router;
