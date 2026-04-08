import React, { useState } from "react";
import { formatDA } from "@/lib/format";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrepLockIndicator } from "@/components/ui/PrepLockIndicator";
import { StatCard } from "@/components/ui/StatCard";
import { useListOrders, useGetRestaurantStats, useStartPreparing, useMarkOrderReady, useGetRestaurant } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Clock, TrendingUp, ChefHat, CheckCircle, Package, RefreshCw, PauseCircle, PlayCircle } from "lucide-react";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { Separator } from "@/components/ui/separator";
import MenuManager from "./MenuManager";

const ACTIVE_STATUSES = [
  "confirmed_for_preparation",
  "preparing",
  "ready_for_pickup",
];

const PENDING_STATUSES = [
  "pending_dispatch",
  "dispatching_driver",
  "driver_assigned",
  "awaiting_customer_confirmation",
];

const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: "Recherche livreur",
  dispatching_driver: "Dispatch",
  driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Attente confirmation",
  needs_update: "Correction requise",
  confirmation_failed: "Confirmation échouée",
  confirmed_for_preparation: "Confirmé — À préparer",
  preparing: "En préparation",
  ready_for_pickup: "Prêt pour pickup",
  picked_up: "Récupéré",
  on_the_way: "En route",
  arriving_soon: "Proche du client",
  delivered: "Livré",
  cancelled: "Annulé",
};

function OrderCard({ order, onAction }: { order: any; onAction: () => void }) {
  const { toast } = useToast();
  const startPreparing = useStartPreparing();
  const markReady = useMarkOrderReady();

  const handleStartPrepare = () => {
    startPreparing.mutate(
      { orderId: order.id },
      {
        onSuccess: () => {
          toast({ title: "Préparation commencée !" });
          onAction();
        },
        onError: (e: any) => {
          toast({ title: "Erreur", description: e?.response?.data?.error ?? "Préparation verrouillée", variant: "destructive" });
        }
      }
    );
  };

  const handleMarkReady = () => {
    markReady.mutate(
      { orderId: order.id },
      {
        onSuccess: () => {
          toast({ title: "Commande prête pour le pickup !" });
          onAction();
        },
        onError: () => {
          toast({ title: "Erreur", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Card className="border-l-4 border-l-primary/40 hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-bold text-sm">{order.orderNumber}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {new Date(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        <PrepLockIndicator status={order.status} className="mb-3" />

        <div className="space-y-1 mb-3">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
              <span>{item.quantity}× {item.productName}</span>
              <span>{formatDA(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <Separator className="mb-3" />

        <div className="flex items-center justify-between">
          <span className="font-bold text-primary">{formatDA(order.total)}</span>
          <div className="flex gap-2">
            {order.status === "confirmed_for_preparation" && (
              <Button size="sm" onClick={handleStartPrepare} disabled={startPreparing.isPending} className="text-xs h-7">
                <ChefHat className="w-3 h-3 mr-1" /> Commencer
              </Button>
            )}
            {order.status === "preparing" && (
              <Button size="sm" variant="outline" onClick={handleMarkReady} disabled={markReady.isPending} className="text-xs h-7">
                <CheckCircle className="w-3 h-3 mr-1" /> Prêt
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RestaurantDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("active");
  const [myRestaurant, setMyRestaurant] = React.useState<any>(null);
  const [pauseLoading, setPauseLoading] = React.useState(false);

  const authorized = !!user && user.role === "restaurant";

  React.useEffect(() => {
    if (!authorized) return;
    const token = localStorage.getItem("tc_token");
    fetch("/api/restaurants/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMyRestaurant(data); })
      .catch(() => {});
  }, [authorized]);

  const handleTogglePause = async () => {
    if (!myRestaurant) return;
    setPauseLoading(true);
    const token = localStorage.getItem("tc_token");
    const res = await fetch(`/api/restaurants/${myRestaurant.id}/toggle-pause`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const updated = await res.json();
      setMyRestaurant(updated);
      toast({ title: updated.isPaused ? "Restaurant mis en pause" : "Restaurant réouvert" });
    }
    setPauseLoading(false);
  };

  if (!authorized) {
    setLocation("/auth/login");
    return null;
  }

  const { data: activeOrders, refetch: refetchActive, isLoading: loadingActive } = useListOrders({ status: "confirmed_for_preparation" }, { query: { refetchInterval: 15000 } });
  const { data: preparingOrders, refetch: refetchPreparing } = useListOrders({ status: "preparing" }, { query: { refetchInterval: 15000 } });
  const { data: pendingOrders, refetch: refetchPending } = useListOrders({ status: "awaiting_customer_confirmation" }, { query: { refetchInterval: 15000 } });
  const { data: readyOrders, refetch: refetchReady } = useListOrders({ status: "ready_for_pickup" }, { query: { refetchInterval: 15000 } });

  const refetchAll = () => {
    refetchActive();
    refetchPreparing();
    refetchPending();
    refetchReady();
  };

  const confirmedOrders = activeOrders?.orders ?? [];
  const inPreparation = preparingOrders?.orders ?? [];
  const awaitingConf = pendingOrders?.orders ?? [];
  const readyForPickup = readyOrders?.orders ?? [];

  const totalActive = confirmedOrders.length + inPreparation.length;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-bold text-lg text-primary">TastyCrousty</h1>
          <p className="text-xs text-muted-foreground">Dashboard Restaurant</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: "active", icon: <ChefHat className="w-4 h-4 mr-2" />, label: "Commandes actives" },
            { id: "menu",   icon: <Package className="w-4 h-4 mr-2" />,  label: "Menu" },
            { id: "stats",  icon: <TrendingUp className="w-4 h-4 mr-2" />, label: "Statistiques" },
          ].map(item => (
            <Button
              key={item.id}
              variant={tab === item.id ? "default" : "ghost"}
              className="w-full justify-start text-sm h-9"
              onClick={() => setTab(item.id)}
            >
              {item.icon} {item.label}
            </Button>
          ))}
        </nav>
        <div className="p-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">{user.name}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => { logout(); setLocation("/"); }}>
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Tableau de bord</h2>
              <p className="text-sm text-muted-foreground">Gérez vos commandes en temps réel</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              {myRestaurant && (
                <Button
                  variant={myRestaurant.isPaused ? "destructive" : "outline"}
                  size="sm"
                  onClick={handleTogglePause}
                  disabled={pauseLoading}
                  className="gap-1.5"
                >
                  {myRestaurant.isPaused
                    ? <><PlayCircle className="w-4 h-4" /> Réouvrir</>
                    : <><PauseCircle className="w-4 h-4" /> Pause</>
                  }
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={refetchAll}>
                <RefreshCw className="w-4 h-4 mr-1" /> Actualiser
              </Button>
            </div>
          </div>

          {/* ======= MENU TAB ======= */}
          {tab === "menu" && myRestaurant && (
            <MenuManager restaurantId={myRestaurant.id} />
          )}
          {tab === "menu" && !myRestaurant && (
            <div className="text-center py-20 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Chargement du restaurant…</p>
            </div>
          )}

          {/* ======= STATS TAB ======= */}
          {tab === "stats" && (
            <div className="text-center py-20 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Statistiques disponibles prochainement</p>
            </div>
          )}

          {/* ======= ACTIVE ORDERS TAB ======= */}
          {tab === "active" && <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="À préparer"
              value={confirmedOrders.length}
              icon={<ChefHat className="w-5 h-5" />}
              variant="success"
            />
            <StatCard
              title="En préparation"
              value={inPreparation.length}
              icon={<Clock className="w-5 h-5" />}
              variant="warning"
            />
            <StatCard
              title="Attente conf."
              value={awaitingConf.length}
              icon={<ShoppingBag className="w-5 h-5" />}
            />
            <StatCard
              title="Prêt pickup"
              value={readyForPickup.length}
              icon={<CheckCircle className="w-5 h-5" />}
              variant="info"
            />
          </div>

          {/* Orders */}
          <div className="space-y-6">
            {/* À préparer NOW */}
            {confirmedOrders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <h3 className="font-bold text-green-700">GO — À préparer maintenant ({confirmedOrders.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {confirmedOrders.map((order: any) => (
                    <OrderCard key={order.id} order={order} onAction={refetchAll} />
                  ))}
                </div>
              </section>
            )}

            {/* En préparation */}
            {inPreparation.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <h3 className="font-semibold text-amber-700">En préparation ({inPreparation.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inPreparation.map((order: any) => (
                    <OrderCard key={order.id} order={order} onAction={refetchAll} />
                  ))}
                </div>
              </section>
            )}

            {/* Prêt */}
            {readyForPickup.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <h3 className="font-semibold text-blue-700">Prêt pour pickup ({readyForPickup.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {readyForPickup.map((order: any) => (
                    <OrderCard key={order.id} order={order} onAction={refetchAll} />
                  ))}
                </div>
              </section>
            )}

            {/* Attente confirmation */}
            {awaitingConf.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <h3 className="font-semibold text-orange-700">En attente de confirmation client ({awaitingConf.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {awaitingConf.map((order: any) => (
                    <OrderCard key={order.id} order={order} onAction={refetchAll} />
                  ))}
                </div>
              </section>
            )}

            {totalActive === 0 && awaitingConf.length === 0 && readyForPickup.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Aucune commande active</p>
                <p className="text-sm mt-1">Les nouvelles commandes apparaîtront ici automatiquement.</p>
              </div>
            )}
          </div>
          </>}
        </div>
      </main>
    </div>
  );
}
