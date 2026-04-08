import React from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useListOrders } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Clock, ChevronRight, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: "Recherche livreur",
  driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Confirmation attendue",
  confirmed_for_preparation: "Préparation autorisée",
  preparing: "En préparation",
  ready_for_pickup: "Prêt pour pickup",
  picked_up: "Récupéré",
  on_the_way: "En route",
  arriving_soon: "Proche",
  delivered: "Livré",
  cancelled: "Annulé",
  failed: "Échoué",
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  delivered: "default",
  cancelled: "destructive",
  failed: "destructive",
};

export default function Orders() {
  const { user } = useAuth();
  const { data, isLoading } = useListOrders({}, {
    query: { refetchInterval: 30000 }
  });

  if (!user) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container py-20 text-center">
        <Link href="/auth/login"><Button>Connexion</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />
      <div className="container max-w-3xl py-6">
        <h1 className="text-2xl font-bold mb-6">Mes commandes</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : !data?.orders?.length ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">Aucune commande</h2>
            <p className="text-muted-foreground mb-4">Commandez dès maintenant !</p>
            <Link href="/restaurants"><Button>Voir les restaurants</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.orders.map((order: any) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{order.orderNumber}</span>
                        <Badge variant={STATUS_BADGE[order.status] ?? "secondary"} className="text-xs">
                          {STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{order.restaurantName}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary">{Number(order.total).toFixed(2)} €</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
