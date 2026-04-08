import { pgTable, text, serial, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const fraudSeverityEnum = pgEnum("fraud_severity", ["low", "medium", "high", "critical"]);

export const fraudFlagsTable = pgTable("fraud_flags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: text("type").notNull(),
  severity: fraudSeverityEnum("severity").notNull().default("low"),
  description: text("description").notNull(),
  relatedOrderId: integer("related_order_id"),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: integer("resolved_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFraudFlagSchema = createInsertSchema(fraudFlagsTable).omit({ id: true, createdAt: true });
export type InsertFraudFlag = z.infer<typeof insertFraudFlagSchema>;
export type FraudFlag = typeof fraudFlagsTable.$inferSelect;
