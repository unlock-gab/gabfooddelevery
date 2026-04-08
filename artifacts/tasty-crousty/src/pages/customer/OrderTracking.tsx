import React, { useState } from "react";
import { formatDA } from "@/lib/format";
import { useParams, Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { useGetOrder, useCancelOrder } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, Package, MapPin, Phone, RefreshCw, Clock,
  CheckCircle, Truck, ChefHat, AlertCircle, Edit3, Home,
  Navigation, Star
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: "Recherche d'un livreur",
  dispatching_driver: "Dispatch en cours",
  driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Confirmation en attente",
  needs_update: "Correction requise",
  confirmation_failed: "Client injoignable",
  confirmed_for_preparation: "Confirmé",
  preparing: "En préparation",
  ready_for_pickup: "Prêt pour collecte",
  picked_up: "Collecté par le livreur",
  on_the_way: "En route",
  arriving_soon: "Arrivée imminente",
  delivered: "Livré !",
  cancelled: "Annulé",
  failed: "Échoué",
  refunded: "Remboursé",
};

const STATUS_STYLES: Record<string, string> = {
  pending_dispatch: "bg-blue-50 text-blue-700 border-blue-200",
  dispatching_driver: "bg-blue-50 text-blue-700 border-blue-200",
  driver_assigned: "bg-indigo-50 text-indigo-700 border-indigo-200",
  awaiting_customer_confirmation: "bg-amber-50 text-amber-800 border-amber-200",
  needs_update: "bg-orange-50 text-orange-800 border-orange-300",
  confirmation_failed: "bg-red-50 text-red-700 border-red-200",
  confirmed_for_preparation: "bg-green-50 text-green-700 border-green-200",
  preparing: "bg-purple-50 text-purple-700 border-purple-200",
  ready_for_pickup: "bg-indigo-50 text-indigo-700 border-indigo-200",
  picked_up: "bg-indigo-50 text-indigo-700 border-indigo-200",
  on_the_way: "bg-blue-50 text-blue-700 border-blue-200",
  arriving_soon: "bg-teal-50 text-teal-700 border-teal-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-100 text-gray-600 border-gray-200",
};

const TIMELINE: { status: string; label: string; desc: string; icon: React.ElementType }[] = [
  { status: "pending_dispatch", label: "Commande reçue", desc: "Recherche d'un livreur disponible", icon: Clock },
  { status: "dispatching_driver", label: "Dispatch en cours", desc: "Notification des livreurs à proximité", icon: Truck },
  { status: "driver_assigned", label: "Livreur assigné", desc: "Un livreur a accepté votre commande", icon: Truck },
  { status: "awaiting_customer_confirmation", label: "Confirmation du livreur", desc: "Le livreur vérifie votre adresse", icon: Phone },
  { status: "confirmed_for_preparation", label: "Adresse confirmée", desc: "Tout est bon — la cuisine peut commencer !", icon: CheckCircle },
  { status: "preparing", label: "En préparation", desc: "Le restaurant prépare vos plats avec soin", icon: ChefHat },
  { status: "ready_for_pickup", label: "Prête — collecte en cours", desc: "Le livreur arrive au restaurant", icon: Package },
  { status: "picked_up", label: "Commande collectée", desc: "Le livreur est parti avec votre repas", icon: Package },
  { status: "on_the_way", label: "En route vers vous", desc: "Votre repas est en chemin !", icon: Navigation },
  { status: "arriving_soon", label: "Arrivée imminente", desc: "Le livreur est presque chez vous !", icon: MapPin },
  { status: "delivered", label: "Livré !", desc: "Bon appétit ! 🎉", icon: CheckCircle },
];

const ISSUE_STATUSES: Record<string, { label: string; desc: string }> = {
  needs_update: {
    label: "Correction requise",
    desc: "Votre livreur n'a pas pu confirmer vos informations. Corrigez-les pour continuer.",
  },
  confirmation_failed: {
    label: "Client injoignable",
    desc: "Votre livreur n'a pas pu vous joindre. Notre équipe va intervenir.",
  },
  cancelled: { label: "Commande annulée", desc: "Cette commande a été annulée." },
  failed: { label: "Commande échouée", desc: "Une erreur est survenue. Contactez notre support." },
};

const isIssueStatus = (s: string) => ["needs_update", "confirmation_failed", "cancelled", "failed", "refunded"].includes(s);
const isTerminal = (s: string) => ["delivered", "cancelled", "failed", "refunded"].includes(s);

function Timeline({ currentStatus, history }: { currentStatus: string; history?: any[] }) {
  const issue = isIssueStatus(currentStatus);
  const currentIdx = TIMELINE.findIndex((s) => s.status === currentStatus);

  const getTs = (status: string) => {
    const entry = history?.find((h: any) => h.status === status);
    if (!entry) return null;
    return new Date(entry.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-0">
      {TIMELINE.map((step, idx) => {
        const isDone = !issue && currentIdx > idx;
        const isActive = step.status === currentStatus && !issue;
        const isFuture = currentIdx < idx;
        const Icon = step.icon;
        const ts = getTs(step.status);

        if (issue && isFuture) return null;

        return (
          <div key={step.status} className="flex gap-3">
            {/* Line + dot */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                isDone ? "bg-green-500 shadow-sm shadow-green-200" :
                isActive ? "bg-primary ring-4 ring-primary/20 shadow-md shadow-primary/20" :
                "bg-gray-100"
              }`}>
                {isDone ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : isActive ? (
                  <Icon className="w-4 h-4 text-white" />
                ) : (
                  <Icon className={`w-3.5 h-3.5 ${isFuture ? "text-gray-300" : "text-gray-400"}`} />
                )}
              </div>
              {idx < TIMELINE.length - 1 && (
                <div className={`w-0.5 flex-1 min-h-[20px] mt-1 mb-1 ${isDone ? "bg-green-300" : "bg-gray-100"}`} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 flex-1 min-w-0 pt-1 ${isFuture ? "opacity-35" : ""}`}>
              <div className={`text-sm font-semibold leading-tight ${isActive ? "text-primary" : isDone ? "text-foreground/80" : "text-muted-foreground/60"}`}>
                {step.label}
              </div>
              {(isDone || isActive) && (
                <>
                  <div className="text-xs text-muted-foreground mt-0.5">{step.desc}</div>
                  {isActive && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                      <span className="text-xs text-primary font-semibold">En cours...</span>
                    </div>
                  )}
                  {isDone && ts && (
                    <div className="text-xs text-muted-foreground/50 mt-0.5 tabular-nums">{ts}</div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {issue && ISSUE_STATUSES[currentStatus] && (
        <div className="flex gap-3 mt-1">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-4 ${
              currentStatus === "needs_update"
                ? "bg-orange-500 ring-orange-100"
                : "bg-red-500 ring-red-100"
            }`}>
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="pt-1 flex-1">
            <div className={`text-sm font-bold ${currentStatus === "needs_update" ? "text-orange-700" : "text-red-700"}`}>
              {ISSUE_STATUSES[currentStatus].label}
            </div>
            <div className={`text-xs mt-0.5 ${currentStatus === "needs_update" ? "text-orange-600" : "text-red-600"}`}>
              {ISSUE_STATUSES[currentStatus].desc}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CorrectionForm({ orderId, onSuccess }: { orderId: number; onSuccess: () => void }) {
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [landmark, setLandmark] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address && !phone) {
      toast({ title: "Saisissez au moins l'adresse ou le téléphone", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("tc_token");
      const body: Record<string, string> = {};
      if (address) body.deliveryAddress = address;
      if (phone) body.deliveryPhone = phone;
      if (landmark) body.deliveryLandmark = landmark;
      if (instructions) body.deliveryInstructions = instructions;

      const res = await fetch(`/api/orders/${orderId}/update-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Informations mises à jour !", description: "Le livreur va vous recontacter." });
      onSuccess();
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour vos informations", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-2 border-orange-300 bg-orange-50 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Edit3 className="w-4 h-4 text-orange-700" />
        <h3 className="font-bold text-sm text-orange-800">Corriger vos informations de livraison</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Adresse de livraison", value: address, set: setAddress, placeholder: "Numéro, rue, quartier..." },
            { label: "Téléphone de contact", value: phone, set: setPhone, placeholder: "+213 5XX XXX XXX" },
            { label: "Point de repère", value: landmark, set: setLandmark, placeholder: "En face du café..." },
            { label: "Instructions livreur", value: instructions, set: setInstructions, placeholder: "Sonner 2 fois..." },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <Label className="text-xs font-semibold text-orange-900">{label}</Label>
              <Input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} className="mt-1 text-sm bg-white h-10" />
            </div>
          ))}
        </div>
        <Button type="submit" className="gap-2" disabled={saving}>
          {saving ? "Enregistrement..." : "Confirmer les corrections"}
        </Button>
      </form>
    </div>
  );
}

const STATUS_MESSAGES: Record<string, { text: string; className: string }> = {
  awaiting_customer_confirmation: {
    text: "📞 Votre livreur va vous contacter pour confirmer votre adresse. Restez disponible !",
    className: "bg-amber-50 border-amber-200 text-amber-800",
  },
  confirmed_for_preparation: {
    text: "✅ Adresse confirmée ! Le restaurant commence à préparer votre commande.",
    className: "bg-green-50 border-green-200 text-green-800",
  },
  preparing: {
    text: "🍳 Votre commande est en cours de préparation. Elle arrivera chaude et fraîche !",
    className: "bg-purple-50 border-purple-200 text-purple-800",
  },
  ready_for_pickup: {
    text: "🛍️ Prête ! Votre livreur est en route vers le restaurant.",
    className: "bg-indigo-50 border-indigo-200 text-indigo-800",
  },
  on_the_way: {
    text: "🛵 Votre repas est en route ! Plus que quelques minutes.",
    className: "bg-blue-50 border-blue-200 text-blue-800",
  },
  arriving_soon: {
    text: "📍 Votre livreur est presque chez vous ! Préparez-vous.",
    className: "bg-teal-50 border-teal-200 text-teal-800",
  },
};

export default function OrderTracking() {
  const params = useParams<{ orderId: string }>();
  const orderId = Number(params.orderId);
  const { toast } = useToast();

  const { data: order, isLoading, refetch } = useGetOrder(orderId, {
    query: { refetchInterval: 15000 },
  });

  const cancelMutation = useCancelOrder();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container max-w-3xl py-8 space-y-5">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-48 rounded-2xl" />
          <div className="grid md:grid-cols-2 gap-5">
            <Skeleton className="h-64 rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container max-w-3xl py-28 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-2xl font-bold mb-2">Commande introuvable</h2>
          <Link href="/orders"><Button variant="outline" className="mt-4">Mes commandes</Button></Link>
        </div>
      </div>
    );
  }

  const orderData = order as any;
  const status = orderData.status as string;
  const terminal = isTerminal(status);
  const delivered = status === "delivered";
  const needsCorrection = status === "needs_update";
  const msgCfg = STATUS_MESSAGES[status];

  const cancellableStatuses = ["pending_dispatch", "dispatching_driver", "driver_assigned"];
  const canCancel = cancellableStatuses.includes(status);

  const handleCancelOrder = () => {
    cancelMutation.mutate(
      { orderId, data: { reason: "Annulé par le client" } },
      {
        onSuccess: () => {
          setShowCancelConfirm(false);
          toast({ title: "Commande annulée", description: "Votre commande a été annulée avec succès." });
          refetch();
        },
        onError: () => {
          toast({ title: "Erreur", description: "Impossible d'annuler cette commande.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      <Navbar />
      <div className="container max-w-3xl py-6 space-y-5 pb-14">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-sm">
              <ChevronLeft className="w-4 h-4" /> Mes commandes
            </Button>
          </Link>
          {!terminal && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-medium" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser
            </Button>
          )}
        </div>

        {/* Delivery success celebration */}
        {delivered && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-8 text-center shadow-sm">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-extrabold text-green-800 mb-1">Livraison réussie !</h2>
            <p className="text-green-700 text-sm mb-5">Bon appétit ! Merci de votre confiance.</p>
            {orderData.qrToken && (
              <div className="max-w-xs mx-auto">
                <QRCodeDisplay token={orderData.qrToken} orderNumber={orderData.orderNumber} isUsed />
              </div>
            )}
          </div>
        )}

        {/* Header card */}
        <div className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${
          delivered ? "border-green-200" :
          needsCorrection ? "border-orange-300" :
          isIssueStatus(status) ? "border-red-200" :
          "border-primary/15"
        }`}>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">Commande</p>
                <h1 className="text-xl font-extrabold tracking-tight">{orderData.orderNumber}</h1>
                <p className="text-sm text-muted-foreground font-medium">{orderData.restaurantName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(orderData.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>

            <div className="flex items-start gap-2.5 bg-muted/40 rounded-xl p-3 text-sm">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">{orderData.deliveryAddress}</div>
                {orderData.deliveryLandmark && <div className="text-xs text-muted-foreground mt-0.5">{orderData.deliveryLandmark}</div>}
                {orderData.deliveryPhone && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {orderData.deliveryPhone}
                  </div>
                )}
              </div>
            </div>

            {orderData.driverName && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{orderData.driverName}</div>
                  <div className="text-xs text-muted-foreground">Votre livreur</div>
                </div>
                {orderData.driverRating && (
                  <div className="ml-auto flex items-center gap-1 text-amber-600 text-xs font-semibold">
                    <Star className="w-3 h-3 fill-current" />
                    {Number(orderData.driverRating).toFixed(1)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status message */}
        {msgCfg && (
          <div className={`border rounded-xl p-4 text-sm font-medium ${msgCfg.className}`}>
            {msgCfg.text}
          </div>
        )}

        {/* Issue alert */}
        {isIssueStatus(status) && ISSUE_STATUSES[status] && !["cancelled", "failed"].includes(status) && (
          <div className={`border-2 rounded-2xl p-4 flex gap-3 ${status === "needs_update" ? "border-orange-300 bg-orange-50" : "border-red-200 bg-red-50"}`}>
            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${status === "needs_update" ? "text-orange-600" : "text-red-600"}`} />
            <div>
              <p className={`font-bold text-sm ${status === "needs_update" ? "text-orange-800" : "text-red-800"}`}>
                {ISSUE_STATUSES[status].label}
              </p>
              <p className={`text-xs mt-0.5 ${status === "needs_update" ? "text-orange-700" : "text-red-700"}`}>
                {ISSUE_STATUSES[status].desc}
              </p>
            </div>
          </div>
        )}

        {needsCorrection && (
          <CorrectionForm orderId={orderId} onSuccess={() => refetch()} />
        )}

        {/* Cancel order button */}
        {canCancel && !showCancelConfirm && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-2"
              onClick={() => setShowCancelConfirm(true)}
            >
              <AlertCircle className="w-4 h-4" />
              Annuler ma commande
            </Button>
          </div>
        )}

        {/* Cancel confirmation */}
        {showCancelConfirm && (
          <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-800 text-sm">Confirmer l'annulation</p>
                <p className="text-red-700 text-xs mt-0.5">
                  Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-gray-200"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelMutation.isPending}
              >
                Non, garder
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancelOrder}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Annulation..." : "Oui, annuler"}
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Timeline */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-5">Suivi en temps réel</h3>
            <Timeline currentStatus={status} history={orderData.statusHistory} />
          </div>

          {/* Summary + QR */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Récapitulatif</h3>
              <div className="space-y-2">
                {orderData.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-semibold">{item.quantity}×</span> {item.productName}
                    </span>
                    <span className="font-semibold tabular-nums">{formatDA(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total</span><span className="tabular-nums">{formatDA(orderData.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Livraison</span><span className="tabular-nums">{formatDA(orderData.deliveryFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary tabular-nums">{formatDA(orderData.total)}</span>
                </div>
              </div>
            </div>

            {!delivered && orderData.qrToken && (
              <div className="bg-white rounded-2xl border shadow-sm p-4">
                <p className="text-xs text-center font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Code QR de livraison</p>
                <QRCodeDisplay token={orderData.qrToken} orderNumber={orderData.orderNumber} />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Link href="/restaurants" className="flex-1">
            <Button variant="outline" className="w-full gap-1.5 font-medium">
              <Home className="w-4 h-4" /> Commander à nouveau
            </Button>
          </Link>
          {!terminal && (
            <Button variant="ghost" className="gap-1.5 shrink-0 font-medium" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" /> Rafraîchir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
