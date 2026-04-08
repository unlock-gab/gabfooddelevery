import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, customerProfilesTable, driverProfilesTable, restaurantsTable, addressesTable, citiesTable, zonesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, signToken, authenticate } from "../lib/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, phone, role } = parsed.data;
  const cityId: number | null = req.body.cityId ? Number(req.body.cityId) : null;
  const zoneId: number | null = req.body.zoneId ? Number(req.body.zoneId) : null;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash,
    phone: phone ?? null,
    role: role as any,
  }).returning();

  if (role === "customer") {
    await db.insert(customerProfilesTable).values({ userId: user.id, cityId: cityId ?? null });
    if (cityId && zoneId) {
      const [zone] = await db.select().from(zonesTable).where(eq(zonesTable.id, zoneId));
      const [city] = await db.select().from(citiesTable).where(eq(citiesTable.id, cityId));
      if (zone && city) {
        await db.insert(addressesTable).values({
          userId: user.id,
          label: "Adresse principale",
          fullAddress: `${zone.name}, ${city.name}`,
          cityId,
          zoneId,
          isDefault: true,
        });
      }
    }
  } else if (role === "driver") {
    await db.insert(driverProfilesTable).values({ userId: user.id, cityId: cityId ?? null, preferredZoneId: zoneId ?? null });
  } else if (role === "restaurant") {
    await db.insert(restaurantsTable).values({
      userId: user.id,
      name,
      cityId: cityId ?? null,
      zoneId: zoneId ?? null,
      status: "pending",
    });
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!user.isActive) {
    res.status(401).json({ error: "Account inactive" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
