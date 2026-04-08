import { pgTable, text, serial, timestamp, boolean, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const promoDiscountTypeEnum = pgEnum("promo_discount_type", ["fixed", "percentage", "free_delivery"]);

export const promoCodesTable = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: promoDiscountTypeEnum("discount_type").notNull().default("fixed"),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull().default("0.00"),
  minimumBasket: numeric("minimum_basket", { precision: 10, scale: 2 }).default("0.00"),
  maxUsageTotal: integer("max_usage_total"),
  maxUsagePerUser: integer("max_usage_per_user").default(1),
  usageCount: integer("usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const promoUsageTable = pgTable("promo_usage", {
  id: serial("id").primaryKey(),
  promoId: integer("promo_id").notNull().references(() => promoCodesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  discountApplied: numeric("discount_applied", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodesTable).omit({ id: true, createdAt: true, updatedAt: true, usageCount: true });
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodesTable.$inferSelect;

export const insertPromoUsageSchema = createInsertSchema(promoUsageTable).omit({ id: true, usedAt: true });
export type InsertPromoUsage = z.infer<typeof insertPromoUsageSchema>;
export type PromoUsage = typeof promoUsageTable.$inferSelect;
