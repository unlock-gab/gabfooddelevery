import React from "react";
import { formatDA } from "@/lib/format";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useListOrders } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import {
  Clock, ChevronRight, Package, Truck, CheckCircle,
  AlertCircle, ShoppingBag, RefreshCw
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: "Recherche livreur",
  dispatching_driver: "Dispatch",
  driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Confirmation attendue",
  needs_update: "Correction requise",
  confirmation_failed: "Client injoignable",
  confirmed_for_preparation: "Confirmé",
  preparing: "En préparation",
  ready_for_pickup: "Prêt pour collecte",
  picked_up: "Collecté",
  on_the_way: "En route",
  arriving_soon: "Arrivée imminente",
  delivered: "Livré",
  cancelled: "Annulé",
  failed: "Échoué",
  refunded: "Remboursé",
};

const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  pending_dispatch: { pill: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  dispatching_driver: { pill: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  driver_assigned: { pill: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  awaiting_customer_confirmation: { pill: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  needs_update: { pill: "bg-orange-50 text-orange-800 border-orange-300 font-semibold", dot: "bg-orange-500" },
  confirmation_failed: { pill: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  confirmed_for_preparation: { pill: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  preparing: { pill: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  ready_for_pickup: { pill: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  picked_up: { pill: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  on_the_way: { pill: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  arriving_soon: { pill: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  delivered: { pill: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  cancelled: { pill: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-400" },
  failed: { pill: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-400" },
  refunded: { pill: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" },
};

const ACTIVE_STATUSES = [
  "pending_dispatch", "dispatching_driver", "driver_assigned",
  "awaiting_customer_confirmation", "needs_update", "confirmation_failed",
  "confirmed_for_preparation", "preparing", "ready_for_pickup",
  "picked_up", "on_the_way", "arriving_soon",
];

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { pill: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" };
  const isActive = ACTIVE_STATUSES.includes(status) && status !== "cancelled" && status !== "failed";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${isActive ? "animate-pulse" : ""}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function OrderRow({ order }: { order: any }) {
  const isActive = ACTIVE_STATUSES.includes(order.status);
  const needsAction = order.status === "needs_update";
  const isDelivered = order.status === "delivered";

  return (
    <Link href={`/orders/${order.id}`}>
      <div className={`flex gap-4 p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer ${
        needsAction ? "border-orange-300 bg-orange-50/50" :
        isActive ? "border-primary/20 bg-primary/3" :
        isDelivered ? "bg-white border-gray-200" :
        "bg-white border-gray-200 opacity-80"
      }`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          isDelivered ? "bg-green-100" :
          needsAction ? "bg-orange-100" :
          isActive ? "bg-primary/10" :
          "bg-gray-100"
        }`}>
          {isDelivered ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : needsAction ? (
            <AlertCircle className="w-5 h-5 text-orange-600" />
          ) : isActive ? (
            <Truck className="w-5 h-5 text-primary" />
          ) : (
            <Package className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0">
              <div className="font-bold text-sm">{order.orderNumber}</div>
              <div className="text-xs text-muted-foreground truncate">{order.restaurantName}</div>
            </div>
            <StatusPill status={order.status} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              {order.items?.length > 0 && (
                <span>{order.items.length} article{order.items.length !== 1 ? "s" : ""}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-primary tabular-nums">{formatDA(order.total)}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </div>
          </div>

          {needsAction && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-orange-700">
              <AlertCircle className="w-3.5 h-3.5" />
              Votre adresse doit être corrigée — Appuyez pour corriger
            </div>
          )}
          {order.status === "awaiting_customer_confirmation" && (
            <div className="mt-2 text-xs font-medium text-amber-700 flex items-center gap-1">
              📞 Votre livreur va vous appeler — restez disponible
            </div>
          )}
          {order.status === "on_the_way" && (
            <div className="mt-2 text-xs font-medium text-blue-600 flex items-center gap-1">
              🛵 Votre repas est en route !
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
      <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
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
        <div className="container py-28 text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Connexion requise</h2>
          <p className="text-muted-foreground mb-5 text-sm">Connectez-vous pour accéder à vos commandes.</p>
          <Link href="/auth/login"><Button className="font-semibold">Se connecter</Button></Link>
        </div>
      </div>
    );
  }

  const orders = (data as any)?.orders ?? [];
  const active = orders.filter((o: any) => ACTIVE_STATUSES.includes(o.status));
  const past = orders.filter((o: any) => !ACTIVE_STATUSES.includes(o.status));
  const needsAction = active.filter((o: any) => o.status === "needs_update");

  return (
    <div className="min-h-screen bg-gray-50/60">
      <Navbar />
      <div className="container max-w-2xl py-7 space-y-6 pb-14">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">Mes commandes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? "Chargement..." : `${orders.length} commande${orders.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-medium" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-5">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <h2 className="text-xl font-bold mb-2">Aucune commande</h2>
            <p className="text-muted-foreground mb-6 text-sm">Votre historique apparaîtra ici après votre première commande.</p>
            <Link href="/restaurants">
              <Button className="gap-1.5 font-semibold">
                <ShoppingBag className="w-4 h-4" /> Découvrir les restaurants
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {needsAction.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                  <h2 className="font-bold text-sm text-orange-700">Action requise ({needsAction.length})</h2>
                </div>
                <div className="space-y-3">
                  {needsAction.map((o: any) => <OrderRow key={o.id} order={o} />)}
                </div>
              </section>
            )}

            {active.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary status-pulse" />
                  <h2 className="font-bold text-sm text-primary">En cours — {active.length} commande{active.length !== 1 ? "s" : ""}</h2>
                </div>
                <div className="space-y-3">
                  {active.filter((o: any) => o.status !== "needs_update").map((o: any) => <OrderRow key={o.id} order={o} />)}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                {active.length > 0 && <Separator className="mb-6" />}
                <h2 className="font-bold text-xs text-muted-foreground mb-3 uppercase tracking-widest px-1">Historique</h2>
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
