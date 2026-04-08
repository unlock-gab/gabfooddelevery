import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDA } from "@/lib/format";
import {
  Tag, Plus, RefreshCw, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check,
} from "lucide-react";

interface PromoCode {
  id: number;
  code: string;
  description: string | null;
  discountType: "fixed" | "percentage" | "free_delivery";
  discountValue: number;
  minimumBasket: number | null;
  maxUsageTotal: number | null;
  maxUsagePerUser: number;
  usageCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const DISCOUNT_LABELS: Record<string, string> = {
  fixed: "Montant fixe",
  percentage: "Pourcentage",
  free_delivery: "Livraison gratuite",
};

function PromoRow({ promo, onRefresh }: { promo: PromoCode; onRefresh: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    description: promo.description ?? "",
    discountValue: String(promo.discountValue),
    minimumBasket: promo.minimumBasket ? String(promo.minimumBasket) : "",
    maxUsageTotal: promo.maxUsageTotal ? String(promo.maxUsageTotal) : "",
    expiresAt: promo.expiresAt ? promo.expiresAt.slice(0, 10) : "",
  });

  const token = localStorage.getItem("tc_token");

  const toggle = async () => {
    await fetch(`/api/admin/promo-codes/${promo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !promo.isActive }),
    });
    onRefresh();
  };

  const save = async () => {
    await fetch(`/api/admin/promo-codes/${promo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        description: form.description || null,
        discountValue: Number(form.discountValue),
        minimumBasket: form.minimumBasket ? Number(form.minimumBasket) : null,
        maxUsageTotal: form.maxUsageTotal ? Number(form.maxUsageTotal) : null,
        expiresAt: form.expiresAt || null,
      }),
    });
    toast({ title: "Code mis à jour" });
    setEditing(false);
    onRefresh();
  };

  const remove = async () => {
    if (!confirm(`Supprimer le code "${promo.code}" ?`)) return;
    await fetch(`/api/admin/promo-codes/${promo.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    toast({ title: "Code supprimé" });
    onRefresh();
  };

  const discountLabel =
    promo.discountType === "fixed" ? formatDA(promo.discountValue) :
    promo.discountType === "percentage" ? `${promo.discountValue}%` :
    "Livraison gratuite";

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${promo.isActive ? "bg-white" : "bg-slate-50 opacity-70"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-base font-bold tracking-widest bg-slate-100 px-2 py-0.5 rounded border text-slate-800">
            {promo.code}
          </code>
          <Badge variant={promo.isActive ? "default" : "secondary"} className="text-xs">
            {promo.isActive ? "Actif" : "Inactif"}
          </Badge>
          <Badge variant="outline" className="text-xs">{DISCOUNT_LABELS[promo.discountType]}</Badge>
          <span className="text-sm font-semibold text-emerald-700">{discountLabel}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={toggle} className="text-slate-400 hover:text-slate-700 p-1" title={promo.isActive ? "Désactiver" : "Activer"}>
            {promo.isActive ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button onClick={() => setEditing(!editing)} className="text-slate-400 hover:text-blue-600 p-1">
            {editing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </button>
          <button onClick={remove} className="text-slate-400 hover:text-red-600 p-1">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        {promo.minimumBasket && <span>Panier min : <strong className="text-slate-700">{formatDA(promo.minimumBasket)}</strong></span>}
        <span>Utilisations : <strong className="text-slate-700">{promo.usageCount}{promo.maxUsageTotal ? ` / ${promo.maxUsageTotal}` : ""}</strong></span>
        {promo.maxUsagePerUser && <span>Par client : <strong className="text-slate-700">{promo.maxUsagePerUser}</strong></span>}
        {promo.expiresAt && <span>Expire : <strong className="text-slate-700">{new Date(promo.expiresAt).toLocaleDateString("fr-DZ")}</strong></span>}
        {promo.description && <span className="italic">{promo.description}</span>}
      </div>

      {editing && (
        <div className="pt-2 border-t space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">Description</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Valeur remise</label>
              <Input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Panier minimum (DA)</label>
              <Input type="number" value={form.minimumBasket} onChange={e => setForm(f => ({ ...f, minimumBasket: e.target.value }))} placeholder="0" className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Limite totale</label>
              <Input type="number" value={form.maxUsageTotal} onChange={e => setForm(f => ({ ...f, maxUsageTotal: e.target.value }))} placeholder="Illimité" className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Date d'expiration</label>
              <Input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="h-7" onClick={() => setEditing(false)}><X className="w-3 h-3 mr-1" />Annuler</Button>
            <Button size="sm" className="h-7" onClick={save}><Check className="w-3 h-3 mr-1" />Enregistrer</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePromoForm({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "", description: "", discountType: "fixed" as const,
    discountValue: "", minimumBasket: "", maxUsageTotal: "", maxUsagePerUser: "1", expiresAt: "",
  });

  const submit = async () => {
    if (!form.code || !form.discountValue) { toast({ title: "Code et valeur requis", variant: "destructive" }); return; }
    const token = localStorage.getItem("tc_token");
    const res = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        code: form.code.toUpperCase(),
        description: form.description || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minimumBasket: form.minimumBasket ? Number(form.minimumBasket) : null,
        maxUsageTotal: form.maxUsageTotal ? Number(form.maxUsageTotal) : null,
        maxUsagePerUser: Number(form.maxUsagePerUser) || 1,
        isActive: true,
        expiresAt: form.expiresAt || null,
      }),
    });
    if (!res.ok) { toast({ title: "Erreur lors de la création", variant: "destructive" }); return; }
    toast({ title: `Code "${form.code.toUpperCase()}" créé` });
    setOpen(false);
    setForm({ code: "", description: "", discountType: "fixed", discountValue: "", minimumBasket: "", maxUsageTotal: "", maxUsagePerUser: "1", expiresAt: "" });
    onCreated();
  };

  if (!open) return (
    <Button size="sm" className="h-8" onClick={() => setOpen(true)}>
      <Plus className="w-4 h-4 mr-1" /> Nouveau code promo
    </Button>
  );

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">Créer un code promo</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-600">Code *</label>
            <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="EX: BIENVENUE10" className="h-8 text-sm mt-1 font-mono" />
          </div>
          <div>
            <label className="text-xs text-slate-600">Type de remise *</label>
            <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as any }))} className="w-full h-8 text-sm mt-1 border rounded-md px-2 bg-white">
              <option value="fixed">Montant fixe (DA)</option>
              <option value="percentage">Pourcentage (%)</option>
              <option value="free_delivery">Livraison gratuite</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Valeur *</label>
            <Input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder={form.discountType === "percentage" ? "10" : "500"} className="h-8 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs text-slate-600">Panier minimum (DA)</label>
            <Input type="number" value={form.minimumBasket} onChange={e => setForm(f => ({ ...f, minimumBasket: e.target.value }))} placeholder="0" className="h-8 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs text-slate-600">Limite d'utilisation totale</label>
            <Input type="number" value={form.maxUsageTotal} onChange={e => setForm(f => ({ ...f, maxUsageTotal: e.target.value }))} placeholder="Illimité" className="h-8 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs text-slate-600">Par client</label>
            <Input type="number" value={form.maxUsagePerUser} onChange={e => setForm(f => ({ ...f, maxUsagePerUser: e.target.value }))} className="h-8 text-sm mt-1" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-600">Description</label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description interne (optionnel)" className="h-8 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs text-slate-600">Date d'expiration</label>
            <Input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="h-8 text-sm mt-1" />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <Button size="sm" variant="outline" className="h-7" onClick={() => setOpen(false)}><X className="w-3 h-3 mr-1" />Annuler</Button>
          <Button size="sm" className="h-7" onClick={submit}><Plus className="w-3 h-3 mr-1" />Créer</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PromoSection() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const load = async () => {
    setLoading(true);
    const token = localStorage.getItem("tc_token");
    const res = await fetch("/api/admin/promo-codes", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPromos(await res.json());
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const displayed = promos.filter(p => filter === "all" ? true : filter === "active" ? p.isActive : !p.isActive);
  const activeCount = promos.filter(p => p.isActive).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Codes Promo</h1>
          <p className="text-sm text-slate-500 mt-0.5">{activeCount} code{activeCount !== 1 ? "s" : ""} actif{activeCount !== 1 ? "s" : ""} · {promos.length} au total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={load}>
            <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
          </Button>
          <CreatePromoForm onCreated={load} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-xs text-slate-500">Total codes</div>
          <div className="text-2xl font-bold text-slate-900">{promos.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">Codes actifs</div>
          <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">Utilisations totales</div>
          <div className="text-2xl font-bold text-blue-600">{promos.reduce((s, p) => s + p.usageCount, 0)}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "active", "inactive"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
            {f === "all" ? "Tous" : f === "active" ? "Actifs" : "Inactifs"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Chargement…
        </div>
      ) : displayed.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">
          <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun code promo trouvé</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayed.map(promo => (
            <PromoRow key={promo.id} promo={promo} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}
