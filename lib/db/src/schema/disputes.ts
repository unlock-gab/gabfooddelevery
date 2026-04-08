import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const disputeTypeEnum = pgEnum("dispute_type", [
  "not_delivered",
  "wrong_order",
  "missing_items",
  "quality_issue",
  "payment_issue",
  "driver_behavior",
  "late_delivery",
  "qr_issue",
  "other",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "under_review",
  "resolved",
  "rejected",
  "closed",
]);

export const disputesTable = pgTable("disputes", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  reportedBy: integer("reported_by").notNull().references(() => usersTable.id),
  assignedTo: integer("assigned_to").references(() => usersTable.id),
  type: disputeTypeEnum("type").notNull().default("other"),
  status: disputeStatusEnum("status").notNull().default("open"),
  description: text("description").notNull(),
  adminNote: text("admin_note"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDisputeSchema = createInsertSchema(disputesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputesTable.$inferSelect;
