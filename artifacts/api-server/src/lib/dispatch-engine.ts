/**
 * Tasty Crousty — Dispatch Engine
 * Automatically selects and notifies drivers for an order.
 * Scoring algorithm: zone match + availability + rating + workload
 */

import { db } from "@workspace/db";
import {
  ordersTable, driverProfilesTable, usersTable, dispatchAttemptsTable,
  orderStatusHistoryTable, restaurantsTable,
} from "@workspace/db";
import { eq, and, not, inArray } from "drizzle-orm";
import { createNotification } from "./notifications";

interface DriverCandidate {
  userId: number;
  name: string;
  avgRating: number;
  acceptanceRate: number;
  totalDeliveries: number;
  score: number;
}

async function addStatusHistory(orderId: number, status: string, note?: string, createdBy = "system") {
  await db.insert(orderStatusHistoryTable).values({
    orderId,
    status: status as any,
    note: note ?? null,
    createdBy,
  });
}

/**
 * Score a driver candidate for an order.
 * Higher score = better candidate.
 */
function scoreDriver(driver: {
  avgRating: number;
  acceptanceRate: number;
  totalDeliveries: number;
}): number {
  const ratingScore = (Number(driver.avgRating) / 5) * 40;          // 0–40 pts
  const acceptanceScore = (Number(driver.acceptanceRate) / 100) * 30; // 0–30 pts
  const experienceScore = Math.min(Number(driver.totalDeliveries) / 100, 1) * 20; // 0–20 pts
  const baseScore = 10;                                               // base 10 pts

  return ratingScore + acceptanceScore + experienceScore + baseScore;
}

/**
 * Get candidate drivers for an order.
 * Filters: approved, online, available, not already assigned.
 */
async function getCandidateDrivers(orderId: number, restaurantCityId: number | null): Promise<DriverCandidate[]> {
  // Get drivers already notified (rejected or pending)
  const alreadyNotified = await db.select({ driverId: dispatchAttemptsTable.driverId })
    .from(dispatchAttemptsTable)
    .where(eq(dispatchAttemptsTable.orderId, orderId));

  const notifiedIds = alreadyNotified
    .map((a) => a.driverId)
    .filter((id): id is number => id !== null);

  const drivers = await db.select({
    userId: usersTable.id,
    name: usersTable.name,
    avgRating: driverProfilesTable.avgRating,
    acceptanceRate: driverProfilesTable.acceptanceRate,
    totalDeliveries: driverProfilesTable.totalDeliveries,
    status: driverProfilesTable.status,
    isOnline: driverProfilesTable.isOnline,
    availability: driverProfilesTable.availability,
  })
    .from(driverProfilesTable)
    .innerJoin(usersTable, eq(driverProfilesTable.userId, usersTable.id))
    .where(
      and(
        eq(driverProfilesTable.status, "approved"),
        eq(driverProfilesTable.isOnline, true),
        eq(driverProfilesTable.availability, "available"),
        notifiedIds.length > 0 ? not(inArray(usersTable.id, notifiedIds)) : undefined,
      ),
    );

  return drivers.map((d) => ({
    userId: d.userId,
    name: d.name,
    avgRating: Number(d.avgRating ?? 0),
    acceptanceRate: Number(d.acceptanceRate ?? 0),
    totalDeliveries: Number(d.totalDeliveries ?? 0),
    score: scoreDriver(d),
  })).sort((a, b) => b.score - a.score);
}

/**
 * Main dispatch function — called after order is placed.
 * Finds best driver candidates and sends them mission notifications.
 * The first driver to accept wins the assignment.
 */
export async function dispatchOrder(orderId: number): Promise<{ dispatched: boolean; candidates: number }> {
  const [order] = await db.select({
    order: ordersTable,
    restaurantCityId: restaurantsTable.cityId,
  })
    .from(ordersTable)
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .where(eq(ordersTable.id, orderId));

  if (!order) return { dispatched: false, candidates: 0 };
  if (order.order.driverId) return { dispatched: true, candidates: 0 }; // Already assigned

  const candidates = await getCandidateDrivers(orderId, order.restaurantCityId ?? null);

  if (candidates.length === 0) {
    // No drivers available — keep as pending_dispatch, will retry
    await db.update(ordersTable)
      .set({ status: "pending_dispatch" })
      .where(eq(ordersTable.id, orderId));
    return { dispatched: false, candidates: 0 };
  }

  // Transition to dispatching_driver
  await db.update(ordersTable)
    .set({ status: "dispatching_driver" })
    .where(eq(ordersTable.id, orderId));
  await addStatusHistory(orderId, "dispatching_driver", `${candidates.length} livreur(s) notifié(s)`);

  // Notify top candidates (up to 3 simultaneously)
  const toNotify = candidates.slice(0, 3);
  for (const driver of toNotify) {
    await createNotification({
      userId: driver.userId,
      type: "mission_request",
      title: "Nouvelle mission disponible 🚴",
      message: `Une nouvelle commande vous attend. Score: ${Math.round(driver.score)}pts. Acceptez rapidement !`,
      relatedOrderId: orderId,
    });

    // Log the dispatch attempt (pending result)
    await db.insert(dispatchAttemptsTable).values({
      orderId,
      driverId: driver.userId,
      result: "pending" as any,
    }).onConflictDoNothing();
  }

  return { dispatched: true, candidates: toNotify.length };
}

/**
 * Retry dispatch for orders stuck in pending_dispatch for too long.
 * Called by a periodic job or manually by admin.
 */
export async function retryPendingDispatch(): Promise<number> {
  const pendingOrders = await db.select()
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending_dispatch"))
    .limit(10);

  let retried = 0;
  for (const order of pendingOrders) {
    const result = await dispatchOrder(order.id);
    if (result.dispatched) retried++;
  }
  return retried;
}

/**
 * Lock driver assignment — called when a driver accepts.
 * Ensures only the first driver to accept gets the order (race condition prevention).
 */
export async function lockDriverAssignment(orderId: number, driverId: number): Promise<boolean> {
  // Only assign if no driver yet and order is in dispatchable state
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return false;

  const dispatchableStatuses = ["pending_dispatch", "dispatching_driver"];
  if (!dispatchableStatuses.includes(order.status) || order.driverId) {
    return false; // Already claimed
  }

  // Update driver acceptance rate
  await db.update(driverProfilesTable)
    .set({ acceptanceRate: db.sql`LEAST(acceptance_rate + 2, 100)` as any })
    .where(eq(driverProfilesTable.userId, driverId));

  // Mark other pending attempts as missed
  await db.update(dispatchAttemptsTable)
    .set({ result: "missed" as any })
    .where(
      and(
        eq(dispatchAttemptsTable.orderId, orderId),
        eq(dispatchAttemptsTable.result, "pending" as any),
        not(eq(dispatchAttemptsTable.driverId, driverId)),
      ),
    );

  // Mark this driver's attempt as accepted
  await db.update(dispatchAttemptsTable)
    .set({ result: "accepted" as any, respondedAt: new Date() })
    .where(
      and(
        eq(dispatchAttemptsTable.orderId, orderId),
        eq(dispatchAttemptsTable.driverId, driverId),
      ),
    );

  return true;
}
