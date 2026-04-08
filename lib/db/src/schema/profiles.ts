import { pgTable, text, serial, timestamp, boolean, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { citiesTable } from "./cities";

export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high"]);
export const driverAvailabilityEnum = pgEnum("driver_availability", ["available", "busy", "offline"]);

export const customerProfilesTable = pgTable("customer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  riskScore: riskLevelEnum("risk_score").notNull().default("low"),
  cancellationCount: integer("cancellation_count").notNull().default(0),
  unreachableCount: integer("unreachable_count").notNull().default(0),
  failedConfirmationCount: integer("failed_confirmation_count").notNull().default(0),
  disputeCount: integer("dispute_count").notNull().default(0),
  totalOrders: integer("total_orders").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const driverProfilesTable = pgTable("driver_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  status: text("status").notNull().default("pending"),
  isOnline: boolean("is_online").notNull().default(false),
  availability: driverAvailabilityEnum("availability").notNull().default("offline"),
  cityId: integer("city_id").references(() => citiesTable.id),
  avgRating: numeric("avg_rating", { precision: 3, scale: 2 }).default("0.00"),
  acceptanceRate: numeric("acceptance_rate", { precision: 5, scale: 2 }).default("0.00"),
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  failedConfirmations: integer("failed_confirmations").notNull().default(0),
  earningsTotal: numeric("earnings_total", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const addressesTable = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  label: text("label").default("Autre"),
  fullAddress: text("full_address").notNull(),
  building: text("building"),
  landmark: text("landmark"),
  floor: text("floor"),
  phone: text("phone"),
  instructions: text("instructions"),
  cityId: integer("city_id").references(() => citiesTable.id),
  zoneId: integer("zone_id"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCustomerProfileSchema = createInsertSchema(customerProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerProfile = z.infer<typeof insertCustomerProfileSchema>;
export type CustomerProfile = typeof customerProfilesTable.$inferSelect;

export const insertDriverProfileSchema = createInsertSchema(driverProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDriverProfile = z.infer<typeof insertDriverProfileSchema>;
export type DriverProfile = typeof driverProfilesTable.$inferSelect;

export const insertAddressSchema = createInsertSchema(addressesTable).omit({ id: true, createdAt: true });
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addressesTable.$inferSelect;
