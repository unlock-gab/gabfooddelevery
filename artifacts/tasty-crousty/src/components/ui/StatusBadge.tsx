import React from "react";
import { OrderStatus } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  let label = status;
  let colorClass = "bg-gray-100 text-gray-800";

  switch (status) {
    case "draft":
    case "pending_dispatch":
      label = "En attente";
      colorClass = "bg-gray-100 text-gray-800";
      break;
    case "dispatching_driver":
      label = "Recherche de livreur";
      colorClass = "bg-indigo-100 text-indigo-800";
      break;
    case "driver_assigned":
    case "awaiting_customer_confirmation":
      label = "Attente confirmation";
      colorClass = "bg-amber-100 text-amber-800";
      break;
    case "needs_update":
      label = "Mise à jour requise";
      colorClass = "bg-orange-100 text-orange-800";
      break;
    case "confirmation_failed":
      label = "Confirmation échouée";
      colorClass = "bg-red-100 text-red-800";
      break;
    case "confirmed_for_preparation":
      label = "Prêt à préparer";
      colorClass = "bg-green-100 text-green-800 ring-2 ring-green-400 ring-offset-1";
      break;
    case "preparing":
      label = "En préparation";
      colorClass = "bg-emerald-100 text-emerald-800";
      break;
    case "ready_for_pickup":
      label = "Prêt pour retrait";
      colorClass = "bg-purple-100 text-purple-800";
      break;
    case "picked_up":
    case "on_the_way":
    case "arriving_soon":
      label = "En route";
      colorClass = "bg-blue-100 text-blue-800";
      break;
    case "delivered":
      label = "Livré";
      colorClass = "bg-green-800 text-white";
      break;
    case "cancelled":
    case "failed":
      label = "Annulé";
      colorClass = "bg-red-100 text-red-800";
      break;
    case "refunded":
      label = "Remboursé";
      colorClass = "bg-slate-100 text-slate-800";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
