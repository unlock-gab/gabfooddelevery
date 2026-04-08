import React from "react";
import { OrderStatusHistory } from "@workspace/api-client-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderTimelineProps {
  history: OrderStatusHistory[];
  currentStatus: string;
}

const statusOrder = [
  "draft",
  "pending_dispatch",
  "dispatching_driver",
  "driver_assigned",
  "awaiting_customer_confirmation",
  "confirmed_for_preparation",
  "preparing",
  "ready_for_pickup",
  "picked_up",
  "on_the_way",
  "arriving_soon",
  "delivered"
];

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    "pending_dispatch": "Commande reçue",
    "dispatching_driver": "Recherche de livreur",
    "driver_assigned": "Livreur assigné",
    "awaiting_customer_confirmation": "Attente de votre confirmation",
    "confirmed_for_preparation": "Confirmation reçue",
    "preparing": "En préparation",
    "ready_for_pickup": "Prête pour le livreur",
    "picked_up": "Récupérée par le livreur",
    "on_the_way": "En route",
    "arriving_soon": "Arrive bientôt",
    "delivered": "Livrée"
  };
  return map[status] || status;
}

export function OrderTimeline({ history, currentStatus }: OrderTimelineProps) {
  const currentIndex = statusOrder.indexOf(currentStatus);
  
  // Filter relevant statuses for customer display
  const displayStatuses = [
    "pending_dispatch",
    "driver_assigned",
    "confirmed_for_preparation",
    "preparing",
    "on_the_way",
    "delivered"
  ];

  return (
    <div className="space-y-4 py-4">
      {displayStatuses.map((status, index) => {
        const stepIndex = statusOrder.indexOf(status);
        const isCompleted = stepIndex <= currentIndex && currentIndex !== -1;
        const isCurrent = stepIndex === currentIndex;
        
        const historyItem = history?.find(h => h.status === status);
        const timeStr = historyItem 
          ? format(new Date(historyItem.createdAt), "HH:mm", { locale: fr })
          : "";

        return (
          <div key={status} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              {isCompleted ? (
                <CheckCircle2 className={cn("w-6 h-6", isCurrent ? "text-primary" : "text-green-500")} />
              ) : (
                <Circle className="w-6 h-6 text-muted" />
              )}
              {index < displayStatuses.length - 1 && (
                <div className={cn(
                  "w-0.5 h-10 my-1 rounded-full",
                  isCompleted && !isCurrent ? "bg-green-500" : "bg-muted"
                )} />
              )}
            </div>
            <div className="pt-0.5 flex-1">
              <div className={cn(
                "font-medium",
                isCurrent ? "text-primary font-bold" : isCompleted ? "text-foreground" : "text-muted-foreground"
              )}>
                {getStatusLabel(status)}
              </div>
              {timeStr && (
                <div className="text-xs text-muted-foreground mt-0.5">{timeStr}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
