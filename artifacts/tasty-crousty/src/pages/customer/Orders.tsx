import React, { useState } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useListOrders } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import {
  Clock, ChevronRight, Package, Truck, CheckCircle,
  AlertCircle, ShoppingBag, RefreshCw, Star
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: "Recherche livreur",
  dispatching_driver: "Dispatch",
  driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "📞 Confirmation attendue",
  needs_update: "⚠️ Correction requise",
  confirmation_failed: "❌ Injoignable",
  confirmed_for_preparation: "✅ Confirmé",
  preparing: "🍳 En préparation",
  ready_for_pickup: "🛍️ Prêt pour collecte",
  picked_up: "📦 Collecté",
  on_the_way: "🛵 En route",
  arriving_soon: "📍 Arrivée imminente",
  delivered: "✅ Livré",
  cancelled: "❌ Annulé",
  failed: "❌ Échoué",
  refunded: "Remboursé",
};

const STATUS_COLORS: Record<string, string> = {
  pending_dispatch: "bg-blue-100 text-blue-800",
  dispatching_driver: "bg-blue-100 text-blue-800",
  driver_assigned: "bg-indigo-100 text-indigo-800",
  awaiting_customer_confirmation: "bg-amber-100 text-amber-800",
  needs_update: "bg-orange-100 text-orange-800 font-semibold",
  confirmation_failed: "bg-red-100 text-red-800",
  confirmed_for_preparation: "bg-green-100 text-green-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-indigo-100 text-indigo-800",
  picked_up: "bg-indigo-100 text-indigo-800",
  on_the_way: "bg-blue-100 text-blue-800",
  arriving_soon: "bg-teal-100 text-teal-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-700",
};

const ACTIVE_STATUSES = [
  "pending_dispatch", "dispatching_driver", "driver_assigned",
  "awaiting_customer_confirmation", "needs_update", "confirmation_failed",
  "confirmed_for_preparation", "preparing", "ready_for_pickup",
  "picked_up", "on_the_way", "arriving_soon",
];

function OrderRow({ order }: { order: any }) {
  const isActive = ACTIVE_STATUSES.includes(order.status);
  const needsAction = order.status === "needs_update";

  return (
    <Link href={`/orders/${order.id}`}>
      <div className={`flex gap-4 p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer ${
        needsAction ? "border-orange-300 bg-orange-50" :
        isActive ? "border-primary/20 bg-primary/5" :
        order.status === "delivered" ? "bg-white border-gray-200" :
        "bg-white border-gray-200 opacity-75"
      }`}>
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          order.status === "delivered" ? "bg-green-100" :
          needsAction ? "bg-orange-100" :
          isActive ? "bg-primary/10" :
          "bg-gray-100"
        }`}>
          {order.status === "delivered" ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : needsAction ? (
            <AlertCircle className="w-5 h-5 text-orange-600" />
          ) : isActive ? (
            <Truck className="w-5 h-5 text-primary" />
          ) : (
            <Package className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="font-bold text-sm">{order.orderNumber}</div>
              <div className="text-xs text-muted-foreground">{order.restaurantName}</div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span>{order.items?.length ?? 0} article{(order.items?.length ?? 0) !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-primary">{Number(order.total).toFixed(2)} €</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Action prompt */}
          {needsAction && (
            <div className="mt-2 text-xs font-semibold text-orange-700 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Votre adresse doit être corrigée — Appuyez pour corriger
            </div>
          )}
          {isActive && !needsAction && order.status === "awaiting_customer_confirmation" && (
            <div className="mt-2 text-xs font-medium text-amber-700">
              📞 Votre livreur va vous appeler — restez disponible
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-4 p-4 rounded-2xl border bg-white">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useListOrders({} as any, {
    query: { refetchInterval: 20000 },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container py-20 text-center max-w-md">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-2xl font-bold mb-2">Connexion requise</h2>
          <p className="text-muted-foreground mb-4">Connectez-vous pour voir vos commandes.</p>
          <Link href="/auth/login"><Button>Se connecter</Button></Link>
        </div>
      </div>
    );
  }

  const orders = data?.orders ?? [];
  const active = orders.filter((o: any) => ACTIVE_STATUSES.includes(o.status));
  const past = orders.filter((o: any) => !ACTIVE_STATUSES.includes(o.status));
  const needsAction = active.filter((o: any) => o.status === "needs_update");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container max-w-2xl py-6 space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mes commandes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? "Chargement..." : `${orders.length} commande${orders.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-bold mb-2">Aucune commande</h2>
            <p className="text-muted-foreground mb-5">Votre historique de commandes apparaîtra ici.</p>
            <Link href="/restaurants">
              <Button className="gap-1">
                <ShoppingBag className="w-4 h-4" /> Découvrir les restaurants
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Action required */}
            {needsAction.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <h2 className="font-bold text-sm text-orange-700">Action requise</h2>
                </div>
                <div className="space-y-3">
                  {needsAction.map((o: any) => <OrderRow key={o.id} order={o} />)}
                </div>
              </section>
            )}

            {/* Active orders */}
            {active.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <h2 className="font-bold text-sm text-primary">En cours ({active.length})</h2>
                </div>
                <div className="space-y-3">
                  {active.filter((o: any) => o.status !== "needs_update").map((o: any) => <OrderRow key={o.id} order={o} />)}
                </div>
              </section>
            )}

            {/* History */}
            {past.length > 0 && (
              <section>
                {active.length > 0 && <Separator className="mb-5" />}
                <h2 className="font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wider">Historique</h2>
                <div className="space-y-3">
                  {past.map((o: any) => <OrderRow key={o.id} order={o} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
