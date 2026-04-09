import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../lib/auth";

const router = Router();

// Get all notifications for current user
router.get("/notifications", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { unreadOnly, limit = 30 } = req.query;

  let conditions: any[] = [eq(notificationsTable.userId, user.id)];
  if (unreadOnly === "true") conditions.push(eq(notificationsTable.isRead, false));

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(and(...conditions))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(Number(limit));

  const unreadCount = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));

  res.json({
    notifications: notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      relatedOrderId: n.relatedOrderId ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount: unreadCount.length,
  });
});

// Get unread count only
router.get("/notifications/count", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const unread = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));
  res.json({ unreadCount: unread.length });
});

// Mark a single notification as read
router.post("/notifications/:id/read", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(req.params.id, 10);
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));
  res.json({ success: true });
});

// Mark all notifications as read
router.post("/notifications/read-all", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, user.id));
  res.json({ success: true });
});

// Save / update push token
router.post("/notifications/push-token", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { token } = req.body;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }
  await db
    .update(usersTable)
    .set({ pushToken: token })
    .where(eq(usersTable.id, user.id));
  res.json({ success: true });
});

export default router;
