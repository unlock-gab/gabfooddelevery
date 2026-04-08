import React, { useState, useEffect } from "react";
import { formatDA } from "@/lib/format";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useListOrders, useStartPreparing, useMarkOrderReady } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChefHat, CheckCircle, Package, RefreshCw, PauseCircle, PlayCircle,
  Lock, Clock, TrendingUp, AlertTriangle, ShoppingBag, Truck,
  Star, Zap, Plus, List, BarChart2, Menu, ArrowRight, Circle,
  MapPin, Phone, Users,
} from "lucide-react";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { cn } from "@/lib/utils";
import MenuManager from "./MenuManager";

const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: "Recherche livreur",
  dispatching_driver: "Dispatch en cours",
  driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Attente confirmation",
  needs_update: "Correction requise",
  confirmation_failed: "Confirmation échouée",
  confirmed_for_preparation: "À préparer",
  preparing: "En préparation",
  ready_for_pickup: "Prêt — pickup",
  picked_up: "Récupéré",
  on_the_way: "En route",
  arriving_soon: "Proche du client",
  delivered: "Livré",
  cancelled: "Annulé",
};

const STATUS_COLOR: Record<string, string> = {
  awaiting_customer_confirmation: "bg-orange-100 text-orange-800 border-orange-200",
  needs_update: "bg-red-100 text-red-800 border-red-200",
  confirmed_for_preparation: "bg-green-100 text-green-800 border-green-200",
  preparing: "bg-purple-100 text-purple-800 border-purple-200",
  ready_for_pickup: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-500 border-red-100",
  driver_assigned: "bg-amber-100 text-amber-800 border-amber-200",
  pending_dispatch: "bg-amber-50 text-amber-700 border-amber-100",
};

function timeAgo(dateStr: string) {
  const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "à l'instant";
  if (diff < 60) return `il y a ${diff} min`;
  return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function StatusChip({ status }: { status: string }) {
  const cls = STATUS_COLOR[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border", cls)}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function UrgencyDot({ minutes }: { minutes: number }) {
  if (minutes > 30) return <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Urgent" />;
  if (minutes > 15) return <span className="flex h-2 w-2 rounded-full bg-amber-400" title="Attentif" />;
  return <span className="flex h-2 w-2 rounded-full bg-green-400" title="Normal" />;
}

function OrderRow({ order, onAction }: { order: any; onAction: () => void }) {
  const { toast } = useToast();
  const startPreparing = useStartPreparing();
  const markReady = useMarkOrderReady();
  const waitMin = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000);

  const handleStart = () => {
    startPreparing.mutate({ orderId: order.id }, {
      onSuccess: () => { toast({ title: "Préparation commencée !" }); onAction(); },
      onError: (e: any) => toast({ title: "Erreur PrepLock™", description: e?.response?.data?.error ?? "Verrouillé", variant: "destructive" }),
    });
  };
  const handleReady = () => {
    markReady.mutate({ orderId: order.id }, {
      onSuccess: () => { toast({ title: "Commande prête !" }); onAction(); },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b last:border-0 hover:bg-slate-50/60 transition-colors group">
      <UrgencyDot minutes={waitMin} />
      <div className="w-28 shrink-0">
        <p className="font-mono text-xs font-bold text-slate-800">{order.orderNumber}</p>
        <p className="text-xs text-slate-400 mt-0.5">{timeAgo(order.createdAt)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-600 truncate">{order.deliveryAddress}</p>
        {order.driverName && (
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <Truck className="w-3 h-3" /> {order.driverName}
          </p>
        )}
      </div>
      <div className="w-20 text-right shrink-0">
        <p className="text-sm font-bold text-slate-800">{formatDA(order.total)}</p>
        <p className="text-xs text-slate-400">{order.items?.length ?? 0} art.</p>
      </div>
      <div className="w-36 shrink-0 flex justify-end">
        <StatusChip status={order.status} />
      </div>
      <div className="w-28 shrink-0 flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {order.status === "confirmed_for_preparation" && (
          <Button size="sm" className="h-7 text-xs px-3" onClick={handleStart} disabled={startPreparing.isPending}>
            <ChefHat className="w-3 h-3 mr-1" /> Commencer
          </Button>
        )}
        {order.status === "preparing" && (
          <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={handleReady} disabled={markReady.isPending}>
            <CheckCircle className="w-3 h-3 mr-1" /> Prêt
          </Button>
        )}
      </div>
    </div>
  );
}

function PrepLockSection({ orders }: { orders: any[] }) {
  if (orders.length === 0) return null;
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 mb-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100">
            <Lock className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 text-base">PrepLock™ — En attente</h3>
            <p className="text-xs text-amber-700 mt-0.5">
              {orders.length} commande{orders.length > 1 ? "s" : ""} en attente de confirmation
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-amber-200 text-amber-900 text-xs font-bold rounded-full">
          ⚠ Ne pas préparer
        </span>
      </div>
      <div className="bg-white/70 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-900">
        <p className="font-semibold mb-1">🔒 Préparation verrouillée</p>
        <p className="text-xs text-amber-800 leading-relaxed">
          Le livreur doit confirmer l'adresse de livraison avant que vous commenciez à préparer.
          Cela garantit que votre plat arrivera chaud. Attendez le signal <strong>"GO — À préparer"</strong>.
        </p>
      </div>
      <div className="space-y-2">
        {orders.map((o: any) => {
          const wait = Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000);
          return (
            <div key={o.id} className="flex items-center gap-3 bg-white/80 border border-amber-200 rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-700">{o.orderNumber}</span>
                  <StatusChip status={o.status} />
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">{o.deliveryAddress}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-800">{formatDA(o.total)}</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span className="text-xs text-amber-700 font-medium">{wait} min</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({ title, value, sub, icon, color, urgent }: {
  title: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; urgent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-2xl border p-4 flex flex-col gap-2 transition-all",
      urgent ? "border-amber-300 bg-amber-50" : "border-slate-100 bg-white hover:shadow-sm"
    )}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{title}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          {icon}
        </div>
      </div>
      <p className={cn("text-2xl font-black", urgent ? "text-amber-700" : "text-slate-900")}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

const NAV_ITEMS = [
  { id: "overview", icon: <BarChart2 className="w-4 h-4" />, label: "Tableau de bord" },
  { id: "orders",   icon: <List className="w-4 h-4" />,      label: "Commandes" },
  { id: "menu",     icon: <Menu className="w-4 h-4" />,      label: "Menu" },
];

export default function RestaurantDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [orderFilter, setOrderFilter] = useState("active");
  const [myRestaurant, setMyRestaurant] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const authorized = !!user && user.role === "restaurant";

  useEffect(() => {
    if (!authorized) return;
    const token = localStorage.getItem("tc_token");
    fetch("/api/restaurants/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(data => { if (data) setMyRestaurant(data); });
  }, [authorized]);

  useEffect(() => {
    if (!myRestaurant?.id) return;
    const token = localStorage.getItem("tc_token");
    fetch(`/api/restaurants/${myRestaurant.id}/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(data => { if (data) setStats(data); });
  }, [myRestaurant?.id]);

  const handleTogglePause = async () => {
    if (!myRestaurant) return;
    setPauseLoading(true);
    const token = localStorage.getItem("tc_token");
    const res = await fetch(`/api/restaurants/${myRestaurant.id}/toggle-pause`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const updated = await res.json(); setMyRestaurant(updated);
      toast({ title: updated.isPaused ? "Restaurant mis en pause" : "Restaurant réouvert" });
    }
    setPauseLoading(false);
  };

  if (!authorized) { setLocation("/auth/login"); return null; }

  const POLL = { refetchInterval: 12000 };
  const { data: confirmedData, refetch: r1 } = useListOrders({ status: "confirmed_for_preparation" }, { query: POLL });
  const { data: preparingData, refetch: r2 } = useListOrders({ status: "preparing" }, { query: POLL });
  const { data: pendingConfData, refetch: r3 } = useListOrders({ status: "awaiting_customer_confirmation" }, { query: POLL });
  const { data: readyData, refetch: r4 } = useListOrders({ status: "ready_for_pickup" }, { query: POLL });
  const { data: todayDeliveredData } = useListOrders({ status: "delivered" } as any, { query: { refetchInterval: 30000 } });
  const { data: todayCancelledData } = useListOrders({ status: "cancelled" } as any, { query: { refetchInterval: 30000 } });
  const { data: allOrdersData, refetch: r5 } = useListOrders({} as any, { query: { refetchInterval: 30000 } });

  const confirmed = confirmedData?.orders ?? [];
  const preparing = preparingData?.orders ?? [];
  const pendingConf = pendingConfData?.orders ?? [];
  const ready = readyData?.orders ?? [];
  const delivered = todayDeliveredData?.orders ?? [];
  const cancelled = todayCancelledData?.orders ?? [];
  const allOrders = allOrdersData?.orders ?? [];

  const refetchAll = () => { r1(); r2(); r3(); r4(); r5(); setLastRefresh(new Date()); qc.invalidateQueries(); };

  const totalActive = confirmed.length + preparing.length;
  const caJour = delivered.reduce((s: number, o: any) => s + (o.total ?? 0), 0);

  const getFilteredOrders = () => {
    switch (orderFilter) {
      case "pending": return pendingConf;
      case "confirmed": return confirmed;
      case "preparing": return preparing;
      case "ready": return ready;
      case "history": return allOrders.filter((o: any) => ["delivered","cancelled"].includes(o.status));
      default: return [...pendingConf, ...confirmed, ...preparing, ...ready];
    }
  };

  const restaurantStatus = myRestaurant?.isPaused ? "pause" : myRestaurant?.isOpen ? "open" : "closed";
  const statusBadge = {
    open:   { label: "Ouvert",    cls: "bg-green-100 text-green-700 border-green-200" },
    closed: { label: "Fermé",     cls: "bg-red-100 text-red-700 border-red-200" },
    pause:  { label: "En pause",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
  }[restaurantStatus];

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ═══ SIDEBAR ═══ */}
      <aside className="w-60 bg-white border-r flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-5 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{myRestaurant?.name ?? "Restaurant"}</p>
              <p className="text-xs text-slate-400">Dashboard</p>
            </div>
          </div>
        </div>

        {/* Restaurant info */}
        <div className="px-4 py-3 border-b bg-slate-50/50">
          {statusBadge && (
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border mb-2", statusBadge.cls)}>
              <Circle className="w-1.5 h-1.5 fill-current" /> {statusBadge.label}
            </span>
          )}
          {myRestaurant && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{myRestaurant.address}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Phone className="w-3 h-3 shrink-0" />
                <span>{myRestaurant.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3 h-3 shrink-0" />
                <span>Prépa. ~{myRestaurant.estimatedPrepTime} min</span>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                tab === item.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {item.icon}
              {item.label}
              {item.id === "orders" && totalActive + pendingConf.length > 0 && (
                <span className={cn(
                  "ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full",
                  tab === "orders" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                )}>
                  {totalActive + pendingConf.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t space-y-2">
          <button
            onClick={handleTogglePause}
            disabled={pauseLoading}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
              myRestaurant?.isPaused
                ? "bg-green-50 text-green-700 hover:bg-green-100"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            )}
          >
            {myRestaurant?.isPaused
              ? <><PlayCircle className="w-4 h-4" /> Réouvrir le restaurant</>
              : <><PauseCircle className="w-4 h-4" /> Mettre en pause</>
            }
          </button>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400">{user.name}</span>
            <button onClick={() => { logout(); setLocation("/"); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main className="flex-1 overflow-auto">

        {/* Top action bar */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900">
              {tab === "overview" ? "Tableau de bord" : tab === "orders" ? "Gestion des commandes" : "Menu"}
            </h1>
            <p className="text-xs text-slate-400">
              Actualisé {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={refetchAll}>
              <RefreshCw className="w-3 h-3" /> Actualiser
            </Button>
            {tab !== "menu" && (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setTab("menu")}>
                <Package className="w-3 h-3" /> Gérer menu
              </Button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5 max-w-6xl">

          {/* ═══ MENU TAB ═══ */}
          {tab === "menu" && myRestaurant && <MenuManager restaurantId={myRestaurant.id} />}
          {tab === "menu" && !myRestaurant && (
            <div className="text-center py-20 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Chargement…</p>
            </div>
          )}

          {/* ═══ OVERVIEW TAB ═══ */}
          {tab === "overview" && <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              <KpiCard
                title="Attente confirmation"
                value={pendingConf.length}
                sub="PrepLock™ actif"
                icon={<Lock className="w-4 h-4 text-amber-700" />}
                color="bg-amber-100"
                urgent={pendingConf.length > 0}
              />
              <KpiCard
                title="À préparer"
                value={confirmed.length}
                sub="Confirmés"
                icon={<Zap className="w-4 h-4 text-green-700" />}
                color="bg-green-100"
              />
              <KpiCard
                title="En préparation"
                value={preparing.length}
                sub="En cuisine"
                icon={<ChefHat className="w-4 h-4 text-purple-700" />}
                color="bg-purple-100"
              />
              <KpiCard
                title="Prêts — pickup"
                value={ready.length}
                sub="Attendent livreur"
                icon={<CheckCircle className="w-4 h-4 text-blue-700" />}
                color="bg-blue-100"
              />
              <KpiCard
                title="Livrées aujourd'hui"
                value={delivered.length}
                sub="Complétées"
                icon={<TrendingUp className="w-4 h-4 text-emerald-700" />}
                color="bg-emerald-100"
              />
              <KpiCard
                title="Annulées"
                value={cancelled.length}
                sub="Aujourd'hui"
                icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
                color="bg-red-50"
              />
              <KpiCard
                title="CA du jour"
                value={formatDA(caJour)}
                sub={`${delivered.length} livraison${delivered.length !== 1 ? "s" : ""}`}
                icon={<ShoppingBag className="w-4 h-4 text-indigo-700" />}
                color="bg-indigo-100"
              />
              {stats && (
                <KpiCard
                  title="Note moyenne"
                  value={stats.avgRating ? `${Number(stats.avgRating).toFixed(1)} ★` : "—"}
                  sub={`${stats.totalOrders} commandes total`}
                  icon={<Star className="w-4 h-4 text-yellow-600" />}
                  color="bg-yellow-100"
                />
              )}
            </div>

            {/* PrepLock focus */}
            <PrepLockSection orders={pendingConf} />

            {/* Active orders */}
            {totalActive > 0 || ready.length > 0 ? (
              <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <h2 className="font-bold text-slate-900 text-sm">Commandes actives</h2>
                    <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {totalActive + ready.length}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-primary" onClick={() => setTab("orders")}>
                    Tout voir <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[auto_1fr_5rem_9rem_7rem] gap-4 px-4 py-2 bg-slate-50 border-b text-xs font-semibold text-slate-400 uppercase tracking-wide items-center">
                  <span className="w-4" />
                  <span>Commande · Adresse</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Statut</span>
                  <span />
                </div>

                {[...confirmed, ...preparing, ...ready].slice(0, 8).map(order => (
                  <OrderRow key={order.id} order={order} onAction={refetchAll} />
                ))}
              </Card>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <ChefHat className="w-8 h-8 text-slate-300" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Aucune commande active</p>
                  <p className="text-sm text-slate-400 mt-1">Les nouvelles commandes s'afficheront ici automatiquement.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setTab("menu")}>
                    <Plus className="w-3.5 h-3.5" /> Ajouter un produit
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={refetchAll}>
                    <RefreshCw className="w-3.5 h-3.5" /> Actualiser
                  </Button>
                </div>
                {stats && (
                  <div className="flex gap-6 mt-2 text-xs text-slate-400">
                    <span>📦 {stats.totalOrders} commandes total</span>
                    <span>💰 {formatDA(stats.revenue)} de CA</span>
                    {stats.avgRating && <span>⭐ {Number(stats.avgRating).toFixed(1)} de note</span>}
                  </div>
                )}
              </div>
            )}

            {/* Performance + Quick actions */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Performance */}
              {stats && (
                <Card className="rounded-2xl shadow-sm">
                  <div className="px-5 py-4 border-b flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-slate-400" />
                    <h3 className="font-bold text-sm text-slate-800">Performance</h3>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    {[
                      { label: "Commandes total", value: stats.totalOrders },
                      { label: "Chiffre d'affaires", value: formatDA(stats.revenue) },
                      { label: "Temps moyen prépa.", value: `${stats.avgPrepTime ?? myRestaurant?.estimatedPrepTime ?? "—"} min` },
                      { label: "Taux d'annulation", value: `${stats.cancellationRate ?? 0}%` },
                      { label: "Note moyenne", value: stats.avgRating ? `${Number(stats.avgRating).toFixed(1)} / 5 ★` : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-1.5 border-b last:border-0">
                        <span className="text-sm text-slate-500">{label}</span>
                        <span className="text-sm font-bold text-slate-800">{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Quick actions */}
              <Card className="rounded-2xl shadow-sm">
                <div className="px-5 py-4 border-b flex items-center gap-2">
                  <Zap className="w-4 h-4 text-slate-400" />
                  <h3 className="font-bold text-sm text-slate-800">Actions rapides</h3>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: <Plus className="w-4 h-4" />,       label: "Ajouter produit",     action: () => setTab("menu") },
                      { icon: <Menu className="w-4 h-4" />,       label: "Gérer menu",           action: () => setTab("menu") },
                      { icon: <List className="w-4 h-4" />,       label: "Voir commandes",       action: () => setTab("orders") },
                      { icon: <Users className="w-4 h-4" />,      label: "Historique",           action: () => { setTab("orders"); setOrderFilter("history"); } },
                      { icon: <PauseCircle className="w-4 h-4" />, label: myRestaurant?.isPaused ? "Réouvrir" : "Mettre en pause", action: handleTogglePause },
                      { icon: <RefreshCw className="w-4 h-4" />,  label: "Actualiser",           action: refetchAll },
                    ].map(({ icon, label, action }) => (
                      <button
                        key={label}
                        onClick={action}
                        className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all text-left text-sm text-slate-700 font-medium"
                      >
                        <span className="text-primary">{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>}

          {/* ═══ ORDERS TAB ═══ */}
          {tab === "orders" && <>
            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
              {[
                { id: "active",    label: "Actives",         count: totalActive + ready.length + pendingConf.length },
                { id: "pending",   label: "Attente conf.",   count: pendingConf.length },
                { id: "confirmed", label: "À préparer",      count: confirmed.length },
                { id: "preparing", label: "En préparation",  count: preparing.length },
                { id: "ready",     label: "Prêtes pickup",   count: ready.length },
                { id: "history",   label: "Historique",      count: null },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setOrderFilter(f.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    orderFilter === f.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {f.label}
                  {f.count !== null && f.count > 0 && (
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold",
                      orderFilter === f.id ? "bg-primary text-white" : "bg-slate-200 text-slate-600"
                    )}>{f.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* PrepLock focus only on pending tab */}
            {orderFilter === "pending" && <PrepLockSection orders={pendingConf} />}

            {/* Orders table */}
            {getFilteredOrders().length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
                <ChefHat className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">Aucune commande dans cette catégorie</p>
              </div>
            ) : (
              <Card className="rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-[auto_1fr_5rem_9rem_7rem] gap-4 px-4 py-2.5 bg-slate-50 border-b text-xs font-semibold text-slate-400 uppercase tracking-wide items-center">
                  <span className="w-4" />
                  <span>Commande · Adresse</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Statut</span>
                  <span />
                </div>
                {getFilteredOrders().map(order => (
                  <OrderRow key={order.id} order={order} onAction={refetchAll} />
                ))}
              </Card>
            )}
          </>}
        </div>
      </main>
    </div>
  );
}
