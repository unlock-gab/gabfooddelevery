import React from "react";
import { OrderStatus } from "@workspace/api-client-react";
import { Lock, Unlock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrepLockIndicatorProps {
  status: OrderStatus;
  className?: string;
}

export function PrepLockIndicator({ status, className }: PrepLockIndicatorProps) {
  const isLocked = [
    "pending_dispatch",
    "dispatching_driver",
    "driver_assigned",
    "awaiting_customer_confirmation",
  ].includes(status);

  const isWarning = ["needs_update", "confirmation_failed"].includes(status);
  const isUnlocked = status === "confirmed_for_preparation";
  const isPast = [
    "preparing",
    "ready_for_pickup",
    "picked_up",
    "on_the_way",
    "arriving_soon",
    "delivered",
  ].includes(status);

  if (isPast) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border font-medium",
        isLocked && "bg-amber-50 border-amber-200 text-amber-800",
        isWarning && "bg-red-50 border-red-200 text-red-800",
        isUnlocked && "bg-green-50 border-green-200 text-green-800 shadow-sm ring-1 ring-green-400",
        className
      )}
    >
      {isLocked && (
        <>
          <Lock className="w-5 h-5" />
          <span>Préparation verrouillée - Attente de confirmation</span>
        </>
      )}
      {isWarning && (
        <>
          <AlertTriangle className="w-5 h-5" />
          <span>Préparation bloquée - Problème de confirmation</span>
        </>
      )}
      {isUnlocked && (
        <>
          <Unlock className="w-5 h-5" />
          <span className="text-base font-bold uppercase tracking-wide">GO — Commencer la préparation</span>
        </>
      )}
    </div>
  );
}
