import { Router } from "express";
import { db } from "@workspace/db";
import { cartTable, cartItemsTable, productsTable, zonesTable, restaurantsTable, platformSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../lib/auth";

const router = Router();

async function getOrCreateCart(userId: number) {
  let [cart] = await db.select().from(cartTable).where(eq(cartTable.userId, userId));
  if (!cart) {
    [cart] = await db.insert(cartTable).values({ userId }).returning();
  }
  return cart;
}

async function getCartWithItems(userId: number) {
  const cart = await getOrCreateCart(userId);
  const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));

  let restaurantName: string | null = null;
  if (cart.restaurantId) {
    const [r] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, cart.restaurantId));
    restaurantName = r?.name ?? null;
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  // Calculate delivery fee from restaurant zone → platform default → 350 DA fallback
  let deliveryFee = 350;
  if (cart.restaurantId) {
    const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, cart.restaurantId));
    if (restaurant?.zoneId) {
      const [zone] = await db.select().from(zonesTable).where(eq(zonesTable.id, restaurant.zoneId));
      if (zone?.deliveryFee) deliveryFee = Number(zone.deliveryFee);
    }
  }
  if (deliveryFee === 350) {
    const [setting] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, "default_delivery_fee"));
    if (setting?.value) deliveryFee = Number(setting.value) || 350;
  }
  if (items.length === 0) deliveryFee = 0;

  return {
    id: cart.id,
    restaurantId: cart.restaurantId ?? null,
    restaurantName,
    items: items.map(i => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      price: Number(i.price),
      quantity: i.quantity,
      imageUrl: i.imageUrl ?? null,
      notes: i.notes ?? null,
    })),
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
}

router.get("/cart", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  res.json(await getCartWithItems(user.id));
});

router.post("/cart/items", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { productId, quantity, notes } = req.body;
  if (!productId || !quantity) { res.status(400).json({ error: "productId and quantity required" }); return; }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const cart = await getOrCreateCart(user.id);

  // If cart has different restaurant, clear it
  if (cart.restaurantId && cart.restaurantId !== product.restaurantId) {
    await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));
    await db.update(cartTable).set({ restaurantId: product.restaurantId }).where(eq(cartTable.id, cart.id));
  } else if (!cart.restaurantId) {
    await db.update(cartTable).set({ restaurantId: product.restaurantId }).where(eq(cartTable.id, cart.id));
  }

  // Check if item already in cart
  const [existing] = await db.select().from(cartItemsTable)
    .where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.productId, productId)));

  if (existing) {
    await db.update(cartItemsTable).set({ quantity: existing.quantity + quantity }).where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({
      cartId: cart.id,
      productId,
      productName: product.name,
      price: product.price,
      quantity,
      imageUrl: product.imageUrl ?? null,
      notes: notes ?? null,
    });
  }

  res.json(await getCartWithItems(user.id));
});

router.patch("/cart/items/:itemId", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const itemId = parseInt(Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId, 10);
  const { quantity } = req.body;
  if (!quantity) { res.status(400).json({ error: "Quantity required" }); return; }

  if (quantity <= 0) {
    await db.delete(cartItemsTable).where(eq(cartItemsTable.id, itemId));
  } else {
    await db.update(cartItemsTable).set({ quantity }).where(eq(cartItemsTable.id, itemId));
  }

  res.json(await getCartWithItems(user.id));
});

router.delete("/cart/items/:itemId", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const itemId = parseInt(Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId, 10);
  await db.delete(cartItemsTable).where(eq(cartItemsTable.id, itemId));
  res.json(await getCartWithItems(user.id));
});

router.post("/cart/clear", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const cart = await getOrCreateCart(user.id);
  await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));
  await db.update(cartTable).set({ restaurantId: null }).where(eq(cartTable.id, cart.id));
  res.json({ success: true, message: "Cart cleared" });
});

export default router;
