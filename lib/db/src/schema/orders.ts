import { pgTable, text, serial, timestamp, boolean, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { restaurantsTable } from "./restaurants";

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "pending_dispatch",
  "dispatching_driver",
  "driver_assigned",
  "awaiting_customer_confirmation",
  "needs_update",
  "confirmation_failed",
  "confirmed_for_preparation",
  "preparing",
  "ready_for_pickup",
  "picked_up",
  "on_the_way",
  "arriving_soon",
  "delivered",
  "cancelled",
  "failed",
  "refunded",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["cash_on_delivery", "online"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "authorized", "paid", "failed", "refunded", "cash_on_delivery"]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => usersTable.id),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurantsTable.id),
  driverId: integer("driver_id").references(() => usersTable.id),
  status: orderStatusEnum("status").notNull().default("pending_dispatch"),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryLandmark: text("delivery_landmark"),
  deliveryFloor: text("delivery_floor"),
  deliveryInstructions: text("delivery_instructions"),
  deliveryPhone: text("delivery_phone"),
  zoneId: integer("zone_id"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash_on_delivery"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  promoCode: text("promo_code"),
  promoDiscount: numeric("promo_discount", { precision: 10, scale: 2 }).default("0.00"),
  estimatedDeliveryMinutes: integer("estimated_delivery_minutes"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderStatusHistoryTable = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  status: orderStatusEnum("status").notNull(),
  note: text("note"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const qrDeliveryTokensTable = pgTable("qr_delivery_tokens", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  token: text("token").notNull().unique(),
  isUsed: boolean("is_used").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;

export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true, createdAt: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItemsTable.$inferSelect;
