import React, { useState, useEffect, useRef } from "react";
import { formatDA } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Radio, RefreshCw, Clock, Truck, AlertTriangle, Send, Users, RotateCcw,
  XCircle, CheckCircle2, Zap, MapPin, Activity, Eye, Filter, Search,
  AlertCircle, TrendingUp, TrendingDown, Star, Phone, Flag, Minus,
  ChevronRight, Wifi,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type DispatchCenter = {
  kpis: {
    pendingDispatch: number; dispatchingDriver: number; pendingLong: number;
    activeAttempts: number; totalAttempts: number; successRate: number;
    timeoutRate: number; noDriverToday: number; onlineDrivers: number; totalDrivers: number;
  };
  waitingOrders: WaitingOrder[];
  activeAttempts: ActiveAttempt[];
  recentResponses: DriverResponse[];
  failedOrders: FailedOrder[];
  zonePressure: ZonePressure[];
  activityFeed: ActivityItem[];
  onlineDrivers: OnlineDriver[];
  analytics: { today: TodayStats; hourly: HourlyStats[] };
};

type WaitingOrder = {
  id: number; orderNumber: string; status: string; total: number;
  deliveryAddress: string; createdAt: string; updatedAt: string;
  restaurantName: string; restaurantId?: number;
  zoneName?: string; cityName?: string; attemptCount: number;
};

type ActiveAttempt = {
  id: number; orderId: number; driverId?: number; result: string;
  driverName: string; orderNumber: string; restaurantName: string;
  attemptedAt: string; expiresAt?: string; respondedAt?: string;
  acceptanceRate: number; avgRating: number; isOnline: boolean;
};

type DriverResponse = {
  id: number; orderId: number; driverId?: number; result: string;
  driverName: string; orderNumber: string; restaurantName: string;
  attemptedAt: string; respondedAt?: string;
  acceptanceRate: number; avgRating: number; zoneName?: string;
};

type FailedOrder = {
  id: number; orderNumber: string; status: string; total: number;
  deliveryAddress: string; createdAt: string; restaurantName: string;
  zoneName?: string; cityName?: string;
  attemptCount: number; timeoutCount: number; rejectedCount: number;
};

type ZonePressure = {
  zoneId: number; zoneName: string; cityName?: string;
  waitingOrders: number; totalOrders: number; onlineDrivers: number;
};

type ActivityItem = {
  id: number; orderId: number; result: string;
  driverName: string; orderNumber: string; restaurantName: string;
  attemptedAt: string; respondedAt?: string;
};

type OnlineDriver = {
  id: number; name: string; phone?: string;
  acceptanceRate: number; avgRating: number;
  totalDeliveries: number; currentZoneId?: number;
  zoneName?: string; isOnline: boolean;
};

type TodayStats = {
  total: number; accepted: number; rejected: number;
  timeout: number; noDriver: number; successRate: number; timeoutRate: number;
};

type HourlyStats = {
  hour: number; accepted: number; rejected: number; timeout: number; noDriver: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const getWaitMinutes = (createdAt: string) =>
  Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);

const getUrgency = (waitMin: number, attemptCount: number): "critical" | "high" | "medium" | "low" => {
  if (waitMin > 30 || attemptCount > 5) return "critical";
  if (waitMin > 15 || attemptCount > 3) return "high";
  if (waitMin > 8 || attemptCount > 1) return "medium";
  return "low";
};

const URGENCY_STYLES = {
  critical: { badge: "bg-red-600 text-white", card: "border-red-300 bg-red-50/40", icon: "text-red-600", dot: "bg-red-500" },
  high: { badge: "bg-orange-500 text-white", card: "border-orange-200 bg-orange-50/30", icon: "text-orange-500", dot: "bg-orange-500" },
  medium: { badge: "bg-amber-500 text-white", card: "border-amber-200 bg-amber-50/20", icon: "text-amber-500", dot: "bg-amber-400" },
  low: { badge: "bg-slate-200 text-slate-700", card: "border-slate-200", icon: "text-slate-400", dot: "bg-green-400" },
};

const RESULT_STYLES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  accepted: { label: "Accepté", color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: "Refusé", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3 h-3" /> },
  timeout: { label: "Timeout", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> },
  pending: { label: "En attente", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Radio className="w-3 h-3" /> },
  no_driver: { label: "Aucun livreur", color: "bg-slate-100 text-slate-600 border-slate-200", icon: <AlertCircle className="w-3 h-3" /> },
};

// ─── Countdown timer component ─────────────────────────────────────────────
function Countdown({ expiresAt }: { expiresAt: string }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)));
  useEffect(() => {
    const iv = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);
  const pct = Math.min(100, (secs / 60) * 100);
  const color = secs < 10 ? "bg-red-500" : secs < 20 ? "bg-amber-400" : "bg-green-400";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono font-bold tabular-nums ${secs < 10 ? "text-red-600" : secs < 20 ? "text-amber-600" : "text-slate-600"}`}>
        {secs}s
      </span>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, color = "text-slate-800", bg = "bg-white",
  icon, urgent,
}: {
  label: string; value: string | number; sub?: string;
  color?: string; bg?: string; icon: React.ReactNode; urgent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${bg} ${urgent ? "border-red-300 shadow-red-100 shadow-md" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500 font-medium leading-none mb-2">{label}</p>
          <p className={`text-2xl font-black leading-none ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${urgent ? "bg-red-100" : "bg-slate-100"}`}>{icon}</div>
      </div>
    </div>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, icon, count, children }: { title: string; icon: React.ReactNode; count?: number; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-slate-500">{icon}</span>
        <h3 className="text-sm font-bold text-slate-800 tracking-wide">{title}</h3>
        {count !== undefined && (
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── API hooks ─────────────────────────────────────────────────────────────────
function useDispatchCenter() {
  return useQuery<DispatchCenter>({
    queryKey: ["admin-dispatch-center"],
    queryFn: async () => {
      const token = localStorage.getItem("tc_token");
      const res = await fetch("/api/admin/dispatch/center", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
    refetchInterval: 10000,
  });
}

function useDispatchOrder() {
  return useMutation({
    mutationFn: async (orderId: number) => {
      const token = localStorage.getItem("tc_token");
      const res = await fetch(`/api/orders/${orderId}/dispatch`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Dispatch failed");
      return res.json();
    },
  });
}

function useRetryAll() {
  return useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("tc_token");
      const res = await fetch("/api/dispatch/retry-all", {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Retry all failed");
      return res.json();
    },
  });
}

function useAssignDriver() {
  return useMutation({
    mutationFn: async ({ orderId, driverId }: { orderId: number; driverId: number }) => {
      const token = localStorage.getItem("tc_token");
      const res = await fetch(`/api/dispatch/${orderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ driverId }),
      });
      if (!res.ok) throw new Error("Assign failed");
      return res.json();
    },
  });
}

function useCancelOrd() {
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: number; reason: string }) => {
      const token = localStorage.getItem("tc_token");
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Cancel failed");
      return res.json();
    },
  });
}

// ─── Manual assignment modal ────────────────────────────────────────────────
function ManualAssignModal({
  orderId, orderNumber, onlineDrivers, onClose, onAssigned,
}: {
  orderId: number; orderNumber: string; onlineDrivers: OnlineDriver[];
  onClose: () => void; onAssigned: () => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const assign = useAssignDriver();

  const filtered = onlineDrivers.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.zoneName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssign = () => {
    if (!selectedDriver) return;
    assign.mutate({ orderId, driverId: selectedDriver }, {
      onSuccess: () => { toast({ title: "Livreur assigné manuellement ✓" }); onAssigned(); },
      onError: () => toast({ title: "Erreur d'assignation", variant: "destructive" } as any),
    });
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Truck className="w-4 h-4 text-blue-600" /> Assignation manuelle — {orderNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input className="pl-9 h-8 text-sm" placeholder="Rechercher livreur ou zone…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">Aucun livreur en ligne</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {filtered.map(d => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDriver(d.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedDriver === d.id ? "border-primary bg-primary/5 shadow-sm" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <Truck className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{d.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{d.totalDeliveries} livraisons</span>
                        {d.avgRating > 0 && <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{d.avgRating.toFixed(1)}</span>}
                        {d.zoneName && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{d.zoneName}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-600 font-medium">En ligne</span>
                    </div>
                    <p className="text-xs text-slate-400">{Math.round(d.acceptanceRate)}% acc.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button className="w-full" onClick={handleAssign}
            disabled={!selectedDriver || assign.isPending}>
            <Send className="w-4 h-4 mr-2" />
            {assign.isPending ? "Assignation…" : "Confirmer l'assignation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Waiting order card ────────────────────────────────────────────────────────
function WaitingOrderCard({
  order, onRetry, onManual, onCancel, onView,
}: {
  order: WaitingOrder;
  onRetry: () => void; onManual: () => void; onCancel: () => void; onView: () => void;
}) {
  const wait = getWaitMinutes(order.createdAt);
  const urgency = getUrgency(wait, order.attemptCount);
  const styles = URGENCY_STYLES[urgency];
  const isDispatching = order.status === "dispatching_driver";

  return (
    <div className={`rounded-xl border p-3.5 transition-all ${styles.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="font-mono text-xs font-black text-slate-800">{order.orderNumber}</span>
            {isDispatching
              ? <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5" /> Dispatch actif
                </span>
              : <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  En attente
                </span>
            }
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${styles.badge}`}>
              {urgency === "critical" ? "🔴 CRITIQUE" : urgency === "high" ? "🟠 URGENT" : urgency === "medium" ? "⚡ Modéré" : "✓ Normal"}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-700 truncate">{order.restaurantName}</p>
          <p className="text-xs text-slate-400 truncate mt-0.5">{order.deliveryAddress}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {wait} min d'attente</span>
            {order.attemptCount > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {order.attemptCount} tentative(s)</span>}
            {(order.zoneName || order.cityName) && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{order.zoneName ?? order.cityName}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-slate-800 mb-2">{formatDA(order.total)}</p>
          <div className="flex flex-col gap-1">
            <Button size="sm" className="h-6 text-xs bg-blue-600 hover:bg-blue-700 px-2"
              onClick={onRetry}>
              <Radio className="w-2.5 h-2.5 mr-1" /> Dispatcher
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2"
              onClick={onManual}>
              <Truck className="w-2.5 h-2.5 mr-1" /> Manuel
            </Button>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-6 text-xs px-1.5 flex-1"
                onClick={onView}>
                <Eye className="w-2.5 h-2.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs px-1.5 text-red-500 flex-1"
                onClick={onCancel}>
                <XCircle className="w-2.5 h-2.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main DispatchSection ────────────────────────────────────────────────────
export function DispatchSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useDispatchCenter();
  const dispatch = useDispatchOrder();
  const retryAll = useRetryAll();
  const cancelOrd = useCancelOrd();

  const [manualOrder, setManualOrder] = useState<{ id: number; orderNumber: string } | null>(null);
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"waiting" | "active" | "failed">("waiting");

  const invalidate = () => { refetch(); qc.invalidateQueries({ queryKey: ["admin-dispatch-center"] }); };

  const handleRetry = (orderId: number) => {
    dispatch.mutate(orderId, {
      onSuccess: () => { toast({ title: "Dispatch relancé ✓" }); invalidate(); },
      onError: () => toast({ title: "Erreur dispatch", variant: "destructive" } as any),
    });
  };

  const handleRetryAll = () => {
    retryAll.mutate(undefined, {
      onSuccess: (d: any) => { toast({ title: `${d.retried ?? 0} commandes relancées` }); invalidate(); },
    });
  };

  const handleCancel = (orderId: number) => {
    cancelOrd.mutate({ orderId, reason: "Annulée par l'opérateur dispatch" }, {
      onSuccess: () => { toast({ title: "Commande annulée" }); invalidate(); },
      onError: () => toast({ title: "Erreur annulation", variant: "destructive" } as any),
    });
  };

  const kpis = data?.kpis;
  const totalWaiting = (kpis?.pendingDispatch ?? 0) + (kpis?.dispatchingDriver ?? 0);

  // Filter waiting orders
  const waitingFiltered = (data?.waitingOrders ?? []).filter(o => {
    if (zoneFilter !== "all" && o.zoneName !== zoneFilter) return false;
    if (urgencyFilter !== "all") {
      const wait = getWaitMinutes(o.createdAt);
      const u = getUrgency(wait, o.attemptCount);
      if (u !== urgencyFilter) return false;
    }
    return true;
  });

  const zones = [...new Set((data?.waitingOrders ?? []).map(o => o.zoneName).filter(Boolean))];

  const hourlyData = (data?.analytics.hourly ?? []).map(h => ({
    heure: `${h.hour}h`,
    Accepté: h.accepted,
    Refusé: h.rejected,
    Timeout: h.timeout,
    "Sans livreur": h.noDriver,
  }));

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">Centre de Dispatch</h1>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 border border-green-200 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Tour de contrôle opérationnel des assignations livreurs
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8" onClick={() => invalidate()}>
            <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
          </Button>
          {totalWaiting > 0 && (
            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700"
              onClick={handleRetryAll} disabled={retryAll.isPending}>
              <RotateCcw className="w-3 h-3 mr-1" /> Relancer tout ({totalWaiting})
            </Button>
          )}
        </div>
      </div>

      {/* ── KPI bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <KpiCard label="En attente dispatch" value={kpis?.pendingDispatch ?? "—"}
          sub="jamais assignées" color={kpis?.pendingDispatch ? "text-amber-600" : "text-slate-400"}
          urgent={(kpis?.pendingDispatch ?? 0) > 5}
          icon={<Clock className="w-4 h-4 text-amber-500" />} />
        <KpiCard label="Dispatch en cours" value={kpis?.dispatchingDriver ?? "—"}
          sub={`${kpis?.activeAttempts ?? 0} rounds actifs`}
          color="text-blue-600"
          icon={<Radio className="w-4 h-4 text-blue-500" />} />
        <KpiCard label="Taux de succès" value={`${kpis?.successRate ?? 0}%`}
          sub={`${data?.analytics.today.accepted ?? 0} acceptés aujourd'hui`}
          color={(kpis?.successRate ?? 0) < 50 ? "text-red-600" : "text-green-600"}
          icon={<TrendingUp className="w-4 h-4 text-green-500" />} />
        <KpiCard label="Taux timeout" value={`${kpis?.timeoutRate ?? 0}%`}
          sub={`${data?.analytics.today.timeout ?? 0} timeouts today`}
          color={(kpis?.timeoutRate ?? 0) > 30 ? "text-red-600" : "text-slate-700"}
          urgent={(kpis?.timeoutRate ?? 0) > 50}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} />
        <KpiCard label="Livreurs en ligne" value={kpis?.onlineDrivers ?? "—"}
          sub={`/ ${kpis?.totalDrivers ?? 0} approuvés`}
          color="text-slate-800"
          icon={<Truck className="w-4 h-4 text-slate-500" />} />
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      {data?.analytics.today && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total tentatives", val: data.analytics.today.total, color: "text-slate-700" },
            { label: "Acceptées", val: data.analytics.today.accepted, color: "text-green-600" },
            { label: "Refusées", val: data.analytics.today.rejected, color: "text-red-500" },
            { label: "Aucun livreur", val: data.analytics.today.noDriver, color: "text-slate-500" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border border-slate-100 px-3 py-2 text-center">
              <p className={`text-lg font-black ${s.color}`}>{s.val}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Main 3-column grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT: Orders tabs (2/3 width) ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-100">
              {(["waiting", "active", "failed"] as const).map(tab => {
                const counts = {
                  waiting: waitingFiltered.length,
                  active: data?.activeAttempts.length ?? 0,
                  failed: data?.failedOrders.length ?? 0,
                };
                const labels = { waiting: "En attente", active: "Rounds actifs", failed: "Bloquées" };
                const urgent = { waiting: (kpis?.pendingDispatch ?? 0) > 3, active: false, failed: (data?.failedOrders.length ?? 0) > 0 };
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold border-b-2 transition-colors ${
                      activeTab === tab ? "border-primary text-primary bg-primary/5" : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}>
                    {labels[tab]}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === tab ? "bg-primary text-white" : urgent[tab] ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
                    }`}>{counts[tab]}</span>
                  </button>
                );
              })}
            </div>

            {/* Filters */}
            {activeTab === "waiting" && (data?.waitingOrders.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-50 bg-slate-50/50 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="flex gap-1.5 flex-wrap">
                  {["all", ...zones as string[]].map(z => (
                    <button key={z} onClick={() => setZoneFilter(z)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        zoneFilter === z ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}>
                      {z === "all" ? "Toutes zones" : z}
                    </button>
                  ))}
                </div>
                <div className="ml-2 flex gap-1.5">
                  {(["all", "critical", "high", "medium", "low"] as const).map(u => (
                    <button key={u} onClick={() => setUrgencyFilter(u)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        urgencyFilter === u ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-500"
                      }`}>
                      {u === "all" ? "Urgence" : u === "critical" ? "🔴 Critique" : u === "high" ? "🟠 Haut" : u === "medium" ? "⚡ Moyen" : "✓ Bas"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
              {/* Tab: Waiting orders */}
              {activeTab === "waiting" && (
                <>
                  {isLoading && <p className="text-center py-8 text-slate-400 text-sm">Chargement…</p>}
                  {!isLoading && waitingFiltered.length === 0 && (
                    <div className="text-center py-10">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-400" />
                      <p className="font-semibold text-slate-700">Aucune commande en attente</p>
                      <p className="text-sm text-slate-400 mt-1">Toutes les commandes sont en cours ou livrées.</p>
                    </div>
                  )}
                  {waitingFiltered.map(order => (
                    <WaitingOrderCard key={order.id} order={order}
                      onRetry={() => handleRetry(order.id)}
                      onManual={() => setManualOrder({ id: order.id, orderNumber: order.orderNumber })}
                      onCancel={() => handleCancel(order.id)}
                      onView={() => window.open(`/admin?tab=orders&order=${order.id}`, "_blank")}
                    />
                  ))}
                </>
              )}

              {/* Tab: Active rounds */}
              {activeTab === "active" && (
                <>
                  {(data?.activeAttempts.length ?? 0) === 0 ? (
                    <div className="text-center py-10">
                      <Radio className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500 font-medium">Aucun round actif</p>
                      <p className="text-xs text-slate-400 mt-1">Les tentatives de dispatch apparaîtront ici.</p>
                    </div>
                  ) : (
                    data?.activeAttempts.map(a => (
                      <div key={a.id} className="rounded-lg border border-blue-200 bg-blue-50/30 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono text-xs font-black text-slate-700">{a.orderNumber}</span>
                              <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1">
                                <Radio className="w-2.5 h-2.5" /> Round actif
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-700">{a.driverName}</p>
                            <p className="text-xs text-slate-400">{a.restaurantName}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                              <span>Envoyé {fmtTime(a.attemptedAt)}</span>
                              {a.acceptanceRate > 0 && <span>{Math.round(a.acceptanceRate)}% acc.</span>}
                              {a.avgRating > 0 && <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{a.avgRating.toFixed(1)}</span>}
                            </div>
                          </div>
                          {a.expiresAt && (
                            <div className="shrink-0 w-28">
                              <p className="text-xs text-slate-400 mb-1">Temps restant</p>
                              <Countdown expiresAt={a.expiresAt} />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-2.5 pt-2 border-t border-blue-100">
                          <Button size="sm" className="h-6 text-xs bg-orange-500 hover:bg-orange-600 px-2"
                            onClick={() => handleRetry(a.orderId)}>
                            <RotateCcw className="w-2.5 h-2.5 mr-1" /> Relancer
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                            onClick={() => setManualOrder({ id: a.orderId, orderNumber: a.orderNumber })}>
                            <Truck className="w-2.5 h-2.5 mr-1" /> Manuel
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Tab: Failed orders */}
              {activeTab === "failed" && (
                <>
                  {(data?.failedOrders.length ?? 0) === 0 ? (
                    <div className="text-center py-10">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-400" />
                      <p className="text-slate-500 font-medium">Aucune commande bloquée</p>
                    </div>
                  ) : (
                    data?.failedOrders.map(o => (
                      <div key={o.id} className="rounded-xl border-2 border-red-200 bg-red-50/40 p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono text-xs font-black text-slate-800">{o.orderNumber}</span>
                              <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" /> Bloquée
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-700">{o.restaurantName}</p>
                            <p className="text-xs text-slate-400 truncate">{o.deliveryAddress}</p>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {[
                                { label: "Tentatives", val: o.attemptCount, color: "text-slate-700" },
                                { label: "Timeouts", val: o.timeoutCount, color: "text-amber-600" },
                                { label: "Refus", val: o.rejectedCount, color: "text-red-600" },
                              ].map(s => (
                                <div key={s.label} className="bg-white rounded border border-red-100 p-1.5 text-center">
                                  <p className={`text-sm font-bold ${s.color}`}>{s.val}</p>
                                  <p className="text-xs text-slate-400">{s.label}</p>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                              <Clock className="w-3 h-3" /> {getWaitMinutes(o.createdAt)} min d'attente
                              {o.zoneName && <><MapPin className="w-3 h-3" />{o.zoneName}</>}
                            </div>
                          </div>
                          <p className="text-sm font-black text-slate-800 shrink-0">{formatDA(o.total)}</p>
                        </div>
                        <div className="flex gap-2 mt-3 pt-2 border-t border-red-100">
                          <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 px-3"
                            onClick={() => handleRetry(o.id)}>
                            <Radio className="w-3 h-3 mr-1" /> Redispatching élargi
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-3"
                            onClick={() => setManualOrder({ id: o.id, orderNumber: o.orderNumber })}>
                            <Truck className="w-3 h-3 mr-1" /> Assignation manuelle
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 px-2 ml-auto"
                            onClick={() => handleCancel(o.id)}>
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Driver responses + feed ─────────────────────────────── */}
        <div className="space-y-4">

          {/* Driver response monitoring */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-700">Réponses livreurs</h3>
                  <span className="text-xs text-slate-400">1h</span>
                </div>
                <span className="text-xs text-slate-400">{data?.recentResponses.length ?? 0}</span>
              </div>
            </div>
            <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
              {(data?.recentResponses.length ?? 0) === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">Aucune réponse récente</div>
              ) : (
                data?.recentResponses.slice(0, 15).map(r => {
                  const rs = RESULT_STYLES[r.result] ?? RESULT_STYLES.pending;
                  return (
                    <div key={r.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-slate-50/50">
                      <div className={`shrink-0 mt-0.5 p-1 rounded-full border ${rs.color}`}>{rs.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{r.driverName}</p>
                        <p className="text-xs text-slate-400 truncate">{r.orderNumber} · {r.restaurantName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-medium px-1 rounded ${rs.color}`}>{rs.label}</span>
                          {r.zoneName && <span className="text-xs text-slate-300">{r.zoneName}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">{fmtTime(r.attemptedAt)}</p>
                        {r.avgRating > 0 && (
                          <p className="text-xs text-slate-300 flex items-center gap-0.5 justify-end">
                            <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />{r.avgRating.toFixed(1)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Live activity feed */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700">Flux d'activité</h3>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              </div>
            </div>
            <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
              {(data?.activityFeed.length ?? 0) === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">Aucune activité récente</div>
              ) : (
                data?.activityFeed.slice(0, 20).map(a => {
                  const rs = RESULT_STYLES[a.result];
                  const messages: Record<string, string> = {
                    accepted: `${a.driverName} a accepté`,
                    rejected: `${a.driverName} a refusé`,
                    timeout: `Timeout — ${a.driverName}`,
                    no_driver: `Aucun livreur trouvé`,
                    pending: `Dispatch envoyé à ${a.driverName}`,
                  };
                  return (
                    <div key={a.id} className="flex items-start gap-2 px-4 py-2">
                      <span className={`text-xs mt-0.5 ${rs?.color ?? ""}`}>{rs?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 truncate">{messages[a.result] ?? a.result}</p>
                        <p className="text-xs text-slate-400 truncate">{a.orderNumber} · {a.restaurantName}</p>
                      </div>
                      <p className="text-xs text-slate-300 shrink-0 tabular-nums">{fmtTime(a.attemptedAt)}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Online drivers quick view */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700">Livreurs en ligne</h3>
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                {data?.onlineDrivers.length ?? 0}
              </span>
            </div>
            <div className="divide-y divide-slate-50 max-h-44 overflow-y-auto">
              {(data?.onlineDrivers.length ?? 0) === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">Aucun livreur en ligne</div>
              ) : (
                data?.onlineDrivers.slice(0, 8).map(d => (
                  <div key={d.id} className="flex items-center gap-2.5 px-4 py-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Truck className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{d.name}</p>
                      <p className="text-xs text-slate-400">{d.zoneName ?? "Zone inconnue"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-0.5 justify-end">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-green-600">En ligne</span>
                      </div>
                      <p className="text-xs text-slate-300">{Math.round(d.acceptanceRate)}% acc.</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Zone pressure row ─────────────────────────────────────────────── */}
      {(data?.zonePressure.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-700">Pression par zone / wilaya</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data?.zonePressure.slice(0, 10).map(z => {
              const ratio = z.onlineDrivers === 0 ? Infinity : z.waitingOrders / z.onlineDrivers;
              const pressure = z.waitingOrders > 5 || (ratio > 3 && z.waitingOrders > 0) ? "critical"
                : z.waitingOrders > 2 || (ratio > 1.5 && z.waitingOrders > 0) ? "high"
                : z.waitingOrders > 0 ? "medium" : "low";
              const p = URGENCY_STYLES[pressure];
              return (
                <div key={z.zoneId} className={`rounded-xl border p-3 ${p.card}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate">{z.zoneName}</p>
                      {z.cityName && <p className="text-xs text-slate-400">{z.cityName}</p>}
                    </div>
                    <span className={`w-2 h-2 rounded-full mt-0.5 ${p.dot}`} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">En attente</span>
                      <span className={`font-bold ${z.waitingOrders > 0 ? p.icon : "text-slate-400"}`}>{z.waitingOrders}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Livreurs</span>
                      <span className={`font-bold ${z.onlineDrivers > 0 ? "text-green-600" : "text-red-500"}`}>{z.onlineDrivers}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Total auj.</span>
                      <span className="text-slate-600 font-medium">{z.totalOrders}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Analytics chart ────────────────────────────────────────────────── */}
      {hourlyData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-700">Tentatives de dispatch — aujourd'hui par heure</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="heure" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                cursor={{ fill: "#f8fafc" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Accepté" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Refusé" stackId="a" fill="#ef4444" />
              <Bar dataKey="Timeout" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Sans livreur" stackId="a" fill="#94a3b8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Manual assignment modal ──────────────────────────────────────── */}
      {manualOrder && (
        <ManualAssignModal
          orderId={manualOrder.id}
          orderNumber={manualOrder.orderNumber}
          onlineDrivers={data?.onlineDrivers ?? []}
          onClose={() => setManualOrder(null)}
          onAssigned={() => { setManualOrder(null); invalidate(); }}
        />
      )}
    </div>
  );
}
