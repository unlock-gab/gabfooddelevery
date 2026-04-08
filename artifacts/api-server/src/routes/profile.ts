import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, addressesTable, notificationsTable, ratingsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { authenticate } from "../lib/auth";

const router = Router();

router.get("/profile", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    language: user.language ?? "fr",
    riskScore: null,
    createdAt: user.createdAt.toISOString(),
  });
});

router.patch("/profile", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { name, phone, avatarUrl, language } = req.body;
  const updates: any = {};
  if (name != null) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (language != null) updates.language = language;
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone ?? null,
    role: updated.role,
    avatarUrl: updated.avatarUrl ?? null,
    language: updated.language,
    riskScore: null,
    createdAt: updated.createdAt.toISOString(),
  });
});

function formatAddress(a: any) {
  return {
    id: a.id,
    label: a.label ?? "Autre",
    fullAddress: a.fullAddress,
    building: a.building ?? null,
    landmark: a.landmark ?? null,
    floor: a.floor ?? null,
    phone: a.phone ?? null,
    instructions: a.instructions ?? null,
    cityId: a.cityId ?? null,
    zoneId: a.zoneId ?? null,
    isDefault: a.isDefault,
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
  };
}

router.get("/addresses", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const addresses = await db.select().from(addressesTable).where(eq(addressesTable.userId, user.id)).orderBy(desc(addressesTable.createdAt));
  res.json(addresses.map(formatAddress));
});

router.post("/addresses", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { label, fullAddress, building, landmark, floor, phone, instructions, cityId, zoneId, isDefault } = req.body;
  if (!fullAddress) { res.status(400).json({ error: "fullAddress required" }); return; }

  if (isDefault) {
    await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, user.id));
  }

  const [addr] = await db.insert(addressesTable).values({
    userId: user.id,
    label: label ?? "Autre",
    fullAddress,
    building: building ?? null,
    landmark: landmark ?? null,
    floor: floor ?? null,
    phone: phone ?? null,
    instructions: instructions ?? null,
    cityId: cityId ?? null,
    zoneId: zoneId ?? null,
    isDefault: isDefault ?? false,
  }).returning();
  res.status(201).json(formatAddress(addr));
});

router.patch("/addresses/:addressId", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(Array.isArray(req.params.addressId) ? req.params.addressId[0] : req.params.addressId, 10);
  const { label, fullAddress, building, landmark, floor, phone, instructions, cityId, zoneId, isDefault } = req.body;

  const [existing] = await db.select().from(addressesTable).where(and(eq(addressesTable.id, id), eq(addressesTable.userId, user.id)));
  if (!existing) { res.status(404).json({ error: "Address not found" }); return; }

  if (isDefault) {
    await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, user.id));
  }

  const updates: any = {};
  if (label !== undefined) updates.label = label;
  if (fullAddress !== undefined) updates.fullAddress = fullAddress;
  if (building !== undefined) updates.building = building;
  if (landmark !== undefined) updates.landmark = landmark;
  if (floor !== undefined) updates.floor = floor;
  if (phone !== undefined) updates.phone = phone;
  if (instructions !== undefined) updates.instructions = instructions;
  if (cityId !== undefined) updates.cityId = cityId;
  if (zoneId !== undefined) updates.zoneId = zoneId;
  if (isDefault !== undefined) updates.isDefault = isDefault;

  const [updated] = await db.update(addressesTable).set(updates).where(eq(addressesTable.id, id)).returning();
  res.json(formatAddress(updated));
});

router.post("/addresses/:addressId/set-default", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(Array.isArray(req.params.addressId) ? req.params.addressId[0] : req.params.addressId, 10);

  const [existing] = await db.select().from(addressesTable).where(and(eq(addressesTable.id, id), eq(addressesTable.userId, user.id)));
  if (!existing) { res.status(404).json({ error: "Address not found" }); return; }

  await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, user.id));
  const [updated] = await db.update(addressesTable).set({ isDefault: true }).where(eq(addressesTable.id, id)).returning();
  res.json(formatAddress(updated));
});

router.delete("/addresses/:addressId", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(Array.isArray(req.params.addressId) ? req.params.addressId[0] : req.params.addressId, 10);
  const [existing] = await db.select().from(addressesTable).where(and(eq(addressesTable.id, id), eq(addressesTable.userId, user.id)));
  if (!existing) { res.status(404).json({ error: "Address not found" }); return; }
  await db.delete(addressesTable).where(eq(addressesTable.id, id));
  res.sendStatus(204);
});

// NOTIFICATIONS
router.get("/notifications", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { unreadOnly, limit = 30 } = req.query;

  const all = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(Number(limit));

  const result = unreadOnly === "true" ? all.filter(n => !n.isRead) : all;
  const unreadCount = all.filter(n => !n.isRead).length;

  res.json({
    notifications: result.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      relatedOrderId: n.relatedOrderId ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
});

router.get("/notifications/count", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const all = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id));
  res.json({ unreadCount: all.filter(n => !n.isRead).length });
});

router.post("/notifications/read-all", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, user.id));
  res.json({ success: true });
});

router.post("/notifications/:notificationId/read", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.notificationId) ? req.params.notificationId[0] : req.params.notificationId, 10);
  const user = (req as any).user;
  await db.update(notificationsTable).set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));
  res.json({ success: true });
});

// RATINGS
router.post("/ratings", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { orderId, targetType, targetId, rating, comment } = req.body;
  if (!orderId || !targetType || !targetId || !rating) { res.status(400).json({ error: "Missing required fields" }); return; }

  const [r] = await db.insert(ratingsTable).values({
    orderId,
    customerId: user.id,
    targetType,
    targetId,
    rating,
    comment: comment ?? null,
  }).returning();

  res.status(201).json({ id: r.id, orderId: r.orderId, restaurantId: targetType === "restaurant" ? targetId : null, driverId: targetType === "driver" ? targetId : null, customerId: r.customerId, rating: r.rating, comment: r.comment ?? null, targetType: r.targetType, createdAt: r.createdAt.toISOString() });
});

router.get("/ratings/restaurant/:restaurantId", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const ratings = await db.select().from(ratingsTable)
    .where(eq(ratingsTable.targetId, id))
    .orderBy(desc(ratingsTable.createdAt))
    .limit(50);

  res.json(ratings.map(r => ({
    id: r.id,
    orderId: r.orderId,
    restaurantId: id,
    driverId: null,
    customerId: r.customerId,
    rating: r.rating,
    comment: r.comment ?? null,
    targetType: r.targetType,
    createdAt: r.createdAt.toISOString(),
  })));
});

export default router;
