import React, { useState } from "react";
import { formatDA } from "@/lib/format";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { MissionCard } from "@/components/ui/MissionCard";
import {
  useGetAvailableMissions, useAcceptMission, useRejectMission,
  useMarkPickedUp, useMarkOnTheWay, useMarkArriving, useDeliverOrder,
  useUpdateDriverStatus, useGetDriverStats, useSubmitConfirmation, useListOrders,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Truck, MapPin, Phone, CheckCircle, RefreshCw, Navigation, Package,
  Clock, Star, TrendingUp, Wifi, WifiOff, AlertCircle, ChefHat,
  ArrowRight, UserCheck, XCircle, Edit3, History, QrCode, ScanLine
} from "lucide-react";
import { NotificationBell } from "@/components/ui/NotificationBell";

// All active delivery statuses in order
const DELIVERY_STEPS = [
  { status: "awaiting_customer_confirmation", label: "Confirmation client", icon: Phone },
  { status: "confirmed_for_preparation", label: "Préparation", icon: ChefHat },
  { status: "preparing", label: "En cuisine", icon: ChefHat },
  { status: "ready_for_pickup", label: "Prêt à collecter", icon: Package },
  { status: "picked_up", label: "Collecté", icon: Package },
  { status: "on_the_way", label: "En route", icon: Navigation },
  { status: "arriving_soon", label: "Arrivée imminente", icon: MapPin },
  { status: "delivered", label: "Livré", icon: CheckCircle },
];

// Statuses that belong to an active driver delivery
const ACTIVE_DRIVER_STATUSES = [
  "awaiting_customer_confirmation",
  "needs_update",
  "confirmation_failed",
  "confirmed_for_preparation",
  "preparing",
  "ready_for_pickup",
  "picked_up",
  "on_the_way",
  "arriving_soon",
];

function getStepProgress(status: string): number {
  const idx = DELIVERY_STEPS.findIndex((s) => s.status === status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / DELIVERY_STEPS.length) * 100);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    awaiting_customer_confirmation: { label: "📞 Confirmer client", color: "bg-amber-100 text-amber-800 border-amber-300" },
    needs_update: { label: "✏️ Correction requise", color: "bg-orange-100 text-orange-800 border-orange-300" },
    confirmation_failed: { label: "❌ Injoignable", color: "bg-red-100 text-red-800 border-red-300" },
    confirmed_for_preparation: { label: "✅ Confirmé — Attente cuisine", color: "bg-green-100 text-green-800 border-green-300" },
    preparing: { label: "🍳 En préparation", color: "bg-amber-100 text-amber-800 border-amber-300" },
    ready_for_pickup: { label: "🛍️ Prêt — Allez collecter !", color: "bg-blue-100 text-blue-800 border-blue-300" },
    picked_up: { label: "📦 Collecté", color: "bg-purple-100 text-purple-800 border-purple-300" },
    on_the_way: { label: "🛵 En route", color: "bg-purple-100 text-purple-800 border-purple-300" },
    arriving_soon: { label: "📍 Arrivée imminente", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
    delivered: { label: "✅ Livré !", color: "bg-green-100 text-green-800 border-green-300" },
  };
  const cfg = map[status] ?? { label: status, color: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [qrScanMode, setQrScanMode] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [qrVerifying, setQrVerifying] = useState(false);

  if (!user || user.role !== "driver") {
    setLocation("/auth/login");
    return null;
  }

  // Fetch available missions
  const { data: missions, refetch: refetchMissions } = useGetAvailableMissions(undefined, {
    query: { refetchInterval: isOnline ? 8000 : false },
  });

  // Fetch active delivery — look across all active statuses
  const { data: myOrdersData, refetch: refetchOrders } = useListOrders(
    { driverId: user.id as any } as any,
    { query: { refetchInterval: 10000 } }
  );

  const activeDelivery = myOrdersData?.orders?.find((o: any) =>
    ACTIVE_DRIVER_STATUSES.includes(o.status)
  ) ?? null;

  const { data: stats } = useGetDriverStats(undefined, { query: { refetchInterval: 60000 } });

  const acceptMission = useAcceptMission();
  const rejectMission = useRejectMission();
  const confirm = useSubmitConfirmation();
  const pickup = useMarkPickedUp();
  const onTheWay = useMarkOnTheWay();
  const arriving = useMarkArriving();
  const deliver = useDeliverOrder();
  const updateStatus = useUpdateDriverStatus();

  const refetchAll = () => {
    refetchMissions();
    refetchOrders();
  };

  const verifyQrDelivery = async (orderId: number) => {
    if (!qrInput.trim()) {
      toast({ title: "Entrez le code QR du client", variant: "destructive" } as any);
      return;
    }
    setQrVerifying(true);
    try {
      const token = localStorage.getItem("tc_token");
      const res = await fetch(`/api/orders/${orderId}/verify-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: qrInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "✅ Livraison confirmée par QR !", description: "Commande marquée comme livrée." });
        setQrScanMode(false);
        setQrInput("");
        setTimeout(refetchAll, 500);
      } else {
        const msg: Record<number, string> = {
          401: "Code QR invalide. Vérifiez avec le client.",
          409: "Ce QR a déjà été utilisé.",
          410: "QR code expiré.",
          400: "La commande n'est pas encore livrable.",
        };
        toast({ title: msg[res.status] ?? data.error ?? "Erreur QR", variant: "destructive" } as any);
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" } as any);
    } finally {
      setQrVerifying(false);
    }
  };

  const handleToggleOnline = () => {
    const newState = !isOnline;
    updateStatus.mutate(
      { data: { isOnline: newState } },
      {
        onSuccess: () => {
          setIsOnline(newState);
          toast({ title: newState ? "Vous êtes en ligne !" : "Vous êtes hors ligne" });
          if (newState) refetchAll();
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  const handleAccept = (orderId: number) => {
    acceptMission.mutate(
      { orderId },
      {
        onSuccess: () => {
          toast({ title: "Mission acceptée !", description: "Contactez le client pour confirmer sa commande." });
          refetchAll();
        },
        onError: (e: any) => {
          toast({ title: e?.data?.error ?? "Mission déjà prise", variant: "destructive" });
          refetchMissions();
        },
      }
    );
  };

  const handleReject = (orderId: number) => {
    rejectMission.mutate({ orderId }, {
      onSuccess: () => {
        toast({ title: "Mission refusée" });
        refetchMissions();
      },
    });
  };

  const handleConfirm = (result: "confirmed" | "needs_correction" | "failed") => {
    if (!activeDelivery) return;
    confirm.mutate(
      { orderId: activeDelivery.id, data: { result } },
      {
        onSuccess: () => {
          const msgs = {
            confirmed: "✅ Commande confirmée — la cuisine va commencer !",
            needs_correction: "✏️ Correction signalée — le client va mettre à jour ses infos",
            failed: "❌ Injoignable signalé",
          };
          toast({ title: msgs[result] });
          refetchAll();
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  const handleAction = (action: "pickup" | "on_the_way" | "arriving" | "deliver") => {
    if (!activeDelivery) return;
    const cfg = {
      pickup: { fn: pickup, msg: "📦 Commande collectée !" },
      on_the_way: { fn: onTheWay, msg: "🛵 En route vers le client !" },
      arriving: { fn: arriving, msg: "📍 Arrivée imminente signalée" },
      deliver: { fn: deliver, msg: "✅ Livraison effectuée !" },
    }[action];

    cfg.fn.mutate(
      { orderId: activeDelivery.id, data: {} },
      {
        onSuccess: () => {
          toast({ title: cfg.msg });
          refetchAll();
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  const progress = activeDelivery ? getStepProgress(activeDelivery.status) : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sticky header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base text-primary">food delivery — Livreur</h1>
            <p className="text-xs text-muted-foreground">{user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{isOnline ? "En ligne" : "Hors ligne"}</span>
              <Switch
                checked={isOnline}
                onCheckedChange={handleToggleOnline}
                className="data-[state=checked]:bg-green-600"
                disabled={updateStatus.isPending}
              />
              {isOnline ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-gray-400" />}
            </div>
            <NotificationBell />
            <Button variant="ghost" size="sm" className="text-xs px-2" onClick={() => { logout(); setLocation("/"); }}>
              Sortir
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-4 pb-8">

        {/* Status banner */}
        <div className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold border-2 transition-all ${
          isOnline && activeDelivery
            ? "bg-primary/10 text-primary border-primary/30"
            : isOnline
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-gray-100 text-gray-500 border-gray-200"
        }`}>
          {isOnline && activeDelivery
            ? `🚚 Mission en cours — ${activeDelivery.orderNumber}`
            : isOnline
            ? "🟢 En ligne — En attente d'une mission"
            : "⚫ Hors ligne — Activez pour recevoir des missions"}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl p-3 text-center border shadow-sm">
            <div className="text-xl font-bold text-primary">{stats?.completedToday ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Aujourd'hui</div>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center border shadow-sm">
            <div className="text-xl font-bold flex items-center justify-center gap-0.5">
              {Number(stats?.avgRating ?? 0).toFixed(1)}
              <Star className="w-3.5 h-3.5 text-amber-500 ml-0.5" />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Note</div>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center border shadow-sm">
            <div className="text-xl font-bold text-green-600">{formatDA(stats?.earningsToday ?? 0)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Gains</div>
          </div>
        </div>

        {/* ─── ACTIVE DELIVERY ─── */}
        {activeDelivery && (
          <Card className="border-2 border-primary/20 shadow-md bg-white rounded-2xl overflow-hidden">
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100">
              <div
                className="h-full bg-primary transition-all duration-700 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Order info */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-base">{activeDelivery.orderNumber}</div>
                  <div className="text-sm text-muted-foreground">{activeDelivery.restaurantName}</div>
                </div>
                <StatusBadge status={activeDelivery.status} />
              </div>

              {/* Addresses */}
              <div className="space-y-2 text-sm">
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Package className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Collecte</div>
                    <div className="font-medium">{activeDelivery.restaurantName}</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-green-700" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Livraison</div>
                    <div className="font-medium">{activeDelivery.deliveryAddress}</div>
                    {activeDelivery.deliveryPhone && (
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {activeDelivery.deliveryPhone}
                      </div>
                    )}
                    {activeDelivery.deliveryLandmark && (
                      <div className="text-xs text-muted-foreground">{activeDelivery.deliveryLandmark}</div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Status-specific actions ── */}

              {/* STEP 1: Confirm with customer */}
              {activeDelivery.status === "awaiting_customer_confirmation" && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                    <p className="font-semibold mb-1">📞 Appelez le client</p>
                    <p className="text-xs">Confirmez l'adresse, l'étage, et les instructions de livraison avant que le restaurant commence à préparer.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      className="h-10 bg-green-600 hover:bg-green-700 text-xs flex flex-col gap-0.5"
                      onClick={() => handleConfirm("confirmed")}
                      disabled={confirm.isPending}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Confirmé</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 text-xs flex flex-col gap-0.5 border-orange-300 text-orange-700"
                      onClick={() => handleConfirm("needs_correction")}
                      disabled={confirm.isPending}
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Correction</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 text-xs flex flex-col gap-0.5 border-red-300 text-red-700"
                      onClick={() => handleConfirm("failed")}
                      disabled={confirm.isPending}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Injoignable</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP: Needs update — wait for customer */}
              {activeDelivery.status === "needs_update" && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-800">
                  <p className="font-semibold mb-1">✏️ En attente du client</p>
                  <p className="text-xs">Le client met à jour ses informations de livraison. Vous recevrez une notification quand c'est prêt.</p>
                  <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={refetchAll}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
                  </Button>
                </div>
              )}

              {/* STEP: Confirmation failed */}
              {activeDelivery.status === "confirmation_failed" && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
                  <p className="font-semibold mb-1">❌ Client injoignable</p>
                  <p className="text-xs">L'équipe d'administration a été notifiée. Restez disponible.</p>
                </div>
              )}

              {/* STEP: Restaurant preparing — wait */}
              {(activeDelivery.status === "confirmed_for_preparation" || activeDelivery.status === "preparing") && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                  <p className="font-semibold mb-1">
                    {activeDelivery.status === "confirmed_for_preparation"
                      ? "🍳 Le restaurant va commencer à préparer"
                      : "🍳 Le restaurant est en train de préparer"}
                  </p>
                  <p className="text-xs">Rendez-vous au restaurant et attendez que la commande soit prête.</p>
                  <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={refetchAll}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
                  </Button>
                </div>
              )}

              {/* STEP: Pickup */}
              {activeDelivery.status === "ready_for_pickup" && (
                <div className="space-y-2">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
                    <p className="font-semibold">🛍️ Commande prête ! Allez la collecter.</p>
                  </div>
                  <Button
                    className="w-full h-12 text-sm font-semibold"
                    onClick={() => handleAction("pickup")}
                    disabled={pickup.isPending}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    J'ai collecté la commande
                  </Button>
                </div>
              )}

              {/* STEP: On the way */}
              {activeDelivery.status === "picked_up" && (
                <Button
                  className="w-full h-12 text-sm font-semibold"
                  onClick={() => handleAction("on_the_way")}
                  disabled={onTheWay.isPending}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Je suis en route vers le client
                </Button>
              )}

              {/* STEP: Arriving */}
              {activeDelivery.status === "on_the_way" && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm"
                    onClick={() => handleAction("arriving")}
                    disabled={arriving.isPending}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Je suis presque arrivé
                  </Button>
                  {/* QR Delivery Panel */}
                  {!qrScanMode ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="h-12 text-xs font-semibold bg-green-600 hover:bg-green-700"
                        onClick={() => setQrScanMode(true)}
                      >
                        <QrCode className="w-4 h-4 mr-1" />
                        Scanner QR client
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 text-xs font-semibold"
                        onClick={() => handleAction("deliver")}
                        disabled={deliver.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Sans QR
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 bg-green-50 rounded-xl border border-green-200 space-y-2">
                      <p className="text-xs font-semibold text-green-800 flex items-center gap-1">
                        <ScanLine className="w-3.5 h-3.5" /> Scanner le QR code client
                      </p>
                      <p className="text-xs text-green-700">Demandez au client d'afficher son QR code et entrez le token ci-dessous :</p>
                      <Input
                        className="text-xs h-8 font-mono"
                        placeholder="Collez ou entrez le token QR..."
                        value={qrInput}
                        onChange={e => setQrInput(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => verifyQrDelivery(activeDelivery.id)}
                          disabled={qrVerifying || !qrInput.trim()}
                        >
                          {qrVerifying ? "Vérification…" : "Confirmer QR"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => { setQrScanMode(false); setQrInput(""); }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP: Arriving soon → deliver */}
              {activeDelivery.status === "arriving_soon" && (
                <div className="space-y-2">
                  {!qrScanMode ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="h-12 text-xs font-semibold bg-green-600 hover:bg-green-700"
                        onClick={() => setQrScanMode(true)}
                      >
                        <QrCode className="w-4 h-4 mr-1" />
                        Scanner QR client
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 text-xs font-semibold"
                        onClick={() => handleAction("deliver")}
                        disabled={deliver.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Sans QR
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 bg-green-50 rounded-xl border border-green-200 space-y-2">
                      <p className="text-xs font-semibold text-green-800 flex items-center gap-1">
                        <ScanLine className="w-3.5 h-3.5" /> Scanner le QR code client
                      </p>
                      <p className="text-xs text-green-700">Demandez au client d'afficher son QR code et entrez le token ci-dessous :</p>
                      <Input
                        className="text-xs h-8 font-mono"
                        placeholder="Collez ou entrez le token QR..."
                        value={qrInput}
                        onChange={e => setQrInput(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => verifyQrDelivery(activeDelivery.id)}
                          disabled={qrVerifying || !qrInput.trim()}
                        >
                          {qrVerifying ? "Vérification…" : "Confirmer QR"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => { setQrScanMode(false); setQrInput(""); }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">Montant commande</span>
                <span className="font-bold text-primary text-lg">{formatDA(activeDelivery.total)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── AVAILABLE MISSIONS ─── */}
        {isOnline && !activeDelivery && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm">Missions disponibles</h2>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={refetchAll}>
                <RefreshCw className="w-3.5 h-3.5" /> Actualiser
              </Button>
            </div>
            {missions && missions.length > 0 ? (
              <div className="space-y-3">
                {missions.map((mission: any) => (
                  <MissionCard
                    key={mission.orderId}
                    mission={mission}
                    onAccept={() => handleAccept(mission.orderId)}
                    onReject={() => handleReject(mission.orderId)}
                  />
                ))}
              </div>
            ) : (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Aucune mission disponible</p>
                  <p className="text-xs mt-1">Restez connecté, les missions arrivent en temps réel.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Offline state */}
        {!isOnline && !activeDelivery && (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center">
              <WifiOff className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="font-bold text-base mb-1">Hors ligne</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Activez le switch en haut pour commencer à recevoir des missions.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Delivery steps progress */}
        {activeDelivery && (
          <Card className="rounded-2xl bg-white">
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Progression</h3>
              <div className="space-y-1.5">
                {DELIVERY_STEPS.map((step, idx) => {
                  const currentIdx = DELIVERY_STEPS.findIndex((s) => s.status === activeDelivery.status);
                  const isDone = idx < currentIdx;
                  const isActive = step.status === activeDelivery.status;
                  const Icon = step.icon;
                  return (
                    <div key={step.status} className={`flex items-center gap-3 py-1.5 px-2 rounded-lg transition-colors ${
                      isActive ? "bg-primary/10" : isDone ? "opacity-50" : "opacity-30"
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        isDone ? "bg-green-500" : isActive ? "bg-primary animate-pulse" : "bg-gray-200"
                      }`}>
                        {isDone ? (
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-gray-400"}`} />
                        )}
                      </div>
                      <span className={`text-sm ${isActive ? "font-semibold text-primary" : isDone ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                      {isActive && <ArrowRight className="w-3.5 h-3.5 text-primary ml-auto" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
