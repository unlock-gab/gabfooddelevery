import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, RefreshCw, MessageSquare, CheckCircle, Clock, X, ChevronDown, ChevronUp,
} from "lucide-react";

interface Dispute {
  id: number;
  orderId: number;
  orderNumber: string | null;
  reportedByName: string | null;
  type: string;
  status: string;
  description: string;
  adminNote: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  not_delivered: "Commande non livrée",
  wrong_order: "Mauvaise commande",
  missing_items: "Articles manquants",
  quality_issue: "Problème qualité",
  payment_issue: "Problème paiement",
  driver_behavior: "Comportement livreur",
  late_delivery: "Livraison tardive",
  qr_issue: "Problème QR",
  other: "Autre",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  under_review: "bg-amber-100 text-amber-800",
  resolved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-slate-100 text-slate-700",
  closed: "bg-slate-100 text-slate-600",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  under_review: "En cours",
  resolved: "Résolu",
  rejected: "Rejeté",
  closed: "Clôturé",
};

function DisputeCard({ dispute, onRefresh }: { dispute: Dispute; onRefresh: () => void }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [adminNote, setAdminNote] = useState(dispute.adminNote ?? "");
  const [resolution, setResolution] = useState(dispute.resolution ?? "");
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("tc_token");

  const updateStatus = async (status: string) => {
    await fetch(`/api/admin/disputes/${dispute.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    toast({ title: `Statut mis à jour : ${STATUS_LABELS[status]}` });
    onRefresh();
  };

  const saveNotes = async () => {
    setSaving(true);
    await fetch(`/api/admin/disputes/${dispute.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ adminNote: adminNote || null, resolution: resolution || null }),
    });
    setSaving(false);
    toast({ title: "Notes enregistrées" });
    onRefresh();
  };

  return (
    <Card className={`${dispute.status === "open" ? "border-red-200" : dispute.status === "under_review" ? "border-amber-200" : ""}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-600">{dispute.orderNumber ?? `#${dispute.orderId}`}</span>
            <Badge className={`text-xs ${STATUS_COLORS[dispute.status]}`}>{STATUS_LABELS[dispute.status]}</Badge>
            <Badge variant="outline" className="text-xs">{TYPE_LABELS[dispute.type] ?? dispute.type}</Badge>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-700 p-1 shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div>
          <p className="text-sm text-slate-700">{dispute.description}</p>
          <p className="text-xs text-slate-400 mt-1">
            Signalé par <strong>{dispute.reportedByName ?? "Inconnu"}</strong> · {new Date(dispute.createdAt).toLocaleString("fr-DZ")}
          </p>
        </div>

        {/* Quick actions */}
        {dispute.status === "open" && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus("under_review")}>
              <Clock className="w-3 h-3 mr-1" /> Prendre en charge
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => updateStatus("rejected")}>
              <X className="w-3 h-3 mr-1" /> Rejeter
            </Button>
          </div>
        )}
        {dispute.status === "under_review" && (
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={() => updateStatus("resolved")}>
              <CheckCircle className="w-3 h-3 mr-1" /> Marquer résolu
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus("closed")}>
              Clôturer
            </Button>
          </div>
        )}

        {expanded && (
          <div className="pt-3 border-t space-y-3">
            {dispute.resolution && (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-xs text-emerald-800">
                <strong>Résolution :</strong> {dispute.resolution}
              </div>
            )}
            <div>
              <label className="text-xs text-slate-500">Note interne</label>
              <textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                rows={2}
                className="w-full mt-1 text-sm border rounded-md px-3 py-2 resize-none bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Note visible uniquement par l'équipe admin..."
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Résolution</label>
              <textarea
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                rows={2}
                className="w-full mt-1 text-sm border rounded-md px-3 py-2 resize-none bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Décrivez comment le litige a été résolu…"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" className="h-7 text-xs" onClick={saveNotes} disabled={saving}>
                {saving ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : null}
                Enregistrer les notes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DisputesSection() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const token = localStorage.getItem("tc_token");
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    const res = await fetch(`/api/admin/disputes?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setDisputes(await res.json());
    setLoading(false);
  };

  React.useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const openCount = disputes.filter(d => d.status === "open").length;
  const reviewCount = disputes.filter(d => d.status === "under_review").length;
  const resolvedCount = disputes.filter(d => d.status === "resolved").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Litiges & Support</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {openCount > 0 && <span className="text-red-600 font-medium">{openCount} ouvert{openCount > 1 ? "s" : ""} · </span>}
            {reviewCount > 0 && <span className="text-amber-600">{reviewCount} en cours · </span>}
            {resolvedCount} résolu{resolvedCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={load}>
          <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-slate-500">Total</div>
          <div className="text-2xl font-bold text-slate-900">{disputes.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">Ouverts</div>
          <div className="text-2xl font-bold text-red-600">{openCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">En cours</div>
          <div className="text-2xl font-bold text-amber-600">{reviewCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">Résolus</div>
          <div className="text-2xl font-bold text-emerald-600">{resolvedCount}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1">
          {[["", "Tous statuts"], ["open", "Ouverts"], ["under_review", "En cours"], ["resolved", "Résolus"], ["rejected", "Rejetés"]].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${statusFilter === val ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
              {label}
            </button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-8 text-xs border rounded-full px-3 bg-white">
          <option value="">Tous types</option>
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Chargement…
        </div>
      ) : disputes.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun litige trouvé</p>
          <p className="text-xs mt-1 opacity-70">Les litiges apparaissent lorsque des clients signalent un problème</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => <DisputeCard key={d.id} dispute={d} onRefresh={load} />)}
        </div>
      )}
    </div>
  );
}
