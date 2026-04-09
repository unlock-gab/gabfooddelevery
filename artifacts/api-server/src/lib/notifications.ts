import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

async function sendExpoPushNotification(params: {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify({
        to: params.pushToken,
        title: params.title,
        body: params.body,
        data: params.data ?? {},
        sound: "default",
        priority: "high",
      }),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, "Expo push notification failed");
    }
  } catch (err) {
    logger.error({ err }, "Failed to send Expo push notification");
  }
}

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

    const [user] = await db
      .select({ pushToken: usersTable.pushToken })
      .from(usersTable)
      .where(eq(usersTable.id, params.userId))
      .limit(1);

    if (user?.pushToken) {
      await sendExpoPushNotification({
        pushToken: user.pushToken,
        title: params.title,
        body: params.message,
        data: params.relatedOrderId ? { orderId: params.relatedOrderId } : {},
      });
    }
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
  }
}
