import { Router } from "express";
import { db } from "@workspace/db";
import { citiesTable, zonesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth";

const router = Router();

function formatCity(c: any) {
  return { ...c, createdAt: c.createdAt?.toISOString?.() ?? c.createdAt };
}
function formatZone(z: any) {
  return { ...z, deliveryFee: z.deliveryFee ? Number(z.deliveryFee) : null, createdAt: z.createdAt?.toISOString?.() ?? z.createdAt };
}

router.get("/cities", async (_req, res): Promise<void> => {
  const cities = await db.select().from(citiesTable).orderBy(citiesTable.name);
  res.json(cities.map(formatCity));
});

router.post("/cities", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const { name, nameAr } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [city] = await db.insert(citiesTable).values({ name, nameAr: nameAr ?? null }).returning();
  res.status(201).json(formatCity(city));
});

router.get("/cities/:cityId", async (req, res): Promise<void> => {
  const cityId = parseInt(Array.isArray(req.params.cityId) ? req.params.cityId[0] : req.params.cityId, 10);
  const [city] = await db.select().from(citiesTable).where(eq(citiesTable.id, cityId));
  if (!city) { res.status(404).json({ error: "City not found" }); return; }
  res.json(formatCity(city));
});

router.patch("/cities/:cityId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const cityId = parseInt(Array.isArray(req.params.cityId) ? req.params.cityId[0] : req.params.cityId, 10);
  const { name, nameAr, isActive } = req.body;
  const updates: any = {};
  if (name != null) updates.name = name;
  if (nameAr !== undefined) updates.nameAr = nameAr;
  if (isActive != null) updates.isActive = isActive;
  const [city] = await db.update(citiesTable).set(updates).where(eq(citiesTable.id, cityId)).returning();
  if (!city) { res.status(404).json({ error: "City not found" }); return; }
  res.json(formatCity(city));
});

router.delete("/cities/:cityId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const cityId = parseInt(Array.isArray(req.params.cityId) ? req.params.cityId[0] : req.params.cityId, 10);
  await db.delete(citiesTable).where(eq(citiesTable.id, cityId));
  res.sendStatus(204);
});

router.get("/cities/:cityId/zones", async (req, res): Promise<void> => {
  const cityId = parseInt(Array.isArray(req.params.cityId) ? req.params.cityId[0] : req.params.cityId, 10);
  const zones = await db.select().from(zonesTable).where(eq(zonesTable.cityId, cityId));
  res.json(zones.map(formatZone));
});

router.post("/cities/:cityId/zones", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const cityId = parseInt(Array.isArray(req.params.cityId) ? req.params.cityId[0] : req.params.cityId, 10);
  const { name, nameAr, deliveryFee, estimatedMinutes } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [zone] = await db.insert(zonesTable).values({
    cityId,
    name,
    nameAr: nameAr ?? null,
    deliveryFee: deliveryFee?.toString() ?? null,
    estimatedMinutes: estimatedMinutes ?? null,
  }).returning();
  res.status(201).json(formatZone(zone));
});

router.patch("/zones/:zoneId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const zoneId = parseInt(Array.isArray(req.params.zoneId) ? req.params.zoneId[0] : req.params.zoneId, 10);
  const { name, nameAr, deliveryFee, estimatedMinutes, isActive } = req.body;
  const updates: any = {};
  if (name != null) updates.name = name;
  if (nameAr !== undefined) updates.nameAr = nameAr;
  if (deliveryFee != null) updates.deliveryFee = deliveryFee.toString();
  if (estimatedMinutes != null) updates.estimatedMinutes = estimatedMinutes;
  if (isActive != null) updates.isActive = isActive;
  const [zone] = await db.update(zonesTable).set(updates).where(eq(zonesTable.id, zoneId)).returning();
  if (!zone) { res.status(404).json({ error: "Zone not found" }); return; }
  res.json(formatZone(zone));
});

router.delete("/zones/:zoneId", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const zoneId = parseInt(Array.isArray(req.params.zoneId) ? req.params.zoneId[0] : req.params.zoneId, 10);
  await db.delete(zonesTable).where(eq(zonesTable.id, zoneId));
  res.sendStatus(204);
});

export default router;
