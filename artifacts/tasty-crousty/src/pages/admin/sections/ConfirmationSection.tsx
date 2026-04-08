import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useListOrders } from "@workspace/api-client-react";
import { RefreshCw, CheckSquare, Clock, XCircle, AlertTriangle, Phone } from "lucide-react";

export function ConfirmationSection() {
  const { data: awaitingData, isLoading: loadingAwaiting, refetch: refetchAwaiting } = useListOrders(
    { status: "awaiting_customer_confirmation" },
    { query: { refetchInterval: 15000 } }
  );
  const { data: needsUpdateData, refetch: refetchUpdate } = useListOrders(
    { status: "needs_update" },
    { query: { refetchInterval: 15000 } }
  );
  const { data: failedData, refetch: refetchFailed } = useListOrders(
    { status: "confirmation_failed" },
    { query: { refetchInterval: 15000 } }
  );

  const awaiting = awaitingData?.orders ?? [];
  const needsUpdate = needsUpdateData?.orders ?? [];
  const failed = failedData?.orders ?? [];

  const getAge = (createdAt: string) => {
    const mins = Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);
    return mins < 60 ? `${mins} min` : `${Math.round(mins / 60)}h`;
  };

  const handleRefreshAll = () => { refetchAwaiting(); refetchUpdate(); refetchFailed(); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Centre de confirmation</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {awaiting.length + needsUpdate.length + failed.length} commandes à traiter
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={handleRefreshAll}>
          <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={awaiting.length > 0 ? "border-orange-200" : ""}>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <p className="text-xs text-slate-500 uppercase tracking-wide">Attente confirmation</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{awaiting.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">livreur en route vers client</p>
          </CardContent>
        </Card>
        <Card className={needsUpdate.length > 0 ? "border-red-200" : ""}>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-xs text-slate-500 uppercase tracking-wide">MAJ requise</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{needsUpdate.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">adresse/info à corriger</p>
          </CardContent>
        </Card>
        <Card className={failed.length > 0 ? "border-red-300" : ""}>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <p className="text-xs text-slate-500 uppercase tracking-wide">Confirmations échouées</p>
            </div>
            <p className="text-2xl font-bold text-red-700">{failed.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">client injoignable</p>
          </CardContent>
        </Card>
      </div>

      {/* Awaiting confirmation */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" />
          En attente de confirmation client ({awaiting.length})
        </h2>
        {awaiting.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-slate-400">Aucune commande en attente</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {awaiting.map(order => (
              <Card key={order.id} className="border-orange-200 bg-orange-50/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-700">{order.orderNumber}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {getAge(order.updatedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{order.restaurantName}</p>
                      <p className="text-xs text-slate-500 truncate">{order.deliveryAddress}</p>
                      {order.driverName && (
                        <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Livreur: {order.driverName}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-800">{Number(order.total).toFixed(2)} DA</p>
                      <p className="text-xs text-slate-400 mt-0.5">{order.paymentMethod === "cash_on_delivery" ? "Espèces" : "En ligne"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Needs update */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          Mise à jour requise ({needsUpdate.length})
        </h2>
        {needsUpdate.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-slate-400">Aucune commande à corriger</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {needsUpdate.map(order => (
              <Card key={order.id} className="border-red-200 bg-red-50/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-700">{order.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Adresse à corriger
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{order.restaurantName}</p>
                      <p className="text-xs text-slate-500 truncate">{order.deliveryAddress}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-800">{Number(order.total).toFixed(2)} DA</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Failed */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-600" />
          Confirmations échouées ({failed.length})
        </h2>
        {failed.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-slate-400">Aucune confirmation échouée</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {failed.map(order => (
              <Card key={order.id} className="border-red-300 bg-red-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-700">{order.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Client injoignable
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{order.restaurantName}</p>
                      <p className="text-xs text-slate-500 truncate">{order.deliveryAddress}</p>
                      {order.driverName && (
                        <p className="text-xs text-slate-500 mt-0.5">Livreur: {order.driverName}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-800">{Number(order.total).toFixed(2)} DA</p>
                      <p className="text-xs text-red-500 mt-0.5 font-medium">Intervention requise</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
