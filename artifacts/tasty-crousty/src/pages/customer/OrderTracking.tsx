import React from "react";
import { useParams, Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderTimeline } from "@/components/ui/OrderTimeline";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { useGetOrder } from "@workspace/api-client-react";
import { ChevronLeft, Package, User, Phone, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  pending_dispatch: "En attente de livreur",
  dispatching_driver: "Recherche d'un livreur",
  driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Confirmation en attente",
  needs_update: "Correction requise",
  confirmation_failed: "Confirmation échouée",
  confirmed_for_preparation: "Confirmé — Préparation autorisée",
  preparing: "En cours de préparation",
  ready_for_pickup: "Prêt pour récupération",
  picked_up: "Récupéré par le livreur",
  on_the_way: "En route",
  arriving_soon: "Livreur proche",
  delivered: "Livré",
  cancelled: "Annulé",
  failed: "Échoué",
  refunded: "Remboursé",
};

const STATUS_COLORS: Record<string, string> = {
  pending_dispatch: "bg-yellow-100 text-yellow-800",
  dispatching_driver: "bg-blue-100 text-blue-800",
  driver_assigned: "bg-blue-100 text-blue-800",
  awaiting_customer_confirmation: "bg-orange-100 text-orange-800",
  confirmed_for_preparation: "bg-green-100 text-green-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-indigo-100 text-indigo-800",
  picked_up: "bg-indigo-100 text-indigo-800",
  on_the_way: "bg-blue-100 text-blue-800",
  arriving_soon: "bg-teal-100 text-teal-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
};

export default function OrderTracking() {
  const params = useParams<{ orderId: string }>();
  const orderId = Number(params.orderId);
  const qc = useQueryClient();

  const { data: order, isLoading, refetch } = useGetOrder(orderId, {
    query: { refetchInterval: 15000 }
  });

  if (isLoading) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container max-w-3xl py-12 text-center text-muted-foreground">Chargement de la commande...</div>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container max-w-3xl py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Commande introuvable</h2>
        <Link href="/orders"><Button className="mt-4">Mes commandes</Button></Link>
      </div>
    </div>
  );

  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const statusColor = STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800";
  const isActive = !["delivered", "cancelled", "failed", "refunded"].includes(order.status);

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />
      <div className="container max-w-3xl py-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="-ml-2">
              <ChevronLeft className="w-4 h-4 mr-1" /> Mes commandes
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
          </Button>
        </div>

        {/* Status header */}
        <Card className="mb-6 border-2 border-primary/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl font-bold mb-1">Commande {order.orderNumber}</h1>
                <p className="text-sm text-muted-foreground">{order.restaurantName}</p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusColor}`}>
                {statusLabel}
              </span>
            </div>

            {/* Confirmation indicator */}
            {order.status === "awaiting_customer_confirmation" && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-800 font-medium">
                  ⏳ Votre livreur va vous contacter pour confirmer la commande. Restez disponible !
                </p>
              </div>
            )}
            {order.status === "confirmed_for_preparation" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800 font-medium">
                  ✅ Confirmée ! Le restaurant commence la préparation.
                </p>
              </div>
            )}
            {order.status === "delivered" && order.qrToken && (
              <div className="mt-4">
                <QRCodeDisplay token={order.qrToken} orderId={order.id} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Suivi</CardTitle>
            </CardHeader>
            <CardContent>
              {order.statusHistory && <OrderTimeline history={order.statusHistory} />}
            </CardContent>
          </Card>

          {/* Order summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantity}× {item.productName}</span>
                    <span className="font-medium">{(item.price * item.quantity).toFixed(2)} €</span>
                  </div>
                ))}
                <Separator />
                <div className="text-sm space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Sous-total</span>
                    <span>{Number(order.subtotal).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Livraison</span>
                    <span>{Number(order.deliveryFee).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-primary">{Number(order.total).toFixed(2)} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Livraison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">{order.deliveryAddress}</p>
                {order.deliveryLandmark && <p className="text-muted-foreground">Repère: {order.deliveryLandmark}</p>}
                {order.deliveryFloor && <p className="text-muted-foreground">Étage: {order.deliveryFloor}</p>}
                {order.driverName && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-medium">{order.driverName}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
