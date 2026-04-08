import { pgTable, text, serial, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  code: text("code"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const zonesTable = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  slug: text("slug"),
  cityId: integer("city_id").notNull().references(() => citiesTable.id),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }),
  estimatedMinutes: integer("estimated_minutes"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCitySchema = createInsertSchema(citiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCity = z.infer<typeof insertCitySchema>;
export type City = typeof citiesTable.$inferSelect;

export const insertZoneSchema = createInsertSchema(zonesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Zone = typeof zonesTable.$inferSelect;
