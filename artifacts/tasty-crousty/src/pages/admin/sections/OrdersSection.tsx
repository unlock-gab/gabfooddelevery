import React, { useState } from "react";
import { formatDA } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Search, Eye, RefreshCw, XCircle, Radio, Clock, ChevronLeft, ChevronRight, MapPin, CreditCard, Truck, CheckCircle2 } from "lucide-react";
import { useListOrders, useGetOrder, useCancelOrder } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

function useOverrideDelivery() {
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: number; reason?: string }) => {
      const token = localStorage.getItem("tc_token");
      const res = await fetch(`/api/admin/orders/${orderId}/override-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Override failed");
      return res.json();
    },
  });
}

const STATUS_LABELS: Record<string, string> = {
  placed: "Placée", awaiting_driver_assignment: "Attente livreur",
  dispatching_driver: "Dispatch en cours", driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Attente confirmation", needs_update: "MAJ requise",
  confirmation_failed: "Confirmation échouée", confirmed_for_preparation: "Confirmée PrepLock™",
  preparing: "En préparation", ready_for_pickup: "Prête (pickup)",
  driver_at_restaurant: "Livreur au resto", picked_up: "Récupérée",
  on_the_way: "En route", arriving: "À proximité", delivered: "Livrée",
  cancelled: "Annulée", failed: "Échouée", pending_payment: "Attente paiement",
};

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-slate-100 text-slate-700",
  awaiting_driver_assignment: "bg-amber-100 text-amber-800",
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
  "placed", "awaiting_driver_assignment", "dispatching_driver", "driver_assigned",
  "awaiting_customer_confirmation", "needs_update", "confirmed_for_preparation",
  "preparing", "ready_for_pickup", "driver_at_restaurant", "picked_up", "on_the_way", "arriving",
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

  const { data: orderDetail } = useGetOrder(
    { orderId: selectedOrderId! },
    { query: { enabled: selectedOrderId !== null } }
  );

  const cancelOrder = useCancelOrder();
  const redispatch = useRedispatchOrder();
  const overrideDelivery = useOverrideDelivery();

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
                <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setSelectedOrderId(order.id)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      {(order.status === "dispatching_driver" || order.status === "awaiting_driver_assignment") && (
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

      {/* Order detail drawer */}
      <Sheet open={selectedOrderId !== null} onOpenChange={open => !open && setSelectedOrderId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono text-base">{orderDetail?.orderNumber}</SheetTitle>
          </SheetHeader>
          {orderDetail && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[orderDetail.status] ?? "bg-slate-100"}`}>
                  {STATUS_LABELS[orderDetail.status] ?? orderDetail.status}
                </span>
                <span className="text-xs text-slate-400">{new Date(orderDetail.createdAt).toLocaleString("fr-FR")}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Restaurant</p>
                  <p className="text-sm font-medium text-slate-800">{orderDetail.restaurantName}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Livreur</p>
                  <p className="text-sm font-medium text-slate-800">{orderDetail.driverName ?? "Non assigné"}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{orderDetail.deliveryAddress}</p>
                    {orderDetail.deliveryLandmark && <p className="text-xs text-slate-500 mt-0.5">Repère: {orderDetail.deliveryLandmark}</p>}
                    {orderDetail.deliveryFloor && <p className="text-xs text-slate-500">Étage: {orderDetail.deliveryFloor}</p>}
                    {orderDetail.deliveryInstructions && <p className="text-xs text-slate-500">Instructions: {orderDetail.deliveryInstructions}</p>}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Articles commandés</p>
                <div className="space-y-1.5">
                  {orderDetail.items?.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-700">{item.quantity}× {item.productName}</span>
                      <span className="font-medium text-slate-800">{formatDA(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Sous-total</span>
                  <span>{formatDA(orderDetail.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Livraison</span>
                  <span>{formatDA(orderDetail.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold mt-1">
                  <span>Total</span>
                  <span className="text-primary">{formatDA(orderDetail.total)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">
                  {orderDetail.paymentMethod === "cash_on_delivery" ? "Espèces à la livraison" : "Paiement en ligne"}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${orderDetail.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {orderDetail.paymentStatus === "paid" ? "Payé" : "En attente"}
                </span>
              </div>

              {orderDetail.statusHistory && orderDetail.statusHistory.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Historique des statuts</p>
                  <div className="space-y-2">
                    {[...orderDetail.statusHistory].reverse().map((h, i) => (
                      <div key={h.id} className="flex gap-3 items-start">
                        <div className="flex flex-col items-center mt-1">
                          <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-primary" : "bg-slate-300"}`} />
                          {i < orderDetail.statusHistory!.length - 1 && <div className="w-px h-4 bg-slate-200" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700">{STATUS_LABELS[h.status] ?? h.status}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(h.createdAt).toLocaleString("fr-FR")}
                            {h.note && ` · ${h.note}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />
              <div className="flex gap-2 flex-wrap">
                {!["delivered", "cancelled", "failed"].includes(orderDetail.status) && (
                  <Button size="sm" variant="destructive" className="text-xs h-7"
                    onClick={() => { handleCancel(orderDetail.id); setSelectedOrderId(null); }}>
                    <XCircle className="w-3 h-3 mr-1" /> Annuler
                  </Button>
                )}
                {["dispatching_driver", "awaiting_driver_assignment"].includes(orderDetail.status) && (
                  <Button size="sm" className="text-xs h-7 bg-blue-600 hover:bg-blue-700"
                    onClick={() => { handleRedispatch(orderDetail.id); setSelectedOrderId(null); }}>
                    <Radio className="w-3 h-3 mr-1" /> Redispatching
                  </Button>
                )}
                {!["delivered", "cancelled", "failed"].includes(orderDetail.status) && (
                  <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700"
                    disabled={overrideDelivery.isPending}
                    onClick={() => overrideDelivery.mutate(
                      { orderId: orderDetail.id, reason: "Livraison override par admin" },
                      { onSuccess: () => { toast({ title: "Livraison confirmée" }); setSelectedOrderId(null); refetch(); qc.invalidateQueries(); } }
                    )}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Marquer livrée
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
