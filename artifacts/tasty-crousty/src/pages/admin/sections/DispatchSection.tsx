import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  useListOrders, useGetDispatchAttempts, useListDrivers, useAssignDriver,
} from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Radio, RefreshCw, Clock, Truck, AlertTriangle, Send, Users, RotateCcw,
} from "lucide-react";

function useDispatchOrder() {
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

function useRetryAllDispatch() {
  return useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("tc_token");
      const res = await fetch("/api/dispatch/retry-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Retry all failed");
      return res.json();
    },
  });
}

export function DispatchSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [assignDriverId, setAssignDriverId] = useState<number | null>(null);

  const { data: pendingData, refetch: refetchPending, isLoading: loadingPending } = useListOrders(
    { status: "dispatching_driver" },
    { query: { refetchInterval: 10000 } }
  );
  const { data: awaitingData, refetch: refetchAwaiting } = useListOrders(
    { status: "awaiting_driver_assignment" },
    { query: { refetchInterval: 10000 } }
  );
  const { data: dispatchAttempts } = useGetDispatchAttempts(
    selectedOrderId!,
    { query: { enabled: selectedOrderId !== null } }
  );
  const { data: availableDrivers } = useListDrivers(
    { status: "approved", online: true },
    { query: { enabled: selectedOrderId !== null } }
  );

  const retryDispatch = useDispatchOrder();
  const retryAll = useRetryAllDispatch();
  const assignDriver = useAssignDriver();

  const pending = pendingData?.orders ?? [];
  const awaiting = awaitingData?.orders ?? [];
  const allPending = [...awaiting, ...pending];

  const refetchAll = () => { refetchPending(); refetchAwaiting(); };

  const handleRetryAll = () => {
    retryAll.mutate(undefined, {
      onSuccess: (data: any) => {
        toast({ title: `${data.retried ?? 0} commandes relancées` });
        refetchAll();
      },
    });
  };

  const handleRetry = (orderId: number) => {
    retryDispatch.mutate(orderId, {
      onSuccess: () => { toast({ title: "Dispatch relancé" }); refetchAll(); },
      onError: () => toast({ title: "Erreur dispatch", variant: "destructive" } as any),
    });
  };

  const handleAssign = (orderId: number, driverId: number) => {
    assignDriver.mutate({ orderId, data: { driverId } }, {
      onSuccess: () => {
        toast({ title: "Livreur assigné manuellement" });
        setSelectedOrderId(null); setAssignDriverId(null);
        refetchAll(); qc.invalidateQueries();
      },
      onError: () => toast({ title: "Erreur d'assignation", variant: "destructive" } as any),
    });
  };

  const getWaitTime = (createdAt: string) => {
    return Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Centre de dispatch</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {allPending.length} commande{allPending.length !== 1 ? "s" : ""} en attente d'assignation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={refetchAll}>
            <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
          </Button>
          {allPending.length > 0 && (
            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700" onClick={handleRetryAll} disabled={retryAll.isPending}>
              <RotateCcw className="w-3 h-3 mr-1" /> Relancer tout
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Sans livreur</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{awaiting.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">jamais dispatché</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">En dispatch actif</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{pending.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">envoyé à des livreurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total en attente</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{allPending.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">à traiter</p>
          </CardContent>
        </Card>
      </div>

      {/* Order list */}
      {allPending.length === 0 && !loadingPending ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Radio className="w-10 h-10 mx-auto mb-3 text-green-400" />
            <p className="font-medium text-slate-700">Aucune commande en attente</p>
            <p className="text-sm text-slate-400 mt-1">Toutes les commandes ont été assignées à un livreur.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {awaiting.map(order => {
            const wait = getWaitTime(order.createdAt);
            return (
              <Card key={order.id} className={`border ${wait > 10 ? "border-red-200 bg-red-50/30" : "border-amber-200 bg-amber-50/20"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-700">{order.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Jamais dispatché
                        </span>
                        {wait > 10 && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="w-3 h-3" /> {wait} min
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 font-medium">{order.restaurantName}</p>
                      <p className="text-xs text-slate-400 truncate">{order.deliveryAddress}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-slate-800">{Number(order.total).toFixed(2)} €</span>
                      <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => handleRetry(order.id)}>
                        <Radio className="w-3 h-3 mr-1" /> Dispatcher
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedOrderId(order.id)}>
                        <Truck className="w-3 h-3 mr-1" /> Manuel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {pending.map(order => {
            const wait = getWaitTime(order.createdAt);
            return (
              <Card key={order.id} className="border border-blue-200 bg-blue-50/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-700">{order.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Dispatch en cours
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" /> {wait} min
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium">{order.restaurantName}</p>
                      <p className="text-xs text-slate-400 truncate">{order.deliveryAddress}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-slate-800">{Number(order.total).toFixed(2)} €</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRetry(order.id)}>
                        <RotateCcw className="w-3 h-3 mr-1" /> Relancer
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedOrderId(order.id)}>
                        <Truck className="w-3 h-3 mr-1" /> Manuel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Manual assignment drawer */}
      <Sheet open={selectedOrderId !== null} onOpenChange={open => !open && setSelectedOrderId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Truck className="w-4 h-4" /> Assignation manuelle
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {/* Dispatch attempts history */}
            {dispatchAttempts && dispatchAttempts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Tentatives précédentes</p>
                <div className="space-y-2">
                  {dispatchAttempts.map(attempt => (
                    <div key={attempt.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5 text-sm">
                      <span className="text-slate-700">{(attempt as any).driverName ?? `Livreur #${attempt.driverId}`}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        attempt.result === "accepted" ? "bg-green-100 text-green-700" :
                        attempt.result === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {attempt.result === "accepted" ? "Accepté" :
                         attempt.result === "rejected" ? "Refusé" :
                         attempt.result === "expired" ? "Expiré" : attempt.result}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Available drivers */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                Livreurs disponibles ({availableDrivers?.length ?? 0})
              </p>
              {(!availableDrivers || availableDrivers.length === 0) ? (
                <div className="text-center py-6 text-sm text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Aucun livreur en ligne actuellement
                </div>
              ) : (
                <div className="space-y-2">
                  {availableDrivers.map(driver => (
                    <div
                      key={driver.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        assignDriverId === driver.id ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setAssignDriverId(driver.id)}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{driver.name}</p>
                        <p className="text-xs text-slate-400">
                          {driver.totalDeliveries ?? 0} livraisons
                          {driver.avgRating ? ` · ${Number(driver.avgRating).toFixed(1)}⭐` : ""}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        En ligne
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {assignDriverId !== null && (
              <Button
                className="w-full"
                onClick={() => handleAssign(selectedOrderId!, assignDriverId)}
                disabled={assignDriver.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                {assignDriver.isPending ? "Assignation…" : "Confirmer l'assignation"}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
