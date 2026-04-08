import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { logger } from "./logger";

export async function createNotification(params: {
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedOrderId?: number;
}) {
  try {
    await db.insert(notificationsTable).values({
      userId: params.userId,
      type: params.type as any,
      title: params.title,
      message: params.message,
      relatedOrderId: params.relatedOrderId,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
  }
}
