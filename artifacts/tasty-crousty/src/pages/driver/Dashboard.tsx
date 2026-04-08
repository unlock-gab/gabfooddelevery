import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StatCard } from "@/components/ui/StatCard";
import { MissionCard } from "@/components/ui/MissionCard";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import {
  useGetAvailableMissions, useAcceptMission, useRejectMission,
  useMarkPickedUp, useMarkOnTheWay, useMarkArriving, useDeliverOrder,
  useUpdateDriverStatus, useGetDriverStats, useSubmitConfirmation, useListOrders,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Truck, MapPin, Phone, CheckCircle, RefreshCw, Navigation, Package,
  Clock, Star, TrendingUp, Wifi, WifiOff, AlertTriangle
} from "lucide-react";

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOnline, setIsOnline] = useState(false);

  if (!user || user.role !== "driver") {
    setLocation("/auth/login");
    return null;
  }

  const { data: missions, refetch: refetchMissions } = useGetAvailableMissions(undefined, {
    query: { refetchInterval: isOnline ? 10000 : false }
  });
  const { data: activeOrdersData, refetch: refetchActive } = useListOrders({ status: "awaiting_customer_confirmation" as any }, {
    query: { refetchInterval: 15000 }
  });
  const activeDelivery = activeOrdersData?.orders?.[0] ?? null;
  const { data: stats } = useGetDriverStats(undefined, { query: { refetchInterval: 60000 } });

  const acceptMission = useAcceptMission();
  const rejectMission = useRejectMission();
  const pickup = useMarkPickedUp();
  const onTheWay = useMarkOnTheWay();
  const arriving = useMarkArriving();
  const deliver = useDeliverOrder();
  const driverConfirm = useSubmitConfirmation();
  const updateStatus = useUpdateDriverStatus();

  const handleToggleOnline = async () => {
    const newState = !isOnline;
    updateStatus.mutate(
      { data: { isOnline: newState } },
      {
        onSuccess: () => {
          setIsOnline(newState);
          toast({ title: newState ? "Vous êtes en ligne !" : "Vous êtes hors ligne" });
        },
        onError: () => {
          toast({ title: "Erreur de mise à jour", variant: "destructive" });
        }
      }
    );
  };

  const handleAcceptMission = (orderId: number) => {
    acceptMission.mutate(
      { orderId },
      {
        onSuccess: () => {
          toast({ title: "Mission acceptée !" });
          refetchMissions();
          refetchActive();
        },
        onError: () => {
          toast({ title: "Mission déjà prise", variant: "destructive" });
        }
      }
    );
  };

  const handleRejectMission = (orderId: number) => {
    rejectMission.mutate(
      { orderId },
      {
        onSuccess: () => {
          toast({ title: "Mission refusée" });
          refetchMissions();
        }
      }
    );
  };

  const handleConfirm = (result: "confirmed" | "needs_correction" | "failed") => {
    if (!activeDelivery) return;
    driverConfirm.mutate(
      { orderId: activeDelivery.id, data: { result } },
      {
        onSuccess: () => {
          toast({
            title: result === "confirmed" ? "Commande confirmée !" : "Statut mis à jour",
          });
          refetchActive();
        },
        onError: () => {
          toast({ title: "Erreur", variant: "destructive" });
        }
      }
    );
  };

  const handleDeliveryAction = (action: "pickup" | "on_the_way" | "arriving" | "deliver") => {
    if (!activeDelivery) return;
    const mutations: Record<string, any> = {
      pickup: pickup,
      on_the_way: onTheWay,
      arriving: arriving,
      deliver: deliver,
    };
    const labels: Record<string, string> = {
      pickup: "Commande récupérée !",
      on_the_way: "En route !",
      arriving: "Statut mis à jour",
      deliver: "Livraison effectuée !",
    };
    mutations[action].mutate(
      { orderId: activeDelivery.id, data: {} },
      {
        onSuccess: () => {
          toast({ title: labels[action] });
          refetchActive();
        },
        onError: () => {
          toast({ title: "Erreur", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg text-primary">TastyCrousty</h1>
            <p className="text-xs text-muted-foreground">Livreur</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-gray-400" />}
              <Switch
                checked={isOnline}
                onCheckedChange={handleToggleOnline}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { logout(); setLocation("/"); }}>
              Sortir
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Online banner */}
        <div className={`rounded-xl p-3 text-center text-sm font-semibold ${isOnline ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
          {isOnline ? "🟢 En ligne — Prêt à accepter des missions" : "⚫ Hors ligne — Activez pour recevoir des missions"}
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card rounded-xl p-3 text-center border">
              <div className="text-xl font-bold text-primary">{stats.completedToday}</div>
              <div className="text-xs text-muted-foreground">Aujourd'hui</div>
            </div>
            <div className="bg-card rounded-xl p-3 text-center border">
              <div className="text-xl font-bold">{Number(stats.avgRating).toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Note moy.</div>
            </div>
            <div className="bg-card rounded-xl p-3 text-center border">
              <div className="text-xl font-bold text-green-600">{Number(stats.earningsToday).toFixed(0)} €</div>
              <div className="text-xs text-muted-foreground">Gains</div>
            </div>
          </div>
        )}

        {/* Active delivery */}
        {activeDelivery && (
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Mission en cours — {activeDelivery.orderNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">{activeDelivery.restaurantName}</div>
                <div className="text-muted-foreground text-xs mt-0.5">{activeDelivery.deliveryAddress}</div>
              </div>

              {/* Confirmation actions */}
              {activeDelivery.status === "awaiting_customer_confirmation" && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-orange-700 bg-orange-50 rounded-lg p-2">
                    📞 Contactez le client pour confirmer sa commande
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="default" className="text-xs h-8 bg-green-600 hover:bg-green-700" onClick={() => handleConfirm("confirmed")}>
                      ✅ Confirmé
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleConfirm("needs_correction")}>
                      ✏️ Correction
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8 border-red-300 text-red-700" onClick={() => handleConfirm("failed")}>
                      ❌ Injoignable
                    </Button>
                  </div>
                </div>
              )}

              {/* Delivery actions */}
              <div className="flex flex-wrap gap-2">
                {activeDelivery.status === "ready_for_pickup" && (
                  <Button size="sm" className="flex-1 text-xs h-9" onClick={() => handleDeliveryAction("pickup")}>
                    <Package className="w-3 h-3 mr-1" /> J'ai récupéré
                  </Button>
                )}
                {activeDelivery.status === "picked_up" && (
                  <Button size="sm" className="flex-1 text-xs h-9" onClick={() => handleDeliveryAction("on_the_way")}>
                    <Navigation className="w-3 h-3 mr-1" /> En route
                  </Button>
                )}
                {activeDelivery.status === "on_the_way" && (
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-9" onClick={() => handleDeliveryAction("arriving")}>
                    <MapPin className="w-3 h-3 mr-1" /> Proche du client
                  </Button>
                )}
                {["on_the_way", "arriving_soon"].includes(activeDelivery.status) && (
                  <Button size="sm" className="flex-1 text-xs h-9 bg-green-600 hover:bg-green-700" onClick={() => handleDeliveryAction("deliver")}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Livré !
                  </Button>
                )}
              </div>

              <div className="text-right text-sm font-bold text-primary">{Number(activeDelivery.total).toFixed(2)} €</div>
            </CardContent>
          </Card>
        )}

        {/* Available missions */}
        {isOnline && !activeDelivery && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Missions disponibles</h2>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => refetchMissions()}>
                <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
              </Button>
            </div>
            {missions && missions.length > 0 ? (
              <div className="space-y-3">
                {missions.map((mission: any) => (
                  <MissionCard
                    key={mission.orderId}
                    mission={mission}
                    onAccept={() => handleAcceptMission(mission.orderId)}
                    onReject={() => handleRejectMission(mission.orderId)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Aucune mission disponible</p>
                  <p className="text-xs mt-1">Restez connecté, une mission arrivera bientôt !</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!isOnline && !activeDelivery && (
          <Card>
            <CardContent className="py-16 text-center">
              <WifiOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="font-semibold mb-1">Hors ligne</h3>
              <p className="text-sm text-muted-foreground">Activez le switch pour commencer à recevoir des missions.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
