import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, restaurantsTable, driverProfilesTable, customerProfilesTable,
  ordersTable, fraudFlagsTable, platformSettingsTable, paymentsTable, ratingsTable,
} from "@workspace/db";
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

export default router;
