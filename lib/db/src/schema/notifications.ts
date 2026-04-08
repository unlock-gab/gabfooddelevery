import { pgTable, text, serial, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const notificationTypeEnum = pgEnum("notification_type", [
  "order_placed",
  "driver_requested",
  "driver_assigned",
  "confirmation_complete",
  "correction_needed",
  "preparation_started",
  "ready_for_pickup",
  "picked_up",
  "on_the_way",
  "arriving_soon",
  "delivered",
  "cancelled",
  "failed",
  "mission_request",
  "general",
]);

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: notificationTypeEnum("type").notNull().default("general"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  relatedOrderId: integer("related_order_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
