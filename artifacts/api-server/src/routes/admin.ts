import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, restaurantsTable, driverProfilesTable, customerProfilesTable,
  ordersTable, fraudFlagsTable, platformSettingsTable, paymentsTable, ratingsTable,
  orderStatusHistoryTable, qrDeliveryTokensTable, promoCodesTable, promoUsageTable,
  disputesTable, dispatchAttemptsTable, notificationsTable,
  deliveryConfirmationsTable, menuCategoriesTable, productsTable,
  addressesTable,
} from "@workspace/db";
import { createNotification } from "../lib/notifications";
import { eq, and, count, sql, sum, avg, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth";

const router = Router();

// ADMIN DASHBOARD
router.get("/admin/dashboard", authenticate, requireRole("admin"), async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [orderStats] = await db.select({
    totalOrders: count(),
    deliveredToday: sql<number>`count(*) filter (where ${ordersTable.status} = 'delivered' and ${ordersTable.createdAt} >= ${today})`,
    cancelledToday: sql<number>`count(*) filter (where ${ordersTable.status} = 'cancelled' and ${ordersTable.createdAt} >= ${today})`,
    activeDeliveries: sql<number>`count(*) filter (where ${ordersTable.status} in ('picked_up','on_the_way','arriving_soon'))`,
    pendingDispatch: sql<number>`count(*) filter (where ${ordersTable.status} in ('pending_dispatch','dispatching_driver'))`,
    awaitingConfirmation: sql<number>`count(*) filter (where ${ordersTable.status} = 'awaiting_customer_confirmation')`,
    preparingOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'preparing')`,
    revenueToday: sql<number>`coalesce(sum(case when ${ordersTable.status} = 'delivered' and ${ordersTable.createdAt} >= ${today} then ${ordersTable.total}::numeric else 0 end), 0)`,
    revenueTotal: sql<number>`coalesce(sum(case when ${ordersTable.status} = 'delivered' then ${ordersTable.total}::numeric else 0 end), 0)`,
  }).from(ordersTable);

  const [restaurantStats] = await db.select({
    total: count(),
    pending: sql<number>`count(*) filter (where ${restaurantsTable.status} = 'pending')`,
  }).from(restaurantsTable);

  const [driverStats] = await db.select({
    total: count(),
    online: sql<number>`count(*) filter (where ${driverProfilesTable.isOnline} = true)`,
    pending: sql<number>`count(*) filter (where ${driverProfilesTable.status} = 'pending')`,
  }).from(driverProfilesTable);

  const [customerStats] = await db.select({
    total: count(),
    highRisk: sql<number>`count(*) filter (where ${customerProfilesTable.riskScore} = 'high')`,
  }).from(customerProfilesTable);

  const [fraudStats] = await db.select({
    open: sql<number>`count(*) filter (where ${fraudFlagsTable.isResolved} = false)`,
  }).from(fraudFlagsTable);

  res.json({
    totalOrders: Number(orderStats?.totalOrders ?? 0),
    activeDeliveries: Number(orderStats?.activeDeliveries ?? 0),
    pendingDispatch: Number(orderStats?.pendingDispatch ?? 0),
    awaitingConfirmation: Number(orderStats?.awaitingConfirmation ?? 0),
    preparingOrders: Number(orderStats?.preparingOrders ?? 0),
    deliveredToday: Number(orderStats?.deliveredToday ?? 0),
    cancelledToday: Number(orderStats?.cancelledToday ?? 0),
    revenueToday: Number(orderStats?.revenueToday ?? 0),
    revenueTotal: Number(orderStats?.revenueTotal ?? 0),
    totalRestaurants: Number(restaurantStats?.total ?? 0),
    pendingRestaurantApprovals: Number(restaurantStats?.pending ?? 0),
    totalDrivers: Number(driverStats?.total ?? 0),
    onlineDrivers: Number(driverStats?.online ?? 0),
    pendingDriverApprovals: Number(driverStats?.pending ?? 0),
    totalCustomers: Number(customerStats?.total ?? 0),
    highRiskCustomers: Number(customerStats?.highRisk ?? 0),
    openFraudFlags: Number(fraudStats?.open ?? 0),
    failedConfirmationsToday: 0,
  });
});

// ORDER ANALYTICS
router.get("/admin/analytics/orders", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const { period = "7d" } = req.query;

  const statusCounts = await db.select({
    status: ordersTable.status,
    count: count(),
  }).from(ordersTable).groupBy(ordersTable.status);

  res.json({
    period: period as string,
    ordersByStatus: statusCounts.map(s => ({ status: s.status, count: Number(s.count) })),
    ordersByDay: [],
    avgDeliveryTime: 42,
    avgDispatchTime: 8,
    avgPrepTime: 22,
    cancellationRate: 5.2,
    failedConfirmationRate: 3.1,
  });
});

// FRAUD FLAGS
router.get("/admin/fraud-flags", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const { severity, resolved } = req.query;
  const conditions: any[] = [];
  if (severity) conditions.push(eq(fraudFlagsTable.severity, severity as any));
  if (resolved !== undefined) conditions.push(eq(fraudFlagsTable.isResolved, resolved === "true"));

  const flags = await db.select({
    flag: fraudFlagsTable,
    userName: usersTable.name,
    userRole: usersTable.role,
  })
    .from(fraudFlagsTable)
    .leftJoin(usersTable, eq(fraudFlagsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(fraudFlagsTable.createdAt));

  res.json(flags.map(({ flag, userName, userRole }) => ({
    id: flag.id,
    userId: flag.userId,
    userName: userName ?? "Unknown",
    userRole: userRole ?? "customer",
    type: flag.type,
    severity: flag.severity,
    description: flag.description,
    relatedOrderId: flag.relatedOrderId ?? null,
    isResolved: flag.isResolved,
    resolvedAt: flag.resolvedAt?.toISOString() ?? null,
    createdAt: flag.createdAt.toISOString(),
  })));
});

router.post("/admin/fraud-flags/:flagId/resolve", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.flagId) ? req.params.flagId[0] : req.params.flagId, 10);
  const user = (req as any).user;
  const [flag] = await db.update(fraudFlagsTable)
    .set({ isResolved: true, resolvedAt: new Date(), resolvedBy: user.id })
    .where(eq(fraudFlagsTable.id, id))
    .returning();
  if (!flag) { res.status(404).json({ error: "Not found" }); return; }

  const [userData] = await db.select().from(usersTable).where(eq(usersTable.id, flag.userId));
  res.json({
    id: flag.id,
    userId: flag.userId,
    userName: userData?.name ?? "Unknown",
    userRole: userData?.role ?? "customer",
    type: flag.type,
    severity: flag.severity,
    description: flag.description,
    relatedOrderId: flag.relatedOrderId ?? null,
    isResolved: flag.isResolved,
    resolvedAt: flag.resolvedAt?.toISOString() ?? null,
    createdAt: flag.createdAt.toISOString(),
  });
});

// ADMIN OVERRIDE DELIVERY
router.post("/admin/orders/:orderId/override-delivery", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const user = (req as any).user;
  const { reason } = req.body;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (order.status === "delivered") { res.status(400).json({ error: "Order already delivered" }); return; }

  const [updated] = await db.update(ordersTable)
    .set({ status: "delivered", paymentStatus: order.paymentMethod === "cash_on_delivery" ? "paid" : order.paymentStatus })
    .where(eq(ordersTable.id, orderId))
    .returning();

  await db.insert(orderStatusHistoryTable).values({
    orderId,
    status: "delivered" as any,
    note: reason ?? "Livraison confirmée manuellement par l'admin",
    createdBy: `admin:${user.id}`,
  });

  // Mark QR as used
  await db.update(qrDeliveryTokensTable).set({ isUsed: true }).where(eq(qrDeliveryTokensTable.orderId, orderId));

  // Notify customer
  await createNotification({
    userId: order.customerId,
    type: "delivered",
    title: "Commande livrée",
    message: `Votre commande ${order.orderNumber} a été marquée comme livrée.`,
    relatedOrderId: orderId,
  });

  res.json({ success: true, order: updated });
});

// SETTINGS
router.get("/admin/settings", authenticate, requireRole("admin"), async (_req, res): Promise<void> => {
  const settings = await db.select().from(platformSettingsTable);
  const map: any = {};
  for (const s of settings) { map[s.key] = s.value; }

  res.json({
    dispatchRadiusKm: Number(map["dispatch_radius_km"] ?? 5),
    dispatchTimeoutSeconds: Number(map["dispatch_timeout_seconds"] ?? 60),
    defaultDeliveryFee: Number(map["default_delivery_fee"] ?? 3),
    platformCommissionRate: Number(map["platform_commission_rate"] ?? 10),
    maxCancellationsBeforeFlag: Number(map["max_cancellations_before_flag"] ?? 3),
    maxUnreachableBeforeFlag: Number(map["max_unreachable_before_flag"] ?? 2),
    qrValidationEnabled: map["qr_validation_enabled"] === "true",
    maintenanceMode: map["maintenance_mode"] === "true",
  });
});

router.patch("/admin/settings", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const settingsMap: Record<string, any> = {
    dispatchRadiusKm: "dispatch_radius_km",
    dispatchTimeoutSeconds: "dispatch_timeout_seconds",
    defaultDeliveryFee: "default_delivery_fee",
    platformCommissionRate: "platform_commission_rate",
    maxCancellationsBeforeFlag: "max_cancellations_before_flag",
    maxUnreachableBeforeFlag: "max_unreachable_before_flag",
    qrValidationEnabled: "qr_validation_enabled",
    maintenanceMode: "maintenance_mode",
  };

  for (const [k, dbKey] of Object.entries(settingsMap)) {
    if (req.body[k] != null) {
      await db.insert(platformSettingsTable)
        .values({ key: dbKey, value: String(req.body[k]) })
        .onConflictDoUpdate({ target: platformSettingsTable.key, set: { value: String(req.body[k]) } });
    }
  }

  const settings = await db.select().from(platformSettingsTable);
  const map: any = {};
  for (const s of settings) { map[s.key] = s.value; }

  res.json({
    dispatchRadiusKm: Number(map["dispatch_radius_km"] ?? 5),
    dispatchTimeoutSeconds: Number(map["dispatch_timeout_seconds"] ?? 60),
    defaultDeliveryFee: Number(map["default_delivery_fee"] ?? 3),
    platformCommissionRate: Number(map["platform_commission_rate"] ?? 10),
    maxCancellationsBeforeFlag: Number(map["max_cancellations_before_flag"] ?? 3),
    maxUnreachableBeforeFlag: Number(map["max_unreachable_before_flag"] ?? 2),
    qrValidationEnabled: map["qr_validation_enabled"] === "true",
    maintenanceMode: map["maintenance_mode"] === "true",
  });
});

// DRIVERS
router.get("/drivers", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const { status, cityId, online } = req.query;
  const conditions: any[] = [];
  if (status) conditions.push(eq(driverProfilesTable.status, status as any));
  if (cityId) conditions.push(eq(driverProfilesTable.cityId, Number(cityId)));
  if (online !== undefined) conditions.push(eq(driverProfilesTable.isOnline, online === "true"));

  const drivers = await db.select({
    profile: driverProfilesTable,
    user: usersTable,
  })
    .from(driverProfilesTable)
    .leftJoin(usersTable, eq(driverProfilesTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(driverProfilesTable.createdAt));

  res.json(drivers.map(({ profile, user }) => ({
    id: profile.id,
    userId: profile.userId,
    name: user?.name ?? "Unknown",
    email: user?.email ?? "",
    phone: user?.phone ?? null,
    status: profile.status,
    isOnline: profile.isOnline,
    cityId: profile.cityId ?? null,
    avgRating: Number(profile.avgRating ?? 0),
    acceptanceRate: Number(profile.acceptanceRate ?? 0),
    totalDeliveries: profile.totalDeliveries,
    failedConfirmations: profile.failedConfirmations,
    createdAt: profile.createdAt.toISOString(),
  })));
});

router.post("/drivers/:driverId/approve", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.driverId) ? req.params.driverId[0] : req.params.driverId, 10);
  const [profile] = await db.update(driverProfilesTable).set({ status: "approved" }).where(eq(driverProfilesTable.id, id)).returning();
  if (!profile) { res.status(404).json({ error: "Not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, profile.userId));
  res.json({ id: profile.id, userId: profile.userId, name: user?.name ?? "Unknown", email: user?.email ?? "", phone: user?.phone ?? null, status: profile.status, isOnline: profile.isOnline, cityId: profile.cityId ?? null, avgRating: Number(profile.avgRating ?? 0), acceptanceRate: Number(profile.acceptanceRate ?? 0), totalDeliveries: profile.totalDeliveries, failedConfirmations: profile.failedConfirmations, createdAt: profile.createdAt.toISOString() });
});

router.post("/drivers/:driverId/reject", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.driverId) ? req.params.driverId[0] : req.params.driverId, 10);
  const [profile] = await db.update(driverProfilesTable).set({ status: "rejected" }).where(eq(driverProfilesTable.id, id)).returning();
  if (!profile) { res.status(404).json({ error: "Not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, profile.userId));
  res.json({ id: profile.id, userId: profile.userId, name: user?.name ?? "Unknown", email: user?.email ?? "", phone: user?.phone ?? null, status: profile.status, isOnline: profile.isOnline, cityId: profile.cityId ?? null, avgRating: Number(profile.avgRating ?? 0), acceptanceRate: Number(profile.acceptanceRate ?? 0), totalDeliveries: profile.totalDeliveries, failedConfirmations: profile.failedConfirmations, createdAt: profile.createdAt.toISOString() });
});

router.post("/drivers/:driverId/suspend", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.driverId) ? req.params.driverId[0] : req.params.driverId, 10);
  const [profile] = await db.update(driverProfilesTable)
    .set({ status: "suspended", isOnline: false, availability: "offline" })
    .where(eq(driverProfilesTable.id, id)).returning();
  if (!profile) { res.status(404).json({ error: "Not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, profile.userId));
  res.json({ id: profile.id, userId: profile.userId, name: user?.name ?? "Unknown", email: user?.email ?? "", phone: user?.phone ?? null, status: profile.status, isOnline: profile.isOnline, cityId: profile.cityId ?? null, avgRating: Number(profile.avgRating ?? 0), acceptanceRate: Number(profile.acceptanceRate ?? 0), totalDeliveries: profile.totalDeliveries, failedConfirmations: profile.failedConfirmations, createdAt: profile.createdAt.toISOString() });
});

router.post("/drivers/:driverId/activate", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.driverId) ? req.params.driverId[0] : req.params.driverId, 10);
  const [profile] = await db.update(driverProfilesTable)
    .set({ status: "approved" })
    .where(eq(driverProfilesTable.id, id)).returning();
  if (!profile) { res.status(404).json({ error: "Not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, profile.userId));
  res.json({ id: profile.id, userId: profile.userId, name: user?.name ?? "Unknown", email: user?.email ?? "", phone: user?.phone ?? null, status: profile.status, isOnline: profile.isOnline, cityId: profile.cityId ?? null, avgRating: Number(profile.avgRating ?? 0), acceptanceRate: Number(profile.acceptanceRate ?? 0), totalDeliveries: profile.totalDeliveries, failedConfirmations: profile.failedConfirmations, createdAt: profile.createdAt.toISOString() });
});

router.delete("/drivers/:driverId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.driverId) ? req.params.driverId[0] : req.params.driverId, 10);
  const [profile] = await db.select().from(driverProfilesTable).where(eq(driverProfilesTable.id, id));
  if (!profile) { res.status(404).json({ error: "Not found" }); return; }

  const userId = profile.userId;

  try {
    // 1. Dissocier les commandes (conserver l'historique)
    await db.update(ordersTable).set({ driverId: null }).where(eq(ordersTable.driverId, userId));
    // 2. Dissocier les confirmations de livraison
    await db.update(deliveryConfirmationsTable).set({ driverId: null }).where(eq(deliveryConfirmationsTable.driverId, userId));
    // 3. Nullifier les références dans disputes
    await db.update(disputesTable).set({ assignedTo: null }).where(eq(disputesTable.assignedTo, userId));
    // 4. Nullifier resolved_by dans fraud_flags
    await db.update(fraudFlagsTable).set({ resolvedBy: null }).where(eq(fraudFlagsTable.resolvedBy, userId));
    // 5. Supprimer les tentatives de dispatch
    await db.delete(dispatchAttemptsTable).where(eq(dispatchAttemptsTable.driverId, userId));
    // 6. Supprimer les notifications
    await db.delete(notificationsTable).where(eq(notificationsTable.userId, userId));
    // 7. Supprimer les signalements de fraude liés à ce user
    await db.delete(fraudFlagsTable).where(eq(fraudFlagsTable.userId, userId));
    // 8. Supprimer le profil livreur
    await db.delete(driverProfilesTable).where(eq(driverProfilesTable.id, id));
    // 9. Supprimer l'utilisateur
    await db.delete(usersTable).where(eq(usersTable.id, userId));

    res.json({ success: true });
  } catch (err: any) {
    console.error("Driver delete error:", err);
    res.status(500).json({ error: "Impossible de supprimer ce livreur : " + (err.message ?? "erreur interne") });
  }
});

// Update driver name/phone
router.patch("/drivers/:driverId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.driverId) ? req.params.driverId[0] : req.params.driverId, 10);
  const [profile] = await db.select().from(driverProfilesTable).where(eq(driverProfilesTable.id, id));
  if (!profile) { res.status(404).json({ error: "Not found" }); return; }
  const { name, phone } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (Object.keys(updates).length > 0) {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, profile.userId));
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, profile.userId));
  res.json({ id: profile.id, userId: profile.userId, name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? null, status: profile.status, isOnline: profile.isOnline, cityId: profile.cityId ?? null, avgRating: Number(profile.avgRating ?? 0), acceptanceRate: Number(profile.acceptanceRate ?? 0), totalDeliveries: profile.totalDeliveries, failedConfirmations: profile.failedConfirmations, createdAt: profile.createdAt.toISOString() });
});

// CUSTOMERS
router.get("/customers", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const { riskLevel, search } = req.query;
  const conditions: any[] = [];
  if (riskLevel) conditions.push(eq(customerProfilesTable.riskScore, riskLevel as any));

  const customers = await db.select({
    profile: customerProfilesTable,
    user: usersTable,
  })
    .from(customerProfilesTable)
    .leftJoin(usersTable, eq(customerProfilesTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(customerProfilesTable.createdAt));

  let result = customers;
  if (search) {
    const s = (search as string).toLowerCase();
    result = result.filter(({ user }) => user?.name?.toLowerCase().includes(s) || user?.email?.toLowerCase().includes(s));
  }

  res.json(result.map(({ profile, user }) => ({
    id: profile.id,
    userId: profile.userId,
    name: user?.name ?? "Unknown",
    email: user?.email ?? "",
    phone: user?.phone ?? null,
    riskScore: profile.riskScore,
    cancellationCount: profile.cancellationCount,
    unreachableCount: profile.unreachableCount,
    failedConfirmationCount: profile.failedConfirmationCount,
    totalOrders: profile.totalOrders,
    isActive: user?.isActive ?? true,
    createdAt: profile.createdAt.toISOString(),
  })));
});

router.get("/customers/:customerId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId, 10);
  const [result] = await db.select({ profile: customerProfilesTable, user: usersTable })
    .from(customerProfilesTable)
    .leftJoin(usersTable, eq(customerProfilesTable.userId, usersTable.id))
    .where(eq(customerProfilesTable.id, id));
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  const { profile, user } = result;
  res.json({ id: profile.id, userId: profile.userId, name: user?.name ?? "Unknown", email: user?.email ?? "", phone: user?.phone ?? null, riskScore: profile.riskScore, cancellationCount: profile.cancellationCount, unreachableCount: profile.unreachableCount, failedConfirmationCount: profile.failedConfirmationCount, totalOrders: profile.totalOrders, isActive: user?.isActive ?? true, createdAt: profile.createdAt.toISOString() });
});

// Update customer name/phone
router.patch("/customers/:customerId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId, 10);
  const [result] = await db.select({ profile: customerProfilesTable, user: usersTable })
    .from(customerProfilesTable)
    .leftJoin(usersTable, eq(customerProfilesTable.userId, usersTable.id))
    .where(eq(customerProfilesTable.id, id));
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  const { name, phone } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (Object.keys(updates).length > 0) {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, result.profile.userId));
  }
  const { profile, user } = result;
  res.json({ id: profile.id, userId: profile.userId, name: updates.name ?? user?.name ?? "Unknown", email: user?.email ?? "", phone: updates.phone ?? user?.phone ?? null, riskScore: profile.riskScore, cancellationCount: profile.cancellationCount, unreachableCount: profile.unreachableCount, failedConfirmationCount: profile.failedConfirmationCount, totalOrders: profile.totalOrders, isActive: user?.isActive ?? true, createdAt: profile.createdAt.toISOString() });
});

// Delete customer
router.delete("/customers/:customerId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId, 10);
  const [result] = await db.select({ profile: customerProfilesTable })
    .from(customerProfilesTable)
    .where(eq(customerProfilesTable.id, id));
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  const userId = result.profile.userId;
  try {
    await db.update(ordersTable).set({ customerId: null }).where(eq(ordersTable.customerId, userId));
    await db.update(disputesTable).set({ assignedTo: null }).where(eq(disputesTable.assignedTo, userId));
    await db.delete(disputesTable).where(eq(disputesTable.reportedBy, userId));
    await db.update(fraudFlagsTable).set({ resolvedBy: null }).where(eq(fraudFlagsTable.resolvedBy, userId));
    await db.delete(promoUsageTable).where(eq(promoUsageTable.userId, userId));
    await db.delete(notificationsTable).where(eq(notificationsTable.userId, userId));
    await db.delete(fraudFlagsTable).where(eq(fraudFlagsTable.userId, userId));
    await db.delete(ratingsTable).where(eq(ratingsTable.customerId, userId));
    await db.delete(addressesTable).where(eq(addressesTable.userId, userId));
    await db.delete(customerProfilesTable).where(eq(customerProfilesTable.id, id));
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch (err: any) {
    console.error("Customer delete error:", err);
    res.status(500).json({ error: "Impossible de supprimer ce client : " + (err.message ?? "erreur interne") });
  }
});

// Delete restaurant (admin)
router.delete("/restaurants/:restaurantId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, id));
  if (!restaurant) { res.status(404).json({ error: "Not found" }); return; }
  try {
    await db.update(ordersTable).set({ restaurantId: null } as any).where(eq(ordersTable.restaurantId, id));
    await db.delete(ratingsTable).where(eq(ratingsTable.restaurantId, id));
    const categories = await db.select().from(menuCategoriesTable).where(eq(menuCategoriesTable.restaurantId, id));
    for (const cat of categories) {
      await db.delete(productsTable).where(eq(productsTable.categoryId, cat.id));
    }
    await db.delete(menuCategoriesTable).where(eq(menuCategoriesTable.restaurantId, id));
    await db.delete(restaurantsTable).where(eq(restaurantsTable.id, id));
    await db.delete(usersTable).where(eq(usersTable.id, restaurant.userId));
    res.json({ success: true });
  } catch (err: any) {
    console.error("Restaurant delete error:", err);
    res.status(500).json({ error: "Impossible de supprimer ce restaurant : " + (err.message ?? "erreur interne") });
  }
});

// PAYMENTS
router.get("/payments", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const { status, orderId } = req.query;
  const conditions: any[] = [];
  if (status) conditions.push(eq(paymentsTable.status, status as any));
  if (orderId) conditions.push(eq(paymentsTable.orderId, Number(orderId)));

  const payments = await db.select({
    payment: paymentsTable,
    orderNumber: ordersTable.orderNumber,
  })
    .from(paymentsTable)
    .leftJoin(ordersTable, eq(paymentsTable.orderId, ordersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(paymentsTable.createdAt));

  res.json(payments.map(({ payment, orderNumber }) => ({
    id: payment.id,
    orderId: payment.orderId,
    orderNumber: orderNumber ?? "Unknown",
    amount: Number(payment.amount),
    method: payment.method,
    status: payment.status,
    createdAt: payment.createdAt.toISOString(),
  })));
});

router.post("/payments/:paymentId/refund", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.paymentId) ? req.params.paymentId[0] : req.params.paymentId, 10);
  const [payment] = await db.update(paymentsTable).set({ status: "refunded" }).where(eq(paymentsTable.id, id)).returning();
  if (!payment) { res.status(404).json({ error: "Not found" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, payment.orderId));
  res.json({ id: payment.id, orderId: payment.orderId, orderNumber: order?.orderNumber ?? "Unknown", amount: Number(payment.amount), method: payment.method, status: payment.status, createdAt: payment.createdAt.toISOString() });
});

// PROMO CODES
function formatPromo(p: any) {
  return {
    id: p.id,
    code: p.code,
    description: p.description ?? null,
    discountType: p.discountType,
    discountValue: Number(p.discountValue),
    minimumBasket: p.minimumBasket ? Number(p.minimumBasket) : null,
    maxUsageTotal: p.maxUsageTotal ?? null,
    maxUsagePerUser: p.maxUsagePerUser ?? 1,
    usageCount: p.usageCount,
    isActive: p.isActive,
    expiresAt: p.expiresAt?.toISOString?.() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/admin/promo-codes", authenticate, requireRole("admin"), async (_req, res): Promise<void> => {
  const promos = await db.select().from(promoCodesTable).orderBy(desc(promoCodesTable.createdAt));
  res.json(promos.map(formatPromo));
});

router.post("/admin/promo-codes", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { code, description, discountType, discountValue, minimumBasket, maxUsageTotal, maxUsagePerUser, isActive, expiresAt } = req.body;
  if (!code || !discountType || discountValue == null) {
    res.status(400).json({ error: "code, discountType, discountValue required" }); return;
  }
  const [promo] = await db.insert(promoCodesTable).values({
    code: code.toUpperCase().trim(),
    description: description ?? null,
    discountType,
    discountValue: Number(discountValue).toFixed(2),
    minimumBasket: minimumBasket ? Number(minimumBasket).toFixed(2) : null,
    maxUsageTotal: maxUsageTotal ?? null,
    maxUsagePerUser: maxUsagePerUser ?? 1,
    isActive: isActive ?? true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdBy: user.id,
  }).returning();
  res.status(201).json(formatPromo(promo));
});

router.patch("/admin/promo-codes/:promoId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.promoId) ? req.params.promoId[0] : req.params.promoId, 10);
  const { description, discountType, discountValue, minimumBasket, maxUsageTotal, maxUsagePerUser, isActive, expiresAt } = req.body;
  const updates: any = {};
  if (description !== undefined) updates.description = description;
  if (discountType !== undefined) updates.discountType = discountType;
  if (discountValue !== undefined) updates.discountValue = Number(discountValue).toFixed(2);
  if (minimumBasket !== undefined) updates.minimumBasket = minimumBasket ? Number(minimumBasket).toFixed(2) : null;
  if (maxUsageTotal !== undefined) updates.maxUsageTotal = maxUsageTotal;
  if (maxUsagePerUser !== undefined) updates.maxUsagePerUser = maxUsagePerUser;
  if (isActive !== undefined) updates.isActive = isActive;
  if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
  const [promo] = await db.update(promoCodesTable).set(updates).where(eq(promoCodesTable.id, id)).returning();
  if (!promo) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatPromo(promo));
});

router.delete("/admin/promo-codes/:promoId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.promoId) ? req.params.promoId[0] : req.params.promoId, 10);
  await db.delete(promoCodesTable).where(eq(promoCodesTable.id, id));
  res.sendStatus(204);
});

// DISPUTES
function formatDispute(d: any, extra: any = {}) {
  return {
    id: d.id,
    orderId: d.orderId,
    orderNumber: extra.orderNumber ?? null,
    reportedByName: extra.reportedByName ?? null,
    type: d.type,
    status: d.status,
    description: d.description,
    adminNote: d.adminNote ?? null,
    resolution: d.resolution ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

router.get("/admin/disputes", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const { status, type } = req.query;
  const conditions: any[] = [];
  if (status) conditions.push(eq(disputesTable.status, status as any));
  if (type) conditions.push(eq(disputesTable.type, type as any));

  const disputes = await db.select({
    dispute: disputesTable,
    orderNumber: ordersTable.orderNumber,
    reportedByName: usersTable.name,
  }).from(disputesTable)
    .leftJoin(ordersTable, eq(disputesTable.orderId, ordersTable.id))
    .leftJoin(usersTable, eq(disputesTable.reportedBy, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(disputesTable.createdAt));

  res.json(disputes.map(({ dispute, orderNumber, reportedByName }) =>
    formatDispute(dispute, { orderNumber, reportedByName })
  ));
});

router.post("/admin/disputes", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { orderId, type, description } = req.body;
  if (!orderId || !description) { res.status(400).json({ error: "orderId and description required" }); return; }
  const [dispute] = await db.insert(disputesTable).values({
    orderId: Number(orderId),
    reportedBy: user.id,
    type: type ?? "other",
    description,
    status: "open",
  }).returning();
  res.status(201).json(formatDispute(dispute));
});

router.patch("/admin/disputes/:disputeId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.disputeId) ? req.params.disputeId[0] : req.params.disputeId, 10);
  const { status, adminNote, resolution, assignedTo } = req.body;
  const updates: any = {};
  if (status !== undefined) updates.status = status;
  if (adminNote !== undefined) updates.adminNote = adminNote;
  if (resolution !== undefined) updates.resolution = resolution;
  if (assignedTo !== undefined) updates.assignedTo = assignedTo;
  const [dispute] = await db.update(disputesTable).set(updates).where(eq(disputesTable.id, id)).returning();
  if (!dispute) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatDispute(dispute));
});

router.get("/admin/disputes/:disputeId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.disputeId) ? req.params.disputeId[0] : req.params.disputeId, 10);
  const [row] = await db.select({
    dispute: disputesTable,
    orderNumber: ordersTable.orderNumber,
    reportedByName: usersTable.name,
  }).from(disputesTable)
    .leftJoin(ordersTable, eq(disputesTable.orderId, ordersTable.id))
    .leftJoin(usersTable, eq(disputesTable.reportedBy, usersTable.id))
    .where(eq(disputesTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatDispute(row.dispute, { orderNumber: row.orderNumber, reportedByName: row.reportedByName }));
});

// DISPUTES - customer-facing (report own order)
router.post("/orders/:orderId/dispute", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);
  const { type, description } = req.body;
  if (!description) { res.status(400).json({ error: "description required" }); return; }
  const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.customerId, user.id)));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  const [dispute] = await db.insert(disputesTable).values({
    orderId,
    reportedBy: user.id,
    type: type ?? "other",
    description,
    status: "open",
  }).returning();
  res.status(201).json(formatDispute(dispute));
});

export default router;
