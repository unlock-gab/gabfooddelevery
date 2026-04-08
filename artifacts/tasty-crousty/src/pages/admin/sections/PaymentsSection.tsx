import React, { useState } from "react";
import { formatDA } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useListPayments, useRefundPayment } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CreditCard, Banknote, RotateCcw, TrendingUp } from "lucide-react";

const METHOD_LABELS: Record<string, string> = {
  cash_on_delivery: "Espèces", online: "En ligne",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-slate-100 text-slate-600",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "En attente", paid: "Payé", failed: "Échoué", refunded: "Remboursé",
};

const FILTERS = [
  { label: "Tous", value: "" },
  { label: "En attente", value: "pending" },
  { label: "Payés", value: "paid" },
  { label: "Remboursés", value: "refunded" },
  { label: "Échoués", value: "failed" },
];

export function PaymentsSection() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, refetch } = useListPayments(
    { status: statusFilter || undefined },
    { query: { refetchInterval: 30000 } }
  );

  const refund = useRefundPayment();

  const handleRefund = (paymentId: number) => {
    refund.mutate({ paymentId }, {
      onSuccess: () => { toast({ title: "Remboursement effectué" }); refetch(); },
      onError: () => toast({ title: "Erreur de remboursement", variant: "destructive" } as any),
    });
  };

  const payments = Array.isArray(data) ? data : ((data as any)?.payments ?? []);

  const totalRevenue = payments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const codCount = payments.filter((p: any) => p.method === "cash_on_delivery").length;
  const onlineCount = payments.filter((p: any) => p.method === "online").length;
  const refundedCount = payments.filter((p: any) => p.status === "refunded").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paiements</h1>
          <p className="text-sm text-slate-500 mt-0.5">{payments.length} transactions</p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <p className="text-xs text-slate-500 uppercase tracking-wide">Revenu (filtre)</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatDA(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-4 h-4 text-slate-500" />
              <p className="text-xs text-slate-500 uppercase tracking-wide">Espèces</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{codCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-slate-500 uppercase tracking-wide">En ligne</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{onlineCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className="w-4 h-4 text-orange-500" />
              <p className="text-xs text-slate-500 uppercase tracking-wide">Remboursements</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{refundedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
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

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Commande</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Méthode</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Chargement…</td></tr>
              )}
              {!isLoading && !payments.length && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Aucun paiement</td></tr>
              )}
              {payments.map((p: any) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-slate-700">{p.orderNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      {p.method === "cash_on_delivery"
                        ? <Banknote className="w-3.5 h-3.5 text-slate-400" />
                        : <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                      }
                      {METHOD_LABELS[p.method] ?? p.method}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? "bg-slate-100"}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{formatDA(p.amount)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(p.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === "paid" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-orange-600"
                        onClick={() => handleRefund(p.id)}
                        disabled={refund.isPending}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Rembourser
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
