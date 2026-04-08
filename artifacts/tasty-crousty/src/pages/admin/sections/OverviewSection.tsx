import React, { useState } from "react";
import { formatDA } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetOrderAnalytics } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag, Truck, Clock, CheckCircle, XCircle,
  Store, AlertTriangle, Shield, ArrowRight,
  Activity, Radio, AlertOctagon, Ban, MessageSquare,
  ChevronRight, DollarSign, Package,
  TrendingDown, TrendingUp, Navigation, ThumbsUp,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

type Section = "overview"|"orders"|"restaurants"|"drivers"|"customers"|"dispatch"|"confirmation"|"fraud"|"payments"|"zones"|"settings"|"promo"|"disputes"|"commission"|"statistics";

// ── Status labels + colors ──────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending_dispatch: "Att. dispatch",
  dispatching_driver: "Dispatch en cours",
  driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Att. confirmation",
  needs_update: "MAJ requise",
  confirmation_failed: "Confirmation échouée",
  confirmed_for_preparation: "Confirmé — prépa",
  preparing: "En préparation",
  ready_for_pickup: "Prêt collecte",
  picked_up: "Collecté",
  on_the_way: "En route",
  arriving_soon: "Proche",
  delivered: "Livrée",
  cancelled: "Annulée",
  failed: "Échouée",
};

const STATUS_COLOR: Record<string, string> = {
  pending_dispatch: "#f59e0b",
  dispatching_driver: "#3b82f6",
  awaiting_customer_confirmation: "#8b5cf6",
  needs_update: "#ef4444",
  confirmation_failed: "#dc2626",
  preparing: "#a855f7",
  ready_for_pickup: "#06b6d4",
  picked_up: "#0ea5e9",
  on_the_way: "#22c55e",
  arriving_soon: "#16a34a",
  delivered: "#15803d",
  cancelled: "#6b7280",
};

// ── Utility components ───────────────────────────────────────────────────────
function LiveChip({ value, label, color, icon, alert, onClick }: {
  value: number | string; label: string; color: string; icon: React.ReactNode;
  alert?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
        alert
          ? "bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className={color}>{icon}</span>
      <span className={`text-base font-bold ${alert ? "text-red-700" : "text-slate-900"}`}>{value}</span>
      <span className="text-slate-400 font-normal">{label}</span>
    </button>
  );
}

function KpiCard({ title, value, sub, icon, color, alert, trend }: {
  title: string; value: string | number; sub?: string; icon: React.ReactNode;
  color: string; alert?: boolean; trend?: "up"|"down"|"neutral";
}) {
  return (
    <Card className={`border ${alert ? "border-red-200 bg-red-50/40" : "border-slate-200"} hover:shadow-sm transition-shadow`}>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest truncate">{title}</p>
            <p className={`text-2xl font-black mt-1 leading-none ${color}`}>{value}</p>
            {sub && <p className="text-[11px] text-slate-400 mt-1 leading-tight">{sub}</p>}
          </div>
          <div className={`p-2 rounded-xl ml-2 shrink-0 ${alert ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-[10px] font-medium ${
            trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-slate-400"
          }`}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "#94a3b8";
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function AlertRow({ icon, label, value, color, onClick }: {
  icon: React.ReactNode; label: string; value: number | string;
  color: string; onClick?: () => void;
}) {
  if (!value || value === 0) return null;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group text-left"
    >
      <span className={`${color} shrink-0`}>{icon}</span>
      <span className="flex-1 text-sm text-slate-700">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
      {onClick && <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />}
    </button>
  );
}

function TimeAgo({ minutes }: { minutes: number }) {
  if (minutes < 1) return <span className="text-emerald-600 font-medium text-xs">À l'instant</span>;
  if (minutes < 60) return <span className={`font-medium text-xs ${minutes > 30 ? "text-amber-600" : "text-slate-500"}`}>{minutes}min</span>;
  const h = Math.floor(minutes / 60);
  return <span className="text-red-500 font-medium text-xs">{h}h{minutes % 60 > 0 ? `${minutes % 60}min` : ""}</span>;
}

// ── Hook for operational data ────────────────────────────────────────────────
function useOperationalData() {
  return useQuery({
    queryKey: ["/api/admin/operational"],
    queryFn: async () => {
      const token = localStorage.getItem("tc_token");
      const res = await fetch("/api/admin/operational", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch operational data");
      return res.json();
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function OverviewSection({ onNavigate }: { dashboard?: any; onNavigate: (s: Section) => void }) {
  const { data: ops, isLoading: opsLoading } = useOperationalData();
  const { data: analytics } = useGetOrderAnalytics({ period: "7d" });
  const [activeTab, setActiveTab] = useState<"activity"|"critical">("critical");

  const live = ops?.liveOps ?? {};
  const dispatch = ops?.dispatch ?? {};
  const confirmation = ops?.confirmation ?? {};
  const criticalOrders: any[] = ops?.criticalOrders ?? [];
  const activityFeed: any[] = ops?.activityFeed ?? [];
  const driverPerf: any[] = ops?.driverPerformance ?? [];
  const restaurantRel: any[] = ops?.restaurantReliability ?? [];
  const customerRisk: any[] = ops?.customerRisk ?? [];
  const finance = ops?.finance ?? {};

  const criticalAlerts = live.criticalAlerts ?? 0;

  const statusData = (analytics?.ordersByStatus ?? []).map((s: any) => ({
    ...s,
    label: STATUS_LABEL[s.status] ?? s.status,
    fill: STATUS_COLOR[s.status] ?? "#94a3b8",
  })).sort((a: any, b: any) => b.count - a.count).slice(0, 8);

  const totalStatusCount = statusData.reduce((a: number, s: any) => a + s.count, 0);

  if (opsLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-full" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-slate-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Centre de contrôle</h1>
          <p className="text-xs text-slate-400 mt-0.5">Plateforme Tasty Crousty — Algérie</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          <span>En direct</span>
        </div>
      </div>

      {/* ── Live operations top bar ── */}
      <div className="flex flex-wrap gap-2 p-3 bg-slate-900 rounded-2xl">
        <LiveChip value={live.activeOrders ?? 0} label="actives" color="text-green-400" icon={<Truck className="w-3.5 h-3.5" />} onClick={() => onNavigate("orders")} />
        <LiveChip value={live.onlineDrivers ?? 0} label="livreurs" color="text-blue-400" icon={<Navigation className="w-3.5 h-3.5" />} onClick={() => onNavigate("drivers")} />
        <LiveChip value={`${live.openRestaurants ?? 0}/${live.totalRestaurants ?? 0}`} label="restos" color="text-purple-400" icon={<Store className="w-3.5 h-3.5" />} onClick={() => onNavigate("restaurants")} />
        <LiveChip value={live.pendingDispatch ?? 0} label="dispatch" color="text-amber-400" icon={<Radio className="w-3.5 h-3.5" />} alert={(live.pendingDispatch ?? 0) > 3} onClick={() => onNavigate("dispatch")} />
        <LiveChip value={live.awaitingConfirmation ?? 0} label="confirmation" color="text-violet-400" icon={<Clock className="w-3.5 h-3.5" />} onClick={() => onNavigate("confirmation")} />
        <LiveChip value={live.preparing ?? 0} label="préparation" color="text-orange-400" icon={<ShoppingBag className="w-3.5 h-3.5" />} />
        <LiveChip value={live.readyPickup ?? 0} label="prêts" color="text-cyan-400" icon={<Package className="w-3.5 h-3.5" />} />
        <div className="ml-auto flex items-center">
          {criticalAlerts > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 rounded-lg text-white text-xs font-bold">
              <AlertOctagon className="w-3.5 h-3.5" />
              {criticalAlerts} alertes critiques
            </span>
          )}
        </div>
      </div>

      {/* ── Smart alerts panel ── */}
      {criticalAlerts > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold text-red-800 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-600" />
              Alertes — Action requise
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              <AlertRow icon={<Ban className="w-4 h-4" />} label="Aucun livreur trouvé" value={dispatch.noDriver ?? 0} color="text-red-600" onClick={() => onNavigate("dispatch")} />
              <AlertRow icon={<XCircle className="w-4 h-4" />} label="Confirmation échouée" value={live.confirmationFailed ?? 0} color="text-red-600" onClick={() => onNavigate("confirmation")} />
              <AlertRow icon={<AlertTriangle className="w-4 h-4" />} label="Commandes — MAJ requise" value={live.needsUpdate ?? 0} color="text-amber-600" onClick={() => onNavigate("orders")} />
              <AlertRow icon={<Shield className="w-4 h-4" />} label="Flags fraude ouverts" value={live.openFraudFlags ?? 0} color="text-rose-600" onClick={() => onNavigate("fraud")} />
              <AlertRow icon={<MessageSquare className="w-4 h-4" />} label="Litiges en attente" value={live.openDisputes ?? 0} color="text-orange-600" onClick={() => onNavigate("disputes")} />
              <AlertRow icon={<Store className="w-4 h-4" />} label="Restaurants à approuver" value={live.pendingRestaurantApprovals ?? 0} color="text-blue-600" onClick={() => onNavigate("restaurants")} />
              <AlertRow icon={<Truck className="w-4 h-4" />} label="Livreurs à approuver" value={live.pendingDriverApprovals ?? 0} color="text-blue-600" onClick={() => onNavigate("drivers")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Revenu aujourd'hui" value={formatDA(live.revenueToday ?? 0)} sub={`Total: ${formatDA(finance.revenueTotal ?? 0)}`} icon={<DollarSign className="w-4 h-4" />} color="text-emerald-600" />
        <KpiCard title="Commissions today" value={formatDA(live.commissionsToday ?? 0)} sub={`Total: ${formatDA(finance.commissionsTotal ?? 0)}`} icon={<TrendingUp className="w-4 h-4" />} color="text-teal-600" />
        <KpiCard title="Livrées aujourd'hui" value={live.deliveredToday ?? 0} sub="commandes" icon={<CheckCircle className="w-4 h-4" />} color="text-green-600" />
        <KpiCard title="Annulées aujourd'hui" value={live.cancelledToday ?? 0} sub="commandes" icon={<XCircle className="w-4 h-4" />} color={(live.cancelledToday ?? 0) > 5 ? "text-red-600" : "text-slate-600"} alert={(live.cancelledToday ?? 0) > 5} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Taux acceptation" value={`${dispatch.acceptanceRate ?? 0}%`} sub={`${dispatch.accepted ?? 0}/${dispatch.totalAttempts ?? 0} tentatives`} icon={<ThumbsUp className="w-4 h-4" />} color={(dispatch.acceptanceRate ?? 100) < 50 ? "text-red-600" : "text-blue-600"} alert={(dispatch.acceptanceRate ?? 100) < 50} />
        <KpiCard title="Dispatch — timeout" value={dispatch.timeout ?? 0} sub="sans réponse" icon={<Clock className="w-4 h-4" />} color={(dispatch.timeout ?? 0) > 3 ? "text-amber-600" : "text-slate-600"} />
        <KpiCard title="Paiements en attente" value={finance.pendingPayments ?? 0} sub="à traiter" icon={<DollarSign className="w-4 h-4" />} color="text-violet-600" />
        <KpiCard title="Livreurs en ligne" value={`${live.onlineDrivers ?? 0}/${live.totalDrivers ?? 0}`} sub={dispatch.acceptanceRate ? `${dispatch.acceptanceRate}% taux acceptation` : "actifs"} icon={<Truck className="w-4 h-4" />} color="text-indigo-600" />
      </div>

      {/* ── Dispatch + Confirmation blocks ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dispatch center */}
        <Card className="border-amber-100">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-500" /> Centre Dispatch
              {(live.pendingDispatch ?? 0) > 0 && (
                <span className="ml-auto text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                  {live.pendingDispatch} en attente
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { label: "Tentatives", value: dispatch.totalAttempts ?? 0, color: "text-slate-800" },
                { label: "Acceptées", value: dispatch.accepted ?? 0, color: "text-green-600" },
                { label: "Refusées", value: dispatch.rejected ?? 0, color: "text-amber-600" },
                { label: "Timeout", value: dispatch.timeout ?? 0, color: "text-orange-600" },
                { label: "Aucun livreur", value: dispatch.noDriver ?? 0, color: "text-red-600" },
                { label: "Taux accept.", value: `${dispatch.acceptanceRate ?? 0}%`, color: (dispatch.acceptanceRate ?? 100) >= 70 ? "text-emerald-600" : "text-red-600" },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{item.label}</p>
                  <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => onNavigate("dispatch")}>
              Voir le dispatch complet <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Confirmation center */}
        <Card className="border-purple-100">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-500" /> Centre Confirmation
              {(live.awaitingConfirmation ?? 0) > 0 && (
                <span className="ml-auto text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                  {live.awaitingConfirmation} en attente
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { label: "En attente", value: confirmation.awaiting ?? 0, color: "text-purple-600" },
                { label: "MAJ requise", value: confirmation.needsUpdate ?? 0, color: "text-amber-600" },
                { label: "Échouées", value: confirmation.failed ?? 0, color: "text-red-600" },
                { label: "Confirmées (j)", value: confirmation.confirmedToday ?? 0, color: "text-green-600" },
                { label: "Correction (j)", value: confirmation.needsCorrectionToday ?? 0, color: "text-orange-600" },
                { label: "Échecs (j)", value: confirmation.failedToday ?? 0, color: "text-red-600" },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{item.label}</p>
                  <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => onNavigate("confirmation")}>
              Voir les confirmations <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Orders feed / Critical orders ── */}
      <Card>
        <CardHeader className="pb-0 pt-4 px-5">
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab("critical")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "critical" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}
              >
                Commandes critiques {criticalOrders.length > 0 && <span className="ml-1 bg-red-100 text-red-700 px-1.5 rounded-full">{criticalOrders.length}</span>}
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "activity" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}
              >
                Activité récente
              </button>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto text-xs h-7" onClick={() => onNavigate("orders")}>
              Voir tout <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4 pt-3">
          {activeTab === "critical" ? (
            criticalOrders.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Aucune commande critique — tout est sous contrôle
              </div>
            ) : (
              <div className="space-y-1">
                {criticalOrders.map((o: any) => (
                  <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="shrink-0">
                      <StatusChip status={o.status} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-slate-800">{o.orderNumber}</span>
                        <span className="text-xs text-slate-400 truncate">{o.restaurantName}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{o.deliveryAddress}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-700">{formatDA(o.total)}</p>
                      <TimeAgo minutes={o.minutesAgo} />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            activityFeed.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <Activity className="w-4 h-4" />
                Aucune activité récente
              </div>
            ) : (
              <div className="space-y-1">
                {activityFeed.slice(0, 12).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[a.status] ?? "#94a3b8" }} />
                    <span className="text-xs font-semibold text-slate-600 shrink-0">{a.orderNumber}</span>
                    <StatusChip status={a.status} />
                    {a.note && <span className="text-xs text-slate-400 flex-1 truncate">{a.note}</span>}
                    <span className="text-[10px] text-slate-300 shrink-0">
                      {new Date(a.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Orders over 7 days */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-700">Commandes — 7 derniers jours</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4">
              {(analytics?.ordersByDay ?? []).length > 0 ? (
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={analytics?.ordersByDay ?? []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={d => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} labelFormatter={d => new Date(d).toLocaleDateString("fr-FR")} formatter={(v: any) => [v, "Commandes"]} />
                    <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} fill="url(#gCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[170px] flex items-center justify-center text-sm text-slate-300">Données insuffisantes</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status distribution */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-slate-700">Distribution statuts</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {statusData.length > 0 ? (
              <div className="space-y-2">
                {statusData.map((s: any) => (
                  <div key={s.status} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.fill }} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{s.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ background: s.fill, width: `${Math.round(s.count / Math.max(totalStatusCount, 1) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-6 text-right">{s.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-slate-300">Aucune donnée</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Driver performance + Restaurant reliability ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Driver performance */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-500" /> Performance Livreurs
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigate("drivers")}>
                Voir tout <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {driverPerf.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-300">Aucun livreur</div>
            ) : (
              <div className="space-y-2">
                {driverPerf.map((d: any, i: number) => (
                  <div key={d.id} className="flex items-center gap-3 py-1.5">
                    <span className="text-xs font-black text-slate-300 w-4 shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">{d.name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.isOnline ? "bg-emerald-400" : "bg-slate-300"}`} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-400">{d.deliveries} livraisons</span>
                        {d.rating > 0 && <span className="text-xs text-amber-500 font-medium">★ {d.rating.toFixed(1)}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-700">{formatDA(d.earnings)}</p>
                      <p className="text-[10px] text-slate-400">gains</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Restaurant reliability */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Store className="w-4 h-4 text-purple-500" /> Fiabilité Restaurants
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigate("restaurants")}>
                Voir tout <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {restaurantRel.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-300">Aucun restaurant</div>
            ) : (
              <div className="space-y-2">
                {restaurantRel.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">{r.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${r.isOpen ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {r.isOpen ? "Ouvert" : "Fermé"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-400">{r.totalOrders} cmd</span>
                        {r.cancelledOrders > 0 && <span className="text-xs text-red-400">{r.cancelledOrders} annulées</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`text-sm font-bold ${r.deliveryRate >= 80 ? "text-emerald-600" : r.deliveryRate >= 60 ? "text-amber-600" : "text-red-600"}`}>
                        {r.deliveryRate}%
                      </div>
                      <p className="text-[10px] text-slate-400">livraison</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Customer risk + Finance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer risk */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> Clients à risque
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigate("customers")}>
                Voir tout <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {customerRisk.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Aucun client à risque
              </div>
            ) : (
              <div className="space-y-2">
                {customerRisk.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 py-1.5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${c.riskScore === "high" ? "bg-red-500" : "bg-amber-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.phone ?? "Pas de téléphone"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.riskScore === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {c.riskScore === "high" ? "Élevé" : "Moyen"}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{c.cancelledCount}/{c.orderCount} annulées</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Finance snapshot */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" /> Aperçu Finance
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigate("payments")}>
                Paiements <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Revenu total livraisons</span>
                <span className="text-sm font-black text-emerald-700">{formatDA(finance.revenueTotal ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Commissions totales (12%)</span>
                <span className="text-sm font-bold text-teal-700">{formatDA(finance.commissionsTotal ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Frais de livraison</span>
                <span className="text-sm font-bold text-blue-700">{formatDA(finance.deliveryFeesTotal ?? 0)}</span>
              </div>
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Paiement à la livraison</p>
                  <p className="text-base font-black text-slate-700">{finance.codOrders ?? 0} <span className="text-xs font-normal text-slate-400">cmd</span></p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Paiement en ligne</p>
                  <p className="text-base font-black text-slate-700">{finance.onlineOrders ?? 0} <span className="text-xs font-normal text-slate-400">cmd</span></p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">En attente</p>
                  <p className={`text-base font-black ${(finance.pendingPayments ?? 0) > 0 ? "text-amber-600" : "text-slate-700"}`}>{finance.pendingPayments ?? 0}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => onNavigate("commission")}>
                Voir les commissions <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
