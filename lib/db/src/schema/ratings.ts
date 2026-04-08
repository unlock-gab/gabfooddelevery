import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const ratingTargetEnum = pgEnum("rating_target", ["restaurant", "driver"]);

export const ratingsTable = pgTable("ratings", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  customerId: integer("customer_id").notNull().references(() => usersTable.id),
  targetType: ratingTargetEnum("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRatingSchema = createInsertSchema(ratingsTable).omit({ id: true, createdAt: true });
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratingsTable.$inferSelect;
