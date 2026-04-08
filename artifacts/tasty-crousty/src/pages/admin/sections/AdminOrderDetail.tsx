import React, { useState } from "react";
import { formatDA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  X, RefreshCw, Truck, AlertTriangle, CheckCircle2, XCircle,
  User, Store, MapPin, CreditCard, QrCode, Shield, Clock,
  Radio, Phone, Star, Package, FileText, Activity, ChevronRight,
  AlertCircle, Check, RotateCcw, Flag, MessageSquare, Eye, Zap,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderDetailData = {
  id: number; orderNumber: string; status: string; paymentStatus: string;
  paymentMethod: string; subtotal: number; deliveryFee: number; total: number;
  discount: number; deliveryAddress: string; deliveryPhone: string;
  deliveryLandmark?: string; deliveryFloor?: string; deliveryInstructions?: string;
  specialInstructions?: string; cancellationReason?: string;
  createdAt: string; updatedAt: string;
  customer: { id: number; name: string; email: string; phone?: string; orderCount: number; riskScore: string; cancellationCount: number; unreachableCount: number };
  restaurant: { id: number; name: string; phone?: string; address?: string; isOpen: boolean; avgRating: number; estimatedPrepTime?: number };
  driver: { id: number; name: string; phone?: string; acceptanceRate: number; totalDeliveries: number; avgRating: number; isOnline: boolean; status: string } | null;
  items: { id: number; productName: string; quantity: number; price: number; notes?: string }[];
  statusHistory: { id: number; status: string; note?: string; createdBy?: string; createdAt: string }[];
  dispatchAttempts: { id: number; driverName: string; driverId?: number; result: string; attemptedAt: string; respondedAt?: string; expiresAt?: string }[];
  confirmations: { id: number; driverName: string; result: string; createdAt: string }[];
  qr: { token: string; isVerified: boolean; verifiedAt?: string; expiresAt?: string; invalidAttempts: number } | null;
  fraudFlags: { id: number; type: string; severity: string; description: string; isResolved: boolean; resolvedBy?: string; resolvedAt?: string; createdAt: string; relatedOrderId?: number }[];
  disputes: { id: number; type: string; status: string; description: string; resolution?: string; createdAt: string }[];
  payment: { id: number; amount: number; status: string; method: string; transactionId?: string; createdAt: string } | null;
};

// ─── Labels & Helpers ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: "En attente dispatch", placed: "Placée",
  dispatching_driver: "Dispatch en cours", driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Attente confirmation", needs_update: "MAJ requise",
  confirmation_failed: "Confirmation échouée", confirmed_for_preparation: "PrepLock™ confirmé",
  preparing: "En préparation", ready_for_pickup: "Prête au pickup",
  driver_at_restaurant: "Livreur au restaurant", picked_up: "Récupérée",
  on_the_way: "En route", arriving_soon: "À proximité", delivered: "Livrée ✓",
  cancelled: "Annulée", failed: "Échouée", pending_payment: "Attente paiement",
};

const STATUS_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  pending_dispatch: { icon: <Clock className="w-3.5 h-3.5" />, color: "text-amber-500 bg-amber-50 border-amber-200" },
  dispatching_driver: { icon: <Radio className="w-3.5 h-3.5" />, color: "text-blue-500 bg-blue-50 border-blue-200" },
  driver_assigned: { icon: <Truck className="w-3.5 h-3.5" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
  awaiting_customer_confirmation: { icon: <Phone className="w-3.5 h-3.5" />, color: "text-orange-500 bg-orange-50 border-orange-200" },
  needs_update: { icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-red-500 bg-red-50 border-red-200" },
  confirmation_failed: { icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-600 bg-red-50 border-red-200" },
  confirmed_for_preparation: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-purple-600 bg-purple-50 border-purple-200" },
  preparing: { icon: <Package className="w-3.5 h-3.5" />, color: "text-purple-600 bg-purple-50 border-purple-200" },
  ready_for_pickup: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  picked_up: { icon: <Truck className="w-3.5 h-3.5" />, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  on_the_way: { icon: <Truck className="w-3.5 h-3.5" />, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  arriving_soon: { icon: <Zap className="w-3.5 h-3.5" />, color: "text-teal-600 bg-teal-50 border-teal-200" },
  delivered: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-600 bg-green-50 border-green-200" },
  cancelled: { icon: <XCircle className="w-3.5 h-3.5" />, color: "text-slate-500 bg-slate-50 border-slate-200" },
};

const DISPATCH_RESULT_LABELS: Record<string, { label: string; color: string }> = {
  accepted: { label: "Accepté", color: "bg-green-100 text-green-700" },
  rejected: { label: "Refusé", color: "bg-red-100 text-red-700" },
  timeout: { label: "Timeout", color: "bg-amber-100 text-amber-700" },
  pending: { label: "En attente", color: "bg-blue-100 text-blue-700" },
  no_driver: { label: "Sans livreur", color: "bg-slate-100 text-slate-600" },
};

const CONFIRMATION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  confirmed: { label: "Confirmé ✓", color: "bg-green-100 text-green-700", icon: <Check className="w-3 h-3" /> },
  needs_correction: { label: "Correction requise", color: "bg-amber-100 text-amber-700", icon: <AlertTriangle className="w-3 h-3" /> },
  failed: { label: "Échec / Injoignable", color: "bg-red-100 text-red-700", icon: <XCircle className="w-3 h-3" /> },
};

const RISK_COLORS: Record<string, string> = {
  low: "text-green-600 bg-green-50 border-green-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  high: "text-red-600 bg-red-50 border-red-200",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-amber-50 text-amber-700 border-amber-200",
  medium: "bg-orange-50 text-orange-700 border-orange-200",
  high: "bg-red-50 text-red-700 border-red-200",
  critical: "bg-red-100 text-red-900 border-red-300",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// ─── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <span className="text-slate-500">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-700 tracking-wide">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DataRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-500 shrink-0 mr-4">{label}</span>
      <span className={`text-xs font-medium text-right ${highlight ? "text-primary font-bold" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_ICONS[status];
  if (!s) return <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full border border-slate-200">{STATUS_LABELS[status] ?? status}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${s.color}`}>
      {s.icon}{STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function Timeline({ history }: { history: OrderDetailData["statusHistory"] }) {
  const items = [...history].reverse();
  return (
    <div className="relative">
      {items.map((h, i) => {
        const si = STATUS_ICONS[h.status];
        const isFirst = i === 0;
        return (
          <div key={h.id} className="flex gap-3 mb-3 last:mb-0">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0 ${isFirst ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                {si?.icon ?? <Activity className="w-3 h-3" />}
              </div>
              {i < items.length - 1 && <div className="w-px flex-1 bg-slate-100 my-1" />}
            </div>
            <div className="flex-1 pb-2">
              <p className={`text-sm font-semibold ${isFirst ? "text-slate-900" : "text-slate-600"}`}>
                {STATUS_LABELS[h.status] ?? h.status}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400">{fmt(h.createdAt)}</span>
                {h.createdBy && <span className="text-xs text-slate-400">· par {h.createdBy}</span>}
              </div>
              {h.note && <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded px-2 py-1">{h.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── API hooks ─────────────────────────────────────────────────────────────────
function useAdminOrderDetail(orderId: number | null) {
  return useQuery<OrderDetailData>({
    queryKey: ["admin-order-detail", orderId],
    queryFn: async () => {
      const token = localStorage.getItem("tc_token");
      const res = await fetch(`/api/admin/orders/${orderId}/detail`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
    enabled: orderId !== null,
    refetchInterval: 20000,
  });
}

function useRedispatch() {
  return useMutation({
    mutationFn: async (orderId: number) => {
      const token = localStorage.getItem("tc_token");
      const res = await fetch(`/api/orders/${orderId}/dispatch`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
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
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Override failed");
      return res.json();
    },
  });
}

function useCancelOrder() {
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: number; reason: string }) => {
      const token = localStorage.getItem("tc_token");
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Cancel failed");
      return res.json();
    },
  });
}

// ─── Main component ────────────────────────────────────────────────────────────
export function AdminOrderDetail({ orderId, onClose }: { orderId: number | null; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: order, isLoading } = useAdminOrderDetail(orderId);
  const redispatch = useRedispatch();
  const override = useOverrideDelivery();
  const cancel = useCancelOrder();
  const [noteText, setNoteText] = useState("");

  const isProblematic = order && ["needs_update", "confirmation_failed", "cancelled", "failed"].includes(order.status);
  const isActive = order && !["delivered", "cancelled", "failed"].includes(order.status);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
    qc.invalidateQueries({ queryKey: ["/api/admin/operational"] });
  };

  const handleRedispatch = () => {
    if (!order) return;
    redispatch.mutate(order.id, {
      onSuccess: () => { toast({ title: "Dispatch relancé ✓" }); invalidate(); },
      onError: () => toast({ title: "Erreur dispatch", variant: "destructive" } as any),
    });
  };

  const handleOverride = () => {
    if (!order) return;
    override.mutate({ orderId: order.id, reason: "Override livraison par admin" }, {
      onSuccess: () => { toast({ title: "Commande marquée livrée ✓" }); invalidate(); },
      onError: () => toast({ title: "Erreur override", variant: "destructive" } as any),
    });
  };

  const handleCancel = () => {
    if (!order) return;
    cancel.mutate({ orderId: order.id, reason: "Annulée par admin" }, {
      onSuccess: () => { toast({ title: "Commande annulée" }); invalidate(); },
      onError: () => toast({ title: "Erreur annulation", variant: "destructive" } as any),
    });
  };

  return (
    <Dialog open={orderId !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl w-full h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ── Sticky Header ─────────────────────────────────────────────────── */}
        <div className={`shrink-0 border-b ${isProblematic ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-lg font-bold text-slate-900">{order?.orderNumber ?? "…"}</span>
                {order && <StatusBadge status={order.status} />}
                {isProblematic && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded-full">
                    <AlertTriangle className="w-3 h-3" /> URGENT
                  </span>
                )}
                {order?.fraudFlags?.filter(f => !f.isResolved).length ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full">
                    <Flag className="w-3 h-3" /> Signalé
                  </span>
                ) : null}
              </div>
              {order && (
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{order.customer.name}</span>
                  <span className="flex items-center gap-1"><Store className="w-3 h-3" />{order.restaurant.name}</span>
                  {order.driver && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{order.driver.name}</span>}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(order.createdAt)}</span>
                  <span className="font-bold text-primary text-sm">{formatDA(order.total)}</span>
                </div>
              )}
            </div>
            <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Quick action bar */}
          {order && (
            <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
              {(order.status === "pending_dispatch" || order.status === "dispatching_driver") && (
                <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 gap-1"
                  onClick={handleRedispatch} disabled={redispatch.isPending}>
                  <Radio className="w-3 h-3" /> Relancer dispatch
                </Button>
              )}
              {isActive && (
                <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 gap-1"
                  onClick={handleOverride} disabled={override.isPending}>
                  <CheckCircle2 className="w-3 h-3" /> Marquer livrée
                </Button>
              )}
              {isActive && !["delivered", "cancelled", "failed"].includes(order.status) && (
                <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                  onClick={handleCancel} disabled={cancel.isPending}>
                  <XCircle className="w-3 h-3" /> Annuler
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={invalidate}>
                <RefreshCw className="w-3 h-3" /> Actualiser
              </Button>
            </div>
          )}
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Chargement…
          </div>
        )}
        {order && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
              <div className="space-y-4">

                {/* 1 — Timeline */}
                <Section title="Cycle de vie de la commande" icon={<Activity className="w-4 h-4" />}>
                  {order.statusHistory.length === 0
                    ? <p className="text-xs text-slate-400">Aucun historique</p>
                    : <Timeline history={order.statusHistory} />
                  }
                </Section>

                {/* 2 — Dispatch */}
                <Section title="Dispatch & Tentatives livreurs" icon={<Radio className="w-4 h-4" />}>
                  {order.dispatchAttempts.length === 0 ? (
                    <p className="text-xs text-slate-400">Aucune tentative de dispatch enregistrée</p>
                  ) : (
                    <div className="space-y-2">
                      {order.dispatchAttempts.map((a, i) => {
                        const res = DISPATCH_RESULT_LABELS[a.result] ?? { label: a.result, color: "bg-slate-100 text-slate-600" };
                        return (
                          <div key={a.id} className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-xs font-bold text-slate-500 mt-0.5">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-700 truncate">{a.driverName}</p>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full shrink-0 ${res.color}`}>{res.label}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5 flex gap-3">
                                <span>Envoyé {fmtTime(a.attemptedAt)}</span>
                                {a.respondedAt && <span>Répondu {fmtTime(a.respondedAt)}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Section>

                {/* 3 — Confirmation client */}
                <Section title="Confirmation client (PrepLock™)" icon={<Phone className="w-4 h-4" />}>
                  {order.confirmations.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                      <Clock className="w-3.5 h-3.5" /> Phase de confirmation non atteinte
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {order.confirmations.map(c => {
                        const conf = CONFIRMATION_LABELS[c.result] ?? { label: c.result, color: "bg-slate-100 text-slate-600", icon: null };
                        return (
                          <div key={c.id} className={`flex items-start gap-3 p-3 rounded-lg border ${c.result === "confirmed" ? "bg-green-50 border-green-200" : c.result === "failed" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                            <div className={`p-1.5 rounded-full ${conf.color}`}>{conf.icon}</div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{conf.label}</p>
                              <p className="text-xs text-slate-500">Par {c.driverName} · {fmt(c.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Section>

                {/* 4 — QR livraison */}
                <Section title="Vérification QR livraison" icon={<QrCode className="w-4 h-4" />}>
                  {!order.qr ? (
                    <p className="text-xs text-slate-400">Aucun token QR généré</p>
                  ) : (
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 p-3 rounded-lg border ${order.qr.isVerified ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                        {order.qr.isVerified
                          ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                          : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        }
                        <div>
                          <p className={`text-sm font-bold ${order.qr.isVerified ? "text-green-700" : "text-amber-700"}`}>
                            {order.qr.isVerified ? "QR vérifié ✓" : "QR non scanné"}
                          </p>
                          {order.qr.verifiedAt && <p className="text-xs text-slate-500">Vérifié à {fmt(order.qr.verifiedAt)}</p>}
                          {order.qr.expiresAt && !order.qr.isVerified && <p className="text-xs text-slate-500">Expire {fmt(order.qr.expiresAt)}</p>}
                        </div>
                      </div>
                      {order.qr.invalidAttempts > 0 && (
                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          <AlertCircle className="w-3.5 h-3.5" /> {order.qr.invalidAttempts} tentative(s) de scan invalide(s)
                        </div>
                      )}
                    </div>
                  )}
                </Section>

              </div>

              {/* ── RIGHT COLUMN ──────────────────────────────────────────── */}
              <div className="space-y-4">

                {/* 5 — Articles commandés */}
                <Section title="Articles commandés" icon={<Package className="w-4 h-4" />}>
                  <div className="space-y-1.5 mb-3">
                    {order.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-semibold text-slate-500 mr-1.5">{item.quantity}×</span>
                          <span className="text-slate-800">{item.productName}</span>
                          {item.notes && <p className="text-xs text-slate-400 ml-5">{item.notes}</p>}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 shrink-0 ml-2">{formatDA(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-2" />
                  <DataRow label="Sous-total" value={formatDA(order.subtotal)} />
                  {order.discount > 0 && <DataRow label="Remise promo" value={`-${formatDA(order.discount)}`} />}
                  <DataRow label="Frais livraison" value={formatDA(order.deliveryFee)} />
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                    <span className="text-sm font-bold text-slate-700">Total</span>
                    <span className="text-base font-bold text-primary">{formatDA(order.total)}</span>
                  </div>
                </Section>

                {/* 6 — Paiement */}
                <Section title="Paiement" icon={<CreditCard className="w-4 h-4" />}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${order.paymentStatus === "paid" ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                      {order.paymentStatus === "paid" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {order.paymentStatus === "paid" ? "Payé" : "En attente"}
                    </div>
                    <span className="text-xs text-slate-500">
                      {order.paymentMethod === "cash_on_delivery" ? "Espèces à la livraison" : "Paiement en ligne"}
                    </span>
                  </div>
                  {order.payment && (
                    <>
                      <DataRow label="Montant" value={formatDA(order.payment.amount)} highlight />
                      <DataRow label="Méthode" value={order.payment.method} />
                      {order.payment.transactionId && <DataRow label="Réf. transaction" value={<span className="font-mono text-xs">{order.payment.transactionId}</span>} />}
                      <DataRow label="Date" value={fmt(order.payment.createdAt)} />
                    </>
                  )}
                </Section>

                {/* 7 — Client */}
                <Section title="Client" icon={<User className="w-4 h-4" />}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{order.customer.name}</p>
                      <p className="text-xs text-slate-500">{order.customer.email}</p>
                      {order.customer.phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{order.customer.phone}</p>}
                    </div>
                    <div className="ml-auto">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${RISK_COLORS[order.customer.riskScore] ?? RISK_COLORS.low}`}>
                        Risque {order.customer.riskScore === "high" ? "élevé" : order.customer.riskScore === "medium" ? "moyen" : "faible"}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "Commandes", val: order.customer.orderCount },
                      { label: "Annulations", val: order.customer.cancellationCount },
                      { label: "Injoignable", val: order.customer.unreachableCount },
                    ].map(s => (
                      <div key={s.label} className="text-center bg-slate-50 rounded-lg py-2 border border-slate-100">
                        <p className="text-sm font-bold text-slate-800">{s.val}</p>
                        <p className="text-xs text-slate-400">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Adresse livraison</p>
                    <p className="text-xs text-slate-700">{order.deliveryAddress}</p>
                    {order.deliveryPhone && <p className="text-xs text-slate-500 mt-0.5">{order.deliveryPhone}</p>}
                    {order.deliveryLandmark && <p className="text-xs text-slate-500">Repère: {order.deliveryLandmark}</p>}
                    {order.deliveryFloor && <p className="text-xs text-slate-500">Étage: {order.deliveryFloor}</p>}
                    {order.deliveryInstructions && <p className="text-xs text-slate-500">Notes: {order.deliveryInstructions}</p>}
                  </div>
                </Section>

                {/* 8 — Restaurant */}
                <Section title="Restaurant" icon={<Store className="w-4 h-4" />}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">{order.restaurant.name}</p>
                      {order.restaurant.phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{order.restaurant.phone}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-semibold ${order.restaurant.isOpen ? "text-green-600" : "text-slate-400"}`}>
                        {order.restaurant.isOpen ? "● Ouvert" : "● Fermé"}
                      </span>
                      {order.restaurant.avgRating > 0 && (
                        <div className="flex items-center gap-0.5 justify-end mt-0.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-semibold">{Number(order.restaurant.avgRating).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {order.restaurant.estimatedPrepTime && (
                    <DataRow label="Temps préparation estimé" value={`${order.restaurant.estimatedPrepTime} min`} />
                  )}
                </Section>

                {/* 9 — Livreur */}
                {order.driver ? (
                  <Section title="Livreur assigné" icon={<Truck className="w-4 h-4" />}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{order.driver.name}</p>
                        {order.driver.phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{order.driver.phone}</p>}
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${order.driver.isOnline ? "text-green-600" : "text-slate-400"}`}>
                        {order.driver.isOnline ? "● En ligne" : "● Hors ligne"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Livraisons", val: order.driver.totalDeliveries },
                        { label: "Acceptation", val: `${Math.round(Number(order.driver.acceptanceRate))}%` },
                        { label: "Note", val: Number(order.driver.avgRating).toFixed(1) + " ★" },
                      ].map(s => (
                        <div key={s.label} className="text-center bg-slate-50 rounded-lg py-2 border border-slate-100">
                          <p className="text-sm font-bold text-slate-800">{s.val}</p>
                          <p className="text-xs text-slate-400">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                ) : (
                  <Section title="Livreur" icon={<Truck className="w-4 h-4" />}>
                    <p className="text-xs text-slate-400">Aucun livreur assigné</p>
                  </Section>
                )}

              </div>
            </div>

            {/* ── Full-width sections ──────────────────────────────────────── */}
            <div className="mt-4 space-y-4">

              {/* 10 — Fraude & Litiges */}
              <Section title="Risques, fraude & litiges" icon={<Shield className="w-4 h-4" />}>
                {order.fraudFlags.length === 0 && order.disputes.length === 0 ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" /> Aucun risque opérationnel détecté pour cette commande.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {order.fraudFlags.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Signalements fraude</p>
                        <div className="space-y-2">
                          {order.fraudFlags.map(f => (
                            <div key={f.id} className={`p-2.5 rounded-lg border text-xs ${SEVERITY_COLORS[f.severity] ?? "bg-slate-50"}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold">{f.type.replace(/_/g, " ")}</span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${f.isResolved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                  {f.isResolved ? "Résolu" : "Ouvert"}
                                </span>
                              </div>
                              <p className="text-xs opacity-80">{f.description}</p>
                              <p className="text-xs opacity-60 mt-1">{fmt(f.createdAt)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {order.disputes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Litiges</p>
                        <div className="space-y-2">
                          {order.disputes.map(d => (
                            <div key={d.id} className="p-2.5 rounded-lg border border-orange-200 bg-orange-50 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-orange-800">{d.type.replace(/_/g, " ")}</span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${d.status === "resolved" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                  {d.status}
                                </span>
                              </div>
                              <p className="text-xs text-orange-700">{d.description}</p>
                              {d.resolution && <p className="text-xs text-green-700 mt-1">Résolution: {d.resolution}</p>}
                              <p className="text-xs text-orange-400 mt-1">{fmt(d.createdAt)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* 11 — Notes internes */}
              <Section title="Notes internes & actions admin" icon={<MessageSquare className="w-4 h-4" />}>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Ajouter une note interne sur cette commande…"
                    className="text-sm resize-none min-h-[70px]"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" className="h-7 text-xs gap-1" disabled={!noteText.trim()}
                      onClick={() => { toast({ title: "Note ajoutée (demo)" }); setNoteText(""); }}>
                      <MessageSquare className="w-3 h-3" /> Ajouter note
                    </Button>
                    {isActive && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-amber-700 border-amber-300"
                          onClick={() => toast({ title: "Marqué pour révision" })}>
                          <Eye className="w-3 h-3" /> Marquer révision
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-700 border-red-300"
                          onClick={() => toast({ title: "Signalement ajouté" })}>
                          <Flag className="w-3 h-3" /> Signaler fraude
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Section>

              {/* 12 — Audit trail */}
              <Section title="Journal d'audit complet" icon={<FileText className="w-4 h-4" />}>
                {order.statusHistory.length === 0 ? (
                  <p className="text-xs text-slate-400">Aucune entrée d'audit</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left pb-2 text-slate-400 font-medium pr-4">Horodatage</th>
                          <th className="text-left pb-2 text-slate-400 font-medium pr-4">Acteur</th>
                          <th className="text-left pb-2 text-slate-400 font-medium pr-4">Action</th>
                          <th className="text-left pb-2 text-slate-400 font-medium">Détail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...order.statusHistory].reverse().map(h => (
                          <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{fmt(h.createdAt)}</td>
                            <td className="py-2 pr-4 font-medium text-slate-600 whitespace-nowrap">{h.createdBy ?? "système"}</td>
                            <td className="py-2 pr-4">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-mono">
                                {STATUS_LABELS[h.status] ?? h.status}
                              </span>
                            </td>
                            <td className="py-2 text-slate-400 max-w-xs truncate">{h.note ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
