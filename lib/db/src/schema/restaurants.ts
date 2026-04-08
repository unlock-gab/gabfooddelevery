import { pgTable, text, serial, timestamp, boolean, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { citiesTable, zonesTable } from "./cities";

export const restaurantStatusEnum = pgEnum("restaurant_status", ["pending", "approved", "rejected", "suspended"]);

export const restaurantsTable = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  phone: text("phone"),
  address: text("address"),
  cityId: integer("city_id").references(() => citiesTable.id),
  zoneId: integer("zone_id").references(() => zonesTable.id),
  status: restaurantStatusEnum("status").notNull().default("pending"),
  isOpen: boolean("is_open").notNull().default(false),
  category: text("category"),
  estimatedPrepTime: integer("estimated_prep_time").default(20),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).default("10.00"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const restaurantHoursTable = pgTable("restaurant_hours", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurantsTable.id),
  dayOfWeek: integer("day_of_week").notNull(),
  openTime: text("open_time").notNull().default("09:00"),
  closeTime: text("close_time").notNull().default("22:00"),
  isOpen: boolean("is_open").notNull().default(true),
});

export const insertRestaurantSchema = createInsertSchema(restaurantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurantsTable.$inferSelect;

export const insertRestaurantHoursSchema = createInsertSchema(restaurantHoursTable).omit({ id: true });
export type InsertRestaurantHours = z.infer<typeof insertRestaurantHoursSchema>;
export type RestaurantHours = typeof restaurantHoursTable.$inferSelect;
