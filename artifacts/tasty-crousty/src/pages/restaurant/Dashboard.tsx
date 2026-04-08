import React, { useState, useEffect } from "react";
import { formatDA } from "@/lib/format";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useListOrders, useStartPreparing, useMarkOrderReady } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChefHat, CheckCircle, Package, RefreshCw, PauseCircle, PlayCircle,
  Lock, Clock, TrendingUp, AlertTriangle, ShoppingBag, Truck,
  Star, Zap, Plus, List, BarChart2, Menu as MenuIcon, ArrowRight,
  MapPin, Phone, LogOut, Bell, Utensils, XCircle,
} from "lucide-react";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { cn } from "@/lib/utils";
import MenuManager from "./MenuManager";

/* ─── constants ──────────────────────────────────────────────────────────── */

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
  confirmed_for_preparation: "bg-emerald-100 text-emerald-800 border-emerald-200",
  preparing: "bg-violet-100 text-violet-800 border-violet-200",
  ready_for_pickup: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-slate-100 text-slate-500 border-slate-200",
  cancelled: "bg-red-50 text-red-500 border-red-100",
  driver_assigned: "bg-amber-100 text-amber-800 border-amber-200",
  pending_dispatch: "bg-amber-50 text-amber-700 border-amber-100",
};

const KPI_META = [
  { key: "lock",     title: "Attente conf.",   color: "from-orange-500 to-amber-400",  textColor: "text-orange-600",  bg: "bg-orange-50",   border: "border-l-orange-400" },
  { key: "confirm",  title: "À préparer",      color: "from-emerald-500 to-green-400", textColor: "text-emerald-700", bg: "bg-emerald-50",  border: "border-l-emerald-400" },
  { key: "prep",     title: "En préparation",  color: "from-violet-500 to-purple-400", textColor: "text-violet-700",  bg: "bg-violet-50",   border: "border-l-violet-400" },
  { key: "ready",    title: "Prêts — pickup",  color: "from-blue-500 to-sky-400",      textColor: "text-blue-700",    bg: "bg-blue-50",     border: "border-l-blue-400" },
  { key: "done",     title: "Livrées",         color: "from-teal-500 to-emerald-400",  textColor: "text-teal-700",    bg: "bg-teal-50",     border: "border-l-teal-400" },
  { key: "cancel",   title: "Annulées",        color: "from-red-500 to-rose-400",      textColor: "text-red-600",     bg: "bg-red-50",      border: "border-l-red-400" },
  { key: "ca",       title: "CA du jour",      color: "from-indigo-500 to-blue-400",   textColor: "text-indigo-700",  bg: "bg-indigo-50",   border: "border-l-indigo-400" },
  { key: "rating",   title: "Note moyenne",    color: "from-yellow-500 to-amber-300",  textColor: "text-yellow-700",  bg: "bg-yellow-50",   border: "border-l-yellow-400" },
];

/* ─── helpers ────────────────────────────────────────────────────────────── */

function timeAgo(dateStr: string) {
  const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "à l'instant";
  if (diff < 60) return `${diff} min`;
  return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function todayStr() {
  return new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

/* ─── sub-components ─────────────────────────────────────────────────────── */

function StatusChip({ status }: { status: string }) {
  const cls = STATUS_COLOR[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap", cls)}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function UrgencyBar({ minutes }: { minutes: number }) {
  const color = minutes > 30 ? "bg-red-500" : minutes > 15 ? "bg-amber-400" : "bg-emerald-400";
  return <span className={cn("flex h-full w-1 rounded-full absolute left-0 top-0", color)} />;
}

function KpiCard({
  meta, value, sub, pulse,
}: {
  meta: typeof KPI_META[0]; value: string | number; sub?: string; pulse?: boolean;
}) {
  return (
    <div className={cn(
      "relative bg-white rounded-2xl border border-slate-100 border-l-4 px-5 py-4 shadow-sm hover:shadow-md transition-all",
      meta.border
    )}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">{meta.title}</p>
      <div className="flex items-end justify-between gap-2">
        <p className={cn("text-3xl font-black leading-none", meta.textColor)}>{value}</p>
        {pulse && <span className="flex h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse mb-0.5" />}
      </div>
      {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
    </div>
  );
}

function OrderCard({ order, onAction, compact }: { order: any; onAction: () => void; compact?: boolean }) {
  const { toast } = useToast();
  const startPreparing = useStartPreparing();
  const markReady = useMarkOrderReady();
  const waitMin = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000);

  const handleStart = () =>
    startPreparing.mutate({ orderId: order.id }, {
      onSuccess: () => { toast({ title: "Préparation commencée !" }); onAction(); },
      onError: (e: any) => toast({ title: "PrepLock™ actif", description: e?.response?.data?.error ?? "Verrouillé", variant: "destructive" }),
    });

  const handleReady = () =>
    markReady.mutate({ orderId: order.id }, {
      onSuccess: () => { toast({ title: "Commande prête !" }); onAction(); },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });

  if (compact) {
    return (
      <div className="relative flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-slate-50 group transition-colors overflow-hidden">
        <UrgencyBar minutes={waitMin} />
        <div className="w-24 shrink-0 ml-2">
          <p className="font-mono text-xs font-bold text-slate-700">{order.orderNumber}</p>
          <p className="text-[11px] text-slate-400">{timeAgo(order.createdAt)}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 truncate font-medium">{order.deliveryAddress}</p>
          {order.driverName && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <Truck className="w-3 h-3" /> {order.driverName}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800">{formatDA(order.total)}</p>
            <p className="text-[11px] text-slate-400">{order.items?.length ?? 0} art.</p>
          </div>
          <StatusChip status={order.status} />
          <div className="w-24 flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {order.status === "confirmed_for_preparation" && (
              <Button size="sm" className="h-7 text-xs px-2.5 rounded-lg" onClick={handleStart} disabled={startPreparing.isPending}>
                <ChefHat className="w-3 h-3 mr-1" /> GO
              </Button>
            )}
            {order.status === "preparing" && (
              <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 rounded-lg" onClick={handleReady} disabled={markReady.isPending}>
                <CheckCircle className="w-3 h-3 mr-1" /> Prêt
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      <UrgencyBar minutes={waitMin} />
      <div className="ml-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-mono text-xs font-bold text-slate-500">{order.orderNumber}</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{formatDA(order.total)}</p>
          </div>
          <StatusChip status={order.status} />
        </div>
        <p className="text-xs text-slate-500 truncate mb-1">{order.deliveryAddress}</p>
        {order.driverName && (
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Truck className="w-3 h-3" /> {order.driverName}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="w-3 h-3" /> {waitMin} min d'attente
          </div>
          {order.status === "confirmed_for_preparation" && (
            <Button size="sm" className="h-7 text-xs px-3 rounded-xl" onClick={handleStart} disabled={startPreparing.isPending}>
              <ChefHat className="w-3 h-3 mr-1.5" /> Commencer
            </Button>
          )}
          {order.status === "preparing" && (
            <Button size="sm" variant="outline" className="h-7 text-xs px-3 rounded-xl" onClick={handleReady} disabled={markReady.isPending}>
              <CheckCircle className="w-3 h-3 mr-1.5" /> Marquer prêt
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PrepLockBanner({ orders }: { orders: any[] }) {
  if (orders.length === 0) return null;
  return (
    <div className="rounded-2xl overflow-hidden border border-amber-200 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">PrepLock™ — {orders.length} commande{orders.length > 1 ? "s" : ""} bloquée{orders.length > 1 ? "s" : ""}</p>
            <p className="text-amber-100 text-xs mt-0.5">Attente de confirmation livreur</p>
          </div>
        </div>
        <span className="bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30">
          ⚠ NE PAS PRÉPARER
        </span>
      </div>
      {/* Body */}
      <div className="bg-amber-50 px-5 py-3 border-b border-amber-200">
        <p className="text-xs text-amber-800 leading-relaxed">
          🔒 <strong>Préparation verrouillée.</strong> Le livreur doit confirmer l'adresse avant que vous commenciez.
          Cela garantit un plat chaud à la livraison. Attendez le signal <strong>« GO — À préparer »</strong>.
        </p>
      </div>
      <div className="bg-white divide-y divide-amber-100">
        {orders.map((o: any) => {
          const wait = Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000);
          return (
            <div key={o.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-600">{o.orderNumber}</span>
                  <StatusChip status={o.status} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{o.deliveryAddress}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-800">{formatDA(o.total)}</p>
                <p className="text-xs text-amber-600 font-medium flex items-center justify-end gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> {wait} min
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyOrders({ onAddProduct, onRefresh }: { onAddProduct: () => void; onRefresh: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
        <Utensils className="w-10 h-10 text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">Aucune commande active</h3>
      <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed mb-6">
        Votre cuisine est prête. Les nouvelles commandes apparaissent ici automatiquement — pas besoin de rafraîchir.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" className="gap-2 rounded-xl" onClick={onRefresh}>
          <RefreshCw className="w-3.5 h-3.5" /> Vérifier
        </Button>
        <Button size="sm" className="gap-2 rounded-xl" onClick={onAddProduct}>
          <Plus className="w-3.5 h-3.5" /> Ajouter un produit
        </Button>
      </div>
    </div>
  );
}

/* ─── nav items ──────────────────────────────────────────────────────────── */

const NAV = [
  { id: "overview", icon: BarChart2, label: "Tableau de bord" },
  { id: "orders",   icon: List,      label: "Commandes" },
  { id: "menu",     icon: MenuIcon,  label: "Menu" },
];

/* ─── main component ─────────────────────────────────────────────────────── */

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
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMyRestaurant(data); });
  }, [authorized]);

  useEffect(() => {
    if (!myRestaurant?.id) return;
    const token = localStorage.getItem("tc_token");
    fetch(`/api/restaurants/${myRestaurant.id}/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); });
  }, [myRestaurant?.id]);

  const handleTogglePause = async () => {
    if (!myRestaurant) return;
    setPauseLoading(true);
    const token = localStorage.getItem("tc_token");
    const res = await fetch(`/api/restaurants/${myRestaurant.id}/toggle-pause`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const updated = await res.json();
      setMyRestaurant(updated);
      toast({ title: updated.isPaused ? "Restaurant mis en pause" : "Restaurant réouvert" });
    }
    setPauseLoading(false);
  };

  if (!authorized) { setLocation("/auth/login"); return null; }

  const POLL = { refetchInterval: 12000 };
  const { data: confirmedData, refetch: r1 } = useListOrders({ status: "confirmed_for_preparation" }, { query: POLL });
  const { data: preparingData,  refetch: r2 } = useListOrders({ status: "preparing" }, { query: POLL });
  const { data: pendingConfData, refetch: r3 } = useListOrders({ status: "awaiting_customer_confirmation" }, { query: POLL });
  const { data: readyData,       refetch: r4 } = useListOrders({ status: "ready_for_pickup" }, { query: POLL });
  const { data: deliveredData  }               = useListOrders({ status: "delivered" } as any,  { query: { refetchInterval: 30000 } });
  const { data: cancelledData  }               = useListOrders({ status: "cancelled" } as any,  { query: { refetchInterval: 30000 } });
  const { data: allOrdersData,   refetch: r5 } = useListOrders({} as any, { query: { refetchInterval: 30000 } });

  const confirmed   = confirmedData?.orders   ?? [];
  const preparing   = preparingData?.orders   ?? [];
  const pendingConf = pendingConfData?.orders  ?? [];
  const ready       = readyData?.orders       ?? [];
  const delivered   = deliveredData?.orders   ?? [];
  const cancelled   = cancelledData?.orders   ?? [];
  const allOrders   = allOrdersData?.orders   ?? [];

  const refetchAll = () => { r1(); r2(); r3(); r4(); r5(); setLastRefresh(new Date()); qc.invalidateQueries(); };

  const totalActive = confirmed.length + preparing.length + ready.length;
  const caJour      = delivered.reduce((s: number, o: any) => s + (o.total ?? 0), 0);

  const kpiValues: Record<string, string | number> = {
    lock:   pendingConf.length,
    confirm: confirmed.length,
    prep:   preparing.length,
    ready:  ready.length,
    done:   delivered.length,
    cancel: cancelled.length,
    ca:     formatDA(caJour),
    rating: stats?.avgRating ? `${Number(stats.avgRating).toFixed(1)} ★` : "—",
  };

  const kpiSubs: Record<string, string> = {
    lock:   "PrepLock™ actif",
    confirm: "Confirmés GO",
    prep:   "En cuisine",
    ready:  "Attente livreur",
    done:   "Aujourd'hui",
    cancel: "Aujourd'hui",
    ca:     `${delivered.length} livraison${delivered.length !== 1 ? "s" : ""}`,
    rating: stats ? `${stats.totalOrders} commandes` : "",
  };

  const getFilteredOrders = () => {
    switch (orderFilter) {
      case "pending":   return pendingConf;
      case "confirmed": return confirmed;
      case "preparing": return preparing;
      case "ready":     return ready;
      case "history":   return allOrders.filter((o: any) => ["delivered","cancelled"].includes(o.status));
      default:          return [...pendingConf, ...confirmed, ...preparing, ...ready];
    }
  };

  const restaurantStatus = myRestaurant?.isPaused ? "pause" : myRestaurant?.isOpen ? "open" : "closed";
  const statusDot = { open: "bg-emerald-400", closed: "bg-red-400", pause: "bg-amber-400" }[restaurantStatus];
  const statusLabel = { open: "Ouvert", closed: "Fermé", pause: "En pause" }[restaurantStatus];

  /* ─── render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex bg-[#F5F6FA]">

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0 relative">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800/60 to-slate-950/60 pointer-events-none" />

        {/* Restaurant identity */}
        <div className="relative px-5 pt-6 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0 shadow-lg">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate leading-tight">
                {myRestaurant?.name ?? "Restaurant"}
              </p>
              <p className="text-xs text-slate-400">{myRestaurant?.category ?? "Dashboard"}</p>
            </div>
          </div>
          {/* Status + info */}
          <div className="flex items-center gap-2 mb-3">
            <span className={cn("flex h-2 w-2 rounded-full shrink-0", statusDot)} />
            <span className="text-xs font-semibold text-slate-300">{statusLabel}</span>
            <span className="text-slate-600 text-xs">·</span>
            <span className="text-xs text-slate-400">~{myRestaurant?.estimatedPrepTime ?? "?"} min</span>
          </div>
          {myRestaurant && (
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-[11px] text-slate-500">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="leading-tight">{myRestaurant.address}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Phone className="w-3 h-3 shrink-0" />
                <span>{myRestaurant.phone}</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ id, icon: Icon, label }) => {
            const active = tab === id;
            const badge = id === "orders" ? (totalActive + pendingConf.length) : 0;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-white/10 text-white border border-white/10 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", active ? "text-orange-400" : "")} />
                <span className="flex-1 text-left">{label}</span>
                {badge > 0 && (
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    active ? "bg-orange-400/20 text-orange-300" : "bg-orange-500/20 text-orange-400"
                  )}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="pt-3 pb-1">
            <div className="border-t border-white/10" />
          </div>

          {/* Performance snapshot */}
          {stats && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Performance</p>
              {[
                { label: "CA total", value: formatDA(stats.revenue) },
                { label: "Commandes", value: stats.totalOrders },
                { label: "Annulations", value: `${stats.cancellationRate ?? 0}%` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-xs font-bold text-slate-300">{value}</span>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom actions */}
        <div className="relative px-3 pb-4 pt-3 border-t border-white/10 space-y-2">
          <button
            onClick={handleTogglePause}
            disabled={pauseLoading}
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              myRestaurant?.isPaused
                ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
            )}
          >
            {myRestaurant?.isPaused
              ? <><PlayCircle className="w-4 h-4" /> Réouvrir</>
              : <><PauseCircle className="w-4 h-4" /> Mettre en pause</>
            }
          </button>
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-slate-500 truncate">{user.name}</span>
            <button
              onClick={() => { logout(); setLocation("/"); }}
              className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3 h-3" /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════ MAIN ══════════════ */}
      <main className="flex-1 min-h-screen overflow-auto flex flex-col">

        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-slate-900">
                {tab === "overview" ? "Tableau de bord" : tab === "orders" ? "Commandes" : "Menu"}
              </h1>
              {pendingConf.length > 0 && tab === "overview" && (
                <span className="flex items-center gap-1.5 bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-200">
                  <Lock className="w-3 h-3" /> {pendingConf.length} PrepLock™
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 capitalize mt-0.5">
              {todayStr()} · actualisé à {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-slate-600 hover:text-slate-900" onClick={refetchAll}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            {tab !== "menu" && (
              <Button size="sm" className="h-9 text-xs gap-2 rounded-xl shadow-sm" onClick={() => setTab("menu")}>
                <Package className="w-3.5 h-3.5" /> Gérer menu
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 max-w-[1200px] w-full mx-auto space-y-6">

          {/* ─── MENU TAB ─── */}
          {tab === "menu" && (
            myRestaurant
              ? <MenuManager restaurantId={myRestaurant.id} />
              : <div className="flex items-center justify-center py-24 text-slate-400">
                  <div className="text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Chargement du menu…</p>
                  </div>
                </div>
          )}

          {/* ─── OVERVIEW TAB ─── */}
          {tab === "overview" && <>

            {/* KPI strip */}
            <div className="grid grid-cols-4 gap-3">
              {KPI_META.map(meta => (
                <KpiCard
                  key={meta.key}
                  meta={meta}
                  value={kpiValues[meta.key]}
                  sub={kpiSubs[meta.key]}
                  pulse={meta.key === "lock" && pendingConf.length > 0}
                />
              ))}
            </div>

            {/* PrepLock banner */}
            <PrepLockBanner orders={pendingConf} />

            {/* Active orders */}
            {totalActive > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="font-bold text-slate-900">Commandes actives</h2>
                    <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      {totalActive}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-primary gap-1.5" onClick={() => setTab("orders")}>
                    Tout voir <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Subheader row */}
                <div className="grid grid-cols-[1.5rem_7rem_1fr_6rem_10rem_7rem] gap-3 px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <span />
                  <span>Référence</span>
                  <span>Adresse · Livreur</span>
                  <span className="text-right">Montant</span>
                  <span className="text-right">Statut</span>
                  <span />
                </div>

                {[...confirmed, ...preparing, ...ready].slice(0, 10).map(order => (
                  <OrderCard key={order.id} order={order} onAction={refetchAll} compact />
                ))}
              </div>
            ) : (
              <EmptyOrders onAddProduct={() => setTab("menu")} onRefresh={refetchAll} />
            )}

            {/* Bottom: Quick actions + Stats */}
            <div className="grid grid-cols-3 gap-4">

              {/* Quick actions */}
              <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Actions rapides</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Plus,       label: "Ajouter produit",   action: () => setTab("menu"),    cls: "hover:border-primary/40 hover:bg-primary/5 hover:text-primary" },
                    { icon: MenuIcon,   label: "Gérer menu",        action: () => setTab("menu"),    cls: "hover:border-primary/40 hover:bg-primary/5 hover:text-primary" },
                    { icon: List,       label: "Commandes",          action: () => setTab("orders"),  cls: "hover:border-primary/40 hover:bg-primary/5 hover:text-primary" },
                    { icon: TrendingUp, label: "Historique",         action: () => { setTab("orders"); setOrderFilter("history"); }, cls: "hover:border-slate-300 hover:bg-slate-50" },
                    { icon: myRestaurant?.isPaused ? PlayCircle : PauseCircle,
                      label: myRestaurant?.isPaused ? "Réouvrir" : "Mettre en pause",
                      action: handleTogglePause,
                      cls: myRestaurant?.isPaused ? "hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700" : "hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                    },
                    { icon: RefreshCw,  label: "Actualiser",        action: refetchAll,              cls: "hover:border-slate-300 hover:bg-slate-50" },
                  ].map(({ icon: Icon, label, action, cls }) => (
                    <button
                      key={label}
                      onClick={action}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-100 transition-all text-xs font-semibold text-slate-600",
                        cls
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats card */}
              {stats && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Indicateurs</p>
                  <div className="space-y-3">
                    {[
                      { label: "Commandes total", value: stats.totalOrders, icon: ShoppingBag, color: "text-indigo-500" },
                      { label: "Temps prépa.",    value: `${stats.avgPrepTime ?? myRestaurant?.estimatedPrepTime ?? "—"} min`, icon: Clock, color: "text-purple-500" },
                      { label: "Taux annulation", value: `${stats.cancellationRate ?? 0}%`, icon: XCircle, color: "text-red-400" },
                      { label: "Note client",     value: stats.avgRating ? `${Number(stats.avgRating).toFixed(1)} / 5` : "—", icon: Star, color: "text-yellow-500" },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className={cn("w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0", color)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-400">{label}</p>
                          <p className="text-sm font-bold text-slate-800">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>}

          {/* ─── ORDERS TAB ─── */}
          {tab === "orders" && <>
            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit">
              {[
                { id: "active",    label: "Toutes actives",    count: totalActive + pendingConf.length },
                { id: "pending",   label: "⚠ Attente conf.",   count: pendingConf.length },
                { id: "confirmed", label: "À préparer",        count: confirmed.length },
                { id: "preparing", label: "En préparation",    count: preparing.length },
                { id: "ready",     label: "Prêtes",            count: ready.length },
                { id: "history",   label: "Historique",        count: null },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setOrderFilter(f.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                    orderFilter === f.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  )}
                >
                  {f.label}
                  {f.count !== null && f.count > 0 && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      orderFilter === f.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    )}>{f.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* PrepLock banner for pending filter */}
            {orderFilter === "pending" && <PrepLockBanner orders={pendingConf} />}

            {/* Orders list */}
            {getFilteredOrders().length === 0 ? (
              <EmptyOrders onAddProduct={() => setTab("menu")} onRefresh={refetchAll} />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-[1.5rem_7rem_1fr_6rem_10rem_7rem] gap-3 px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <span />
                  <span>Référence</span>
                  <span>Adresse · Livreur</span>
                  <span className="text-right">Montant</span>
                  <span className="text-right">Statut</span>
                  <span />
                </div>
                {getFilteredOrders().map(order => (
                  <OrderCard key={order.id} order={order} onAction={refetchAll} compact />
                ))}
              </div>
            )}
          </>}

        </div>
      </main>
    </div>
  );
}
