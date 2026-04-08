import { Router } from "express";
import { db } from "@workspace/db";
import { menuCategoriesTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../lib/auth";

const router = Router();

function formatProduct(p: any) {
  return { ...p, price: Number(p.price), createdAt: p.createdAt?.toISOString?.() ?? p.createdAt, updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt };
}

router.get("/restaurants/:restaurantId/categories", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const categories = await db.select().from(menuCategoriesTable)
    .where(and(eq(menuCategoriesTable.restaurantId, id), eq(menuCategoriesTable.isActive, true)))
    .orderBy(menuCategoriesTable.sortOrder);
  res.json(categories);
});

router.post("/restaurants/:restaurantId/categories", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const { name, nameAr, sortOrder } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [cat] = await db.insert(menuCategoriesTable).values({ restaurantId: id, name, nameAr: nameAr ?? null, sortOrder: sortOrder ?? 0 }).returning();
  res.status(201).json(cat);
});

router.patch("/menu-categories/:categoryId", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.categoryId) ? req.params.categoryId[0] : req.params.categoryId, 10);
  const { name, nameAr, sortOrder, isActive } = req.body;
  const updates: any = {};
  if (name != null) updates.name = name;
  if (nameAr !== undefined) updates.nameAr = nameAr;
  if (sortOrder != null) updates.sortOrder = sortOrder;
  if (isActive != null) updates.isActive = isActive;
  const [cat] = await db.update(menuCategoriesTable).set(updates).where(eq(menuCategoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  res.json(cat);
});

router.delete("/menu-categories/:categoryId", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.categoryId) ? req.params.categoryId[0] : req.params.categoryId, 10);
  await db.delete(menuCategoriesTable).where(eq(menuCategoriesTable.id, id));
  res.sendStatus(204);
});

router.get("/restaurants/:restaurantId/products", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const { categoryId } = req.query;
  const conditions: any[] = [eq(productsTable.restaurantId, id), eq(productsTable.isDeleted, false)];
  if (categoryId) conditions.push(eq(productsTable.categoryId, Number(categoryId)));
  const products = await db.select().from(productsTable).where(and(...conditions)).orderBy(productsTable.sortOrder);
  res.json(products.map(formatProduct));
});

router.post("/restaurants/:restaurantId/products", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.restaurantId) ? req.params.restaurantId[0] : req.params.restaurantId, 10);
  const { name, nameAr, description, price, imageUrl, categoryId, preparationTime, sortOrder } = req.body;
  if (!name || !price || !categoryId) { res.status(400).json({ error: "Name, price, and categoryId required" }); return; }
  const [product] = await db.insert(productsTable).values({
    restaurantId: id,
    categoryId,
    name,
    nameAr: nameAr ?? null,
    description: description ?? null,
    price: price.toString(),
    imageUrl: imageUrl ?? null,
    preparationTime: preparationTime ?? null,
    sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json(formatProduct(product));
});

router.get("/products/:productId", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId, 10);
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatProduct(product));
});

router.patch("/products/:productId", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId, 10);
  const updates: any = {};
  const fields = ["name", "nameAr", "description", "imageUrl", "categoryId", "isAvailable", "preparationTime", "sortOrder"];
  for (const f of fields) {
    if (req.body[f] != null) updates[f] = req.body[f];
  }
  if (req.body.price != null) updates.price = req.body.price.toString();
  const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatProduct(product));
});

router.delete("/products/:productId", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId, 10);
  await db.update(productsTable).set({ isDeleted: true }).where(eq(productsTable.id, id));
  res.sendStatus(204);
});

export default router;
