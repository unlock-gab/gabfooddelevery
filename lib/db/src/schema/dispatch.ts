import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";
import { usersTable } from "./users";

export const dispatchResultEnum = pgEnum("dispatch_result", ["pending", "accepted", "rejected", "timeout", "no_driver"]);
export const confirmationResultEnum = pgEnum("confirmation_result", ["confirmed", "needs_correction", "failed"]);

export const dispatchAttemptsTable = pgTable("dispatch_attempts", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  driverId: integer("driver_id").references(() => usersTable.id),
  result: dispatchResultEnum("result").notNull().default("pending"),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const deliveryConfirmationsTable = pgTable("delivery_confirmations", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  driverId: integer("driver_id").notNull().references(() => usersTable.id),
  result: confirmationResultEnum("result").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDispatchAttemptSchema = createInsertSchema(dispatchAttemptsTable).omit({ id: true, attemptedAt: true });
export type InsertDispatchAttempt = z.infer<typeof insertDispatchAttemptSchema>;
export type DispatchAttempt = typeof dispatchAttemptsTable.$inferSelect;
