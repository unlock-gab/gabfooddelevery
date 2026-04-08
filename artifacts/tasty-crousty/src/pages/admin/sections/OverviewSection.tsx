import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminDashboard } from "@workspace/api-client-react";
import { useGetOrderAnalytics } from "@workspace/api-client-react";
import {
  ShoppingBag, Truck, Clock, CheckCircle, XCircle, TrendingUp,
  Store, Users, AlertTriangle, Shield, ArrowRight, Star,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";

type Section = "overview" | "orders" | "restaurants" | "drivers" | "customers" | "dispatch" | "confirmation" | "fraud" | "payments" | "zones" | "settings";

function KpiCard({ title, value, sub, icon, color, alert }: {
  title: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; alert?: boolean;
}) {
  return (
    <Card className={`border ${alert ? "border-red-200 bg-red-50/30" : "border-slate-200"}`}>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${alert ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewSection({ dashboard, onNavigate }: {
  dashboard?: AdminDashboard; onNavigate: (s: Section) => void;
}) {
  const { data: analytics } = useGetOrderAnalytics({ period: "7d" });

  const statusColors: Record<string, string> = {
    delivered: "#22c55e", preparing: "#a855f7", dispatching_driver: "#3b82f6",
    pending_payment: "#f59e0b", cancelled: "#ef4444", confirmed_for_preparation: "#8b5cf6",
  };

  const statusLabels: Record<string, string> = {
    delivered: "Livrée", preparing: "Préparation", dispatching_driver: "Dispatch",
    pending_payment: "Paiement", cancelled: "Annulée", confirmed_for_preparation: "Confirmée",
    placed: "Placée", awaiting_customer_confirmation: "Attente confirm.", needs_update: "MAJ requise",
  };

  const dayData = analytics?.ordersByDay ?? [];
  const statusData = (analytics?.ordersByStatus ?? []).map(s => ({
    ...s,
    label: statusLabels[s.status] ?? s.status,
    fill: statusColors[s.status] ?? "#94a3b8",
  }));

  if (!dashboard) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const cancellationRate = analytics?.cancellationRate ?? 0;
  const failedConfRate = analytics?.failedConfirmationRate ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vue d'ensemble</h1>
        <p className="text-sm text-slate-500 mt-0.5">Activité en temps réel de la plateforme</p>
      </div>

      {/* Alerts bar */}
      {(dashboard.pendingDispatch > 0 || dashboard.failedConfirmationsToday > 0 || dashboard.openFraudFlags > 0) && (
        <div className="flex flex-wrap gap-2">
          {dashboard.pendingDispatch > 0 && (
            <button
              onClick={() => onNavigate("dispatch")}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <Clock className="w-3 h-3" /> {dashboard.pendingDispatch} en attente dispatch <ArrowRight className="w-3 h-3" />
            </button>
          )}
          {dashboard.failedConfirmationsToday > 0 && (
            <button
              onClick={() => onNavigate("confirmation")}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-xs font-medium text-red-800 hover:bg-red-100 transition-colors"
            >
              <XCircle className="w-3 h-3" /> {dashboard.failedConfirmationsToday} confirmations échouées <ArrowRight className="w-3 h-3" />
            </button>
          )}
          {dashboard.openFraudFlags > 0 && (
            <button
              onClick={() => onNavigate("fraud")}
              className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-full text-xs font-medium text-rose-800 hover:bg-rose-100 transition-colors"
            >
              <Shield className="w-3 h-3" /> {dashboard.openFraudFlags} flags fraude <ArrowRight className="w-3 h-3" />
            </button>
          )}
          {dashboard.pendingRestaurantApprovals > 0 && (
            <button
              onClick={() => onNavigate("restaurants")}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-800 hover:bg-blue-100 transition-colors"
            >
              <Store className="w-3 h-3" /> {dashboard.pendingRestaurantApprovals} restaurants à approuver <ArrowRight className="w-3 h-3" />
            </button>
          )}
          {dashboard.pendingDriverApprovals > 0 && (
            <button
              onClick={() => onNavigate("drivers")}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-xs font-medium text-purple-800 hover:bg-purple-100 transition-colors"
            >
              <Truck className="w-3 h-3" /> {dashboard.pendingDriverApprovals} livreurs à approuver <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Commandes actives" value={dashboard.activeDeliveries} sub="en cours de livraison" icon={<Truck className="w-4 h-4" />} color="text-blue-600" />
        <KpiCard title="En préparation" value={dashboard.preparingOrders} sub="prêtes bientôt" icon={<ShoppingBag className="w-4 h-4" />} color="text-purple-600" />
        <KpiCard title="Livrées aujourd'hui" value={dashboard.deliveredToday} sub="commandes" icon={<CheckCircle className="w-4 h-4" />} color="text-green-600" />
        <KpiCard
          title="Revenu du jour"
          value={`${Number(dashboard.revenueToday).toFixed(0)} DA`}
          sub={`Total: ${Number(dashboard.revenueTotal).toFixed(0)} DA`}
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          title="Attente dispatch"
          value={dashboard.pendingDispatch}
          sub="à assigner"
          icon={<Clock className="w-4 h-4" />}
          color={dashboard.pendingDispatch > 3 ? "text-amber-600" : "text-slate-700"}
          alert={dashboard.pendingDispatch > 3}
        />
        <KpiCard
          title="Attente confirmation"
          value={dashboard.awaitingConfirmation}
          sub="en attente client"
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-slate-700"
        />
        <KpiCard
          title="Flags fraude"
          value={dashboard.openFraudFlags}
          sub="non résolus"
          icon={<Shield className="w-4 h-4" />}
          color={dashboard.openFraudFlags > 0 ? "text-red-600" : "text-green-600"}
          alert={dashboard.openFraudFlags > 0}
        />
        <KpiCard
          title="Clients risque élevé"
          value={dashboard.highRiskCustomers}
          sub="sur {dashboard.totalCustomers} clients"
          icon={<AlertTriangle className="w-4 h-4" />}
          color="text-orange-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Orders by day */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Commandes — 7 derniers jours</CardTitle>
            </CardHeader>
            <CardContent>
              {dayData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={dayData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={d => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                      labelFormatter={d => new Date(d).toLocaleDateString("fr-FR")}
                      formatter={(v: number, n: string) => [v, n === "count" ? "Commandes" : "Revenu DA"]}
                    />
                    <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} fill="url(#gradCount)" name="count" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-sm text-slate-400">Données insuffisantes</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Statuts des commandes</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="space-y-2">
                {statusData.slice(0, 7).map(s => (
                  <div key={s.status} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.fill }} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{s.label}</span>
                    <span className="text-xs font-bold text-slate-800">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-sm text-slate-400">Aucune donnée</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Taux annulation</p>
            <p className={`text-2xl font-bold mt-1 ${cancellationRate > 15 ? "text-red-600" : "text-slate-800"}`}>
              {cancellationRate.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Objectif: &lt;10%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Échec confirmation</p>
            <p className={`text-2xl font-bold mt-1 ${failedConfRate > 10 ? "text-red-600" : "text-slate-800"}`}>
              {failedConfRate.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Objectif: &lt;5%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Livreurs</p>
            <p className="text-2xl font-bold mt-1 text-slate-800">{dashboard.onlineDrivers}<span className="text-sm font-normal text-slate-400">/{dashboard.totalDrivers}</span></p>
            <p className="text-xs text-slate-400 mt-0.5">en ligne / total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Restaurants</p>
            <p className="text-2xl font-bold mt-1 text-slate-800">{dashboard.totalRestaurants}</p>
            <p className="text-xs text-slate-400 mt-0.5">{dashboard.pendingRestaurantApprovals} en attente</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance metrics */}
      {analytics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Performances opérationnelles (7j)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              <div className="pr-6 text-center">
                <p className="text-xs text-slate-500">Temps livraison moyen</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{Math.round(analytics.avgDeliveryTime)}<span className="text-sm font-normal text-slate-400"> min</span></p>
              </div>
              <div className="px-6 text-center">
                <p className="text-xs text-slate-500">Temps dispatch moyen</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{Math.round(analytics.avgDispatchTime)}<span className="text-sm font-normal text-slate-400"> s</span></p>
              </div>
              <div className="pl-6 text-center">
                <p className="text-xs text-slate-500">Temps préparation moyen</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{Math.round(analytics.avgPrepTime)}<span className="text-sm font-normal text-slate-400"> min</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
