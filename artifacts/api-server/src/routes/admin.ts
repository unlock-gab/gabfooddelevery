import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, restaurantsTable, driverProfilesTable, customerProfilesTable,
  ordersTable, fraudFlagsTable, platformSettingsTable, paymentsTable, ratingsTable,
  orderStatusHistoryTable, qrDeliveryTokensTable, promoCodesTable, promoUsageTable,
  disputesTable, dispatchAttemptsTable, notificationsTable,
  deliveryConfirmationsTable, menuCategoriesTable, productsTable,
  addressesTable, orderItemsTable, zonesTable, citiesTable,
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

// FULL STATISTICS PAGE
router.get("/admin/statistics", authenticate, requireRole("admin"), async (_req, res): Promise<void> => {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const last7 = new Date(today); last7.setDate(last7.getDate() - 7);
  const last30 = new Date(today); last30.setDate(last30.getDate() - 30);

  // ── Orders global ──
  const [ord] = await db.select({
    total: count(),
    delivered: sql<number>`count(*) filter (where ${ordersTable.status} = 'delivered')`,
    cancelled: sql<number>`count(*) filter (where ${ordersTable.status} = 'cancelled')`,
    todayTotal: sql<number>`count(*) filter (where ${ordersTable.createdAt} >= ${today})`,
    todayDelivered: sql<number>`count(*) filter (where ${ordersTable.status} = 'delivered' and ${ordersTable.createdAt} >= ${today})`,
    weekDelivered: sql<number>`count(*) filter (where ${ordersTable.status} = 'delivered' and ${ordersTable.createdAt} >= ${last7})`,
    revenueTotal: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' then ${ordersTable.total}::numeric else 0 end),0)`,
    revenueToday: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' and ${ordersTable.createdAt}>=${today} then ${ordersTable.total}::numeric else 0 end),0)`,
    revenueWeek: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' and ${ordersTable.createdAt}>=${last7} then ${ordersTable.total}::numeric else 0 end),0)`,
    revenueMonth: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' and ${ordersTable.createdAt}>=${last30} then ${ordersTable.total}::numeric else 0 end),0)`,
    subtotalTotal: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' then ${ordersTable.subtotal}::numeric else 0 end),0)`,
    deliveryFeesTotal: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' then ${ordersTable.deliveryFee}::numeric else 0 end),0)`,
    avgOrderValue: sql<number>`coalesce(avg(case when ${ordersTable.status}='delivered' then ${ordersTable.total}::numeric end),0)`,
  }).from(ordersTable);

  // ── Orders by status ──
  const statusRows = await db.select({ status: ordersTable.status, cnt: count() })
    .from(ordersTable).groupBy(ordersTable.status);

  // ── Revenue last 30 days (daily) ──
  const dailyRevenue = await db.select({
    day: sql<string>`date_trunc('day', ${ordersTable.createdAt})::date::text`,
    revenue: sql<number>`coalesce(sum(${ordersTable.total}::numeric),0)`,
    orders: sql<number>`count(*)`,
  }).from(ordersTable)
    .where(and(eq(ordersTable.status, "delivered"), sql`${ordersTable.createdAt} >= ${last30}`))
    .groupBy(sql`date_trunc('day', ${ordersTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${ordersTable.createdAt})`);

  // ── Top restaurants ──
  const topRestaurants = await db.select({
    id: restaurantsTable.id,
    name: restaurantsTable.name,
    orderCount: sql<number>`count(*)`,
    revenue: sql<number>`coalesce(sum(${ordersTable.total}::numeric),0)`,
  }).from(ordersTable)
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .where(eq(ordersTable.status, "delivered"))
    .groupBy(restaurantsTable.id, restaurantsTable.name)
    .orderBy(sql`sum(${ordersTable.total}::numeric) desc`)
    .limit(10);

  // ── Top drivers ──
  const topDrivers = await db.select({
    id: driverProfilesTable.id,
    name: usersTable.name,
    deliveries: driverProfilesTable.totalDeliveries,
    earningsTotal: driverProfilesTable.earningsTotal,
    rating: driverProfilesTable.avgRating,
  }).from(driverProfilesTable)
    .leftJoin(usersTable, eq(driverProfilesTable.userId, usersTable.id))
    .where(eq(driverProfilesTable.status, "approved"))
    .orderBy(desc(driverProfilesTable.totalDeliveries))
    .limit(10);

  // ── Drivers summary ──
  const [drvSummary] = await db.select({
    total: count(),
    approved: sql<number>`count(*) filter (where ${driverProfilesTable.status}='approved')`,
    online: sql<number>`count(*) filter (where ${driverProfilesTable.isOnline}=true)`,
    pending: sql<number>`count(*) filter (where ${driverProfilesTable.status}='pending')`,
    totalEarnings: sql<number>`coalesce(sum(${driverProfilesTable.earningsTotal}::numeric),0)`,
    totalDeliveries: sql<number>`coalesce(sum(${driverProfilesTable.totalDeliveries}),0)`,
  }).from(driverProfilesTable);

  // ── Restaurants summary ──
  const [rstSummary] = await db.select({
    total: count(),
    approved: sql<number>`count(*) filter (where ${restaurantsTable.status}='approved')`,
    open: sql<number>`count(*) filter (where ${restaurantsTable.isOpen}=true)`,
    pending: sql<number>`count(*) filter (where ${restaurantsTable.status}='pending')`,
  }).from(restaurantsTable);

  // ── Customers summary ──
  const [custSummary] = await db.select({
    total: count(),
    newToday: sql<number>`count(*) filter (where ${customerProfilesTable.createdAt} >= ${today})`,
    newWeek: sql<number>`count(*) filter (where ${customerProfilesTable.createdAt} >= ${last7})`,
  }).from(customerProfilesTable);

  // ── Commission summary ──
  const totalDriverCommission = Math.round(Number(drvSummary?.totalEarnings ?? 0) * 0.12);
  const [restoRevRow] = await db.select({ total: sum(ordersTable.subtotal) })
    .from(ordersTable).where(eq(ordersTable.status, "delivered"));
  const totalRestoCommission = Math.round(Number(restoRevRow?.total ?? 0) * 0.12);

  res.json({
    orders: {
      total: Number(ord.total),
      delivered: Number(ord.delivered),
      cancelled: Number(ord.cancelled),
      todayTotal: Number(ord.todayTotal),
      todayDelivered: Number(ord.todayDelivered),
      weekDelivered: Number(ord.weekDelivered),
      cancellationRate: Number(ord.total) > 0 ? Math.round(Number(ord.cancelled) / Number(ord.total) * 100) : 0,
      avgOrderValue: Math.round(Number(ord.avgOrderValue)),
    },
    revenue: {
      total: Math.round(Number(ord.revenueTotal)),
      today: Math.round(Number(ord.revenueToday)),
      week: Math.round(Number(ord.revenueWeek)),
      month: Math.round(Number(ord.revenueMonth)),
      subtotal: Math.round(Number(ord.subtotalTotal)),
      deliveryFees: Math.round(Number(ord.deliveryFeesTotal)),
    },
    commission: {
      drivers: totalDriverCommission,
      restaurants: totalRestoCommission,
      total: totalDriverCommission + totalRestoCommission,
    },
    byStatus: statusRows.map(s => ({ status: s.status, count: Number(s.cnt) })),
    dailyRevenue: dailyRevenue.map(d => ({ day: d.day, revenue: Math.round(Number(d.revenue)), orders: Number(d.orders) })),
    topRestaurants: topRestaurants.map(r => ({ id: r.id, name: r.name ?? "?", orders: Number(r.orderCount), revenue: Math.round(Number(r.revenue)) })),
    topDrivers: topDrivers.map(d => ({ id: d.id, name: d.name ?? "?", deliveries: Number(d.deliveries), earnings: Math.round(Number(d.earningsTotal ?? 0)), rating: Number(d.rating ?? 0) })),
    drivers: { total: Number(drvSummary.total), approved: Number(drvSummary.approved), online: Number(drvSummary.online), pending: Number(drvSummary.pending), totalDeliveries: Number(drvSummary.totalDeliveries) },
    restaurants: { total: Number(rstSummary.total), approved: Number(rstSummary.approved), open: Number(rstSummary.open), pending: Number(rstSummary.pending) },
    customers: { total: Number(custSummary.total), newToday: Number(custSummary.newToday), newWeek: Number(custSummary.newWeek) },
  });
});

// OPERATIONAL OVERVIEW — live control center data
router.get("/admin/operational", authenticate, requireRole("admin"), async (_req, res): Promise<void> => {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // ── Live ops counters ──
  const [liveOps] = await db.select({
    activeOrders: sql<number>`count(*) filter (where ${ordersTable.status} in ('picked_up','on_the_way','arriving_soon'))`,
    pendingDispatch: sql<number>`count(*) filter (where ${ordersTable.status} in ('pending_dispatch','dispatching_driver'))`,
    awaitingConfirmation: sql<number>`count(*) filter (where ${ordersTable.status} = 'awaiting_customer_confirmation')`,
    needsUpdate: sql<number>`count(*) filter (where ${ordersTable.status} = 'needs_update')`,
    confirmationFailed: sql<number>`count(*) filter (where ${ordersTable.status} = 'confirmation_failed')`,
    preparing: sql<number>`count(*) filter (where ${ordersTable.status} = 'preparing')`,
    readyPickup: sql<number>`count(*) filter (where ${ordersTable.status} = 'ready_for_pickup')`,
    deliveredToday: sql<number>`count(*) filter (where ${ordersTable.status} = 'delivered' and ${ordersTable.createdAt} >= ${today})`,
    cancelledToday: sql<number>`count(*) filter (where ${ordersTable.status} = 'cancelled' and ${ordersTable.createdAt} >= ${today})`,
    revenueToday: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' and ${ordersTable.createdAt}>=${today} then ${ordersTable.total}::numeric else 0 end),0)`,
    commissionsToday: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' and ${ordersTable.createdAt}>=${today} then ${ordersTable.subtotal}::numeric*0.12 else 0 end),0)`,
  }).from(ordersTable);

  const [drvLive] = await db.select({
    online: sql<number>`count(*) filter (where ${driverProfilesTable.isOnline}=true and ${driverProfilesTable.status}='approved')`,
    total: count(),
    pending: sql<number>`count(*) filter (where ${driverProfilesTable.status}='pending')`,
  }).from(driverProfilesTable);

  const [rstLive] = await db.select({
    open: sql<number>`count(*) filter (where ${restaurantsTable.isOpen}=true and ${restaurantsTable.status}='approved')`,
    total: sql<number>`count(*) filter (where ${restaurantsTable.status}='approved')`,
    pending: sql<number>`count(*) filter (where ${restaurantsTable.status}='pending')`,
  }).from(restaurantsTable);

  const [fraudLive] = await db.select({
    open: sql<number>`count(*) filter (where ${fraudFlagsTable.isResolved}=false)`,
  }).from(fraudFlagsTable);

  const [disputeLive] = await db.select({
    open: sql<number>`count(*) filter (where ${disputesTable.status} in ('open','under_review'))`,
  }).from(disputesTable);

  // ── Dispatch stats (today) ──
  const [dispatchStats] = await db.select({
    totalAttempts: sql<number>`count(*) filter (where ${dispatchAttemptsTable.attemptedAt} >= ${today})`,
    noDriverCount: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'no_driver' and ${dispatchAttemptsTable.attemptedAt} >= ${today})`,
    rejectedCount: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'rejected' and ${dispatchAttemptsTable.attemptedAt} >= ${today})`,
    acceptedCount: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'accepted' and ${dispatchAttemptsTable.attemptedAt} >= ${today})`,
    timeoutCount: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'timeout' and ${dispatchAttemptsTable.attemptedAt} >= ${today})`,
  }).from(dispatchAttemptsTable);

  // ── Confirmation stats (today) ──
  const [confStats] = await db.select({
    confirmed: sql<number>`count(*) filter (where ${deliveryConfirmationsTable.result}='confirmed' and ${deliveryConfirmationsTable.createdAt}>=${today})`,
    needsCorrection: sql<number>`count(*) filter (where ${deliveryConfirmationsTable.result}='needs_correction' and ${deliveryConfirmationsTable.createdAt}>=${today})`,
    failed: sql<number>`count(*) filter (where ${deliveryConfirmationsTable.result}='failed' and ${deliveryConfirmationsTable.createdAt}>=${today})`,
  }).from(deliveryConfirmationsTable);

  // ── Critical orders (stuck/problematic) ──
  const criticalOrders = await db.select({
    id: ordersTable.id,
    orderNumber: ordersTable.orderNumber,
    status: ordersTable.status,
    createdAt: ordersTable.createdAt,
    updatedAt: ordersTable.updatedAt,
    restaurantName: restaurantsTable.name,
    total: ordersTable.total,
    deliveryAddress: ordersTable.deliveryAddress,
  }).from(ordersTable)
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .where(sql`${ordersTable.status} in ('needs_update','confirmation_failed','pending_dispatch','dispatching_driver','awaiting_customer_confirmation')`)
    .orderBy(ordersTable.createdAt)
    .limit(15);

  // ── Activity feed (recent status changes) ──
  const activityFeed = await db.select({
    id: orderStatusHistoryTable.id,
    orderId: orderStatusHistoryTable.orderId,
    status: orderStatusHistoryTable.status,
    note: orderStatusHistoryTable.note,
    createdAt: orderStatusHistoryTable.createdAt,
    orderNumber: ordersTable.orderNumber,
  }).from(orderStatusHistoryTable)
    .leftJoin(ordersTable, eq(orderStatusHistoryTable.orderId, ordersTable.id))
    .orderBy(desc(orderStatusHistoryTable.createdAt))
    .limit(20);

  // ── Driver performance snapshot ──
  const driverPerformance = await db.select({
    id: driverProfilesTable.id,
    name: usersTable.name,
    deliveries: driverProfilesTable.totalDeliveries,
    rating: driverProfilesTable.avgRating,
    isOnline: driverProfilesTable.isOnline,
    status: driverProfilesTable.status,
    earningsTotal: driverProfilesTable.earningsTotal,
  }).from(driverProfilesTable)
    .leftJoin(usersTable, eq(driverProfilesTable.userId, usersTable.id))
    .where(eq(driverProfilesTable.status, "approved"))
    .orderBy(desc(driverProfilesTable.totalDeliveries))
    .limit(8);

  // ── Restaurant reliability ──
  const restaurantReliability = await db.select({
    id: restaurantsTable.id,
    name: restaurantsTable.name,
    isOpen: restaurantsTable.isOpen,
    status: restaurantsTable.status,
    totalOrders: sql<number>`count(${ordersTable.id})`,
    deliveredOrders: sql<number>`count(*) filter (where ${ordersTable.status}='delivered')`,
    cancelledOrders: sql<number>`count(*) filter (where ${ordersTable.status}='cancelled')`,
  }).from(restaurantsTable)
    .leftJoin(ordersTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .where(eq(restaurantsTable.status, "approved"))
    .groupBy(restaurantsTable.id, restaurantsTable.name, restaurantsTable.isOpen, restaurantsTable.status)
    .orderBy(sql`count(${ordersTable.id}) desc`)
    .limit(8);

  // ── Customer risk ──
  const customerRisk = await db.select({
    id: customerProfilesTable.id,
    riskScore: customerProfilesTable.riskScore,
    userId: customerProfilesTable.userId,
    name: usersTable.name,
    phone: usersTable.phone,
    orderCount: sql<number>`count(${ordersTable.id})`,
    cancelledCount: sql<number>`count(*) filter (where ${ordersTable.status}='cancelled')`,
  }).from(customerProfilesTable)
    .leftJoin(usersTable, eq(customerProfilesTable.userId, usersTable.id))
    .leftJoin(ordersTable, eq(ordersTable.customerId, customerProfilesTable.userId))
    .where(sql`${customerProfilesTable.riskScore} in ('medium','high')`)
    .groupBy(customerProfilesTable.id, customerProfilesTable.riskScore, customerProfilesTable.userId, usersTable.name, usersTable.phone)
    .orderBy(sql`count(*) filter (where ${ordersTable.status}='cancelled') desc`)
    .limit(8);

  // ── Finance snapshot ──
  const [finance] = await db.select({
    revenueToday: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' and ${ordersTable.createdAt}>=${today} then ${ordersTable.total}::numeric else 0 end),0)`,
    revenueTotal: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' then ${ordersTable.total}::numeric else 0 end),0)`,
    codOrders: sql<number>`count(*) filter (where ${ordersTable.paymentMethod}='cash_on_delivery' and ${ordersTable.status}='delivered')`,
    onlineOrders: sql<number>`count(*) filter (where ${ordersTable.paymentMethod}='online' and ${ordersTable.status}='delivered')`,
    pendingPayments: sql<number>`count(*) filter (where ${ordersTable.paymentStatus}='pending' and ${ordersTable.status} not in ('cancelled','failed'))`,
    commissionsToday: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' and ${ordersTable.createdAt}>=${today} then ${ordersTable.subtotal}::numeric*0.12 else 0 end),0)`,
    commissionsTotal: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' then ${ordersTable.subtotal}::numeric*0.12 else 0 end),0)`,
    deliveryFeesTotal: sql<number>`coalesce(sum(case when ${ordersTable.status}='delivered' then ${ordersTable.deliveryFee}::numeric else 0 end),0)`,
  }).from(ordersTable);

  const criticalAlerts = (
    Number(liveOps?.needsUpdate ?? 0) +
    Number(liveOps?.confirmationFailed ?? 0) +
    Number(dispatchStats?.noDriverCount ?? 0) +
    Number(fraudLive?.open ?? 0) +
    Number(disputeLive?.open ?? 0)
  );

  const acceptanceRate = Number(dispatchStats?.totalAttempts ?? 0) > 0
    ? Math.round(Number(dispatchStats?.acceptedCount ?? 0) / Number(dispatchStats?.totalAttempts ?? 1) * 100)
    : 0;

  res.json({
    liveOps: {
      activeOrders: Number(liveOps?.activeOrders ?? 0),
      pendingDispatch: Number(liveOps?.pendingDispatch ?? 0),
      awaitingConfirmation: Number(liveOps?.awaitingConfirmation ?? 0),
      needsUpdate: Number(liveOps?.needsUpdate ?? 0),
      confirmationFailed: Number(liveOps?.confirmationFailed ?? 0),
      preparing: Number(liveOps?.preparing ?? 0),
      readyPickup: Number(liveOps?.readyPickup ?? 0),
      deliveredToday: Number(liveOps?.deliveredToday ?? 0),
      cancelledToday: Number(liveOps?.cancelledToday ?? 0),
      revenueToday: Math.round(Number(liveOps?.revenueToday ?? 0)),
      commissionsToday: Math.round(Number(liveOps?.commissionsToday ?? 0)),
      onlineDrivers: Number(drvLive?.online ?? 0),
      totalDrivers: Number(drvLive?.total ?? 0),
      pendingDriverApprovals: Number(drvLive?.pending ?? 0),
      openRestaurants: Number(rstLive?.open ?? 0),
      totalRestaurants: Number(rstLive?.total ?? 0),
      pendingRestaurantApprovals: Number(rstLive?.pending ?? 0),
      openFraudFlags: Number(fraudLive?.open ?? 0),
      openDisputes: Number(disputeLive?.open ?? 0),
      criticalAlerts,
    },
    dispatch: {
      pending: Number(liveOps?.pendingDispatch ?? 0),
      totalAttempts: Number(dispatchStats?.totalAttempts ?? 0),
      accepted: Number(dispatchStats?.acceptedCount ?? 0),
      rejected: Number(dispatchStats?.rejectedCount ?? 0),
      timeout: Number(dispatchStats?.timeoutCount ?? 0),
      noDriver: Number(dispatchStats?.noDriverCount ?? 0),
      acceptanceRate,
    },
    confirmation: {
      awaiting: Number(liveOps?.awaitingConfirmation ?? 0),
      needsUpdate: Number(liveOps?.needsUpdate ?? 0),
      failed: Number(liveOps?.confirmationFailed ?? 0),
      confirmedToday: Number(confStats?.confirmed ?? 0),
      needsCorrectionToday: Number(confStats?.needsCorrection ?? 0),
      failedToday: Number(confStats?.failed ?? 0),
    },
    criticalOrders: criticalOrders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      restaurantName: o.restaurantName ?? "—",
      total: Math.round(Number(o.total ?? 0)),
      deliveryAddress: o.deliveryAddress,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      minutesAgo: Math.round((now.getTime() - new Date(o.createdAt!).getTime()) / 60000),
    })),
    activityFeed: activityFeed.map(a => ({
      id: a.id,
      orderId: a.orderId,
      orderNumber: a.orderNumber ?? `#${a.orderId}`,
      status: a.status,
      note: a.note,
      createdAt: a.createdAt,
    })),
    driverPerformance: driverPerformance.map(d => ({
      id: d.id,
      name: d.name ?? "—",
      deliveries: Number(d.deliveries ?? 0),
      rating: Number(d.rating ?? 0),
      isOnline: d.isOnline,
      earnings: Math.round(Number(d.earningsTotal ?? 0)),
    })),
    restaurantReliability: restaurantReliability.map(r => ({
      id: r.id,
      name: r.name ?? "—",
      isOpen: r.isOpen,
      totalOrders: Number(r.totalOrders ?? 0),
      deliveredOrders: Number(r.deliveredOrders ?? 0),
      cancelledOrders: Number(r.cancelledOrders ?? 0),
      deliveryRate: Number(r.totalOrders) > 0
        ? Math.round(Number(r.deliveredOrders) / Number(r.totalOrders) * 100)
        : 0,
    })),
    customerRisk: customerRisk.map(c => ({
      id: c.id,
      name: c.name ?? "Client anonyme",
      phone: c.phone,
      riskScore: c.riskScore,
      orderCount: Number(c.orderCount ?? 0),
      cancelledCount: Number(c.cancelledCount ?? 0),
    })),
    finance: {
      revenueToday: Math.round(Number(finance?.revenueToday ?? 0)),
      revenueTotal: Math.round(Number(finance?.revenueTotal ?? 0)),
      commissionsToday: Math.round(Number(finance?.commissionsToday ?? 0)),
      commissionsTotal: Math.round(Number(finance?.commissionsTotal ?? 0)),
      deliveryFeesTotal: Math.round(Number(finance?.deliveryFeesTotal ?? 0)),
      codOrders: Number(finance?.codOrders ?? 0),
      onlineOrders: Number(finance?.onlineOrders ?? 0),
      pendingPayments: Number(finance?.pendingPayments ?? 0),
    },
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

// ADMIN DISPATCH CENTER — Comprehensive dashboard
router.get("/admin/dispatch/center", authenticate, requireRole("admin"), async (_req, res): Promise<void> => {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

  // ── KPIs ──
  const [orderKpi] = await db.select({
    pending: sql<number>`count(*) filter (where ${ordersTable.status} = 'pending_dispatch')`,
    dispatching: sql<number>`count(*) filter (where ${ordersTable.status} = 'dispatching_driver')`,
    pendingLong: sql<number>`count(*) filter (where ${ordersTable.status} in ('pending_dispatch','dispatching_driver') and ${ordersTable.createdAt} < ${thirtyMinAgo})`,
  }).from(ordersTable);

  const [attemptKpi] = await db.select({
    totalAttempts: sql<number>`count(*) filter (where ${dispatchAttemptsTable.attemptedAt} >= ${today})`,
    acceptedToday: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'accepted' and ${dispatchAttemptsTable.attemptedAt} >= ${today})`,
    rejectedToday: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'rejected' and ${dispatchAttemptsTable.attemptedAt} >= ${today})`,
    timeoutToday: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'timeout' and ${dispatchAttemptsTable.attemptedAt} >= ${today})`,
    noDriverToday: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'no_driver' and ${dispatchAttemptsTable.attemptedAt} >= ${today})`,
    pendingAttempts: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'pending' and ${dispatchAttemptsTable.expiresAt} > now())`,
  }).from(dispatchAttemptsTable);

  const [driverKpi] = await db.select({
    online: sql<number>`count(*) filter (where ${driverProfilesTable.isOnline} = true and ${driverProfilesTable.status} = 'approved')`,
    total: sql<number>`count(*) filter (where ${driverProfilesTable.status} = 'approved')`,
  }).from(driverProfilesTable);

  // ── Orders waiting for dispatch ──
  const waitingOrders = await db.select({
    id: ordersTable.id,
    orderNumber: ordersTable.orderNumber,
    status: ordersTable.status,
    total: ordersTable.total,
    subtotal: ordersTable.subtotal,
    deliveryAddress: ordersTable.deliveryAddress,
    createdAt: ordersTable.createdAt,
    updatedAt: ordersTable.updatedAt,
    zoneId: ordersTable.zoneId,
    restaurantName: restaurantsTable.name,
    restaurantId: ordersTable.restaurantId,
    zoneName: zonesTable.name,
    cityName: citiesTable.name,
    attemptCount: sql<number>`(select count(*) from dispatch_attempts da where da.order_id = ${ordersTable.id})`,
  }).from(ordersTable)
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .leftJoin(zonesTable, eq(ordersTable.zoneId, zonesTable.id))
    .leftJoin(citiesTable, eq(zonesTable.cityId, citiesTable.id))
    .where(sql`${ordersTable.status} in ('pending_dispatch','dispatching_driver')`)
    .orderBy(ordersTable.createdAt)
    .limit(50);

  // ── Active dispatch attempts (pending result, not yet expired) ──
  const activeAttempts = await db.select({
    id: dispatchAttemptsTable.id,
    orderId: dispatchAttemptsTable.orderId,
    driverId: dispatchAttemptsTable.driverId,
    result: dispatchAttemptsTable.result,
    attemptedAt: dispatchAttemptsTable.attemptedAt,
    expiresAt: dispatchAttemptsTable.expiresAt,
    respondedAt: dispatchAttemptsTable.respondedAt,
    driverName: usersTable.name,
    orderNumber: ordersTable.orderNumber,
    restaurantName: restaurantsTable.name,
    driverAcceptanceRate: driverProfilesTable.acceptanceRate,
    driverRating: driverProfilesTable.avgRating,
    driverOnline: driverProfilesTable.isOnline,
  }).from(dispatchAttemptsTable)
    .leftJoin(usersTable, eq(dispatchAttemptsTable.driverId, usersTable.id))
    .leftJoin(ordersTable, eq(dispatchAttemptsTable.orderId, ordersTable.id))
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .leftJoin(driverProfilesTable, eq(driverProfilesTable.userId, dispatchAttemptsTable.driverId))
    .where(sql`${dispatchAttemptsTable.result} = 'pending' and ${dispatchAttemptsTable.expiresAt} > now()`)
    .orderBy(desc(dispatchAttemptsTable.attemptedAt))
    .limit(30);

  // ── Recent driver responses (last hour) ──
  const recentResponses = await db.select({
    id: dispatchAttemptsTable.id,
    orderId: dispatchAttemptsTable.orderId,
    driverId: dispatchAttemptsTable.driverId,
    result: dispatchAttemptsTable.result,
    attemptedAt: dispatchAttemptsTable.attemptedAt,
    respondedAt: dispatchAttemptsTable.respondedAt,
    driverName: usersTable.name,
    orderNumber: ordersTable.orderNumber,
    restaurantName: restaurantsTable.name,
    driverAcceptanceRate: driverProfilesTable.acceptanceRate,
    driverRating: driverProfilesTable.avgRating,
    zoneName: zonesTable.name,
  }).from(dispatchAttemptsTable)
    .leftJoin(usersTable, eq(dispatchAttemptsTable.driverId, usersTable.id))
    .leftJoin(ordersTable, eq(dispatchAttemptsTable.orderId, ordersTable.id))
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .leftJoin(driverProfilesTable, eq(driverProfilesTable.userId, dispatchAttemptsTable.driverId))
    .leftJoin(zonesTable, eq(ordersTable.zoneId, zonesTable.id))
    .where(sql`${dispatchAttemptsTable.result} != 'pending' and ${dispatchAttemptsTable.attemptedAt} >= ${oneHourAgo}`)
    .orderBy(desc(dispatchAttemptsTable.attemptedAt))
    .limit(40);

  // ── Failed dispatches (orders stuck with no driver, or many timeouts) ──
  const failedOrders = await db.select({
    id: ordersTable.id,
    orderNumber: ordersTable.orderNumber,
    status: ordersTable.status,
    total: ordersTable.total,
    createdAt: ordersTable.createdAt,
    deliveryAddress: ordersTable.deliveryAddress,
    restaurantName: restaurantsTable.name,
    zoneName: zonesTable.name,
    cityName: citiesTable.name,
    attemptCount: sql<number>`(select count(*) from dispatch_attempts da where da.order_id = ${ordersTable.id})`,
    timeoutCount: sql<number>`(select count(*) from dispatch_attempts da where da.order_id = ${ordersTable.id} and da.result = 'timeout')`,
    rejectedCount: sql<number>`(select count(*) from dispatch_attempts da where da.order_id = ${ordersTable.id} and da.result = 'rejected')`,
  }).from(ordersTable)
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .leftJoin(zonesTable, eq(ordersTable.zoneId, zonesTable.id))
    .leftJoin(citiesTable, eq(zonesTable.cityId, citiesTable.id))
    .where(sql`${ordersTable.status} in ('pending_dispatch','dispatching_driver') and ${ordersTable.createdAt} < ${thirtyMinAgo}`)
    .orderBy(ordersTable.createdAt)
    .limit(20);

  // ── Zone pressure (orders per zone) ──
  const zonePressure = await db.select({
    zoneId: zonesTable.id,
    zoneName: zonesTable.name,
    cityName: citiesTable.name,
    waitingOrders: sql<number>`count(*) filter (where ${ordersTable.status} in ('pending_dispatch','dispatching_driver'))`,
    totalOrders: sql<number>`count(*) filter (where ${ordersTable.createdAt} >= ${today})`,
    onlineDrivers: sql<number>`(select count(*) from driver_profiles dp where dp.is_online = true and dp.status = 'approved' and dp.current_zone_id = ${zonesTable.id})`,
  }).from(zonesTable)
    .leftJoin(citiesTable, eq(zonesTable.cityId, citiesTable.id))
    .leftJoin(ordersTable, eq(ordersTable.zoneId, zonesTable.id))
    .where(eq(zonesTable.isActive, true))
    .groupBy(zonesTable.id, zonesTable.name, citiesTable.name)
    .orderBy(desc(sql`count(*) filter (where ${ordersTable.status} in ('pending_dispatch','dispatching_driver'))`))
    .limit(15);

  // ── Activity feed (recent dispatch events) ──
  const activityFeed = await db.select({
    id: dispatchAttemptsTable.id,
    orderId: dispatchAttemptsTable.orderId,
    result: dispatchAttemptsTable.result,
    attemptedAt: dispatchAttemptsTable.attemptedAt,
    respondedAt: dispatchAttemptsTable.respondedAt,
    driverName: usersTable.name,
    orderNumber: ordersTable.orderNumber,
    restaurantName: restaurantsTable.name,
  }).from(dispatchAttemptsTable)
    .leftJoin(usersTable, eq(dispatchAttemptsTable.driverId, usersTable.id))
    .leftJoin(ordersTable, eq(dispatchAttemptsTable.orderId, ordersTable.id))
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .where(sql`${dispatchAttemptsTable.attemptedAt} >= ${oneHourAgo}`)
    .orderBy(desc(dispatchAttemptsTable.attemptedAt))
    .limit(30);

  // ── Online drivers (for manual assignment) ──
  const onlineDrivers = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    phone: usersTable.phone,
    acceptanceRate: driverProfilesTable.acceptanceRate,
    avgRating: driverProfilesTable.avgRating,
    totalDeliveries: driverProfilesTable.totalDeliveries,
    currentZoneId: driverProfilesTable.currentZoneId,
    zoneName: zonesTable.name,
    isOnline: driverProfilesTable.isOnline,
  }).from(driverProfilesTable)
    .leftJoin(usersTable, eq(driverProfilesTable.userId, usersTable.id))
    .leftJoin(zonesTable, eq(driverProfilesTable.currentZoneId, zonesTable.id))
    .where(sql`${driverProfilesTable.isOnline} = true and ${driverProfilesTable.status} = 'approved'`)
    .orderBy(desc(driverProfilesTable.avgRating))
    .limit(50);

  // ── Analytics: hourly dispatch attempts (last 12h) ──
  const hourlyAttempts = await db.select({
    hour: sql<number>`extract(hour from ${dispatchAttemptsTable.attemptedAt})`,
    accepted: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'accepted')`,
    rejected: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'rejected')`,
    timeout: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'timeout')`,
    noDriver: sql<number>`count(*) filter (where ${dispatchAttemptsTable.result} = 'no_driver')`,
  }).from(dispatchAttemptsTable)
    .where(sql`${dispatchAttemptsTable.attemptedAt} >= ${today}`)
    .groupBy(sql`extract(hour from ${dispatchAttemptsTable.attemptedAt})`)
    .orderBy(sql`extract(hour from ${dispatchAttemptsTable.attemptedAt})`);

  const totalAttempts = Number(attemptKpi.totalAttempts ?? 0);
  const accepted = Number(attemptKpi.acceptedToday ?? 0);
  const successRate = totalAttempts > 0 ? Math.round(accepted / totalAttempts * 100) : 0;
  const timeoutRate = totalAttempts > 0 ? Math.round(Number(attemptKpi.timeoutToday ?? 0) / totalAttempts * 100) : 0;

  res.json({
    kpis: {
      pendingDispatch: Number(orderKpi.pending ?? 0),
      dispatchingDriver: Number(orderKpi.dispatching ?? 0),
      pendingLong: Number(orderKpi.pendingLong ?? 0),
      activeAttempts: Number(attemptKpi.pendingAttempts ?? 0),
      totalAttempts,
      successRate,
      timeoutRate,
      noDriverToday: Number(attemptKpi.noDriverToday ?? 0),
      onlineDrivers: Number(driverKpi.online ?? 0),
      totalDrivers: Number(driverKpi.total ?? 0),
    },
    waitingOrders: waitingOrders.map(o => ({
      id: o.id, orderNumber: o.orderNumber, status: o.status,
      total: Number(o.total), deliveryAddress: o.deliveryAddress,
      createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(),
      restaurantName: o.restaurantName ?? "Inconnu", restaurantId: o.restaurantId,
      zoneName: o.zoneName ?? null, cityName: o.cityName ?? null,
      attemptCount: Number(o.attemptCount ?? 0),
    })),
    activeAttempts: activeAttempts.map(a => ({
      id: a.id, orderId: a.orderId, driverId: a.driverId,
      result: a.result, driverName: a.driverName ?? "Inconnu",
      orderNumber: a.orderNumber ?? "", restaurantName: a.restaurantName ?? "",
      attemptedAt: a.attemptedAt.toISOString(),
      expiresAt: a.expiresAt?.toISOString() ?? null,
      respondedAt: a.respondedAt?.toISOString() ?? null,
      acceptanceRate: Number(a.driverAcceptanceRate ?? 0),
      avgRating: Number(a.driverRating ?? 0),
      isOnline: a.driverOnline ?? false,
    })),
    recentResponses: recentResponses.map(r => ({
      id: r.id, orderId: r.orderId, driverId: r.driverId,
      result: r.result, driverName: r.driverName ?? "Inconnu",
      orderNumber: r.orderNumber ?? "", restaurantName: r.restaurantName ?? "",
      attemptedAt: r.attemptedAt.toISOString(),
      respondedAt: r.respondedAt?.toISOString() ?? null,
      acceptanceRate: Number(r.driverAcceptanceRate ?? 0),
      avgRating: Number(r.driverRating ?? 0),
      zoneName: r.zoneName ?? null,
    })),
    failedOrders: failedOrders.map(o => ({
      id: o.id, orderNumber: o.orderNumber, status: o.status,
      total: Number(o.total), deliveryAddress: o.deliveryAddress,
      createdAt: o.createdAt.toISOString(), restaurantName: o.restaurantName ?? "Inconnu",
      zoneName: o.zoneName ?? null, cityName: o.cityName ?? null,
      attemptCount: Number(o.attemptCount ?? 0),
      timeoutCount: Number(o.timeoutCount ?? 0),
      rejectedCount: Number(o.rejectedCount ?? 0),
    })),
    zonePressure: zonePressure.map(z => ({
      zoneId: z.zoneId, zoneName: z.zoneName, cityName: z.cityName ?? null,
      waitingOrders: Number(z.waitingOrders ?? 0),
      totalOrders: Number(z.totalOrders ?? 0),
      onlineDrivers: Number(z.onlineDrivers ?? 0),
    })).filter(z => z.waitingOrders > 0 || z.totalOrders > 0),
    activityFeed: activityFeed.map(a => ({
      id: a.id, orderId: a.orderId, result: a.result,
      driverName: a.driverName ?? "Inconnu", orderNumber: a.orderNumber ?? "",
      restaurantName: a.restaurantName ?? "",
      attemptedAt: a.attemptedAt.toISOString(),
      respondedAt: a.respondedAt?.toISOString() ?? null,
    })),
    onlineDrivers: onlineDrivers.map(d => ({
      id: d.id, name: d.name ?? "Inconnu", phone: d.phone ?? null,
      acceptanceRate: Number(d.acceptanceRate ?? 0),
      avgRating: Number(d.avgRating ?? 0),
      totalDeliveries: d.totalDeliveries ?? 0,
      currentZoneId: d.currentZoneId ?? null,
      zoneName: d.zoneName ?? null, isOnline: d.isOnline,
    })),
    analytics: {
      today: {
        total: totalAttempts,
        accepted: Number(attemptKpi.acceptedToday ?? 0),
        rejected: Number(attemptKpi.rejectedToday ?? 0),
        timeout: Number(attemptKpi.timeoutToday ?? 0),
        noDriver: Number(attemptKpi.noDriverToday ?? 0),
        successRate, timeoutRate,
      },
      hourly: hourlyAttempts.map(h => ({
        hour: Number(h.hour),
        accepted: Number(h.accepted ?? 0),
        rejected: Number(h.rejected ?? 0),
        timeout: Number(h.timeout ?? 0),
        noDriver: Number(h.noDriver ?? 0),
      })),
    },
  });
});

// ADMIN ENRICHED ORDER DETAIL
router.get("/admin/orders/:orderId/detail", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const orderId = parseInt(Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId, 10);

  const [orderRow] = await db.select({
    order: ordersTable,
    restaurantName: restaurantsTable.name,
    restaurantPhone: restaurantsTable.phone,
    restaurantAddress: restaurantsTable.address,
    restaurantIsOpen: restaurantsTable.isOpen,
    restaurantEstimatedPrepTime: restaurantsTable.estimatedPrepTime,
    restaurantId: restaurantsTable.id,
    driverName: usersTable.name,
  })
    .from(ordersTable)
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .leftJoin(usersTable, eq(ordersTable.driverId, usersTable.id))
    .where(eq(ordersTable.id, orderId));

  if (!orderRow) { res.status(404).json({ error: "Order not found" }); return; }

  // Customer info
  const [customerUser] = await db.select().from(usersTable).where(eq(usersTable.id, orderRow.order.customerId));
  const [customerProfile] = await db.select().from(customerProfilesTable).where(eq(customerProfilesTable.userId, orderRow.order.customerId));

  // Driver profile
  let driverProfile = null;
  let driverUser = null;
  if (orderRow.order.driverId) {
    [driverUser] = await db.select().from(usersTable).where(eq(usersTable.id, orderRow.order.driverId));
    [driverProfile] = await db.select().from(driverProfilesTable).where(eq(driverProfilesTable.userId, orderRow.order.driverId));
  }

  // Order items
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));

  // Status history
  const statusHistory = await db.select().from(orderStatusHistoryTable)
    .where(eq(orderStatusHistoryTable.orderId, orderId))
    .orderBy(orderStatusHistoryTable.createdAt);

  // Dispatch attempts with driver names
  const dispatchRows = await db.select({
    attempt: dispatchAttemptsTable,
    driverName: usersTable.name,
  })
    .from(dispatchAttemptsTable)
    .leftJoin(usersTable, eq(dispatchAttemptsTable.driverId, usersTable.id))
    .where(eq(dispatchAttemptsTable.orderId, orderId))
    .orderBy(dispatchAttemptsTable.attemptedAt);

  // Delivery confirmations
  const confirmations = await db.select({
    confirmation: deliveryConfirmationsTable,
    driverName: usersTable.name,
  })
    .from(deliveryConfirmationsTable)
    .leftJoin(usersTable, eq(deliveryConfirmationsTable.driverId, usersTable.id))
    .where(eq(deliveryConfirmationsTable.orderId, orderId));

  // QR token
  const [qr] = await db.select().from(qrDeliveryTokensTable).where(eq(qrDeliveryTokensTable.orderId, orderId));

  // Fraud flags on customer and on this order
  const fraudFlags = await db.select({
    flag: fraudFlagsTable,
    resolverName: usersTable.name,
  })
    .from(fraudFlagsTable)
    .leftJoin(usersTable, eq(fraudFlagsTable.resolvedBy, usersTable.id))
    .where(sql`${fraudFlagsTable.userId} = ${orderRow.order.customerId} OR ${fraudFlagsTable.relatedOrderId} = ${orderId}`);

  // Disputes on this order
  const disputes = await db.select().from(disputesTable).where(eq(disputesTable.orderId, orderId));

  // Payment
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, orderId));

  // Customer order count
  const [{ orderCount }] = await db.select({ orderCount: count() }).from(ordersTable)
    .where(eq(ordersTable.customerId, orderRow.order.customerId));

  // Restaurant avg rating
  let restaurantAvgRating = 0;
  if (orderRow.restaurantId) {
    const [ratingRow] = await db.select({ avgRating: avg(ratingsTable.rating) })
      .from(ratingsTable)
      .where(and(eq(ratingsTable.targetType, "restaurant"), eq(ratingsTable.targetId, orderRow.restaurantId)));
    restaurantAvgRating = Number(ratingRow?.avgRating ?? 0);
  }

  res.json({
    id: orderRow.order.id,
    orderNumber: orderRow.order.orderNumber,
    status: orderRow.order.status,
    paymentStatus: orderRow.order.paymentStatus,
    paymentMethod: orderRow.order.paymentMethod,
    subtotal: Number(orderRow.order.subtotal),
    deliveryFee: Number(orderRow.order.deliveryFee),
    total: Number(orderRow.order.total),
    discount: Number(orderRow.order.discount ?? 0),
    deliveryAddress: orderRow.order.deliveryAddress,
    deliveryPhone: orderRow.order.deliveryPhone,
    deliveryLandmark: orderRow.order.deliveryLandmark,
    deliveryFloor: orderRow.order.deliveryFloor,
    deliveryInstructions: orderRow.order.deliveryInstructions,
    specialInstructions: orderRow.order.specialInstructions,
    cancellationReason: orderRow.order.cancellationReason,
    createdAt: orderRow.order.createdAt.toISOString(),
    updatedAt: orderRow.order.updatedAt.toISOString(),
    customer: {
      id: customerUser?.id,
      name: customerUser?.name ?? "Inconnu",
      email: customerUser?.email ?? "",
      phone: customerUser?.phone ?? null,
      orderCount: Number(orderCount),
      riskScore: customerProfile?.riskScore ?? "low",
      cancellationCount: customerProfile?.cancellationCount ?? 0,
      unreachableCount: customerProfile?.unreachableCount ?? 0,
    },
    restaurant: {
      id: orderRow.order.restaurantId,
      name: orderRow.restaurantName ?? "Inconnu",
      phone: orderRow.restaurantPhone ?? null,
      address: orderRow.restaurantAddress ?? null,
      isOpen: orderRow.restaurantIsOpen ?? false,
      avgRating: restaurantAvgRating,
      estimatedPrepTime: orderRow.restaurantEstimatedPrepTime ?? null,
    },
    driver: orderRow.order.driverId ? {
      id: orderRow.order.driverId,
      name: driverUser?.name ?? orderRow.driverName ?? "Inconnu",
      phone: driverUser?.phone ?? null,
      acceptanceRate: Number(driverProfile?.acceptanceRate ?? 0),
      totalDeliveries: driverProfile?.totalDeliveries ?? 0,
      avgRating: Number(driverProfile?.avgRating ?? 0),
      isOnline: driverProfile?.isOnline ?? false,
      status: driverProfile?.status ?? "pending",
    } : null,
    items: items.map(i => ({
      id: i.id,
      productName: i.productName,
      quantity: i.quantity,
      price: Number(i.price),
      notes: i.notes,
    })),
    statusHistory: statusHistory.map(h => ({
      id: h.id,
      status: h.status,
      note: h.note,
      createdBy: h.createdBy,
      createdAt: h.createdAt.toISOString(),
    })),
    dispatchAttempts: dispatchRows.map(r => ({
      id: r.attempt.id,
      driverName: r.driverName ?? "Inconnu",
      driverId: r.attempt.driverId,
      result: r.attempt.result,
      attemptedAt: r.attempt.attemptedAt.toISOString(),
      respondedAt: r.attempt.respondedAt?.toISOString() ?? null,
      expiresAt: r.attempt.expiresAt?.toISOString() ?? null,
    })),
    confirmations: confirmations.map(c => ({
      id: c.confirmation.id,
      driverName: c.driverName ?? "Inconnu",
      result: c.confirmation.result,
      createdAt: c.confirmation.createdAt.toISOString(),
    })),
    qr: qr ? {
      token: qr.token,
      isVerified: qr.isVerified,
      verifiedAt: qr.verifiedAt?.toISOString() ?? null,
      expiresAt: qr.expiresAt?.toISOString() ?? null,
      invalidAttempts: qr.invalidAttempts ?? 0,
    } : null,
    fraudFlags: fraudFlags.map(f => ({
      id: f.flag.id,
      type: f.flag.type,
      severity: f.flag.severity,
      description: f.flag.description,
      isResolved: f.flag.isResolved,
      resolvedBy: f.resolverName ?? null,
      resolvedAt: f.flag.resolvedAt?.toISOString() ?? null,
      createdAt: f.flag.createdAt.toISOString(),
      relatedOrderId: f.flag.relatedOrderId,
    })),
    disputes: disputes.map(d => ({
      id: d.id,
      type: d.type,
      status: d.status,
      description: d.description,
      resolution: d.resolution,
      createdAt: d.createdAt.toISOString(),
    })),
    payment: payment ? {
      id: payment.id,
      amount: Number(payment.amount),
      status: payment.status,
      method: payment.method,
      transactionId: payment.transactionId,
      createdAt: payment.createdAt.toISOString(),
    } : null,
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
router.delete("/admin/customers/:customerId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
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
router.delete("/admin/restaurants/:restaurantId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, id));
  if (!restaurant) { res.status(404).json({ error: "Not found" }); return; }
  const uid = restaurant.userId;
  try {
    // 1. Nullify restaurant_id on orders (column is nullable)
    await db.execute(sql`UPDATE orders SET restaurant_id = NULL WHERE restaurant_id = ${id}`);
    // 2. Delete ratings targeting this restaurant
    await db.execute(sql`DELETE FROM ratings WHERE target_type = 'restaurant' AND target_id = ${id}`);
    // 3. Delete products then menu categories
    await db.execute(sql`DELETE FROM products WHERE category_id IN (SELECT id FROM menu_categories WHERE restaurant_id = ${id})`);
    await db.execute(sql`DELETE FROM menu_categories WHERE restaurant_id = ${id}`);
    // 4. Delete the restaurant row itself
    await db.execute(sql`DELETE FROM restaurants WHERE id = ${id}`);
    // 5. Delete everything tied to the restaurant's user account
    await db.execute(sql`DELETE FROM notifications WHERE user_id = ${uid}`);
    await db.execute(sql`DELETE FROM addresses WHERE user_id = ${uid}`);
    await db.execute(sql`UPDATE fraud_flags SET resolved_by = NULL WHERE resolved_by = ${uid}`);
    await db.execute(sql`DELETE FROM fraud_flags WHERE user_id = ${uid}`);
    await db.execute(sql`DELETE FROM users WHERE id = ${uid}`);
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

// COMMISSION - get all commission data
router.get("/admin/commission", authenticate, requireRole("admin"), async (_req, res): Promise<void> => {
  // Driver commissions: 12% of earningsTotal
  const drivers = await db.select({
    profile: driverProfilesTable,
    name: usersTable.name,
    email: usersTable.email,
  }).from(driverProfilesTable)
    .leftJoin(usersTable, eq(driverProfilesTable.userId, usersTable.id))
    .where(eq(driverProfilesTable.status, "approved"))
    .orderBy(desc(driverProfilesTable.earningsTotal));

  // Restaurant commissions: 12% of delivered order subtotals since last reset
  const restaurants = await db.select().from(restaurantsTable)
    .where(eq(restaurantsTable.status, "approved"));

  const restaurantCommissions = await Promise.all(restaurants.map(async (r) => {
    const conditions = [
      eq(ordersTable.restaurantId, r.id),
      eq(ordersTable.status, "delivered"),
    ];
    if (r.commissionResetAt) {
      conditions.push(sql`${ordersTable.updatedAt} > ${r.commissionResetAt}`);
    }
    const [row] = await db.select({ total: sum(ordersTable.subtotal) })
      .from(ordersTable)
      .where(and(...conditions));
    const revenue = Number(row?.total ?? 0);
    return { id: r.id, name: r.name, revenue, commission: Math.round(revenue * 0.12), commissionResetAt: r.commissionResetAt };
  }));

  res.json({
    drivers: drivers.map(d => ({
      id: d.profile.id,
      name: d.name,
      email: d.email,
      earningsTotal: Number(d.profile.earningsTotal ?? 0),
      commission: Math.round(Number(d.profile.earningsTotal ?? 0) * 0.12),
      totalDeliveries: d.profile.totalDeliveries,
    })),
    restaurants: restaurantCommissions,
  });
});

// COMMISSION - reset driver earnings to 0
router.post("/admin/drivers/:driverId/reset-earnings", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.driverId, 10);
  const [updated] = await db.update(driverProfilesTable)
    .set({ earningsTotal: "0.00" })
    .where(eq(driverProfilesTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Driver not found" }); return; }
  res.json({ success: true });
});

// COMMISSION - reset restaurant commission (mark as collected)
router.post("/admin/restaurants/:restaurantId/reset-commission", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.restaurantId, 10);
  const [updated] = await db.update(restaurantsTable)
    .set({ commissionResetAt: new Date() })
    .where(eq(restaurantsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Restaurant not found" }); return; }
  res.json({ success: true });
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
