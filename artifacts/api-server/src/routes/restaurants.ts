import { Router } from "express";
import { db } from "@workspace/db";
import { restaurantsTable, restaurantHoursTable, ordersTable, ratingsTable, usersTable } from "@workspace/db";
import { eq, and, avg, count, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth";

const router = Router();

function formatRestaurant(r: any) {
  return {
    ...r,
    commissionRate: r.commissionRate ? Number(r.commissionRate) : null,
    minimumOrder: r.minimumOrder ? Number(r.minimumOrder) : 0,
    freeDeliveryThreshold: r.freeDeliveryThreshold ? Number(r.freeDeliveryThreshold) : null,
    avgRating: r.avgRating ? Number(r.avgRating) : null,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
    updatedAt: r.updatedAt?.toISOString?.() ?? r.updatedAt,
  };
}

router.get("/restaurants", async (req, res): Promise<void> => {
  const { cityId, zoneId, status, search, category } = req.query;
  let query = db.select().from(restaurantsTable).where(eq(restaurantsTable.isDeleted, false));

  const conditions: any[] = [eq(restaurantsTable.isDeleted, false)];
  if (cityId) conditions.push(eq(restaurantsTable.cityId, Number(cityId)));
  if (zoneId) conditions.push(eq(restaurantsTable.zoneId, Number(zoneId)));
  if (status) conditions.push(eq(restaurantsTable.status, status as any));
  if (category) conditions.push(eq(restaurantsTable.category, category as string));

  const restaurants = await db.select().from(restaurantsTable)
    .where(conditions.length > 1 ? and(...conditions) : conditions[0])
    .orderBy(restaurantsTable.createdAt);

  let result = restaurants;
  if (search) {
    const s = (search as string).toLowerCase();
    result = result.filter(r => r.name.toLowerCase().includes(s) || (r.description?.toLowerCase().includes(s)));
  }

  res.json(result.map(formatRestaurant));
});

router.post("/restaurants", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { name, nameAr, description, phone, address, cityId, zoneId, category, estimatedPrepTime } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }

  const [restaurant] = await db.insert(restaurantsTable).values({
    userId: user.id,
    name,
    nameAr: nameAr ?? null,
    description: description ?? null,
    phone: phone ?? null,
    address: address ?? null,
    cityId: cityId ?? null,
    zoneId: zoneId ?? null,
    category: category ?? null,
    estimatedPrepTime: estimatedPrepTime ?? 20,
  }).returning();
  res.status(201).json(formatRestaurant(restaurant));
});

router.get("/restaurants/mine", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const [restaurant] = await db.select().from(restaurantsTable).where(and(eq(restaurantsTable.userId, user.id), eq(restaurantsTable.isDeleted, false)));
  if (!restaurant) { res.status(404).json({ error: "No restaurant found for this account" }); return; }
  res.json(formatRestaurant(restaurant));
});

router.get("/restaurants/:restaurantId", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, id));
  if (!restaurant) { res.status(404).json({ error: "Restaurant not found" }); return; }
  res.json(formatRestaurant(restaurant));
});

router.patch("/restaurants/:restaurantId", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const user = (req as any).user;

  const [existing] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  if (user.role !== "admin" && existing.userId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const updates: any = {};
  const fields = ["name", "nameAr", "description", "logoUrl", "coverUrl", "phone", "address", "cityId", "zoneId", "isOpen", "isPaused", "category", "estimatedPrepTime", "minimumOrder", "freeDeliveryThreshold", "commissionRate", "status"];
  for (const f of fields) {
    if (req.body[f] != null) updates[f] = req.body[f];
  }

  const [restaurant] = await db.update(restaurantsTable).set(updates).where(eq(restaurantsTable.id, id)).returning();
  res.json(formatRestaurant(restaurant));
});

router.post("/restaurants/:restaurantId/approve", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const [restaurant] = await db.update(restaurantsTable).set({ status: "approved" }).where(eq(restaurantsTable.id, id)).returning();
  if (!restaurant) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatRestaurant(restaurant));
});

router.post("/restaurants/:restaurantId/reject", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const [restaurant] = await db.update(restaurantsTable).set({ status: "rejected" }).where(eq(restaurantsTable.id, id)).returning();
  if (!restaurant) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatRestaurant(restaurant));
});

router.post("/restaurants/:restaurantId/toggle-open", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const [existing] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const [restaurant] = await db.update(restaurantsTable).set({ isOpen: !existing.isOpen }).where(eq(restaurantsTable.id, id)).returning();
  res.json(formatRestaurant(restaurant));
});

router.post("/restaurants/:restaurantId/toggle-pause", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const user = (req as any).user;
  const [existing] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (user.role !== "admin" && existing.userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  const [restaurant] = await db.update(restaurantsTable).set({ isPaused: !existing.isPaused }).where(eq(restaurantsTable.id, id)).returning();
  res.json(formatRestaurant(restaurant));
});

router.get("/restaurants/:restaurantId/hours", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const hours = await db.select().from(restaurantHoursTable).where(eq(restaurantHoursTable.restaurantId, id)).orderBy(restaurantHoursTable.dayOfWeek);
  res.json(hours);
});

router.post("/restaurants/:restaurantId/hours", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const { hours } = req.body;
  if (!hours || !Array.isArray(hours)) { res.status(400).json({ error: "Hours array required" }); return; }

  await db.delete(restaurantHoursTable).where(eq(restaurantHoursTable.restaurantId, id));
  const inserted = await db.insert(restaurantHoursTable).values(
    hours.map((h: any) => ({ restaurantId: id, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isOpen: h.isOpen }))
  ).returning();
  res.json(inserted);
});

router.get("/restaurants/:restaurantId/stats", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);

  const [totals] = await db.select({
    totalOrders: count(),
    completedOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'delivered')`,
    cancelledOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'cancelled')`,
    revenue: sql<number>`coalesce(sum(case when ${ordersTable.status} = 'delivered' then ${ordersTable.total}::numeric else 0 end), 0)`,
  }).from(ordersTable).where(eq(ordersTable.restaurantId, id));

  const [ratingData] = await db.select({
    avgRating: avg(ratingsTable.rating),
  }).from(ratingsTable).where(and(eq(ratingsTable.targetType, "restaurant"), eq(ratingsTable.targetId, id)));

  const total = Number(totals?.totalOrders ?? 0);
  const cancelled = Number(totals?.cancelledOrders ?? 0);

  res.json({
    totalOrders: total,
    completedOrders: Number(totals?.completedOrders ?? 0),
    cancelledOrders: cancelled,
    avgRating: ratingData?.avgRating ? Number(ratingData.avgRating) : 0,
    avgPrepTime: 25,
    revenue: Number(totals?.revenue ?? 0),
    cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
  });
});

export default router;
