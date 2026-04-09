import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ShoppingBag, TrendingUp, Truck, Store, Users, Percent,
  RefreshCw, ArrowUp, ArrowDown, Star, Package, DollarSign,
} from "lucide-react";

const COMMISSION_RATE = 0.12;

function formatDA(n: number) {
  if (!n || n === 0) return "0 DA";
  return n.toLocaleString("fr-DZ") + " DA";
}

function formatShort(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

async function fetchStats() {
  const token = localStorage.getItem("tc_token");
  const res = await fetch("/api/admin/statistics", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erreur chargement stats");
  return res.json();
}

const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: "En attente",
  dispatching_driver: "Dispatch",
  driver_assigned: "Assigné",
  awaiting_customer_confirmation: "Confirmation",
  confirmed_for_preparation: "Confirmé",
  preparing: "Préparation",
  ready_for_pickup: "Prêt",
  picked_up: "Récupéré",
  on_the_way: "En route",
  arriving_soon: "Arrive",
  delivered: "Livré",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<string, string> = {
  delivered: "#22C55E",
  cancelled: "#EF4444",
  preparing: "#F59E0B",
  on_the_way: "#3B82F6",
  pending_dispatch: "#94A3B8",
  ready_for_pickup: "#8B5CF6",
  driver_assigned: "#06B6D4",
  picked_up: "#10B981",
  arriving_soon: "#0EA5E9",
  awaiting_customer_confirmation: "#F97316",
  confirmed_for_preparation: "#84CC16",
  dispatching_driver: "#A78BFA",
};

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  trend?: "up" | "down" | "neutral";
}

function KpiCard({ label, value, sub, icon, color, trend }: KpiCardProps) {
  return (
    <Card className="p-4 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5 truncate">{value}</p>
        {sub && (
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            {trend === "up" && <ArrowUp className="w-3 h-3 text-green-500" />}
            {trend === "down" && <ArrowDown className="w-3 h-3 text-red-500" />}
            {sub}
          </p>
        )}
      </div>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-bold">{typeof p.value === "number" && p.name?.includes("DA") ? formatDA(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export function StatisticsSection() {
  const [refetchKey, setRefetchKey] = useState(0);
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/statistics", refetchKey],
    queryFn: fetchStats,
    refetchInterval: 60000,
  });

  const s = stats as any;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Statistiques</h1>
          <p className="text-sm text-slate-500 mt-1">Vue complète de la plateforme food delivery</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetch(); setRefetchKey(k => k + 1); }}>
          <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400">Chargement des statistiques...</p>
          </div>
        </div>
      ) : !s ? (
        <p className="text-center text-red-500 py-12">Erreur de chargement</p>
      ) : (
        <div className="space-y-6">
          {/* ── KPIs Row 1 — Revenue ── */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Chiffre d'affaires</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="CA Total" value={formatDA(s.revenue.total)} sub={`Sous-total : ${formatDA(s.revenue.subtotal)}`} icon={<TrendingUp className="w-5 h-5" />} color="#F59E0B" />
              <KpiCard label="CA Aujourd'hui" value={formatDA(s.revenue.today)} sub={`${s.orders.todayDelivered} livraisons`} icon={<DollarSign className="w-5 h-5" />} color="#22C55E" trend="up" />
              <KpiCard label="CA Cette semaine" value={formatDA(s.revenue.week)} sub={`${s.orders.weekDelivered} livraisons`} icon={<TrendingUp className="w-5 h-5" />} color="#3B82F6" />
              <KpiCard label="CA Ce mois" value={formatDA(s.revenue.month)} sub={`Panier moyen : ${formatDA(s.orders.avgOrderValue)}`} icon={<TrendingUp className="w-5 h-5" />} color="#8B5CF6" />
            </div>
          </div>

          {/* ── KPIs Row 2 — Operations ── */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Opérations</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Commandes total" value={String(s.orders.total)} sub={`${s.orders.todayTotal} aujourd'hui`} icon={<ShoppingBag className="w-5 h-5" />} color="#F59E0B" />
              <KpiCard label="Livrées" value={String(s.orders.delivered)} sub={`Taux annulation : ${s.orders.cancellationRate}%`} icon={<Package className="w-5 h-5" />} color="#22C55E" trend="up" />
              <KpiCard label="Frais de livraison" value={formatDA(s.revenue.deliveryFees)} sub="Total collecté" icon={<Truck className="w-5 h-5" />} color="#06B6D4" />
              <KpiCard label="Commissions dues" value={formatDA(s.commission.total)} sub={`Resto : ${formatDA(s.commission.restaurants)} · Livreurs : ${formatDA(s.commission.drivers)}`} icon={<Percent className="w-5 h-5" />} color="#EF4444" />
            </div>
          </div>

          {/* ── KPIs Row 3 — Actors ── */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Acteurs</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Livreurs" value={String(s.drivers.approved)} sub={`${s.drivers.online} en ligne · ${s.drivers.pending} en attente`} icon={<Truck className="w-5 h-5" />} color="#3B82F6" />
              <KpiCard label="Total livraisons" value={String(s.drivers.totalDeliveries)} sub="Toutes périodes" icon={<Package className="w-5 h-5" />} color="#8B5CF6" />
              <KpiCard label="Restaurants" value={String(s.restaurants.approved)} sub={`${s.restaurants.open} ouverts · ${s.restaurants.pending} en attente`} icon={<Store className="w-5 h-5" />} color="#F59E0B" />
              <KpiCard label="Clients" value={String(s.customers.total)} sub={`+${s.customers.newWeek} cette semaine`} icon={<Users className="w-5 h-5" />} color="#22C55E" trend="up" />
            </div>
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Area chart — revenue 30 days */}
            <Card className="lg:col-span-2 p-5">
              <h3 className="font-semibold text-slate-800 mb-1">Chiffre d'affaires — 30 derniers jours</h3>
              <p className="text-xs text-slate-400 mb-4">Commandes livrées uniquement</p>
              {s.dailyRevenue.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Pas encore de données</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={s.dailyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5) ?? ""} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatShort(v) + " DA"} width={65} />
                    <Tooltip content={<CustomTooltip />} formatter={(v: number) => formatDA(v)} />
                    <Area type="monotone" dataKey="revenue" name="CA (DA)" stroke="#F59E0B" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Pie chart — orders by status */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 mb-1">Commandes par statut</h3>
              <p className="text-xs text-slate-400 mb-4">Toutes périodes</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={s.byStatus.filter((d: any) => d.count > 0)}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ status, percent }) => percent > 0.05 ? `${Math.round(percent * 100)}%` : ""}
                    labelLine={false}
                  >
                    {s.byStatus.map((entry: any) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94A3B8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, STATUS_LABELS[name as string] ?? name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {s.byStatus.filter((d: any) => d.count > 0).map((d: any) => (
                  <span key={d.status} className="flex items-center gap-1 text-xs text-slate-600">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[d.status] ?? "#94A3B8" }} />
                    {STATUS_LABELS[d.status] ?? d.status} ({d.count})
                  </span>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Tables Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top restaurants */}
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b bg-slate-50 flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-slate-800">Top Restaurants</h3>
              </div>
              {s.topRestaurants.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">Aucune donnée</p>
              ) : (
                <div className="divide-y">
                  {s.topRestaurants.map((r: any, i: number) => (
                    <div key={r.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.orders} commandes</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-amber-700">{formatDA(r.revenue)}</p>
                        <p className="text-xs text-slate-400">Commission : {formatDA(Math.round(r.revenue * COMMISSION_RATE))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top drivers */}
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b bg-slate-50 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-800">Top Livreurs</h3>
              </div>
              {s.topDrivers.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">Aucune donnée</p>
              ) : (
                <div className="divide-y">
                  {s.topDrivers.map((d: any, i: number) => (
                    <div key={d.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{d.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-slate-400">{d.deliveries} livraisons</p>
                          {d.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-600">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {d.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-blue-700">{formatDA(d.earnings)}</p>
                        <p className="text-xs text-slate-400">Commission : {formatDA(Math.round(d.earnings * COMMISSION_RATE))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── Bar chart — orders by day last 30 days ── */}
          {s.dailyRevenue.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 mb-1">Nombre de commandes livrées — 30 derniers jours</h3>
              <p className="text-xs text-slate-400 mb-4"></p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={s.dailyRevenue} margin={{ top: 0, right: 10, left: 0, bottom: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} tickFormatter={d => d?.slice(5) ?? ""} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="orders" name="Commandes" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
