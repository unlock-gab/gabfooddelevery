import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useListCustomers, Customer } from "@workspace/api-client-react";
import { useUpdateCustomer, useDeleteCustomer } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Eye, Users, RefreshCw, AlertTriangle, ShoppingBag,
  Pencil, Trash2,
} from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};
const RISK_LABELS: Record<string, string> = {
  low: "Faible", medium: "Moyen", high: "Élevé",
};

const FILTERS = [
  { label: "Tous", value: "" },
  { label: "Risque faible", value: "low" },
  { label: "Risque moyen", value: "medium" },
  { label: "Risque élevé", value: "high" },
];

export function CustomersSection() {
  const { toast } = useToast();
  const [riskFilter, setRiskFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const { data: customers, isLoading, refetch } = useListCustomers(
    { riskLevel: riskFilter || undefined, search: search || undefined },
    { query: { refetchInterval: 30000 } }
  );

  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const list = customers ?? [];
  const highRiskCount = list.filter(c => c.riskScore === "high").length;

  const openEdit = (c: Customer) => {
    setEditTarget(c);
    setEditName(c.name);
    setEditPhone(c.phone ?? "");
  };

  const handleEdit = () => {
    if (!editTarget) return;
    updateCustomer.mutate(
      { customerId: editTarget.id, data: { name: editName || undefined, phone: editPhone || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Client mis à jour" });
          setEditTarget(null);
          refetch();
        },
        onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteCustomer.mutate(
      { customerId: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: "Client supprimé" });
          setDeleteTarget(null);
          if (selected?.id === deleteTarget.id) setSelected(null);
          refetch();
        },
        onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {list.length} clients
            {highRiskCount > 0 && <span className="ml-2 text-red-600 font-medium">· {highRiskCount} à risque élevé</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
        </Button>
      </div>

      {highRiskCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">
            <strong>{highRiskCount} client{highRiskCount > 1 ? "s" : ""}</strong> avec un score de risque élevé nécessitent une attention.
          </p>
          <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700 ml-auto" onClick={() => setRiskFilter("high")}>
            Voir
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setRiskFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              riskFilter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input className="pl-8 h-8 text-sm" placeholder="Nom ou email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Risque</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Commandes</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Annulations</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Injoignable</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Éch. conf.</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actif</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">Chargement…</td></tr>
              )}
              {!isLoading && !list.length && (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">Aucun client</td></tr>
              )}
              {list.map(c => (
                <tr key={c.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${c.riskScore === "high" ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${RISK_COLORS[c.riskScore]}`}>
                      {RISK_LABELS[c.riskScore]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-slate-700">
                      <ShoppingBag className="w-3 h-3 text-slate-400" /> {c.totalOrders}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${c.cancellationCount > 3 ? "text-red-600" : "text-slate-600"}`}>
                      {c.cancellationCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${c.unreachableCount > 2 ? "text-red-600" : "text-slate-600"}`}>
                      {c.unreachableCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${c.failedConfirmationCount > 2 ? "text-orange-600" : "text-slate-600"}`}>
                      {c.failedConfirmationCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${c.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {c.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" title="Voir" onClick={() => setSelected(c)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Modifier" onClick={() => openEdit(c)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" title="Supprimer" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail drawer */}
      <Sheet open={selected !== null} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" /> {selected?.name}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${RISK_COLORS[selected.riskScore]}`}>
                  Risque {RISK_LABELS[selected.riskScore]}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${selected.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {selected.isActive ? "Actif" : "Inactif"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Total commandes</p>
                  <p className="text-xl font-bold text-slate-800">{selected.totalOrders}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Annulations</p>
                  <p className={`text-xl font-bold ${selected.cancellationCount > 3 ? "text-red-600" : "text-slate-800"}`}>
                    {selected.cancellationCount}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Injoignable</p>
                  <p className={`text-xl font-bold ${selected.unreachableCount > 2 ? "text-red-600" : "text-slate-800"}`}>
                    {selected.unreachableCount}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Éch. confirmation</p>
                  <p className={`text-xl font-bold ${selected.failedConfirmationCount > 2 ? "text-orange-600" : "text-slate-800"}`}>
                    {selected.failedConfirmationCount}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Email</span>
                  <span className="font-medium">{selected.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Téléphone</span>
                  <span className="font-medium">{selected.phone ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Inscrit le</span>
                  <span className="font-medium">{new Date(selected.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>

              {selected.riskScore === "high" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Score de risque élevé</p>
                    <p>Ce client a un comportement anormal. Vérifiez son historique de commandes et envisagez de restreindre son accès.</p>
                  </div>
                </div>
              )}

              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setSelected(null); openEdit(selected); }}>
                  <Pencil className="w-4 h-4 mr-2" /> Modifier
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => { setSelected(null); setDeleteTarget(selected); }}>
                  <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit dialog */}
      <Dialog open={editTarget !== null} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nom complet</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nom du client" />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+213 XXX XXX XXX" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={updateCustomer.isPending}>
              {updateCustomer.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le client</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.name}</strong> ? Cette action est irréversible et effacera toutes les données associées.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteCustomer.isPending}>
              {deleteCustomer.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
