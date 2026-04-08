import React, { useState } from "react";
import { formatDA } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, RefreshCw, XCircle, Radio, ChevronLeft, ChevronRight, Truck } from "lucide-react";
import { useListOrders, useCancelOrder } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AdminOrderDetail } from "./AdminOrderDetail";

function useRedispatchOrder() {
  return useMutation({
    mutationFn: async (orderId: number) => {
      const token = localStorage.getItem("tc_token");
      const res = await fetch(`/api/orders/${orderId}/dispatch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Dispatch failed");
      return res.json();
    },
  });
}

const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: "En attente", placed: "Placée",
  dispatching_driver: "Dispatch en cours", driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Attente confirmation", needs_update: "MAJ requise",
  confirmation_failed: "Confirmation échouée", confirmed_for_preparation: "Confirmée PrepLock™",
  preparing: "En préparation", ready_for_pickup: "Prête (pickup)",
  driver_at_restaurant: "Livreur au resto", picked_up: "Récupérée",
  on_the_way: "En route", arriving_soon: "À proximité", arriving: "À proximité",
  delivered: "Livrée", cancelled: "Annulée", failed: "Échouée",
  pending_payment: "Attente paiement",
};

const STATUS_COLORS: Record<string, string> = {
  pending_dispatch: "bg-amber-100 text-amber-800",
  placed: "bg-slate-100 text-slate-700",
  dispatching_driver: "bg-blue-100 text-blue-800",
  driver_assigned: "bg-blue-100 text-blue-800",
  awaiting_customer_confirmation: "bg-orange-100 text-orange-800",
  needs_update: "bg-red-100 text-red-800",
  confirmation_failed: "bg-red-100 text-red-800",
  confirmed_for_preparation: "bg-purple-100 text-purple-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-indigo-100 text-indigo-800",
  driver_at_restaurant: "bg-indigo-100 text-indigo-800",
  picked_up: "bg-cyan-100 text-cyan-800",
  on_the_way: "bg-cyan-100 text-cyan-800",
  arriving_soon: "bg-teal-100 text-teal-800",
  arriving: "bg-teal-100 text-teal-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-500",
  failed: "bg-red-100 text-red-800",
  pending_payment: "bg-yellow-100 text-yellow-800",
};

const STATUS_FILTERS = [
  { label: "Toutes", value: "" },
  { label: "Actives", value: "active" },
  { label: "Dispatch", value: "dispatching_driver" },
  { label: "Confirmation", value: "awaiting_customer_confirmation" },
  { label: "MAJ requise", value: "needs_update" },
  { label: "Préparation", value: "preparing" },
  { label: "En route", value: "on_the_way" },
  { label: "Livrées", value: "delivered" },
  { label: "Annulées", value: "cancelled" },
];

const ACTIVE_STATUSES = [
  "pending_dispatch", "dispatching_driver", "driver_assigned",
  "awaiting_customer_confirmation", "needs_update", "confirmed_for_preparation",
  "preparing", "ready_for_pickup", "picked_up", "on_the_way", "arriving_soon",
];

export function OrdersSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const isActive = statusFilter === "active";
  const params = {
    status: isActive ? undefined : (statusFilter || undefined),
    page,
    limit: 20,
  };

  const { data, isLoading, refetch } = useListOrders(params, {
    query: { refetchInterval: 15000 },
  });

  const cancelOrder = useCancelOrder();
  const redispatch = useRedispatchOrder();

  const orders = isActive
    ? (data?.orders ?? []).filter(o => ACTIVE_STATUSES.includes(o.status))
    : (data?.orders ?? []);

  const filtered = search
    ? orders.filter(o =>
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.restaurantName.toLowerCase().includes(search.toLowerCase()) ||
        o.deliveryAddress.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  const handleCancel = (orderId: number) => {
    cancelOrder.mutate({ orderId, data: { reason: "Annulé par admin" } }, {
      onSuccess: () => { toast({ title: "Commande annulée" }); refetch(); qc.invalidateQueries(); },
    });
  };

  const handleRedispatch = (orderId: number) => {
    redispatch.mutate(orderId, {
      onSuccess: () => { toast({ title: "Dispatch relancé" }); refetch(); },
      onError: () => toast({ title: "Erreur dispatch", variant: "destructive" } as any),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commandes</h1>
          <p className="text-sm text-slate-500 mt-0.5">{data?.total ?? 0} commandes au total</p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-9 h-9 text-sm"
          placeholder="Rechercher par n°, restaurant, adresse…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">N° commande</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Restaurant</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Paiement</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Chargement…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Aucune commande</td></tr>
              )}
              {filtered.map(order => (
                <tr
                  key={order.id}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-slate-700">{order.orderNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-700">{order.restaurantName}</span>
                    {order.driverName && (
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Truck className="w-3 h-3" /> {order.driverName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{formatDA(order.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${order.paymentStatus === "paid" ? "text-green-600" : "text-amber-600"}`}>
                      {order.paymentMethod === "cash_on_delivery" ? "Espèces" : "En ligne"}
                      {" · "}
                      {order.paymentStatus === "paid" ? "Payé" : "En attente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setSelectedOrderId(order.id)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      {(order.status === "dispatching_driver" || order.status === "pending_dispatch") && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-600" onClick={() => handleRedispatch(order.id)}>
                          <Radio className="w-3 h-3" />
                        </Button>
                      )}
                      {!["delivered", "cancelled", "failed"].includes(order.status) && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600" onClick={() => handleCancel(order.id)}>
                          <XCircle className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Page {page} sur {data?.totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPage(p => p + 1)} disabled={page >= (data?.totalPages ?? 1)}>
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Full-page order detail modal */}
      <AdminOrderDetail
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}
