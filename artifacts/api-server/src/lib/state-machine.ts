/**
 * Tasty Crousty — Order State Machine
 * Defines all valid status transitions and enforces business rules.
 */

export type OrderStatus =
  | "draft"
  | "pending_dispatch"
  | "dispatching_driver"
  | "driver_assigned"
  | "awaiting_customer_confirmation"
  | "needs_update"
  | "confirmation_failed"
  | "confirmed_for_preparation"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "on_the_way"
  | "arriving_soon"
  | "delivered"
  | "cancelled"
  | "failed"
  | "refunded";

export type ActorRole = "customer" | "restaurant" | "driver" | "admin" | "system";

interface Transition {
  from: OrderStatus | OrderStatus[];
  to: OrderStatus;
  allowedActors: ActorRole[];
  description: string;
}

const TRANSITIONS: Transition[] = [
  // Customer places order
  { from: "draft", to: "pending_dispatch", allowedActors: ["customer", "admin"], description: "Commande soumise" },

  // Dispatch system activates
  { from: "pending_dispatch", to: "dispatching_driver", allowedActors: ["admin", "system"], description: "Recherche de livreur" },

  // Driver accepts mission
  { from: ["pending_dispatch", "dispatching_driver"], to: "driver_assigned", allowedActors: ["driver", "admin", "system"], description: "Livreur assigné" },

  // Move to awaiting confirmation
  { from: "driver_assigned", to: "awaiting_customer_confirmation", allowedActors: ["driver", "system"], description: "En attente de confirmation client" },

  // Driver confirms delivery details with customer
  { from: "awaiting_customer_confirmation", to: "confirmed_for_preparation", allowedActors: ["driver", "admin"], description: "Confirmation client réussie" },
  { from: "awaiting_customer_confirmation", to: "needs_update", allowedActors: ["driver", "admin"], description: "Correction demandée" },
  { from: "awaiting_customer_confirmation", to: "confirmation_failed", allowedActors: ["driver", "admin"], description: "Impossible de joindre le client" },

  // Customer corrects info → back to confirmation
  { from: "needs_update", to: "awaiting_customer_confirmation", allowedActors: ["customer", "admin", "system"], description: "Infos mises à jour, en attente de reconfirmation" },

  // Admin override for failed confirmation
  { from: "confirmation_failed", to: "awaiting_customer_confirmation", allowedActors: ["admin"], description: "Réessai de confirmation (admin)" },
  { from: "confirmation_failed", to: "confirmed_for_preparation", allowedActors: ["admin"], description: "Confirmation forcée par admin" },
  { from: "confirmation_failed", to: "cancelled", allowedActors: ["admin", "system"], description: "Annulé suite à échec de confirmation" },

  // Restaurant prepares (ONLY after confirmed_for_preparation)
  { from: "confirmed_for_preparation", to: "preparing", allowedActors: ["restaurant", "admin"], description: "Préparation commencée" },

  // Restaurant marks ready
  { from: "preparing", to: "ready_for_pickup", allowedActors: ["restaurant", "admin"], description: "Commande prête" },

  // Driver pickup flow
  { from: "ready_for_pickup", to: "picked_up", allowedActors: ["driver", "admin"], description: "Commande récupérée" },
  { from: "picked_up", to: "on_the_way", allowedActors: ["driver"], description: "En route" },
  { from: "on_the_way", to: "arriving_soon", allowedActors: ["driver"], description: "Arrivée imminente" },
  { from: ["on_the_way", "arriving_soon"], to: "delivered", allowedActors: ["driver", "admin"], description: "Livré" },

  // Cancellation rules
  { from: ["pending_dispatch", "dispatching_driver", "driver_assigned"], to: "cancelled", allowedActors: ["customer", "admin"], description: "Commande annulée" },
  { from: ["preparing", "ready_for_pickup", "confirmed_for_preparation"], to: "cancelled", allowedActors: ["admin"], description: "Annulation admin" },

  // Failure & refund
  { from: ["cancelled", "delivered"], to: "refunded", allowedActors: ["admin"], description: "Remboursé" },
  { from: ["pending_dispatch", "dispatching_driver", "confirmation_failed"], to: "failed", allowedActors: ["admin", "system"], description: "Commande échouée" },
];

export function canTransition(from: OrderStatus, to: OrderStatus, actor: ActorRole): boolean {
  return TRANSITIONS.some((t) => {
    const fromMatch = Array.isArray(t.from) ? t.from.includes(from) : t.from === from;
    const toMatch = t.to === to;
    const actorMatch = t.allowedActors.includes(actor);
    return fromMatch && toMatch && actorMatch;
  });
}

export function getTransitionDescription(from: OrderStatus, to: OrderStatus): string | null {
  const t = TRANSITIONS.find((t) => {
    const fromMatch = Array.isArray(t.from) ? t.from.includes(from) : t.from === from;
    return fromMatch && t.to === to;
  });
  return t?.description ?? null;
}

export function getValidNextStatuses(from: OrderStatus, actor: ActorRole): OrderStatus[] {
  return TRANSITIONS
    .filter((t) => {
      const fromMatch = Array.isArray(t.from) ? t.from.includes(from) : t.from === from;
      return fromMatch && t.allowedActors.includes(actor);
    })
    .map((t) => t.to);
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Brouillon",
  pending_dispatch: "En attente de livreur",
  dispatching_driver: "Recherche livreur",
  driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Confirmation client",
  needs_update: "Correction requise",
  confirmation_failed: "Confirmation échouée",
  confirmed_for_preparation: "Confirmé — prêt à préparer",
  preparing: "En préparation",
  ready_for_pickup: "Prête pour pickup",
  picked_up: "Récupérée",
  on_the_way: "En route",
  arriving_soon: "Arrivée imminente",
  delivered: "Livrée",
  cancelled: "Annulée",
  failed: "Échouée",
  refunded: "Remboursée",
};

export const STATUS_COLORS: Record<OrderStatus, "gray" | "blue" | "yellow" | "orange" | "green" | "red" | "purple"> = {
  draft: "gray",
  pending_dispatch: "blue",
  dispatching_driver: "blue",
  driver_assigned: "blue",
  awaiting_customer_confirmation: "yellow",
  needs_update: "orange",
  confirmation_failed: "red",
  confirmed_for_preparation: "green",
  preparing: "orange",
  ready_for_pickup: "purple",
  picked_up: "purple",
  on_the_way: "purple",
  arriving_soon: "purple",
  delivered: "green",
  cancelled: "red",
  failed: "red",
  refunded: "gray",
};

/**
 * Returns true if the restaurant's preparation is unlocked (can start preparing)
 */
export function isPrepUnlocked(status: OrderStatus): boolean {
  return status === "confirmed_for_preparation";
}

/**
 * Returns true if order is in an active delivery state
 */
export function isActiveDelivery(status: OrderStatus): boolean {
  return ["driver_assigned", "awaiting_customer_confirmation", "needs_update",
    "confirmation_failed", "confirmed_for_preparation", "preparing",
    "ready_for_pickup", "picked_up", "on_the_way", "arriving_soon"].includes(status);
}

/**
 * Returns true if order is terminal (no further transitions possible from normal flow)
 */
export function isTerminal(status: OrderStatus): boolean {
  return ["delivered", "cancelled", "failed", "refunded"].includes(status);
}
