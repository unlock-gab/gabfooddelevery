export const formatDA = (amount: number): string => {
  return (
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
      Math.round(amount)
    ) + " DA"
  );
};

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending_dispatch: "Recherche livreur",
    dispatching_driver: "Dispatch en cours",
    driver_assigned: "Livreur assigné",
    awaiting_customer_confirmation: "Attente confirmation",
    confirmed_for_preparation: "Confirmé",
    preparing: "En préparation",
    ready_for_pickup: "Prêt pour récupération",
    picked_up: "Récupéré",
    on_the_way: "En route",
    arriving_soon: "Proche de vous",
    delivered: "Livré",
    cancelled: "Annulé",
    needs_update: "Correction requise",
    confirmation_failed: "Confirmation échouée",
  };
  return labels[status] ?? status;
};

export const getStatusColor = (status: string): string => {
  if (["delivered"].includes(status)) return "#22C55E";
  if (["cancelled", "confirmation_failed"].includes(status)) return "#EF4444";
  if (["preparing", "ready_for_pickup", "picked_up", "on_the_way", "arriving_soon"].includes(status)) return "#F0A000";
  return "#0BA5E9";
};
