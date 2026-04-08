import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { useGetOrder } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, Package, MapPin, Phone, RefreshCw, Clock,
  CheckCircle, Truck, ChefHat, AlertCircle, Edit3, Star, Home, UserCheck, XCircle, Navigation
} from "lucide-react";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: "Recherche d'un livreur",
  dispatching_driver: "Dispatch en cours",
  driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Confirmation en attente",
  needs_update: "⚠️ Correction requise",
  confirmation_failed: "❌ Client injoignable",
  confirmed_for_preparation: "✅ Confirmé",
  preparing: "En préparation",
  ready_for_pickup: "Prêt pour collecte",
  picked_up: "Collecté par le livreur",
  on_the_way: "En route",
  arriving_soon: "Arrivée imminente",
  delivered: "✅ Livré !",
  cancelled: "❌ Annulé",
  failed: "❌ Échoué",
  refunded: "Remboursé",
};

const STATUS_COLORS: Record<string, string> = {
  pending_dispatch: "bg-blue-100 text-blue-800",
  dispatching_driver: "bg-blue-100 text-blue-800",
  driver_assigned: "bg-indigo-100 text-indigo-800",
  awaiting_customer_confirmation: "bg-amber-100 text-amber-800",
  needs_update: "bg-orange-100 text-orange-800",
  confirmation_failed: "bg-red-100 text-red-800",
  confirmed_for_preparation: "bg-green-100 text-green-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-indigo-100 text-indigo-800",
  picked_up: "bg-indigo-100 text-indigo-800",
  on_the_way: "bg-blue-100 text-blue-800",
  arriving_soon: "bg-teal-100 text-teal-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-700",
};

// ─── Full 17-step timeline definition ─────────────────────────────────────────
const TIMELINE: { status: string; label: string; desc: string; icon: React.ElementType }[] = [
  { status: "pending_dispatch", label: "Commande reçue", desc: "Recherche d'un livreur disponible", icon: Clock },
  { status: "dispatching_driver", label: "Dispatch en cours", desc: "Notification des livreurs proches de vous", icon: Truck },
  { status: "driver_assigned", label: "Livreur assigné", desc: "Un livreur a accepté votre commande", icon: Truck },
  { status: "awaiting_customer_confirmation", label: "Confirmation livreur", desc: "Le livreur vérifie votre adresse de livraison", icon: Phone },
  { status: "confirmed_for_preparation", label: "Adresse confirmée", desc: "Tout est bon ! La cuisine peut commencer", icon: CheckCircle },
  { status: "preparing", label: "En préparation", desc: "Le restaurant prépare vos plats avec soin", icon: ChefHat },
  { status: "ready_for_pickup", label: "Prête — collecte en cours", desc: "Le livreur vient chercher votre commande", icon: Package },
  { status: "picked_up", label: "Commande collectée", desc: "Le livreur est parti avec votre repas", icon: Package },
  { status: "on_the_way", label: "En route vers vous", desc: "Votre repas est en chemin !", icon: Navigation },
  { status: "arriving_soon", label: "Arrivée imminente", desc: "Le livreur est presque chez vous !", icon: MapPin },
  { status: "delivered", label: "Livré !", desc: "Bon appétit 🎉", icon: CheckCircle },
];

const ISSUE_STATUSES: Record<string, { label: string; desc: string; color: string }> = {
  needs_update: {
    label: "Correction requise",
    desc: "Votre livreur n'a pas pu confirmer vos informations. Corrigez-les ci-dessous pour continuer.",
    color: "orange",
  },
  confirmation_failed: {
    label: "Client injoignable",
    desc: "Votre livreur n'a pas pu vous joindre. Notre équipe va intervenir. Restez disponible.",
    color: "red",
  },
  cancelled: {
    label: "Commande annulée",
    desc: "Cette commande a été annulée.",
    color: "red",
  },
  failed: {
    label: "Commande échouée",
    desc: "La commande a échoué. Contactez notre support.",
    color: "red",
  },
};

const isIssueStatus = (s: string) => ["needs_update", "confirmation_failed", "cancelled", "failed", "refunded"].includes(s);
const isTerminal = (s: string) => ["delivered", "cancelled", "failed", "refunded"].includes(s);

// ─── Correction form ──────────────────────────────────────────────────────────
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
      toast({ title: "Veuillez renseigner au moins l'adresse ou le téléphone", variant: "destructive" });
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
      if (!res.ok) throw new Error("Erreur");
      toast({ title: "Infos mises à jour !", description: "Le livreur va vous recontacter." });
      onSuccess();
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour vos informations", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Edit3 className="w-4 h-4 text-orange-700" />
          <h3 className="font-semibold text-sm text-orange-800">Corriger vos informations de livraison</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-orange-900">Adresse de livraison</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="Numéro, rue, quartier..." className="mt-1 text-sm bg-white" />
            </div>
            <div>
              <Label className="text-xs font-medium text-orange-900">Téléphone de contact</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+213 5XX XXX XXX" className="mt-1 text-sm bg-white" />
            </div>
            <div>
              <Label className="text-xs font-medium text-orange-900">Repère / Point de référence</Label>
              <Input value={landmark} onChange={(e) => setLandmark(e.target.value)}
                placeholder="En face du café..." className="mt-1 text-sm bg-white" />
            </div>
            <div>
              <Label className="text-xs font-medium text-orange-900">Instructions pour le livreur</Label>
              <Input value={instructions} onChange={(e) => setInstructions(e.target.value)}
                placeholder="Sonner 2 fois, appeler avant..." className="mt-1 text-sm bg-white" />
            </div>
          </div>
          <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
            {saving ? "Envoi..." : "Confirmer les corrections"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Timeline component ───────────────────────────────────────────────────────
function Timeline({ currentStatus, history }: { currentStatus: string; history?: any[] }) {
  const issue = isIssueStatus(currentStatus);
  const currentIdx = TIMELINE.findIndex((s) => s.status === currentStatus);

  // Find timestamp from history
  const getTs = (status: string) => {
    const entry = history?.find((h: any) => h.status === status);
    if (!entry) return null;
    return new Date(entry.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-100" />

      <div className="space-y-0">
        {TIMELINE.map((step, idx) => {
          const isDone = !issue && currentIdx > idx;
          const isActive = step.status === currentStatus && !issue;
          const isFuture = currentIdx < idx;
          const ts = getTs(step.status);
          const Icon = step.icon;

          if (issue && isFuture) return null;

          return (
            <div key={step.status} className={`flex gap-4 pb-5 relative ${isFuture ? "opacity-25" : ""}`}>
              {/* Dot */}
              <div className="absolute left-[-24px] top-0.5 z-10">
                {isDone ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                ) : isActive ? (
                  <div className="w-5 h-5 rounded-full bg-primary ring-4 ring-primary/20 animate-pulse shadow" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200" />
                )}
              </div>

              <div className="flex-1 pt-0.5">
                <div className={`text-sm font-semibold ${isActive ? "text-primary" : isDone ? "text-foreground/70" : "text-muted-foreground/50"}`}>
                  {step.label}
                </div>
                {(isDone || isActive) && (
                  <div className="text-xs text-muted-foreground mt-0.5">{step.desc}</div>
                )}
                {isActive && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    <span className="text-xs text-primary font-medium">En cours...</span>
                  </div>
                )}
                {isDone && ts && (
                  <div className="text-xs text-muted-foreground/50 mt-0.5">{ts}</div>
                )}
              </div>
            </div>
          );
        })}

        {/* Issue step */}
        {issue && ISSUE_STATUSES[currentStatus] && (
          <div className="flex gap-4 pb-5 relative">
            <div className="absolute left-[-24px] top-0.5 z-10">
              <div className="w-5 h-5 rounded-full bg-orange-500 ring-4 ring-orange-200 shadow" />
            </div>
            <div className="flex-1 pt-0.5">
              <div className="text-sm font-semibold text-orange-700">{ISSUE_STATUSES[currentStatus].label}</div>
              <div className="text-xs text-orange-600 mt-0.5">{ISSUE_STATUSES[currentStatus].desc}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderTracking() {
  const params = useParams<{ orderId: string }>();
  const orderId = Number(params.orderId);
  const { toast } = useToast();

  const { data: order, isLoading, refetch } = useGetOrder(orderId, {
    query: { refetchInterval: 15000 },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container max-w-3xl py-16 text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du suivi...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container max-w-3xl py-20 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-2xl font-bold mb-2">Commande introuvable</h2>
          <Link href="/orders"><Button variant="outline" className="mt-4">Mes commandes</Button></Link>
        </div>
      </div>
    );
  }

  const status = order.status as string;
  const terminal = isTerminal(status);
  const delivered = status === "delivered";
  const needsCorrection = status === "needs_update";

  // Status message for key states
  const statusMessages: Record<string, { text: string; bg: string; text2: string }> = {
    awaiting_customer_confirmation: {
      text: "📞 Votre livreur va vous contacter pour confirmer votre adresse. Restez disponible !",
      bg: "bg-amber-50 border-amber-200",
      text2: "text-amber-800",
    },
    confirmed_for_preparation: {
      text: "✅ Adresse confirmée ! Le restaurant commence à préparer votre commande.",
      bg: "bg-green-50 border-green-200",
      text2: "text-green-800",
    },
    preparing: {
      text: "🍳 Votre commande est en cours de préparation. Elle arrivera chaude !",
      bg: "bg-purple-50 border-purple-200",
      text2: "text-purple-800",
    },
    ready_for_pickup: {
      text: "🛍️ Prête ! Votre livreur est en route vers le restaurant.",
      bg: "bg-indigo-50 border-indigo-200",
      text2: "text-indigo-800",
    },
    on_the_way: {
      text: "🛵 Votre repas est en route ! Plus que quelques minutes.",
      bg: "bg-blue-50 border-blue-200",
      text2: "text-blue-800",
    },
    arriving_soon: {
      text: "📍 Votre livreur est presque arrivé ! Préparez-vous à récupérer votre commande.",
      bg: "bg-teal-50 border-teal-200",
      text2: "text-teal-800",
    },
  };

  const msgCfg = statusMessages[status];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container max-w-3xl py-6 space-y-5 pb-12">
        {/* Back + refresh */}
        <div className="flex items-center justify-between">
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="-ml-2 gap-1">
              <ChevronLeft className="w-4 h-4" /> Mes commandes
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </Button>
        </div>

        {/* Header card */}
        <Card className={`border-2 ${delivered ? "border-green-300" : needsCorrection ? "border-orange-300" : "border-primary/20"}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl font-bold">{order.orderNumber}</h1>
                <p className="text-sm text-muted-foreground">{order.restaurantName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"}`}>
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>

            {/* Delivery address */}
            <div className="flex gap-2 bg-muted/50 rounded-xl p-3 text-sm">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">{order.deliveryAddress}</div>
                {order.deliveryLandmark && <div className="text-xs text-muted-foreground mt-0.5">{order.deliveryLandmark}</div>}
                {order.deliveryPhone && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {order.deliveryPhone}
                  </div>
                )}
              </div>
            </div>

            {/* Driver info */}
            {order.driverName && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{order.driverName}</div>
                  <div className="text-xs text-muted-foreground">Votre livreur</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status message */}
        {msgCfg && (
          <div className={`border rounded-xl p-4 text-sm ${msgCfg.bg}`}>
            <p className={`font-medium ${msgCfg.text2}`}>{msgCfg.text}</p>
          </div>
        )}

        {/* Issue alert */}
        {isIssueStatus(status) && ISSUE_STATUSES[status] && (
          <div className={`border-2 rounded-xl p-4 flex gap-3 ${status === "needs_update" ? "border-orange-300 bg-orange-50" : "border-red-300 bg-red-50"}`}>
            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${status === "needs_update" ? "text-orange-600" : "text-red-600"}`} />
            <div>
              <p className={`font-semibold text-sm ${status === "needs_update" ? "text-orange-800" : "text-red-800"}`}>
                {ISSUE_STATUSES[status].label}
              </p>
              <p className={`text-xs mt-0.5 ${status === "needs_update" ? "text-orange-700" : "text-red-700"}`}>
                {ISSUE_STATUSES[status].desc}
              </p>
            </div>
          </div>
        )}

        {/* Correction form */}
        {needsCorrection && (
          <CorrectionForm orderId={orderId} onSuccess={() => refetch()} />
        )}

        {/* Delivered celebration */}
        {delivered && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-bold text-green-800 mb-1">Livraison réussie !</h2>
              <p className="text-sm text-green-700 mb-4">Bon appétit ! Merci de votre confiance.</p>
              {order.qrToken && <QRCodeDisplay token={order.qrToken} orderId={order.id} />}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Timeline */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Suivi en temps réel
              </CardTitle>
            </CardHeader>
            <CardContent className="px-10 pb-5">
              <Timeline currentStatus={status} history={order.statusHistory} />
            </CardContent>
          </Card>

          {/* Order items + address */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.quantity}× {item.productName}</span>
                    <span className="font-medium">{(item.price * item.quantity).toFixed(2)} €</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Sous-total</span>
                    <span>{Number(order.subtotal).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Livraison</span>
                    <span>{Number(order.deliveryFee).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
                    <span>Total</span>
                    <span className="text-primary">{Number(order.total).toFixed(2)} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QR for active delivery */}
            {!delivered && order.qrToken && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-center text-muted-foreground mb-3">Code QR de vérification</p>
                  <QRCodeDisplay token={order.qrToken} orderId={order.id} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Link href="/restaurants" className="flex-1">
            <Button variant="outline" className="w-full gap-1">
              <Home className="w-4 h-4" /> Commander à nouveau
            </Button>
          </Link>
          {!terminal && (
            <Button variant="ghost" className="gap-1 shrink-0" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" /> Rafraîchir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
