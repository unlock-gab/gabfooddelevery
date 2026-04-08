import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useListDrivers, useApproveDriver, useRejectDriver,
  useSuspendDriver, useActivateDriver, useDeleteDriver,
  Driver,
} from "@workspace/api-client-react";
import { useUpdateDriver } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Search, CheckCircle, XCircle, Eye, Truck, RefreshCw,
  Star, Activity, AlertTriangle, PauseCircle, PlayCircle, Trash2, Pencil,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800",
  approved:  "bg-green-100 text-green-800",
  rejected:  "bg-red-100 text-red-700",
  suspended: "bg-slate-100 text-slate-600",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "En attente", approved: "Approuvé", rejected: "Rejeté", suspended: "Suspendu",
};

const FILTERS = [
  { label: "Tous",        value: "",         online: undefined },
  { label: "En attente",  value: "pending",  online: undefined },
  { label: "Approuvés",   value: "approved", online: undefined },
  { label: "En ligne",    value: "approved", online: true      },
  { label: "Hors ligne",  value: "approved", online: false     },
  { label: "Suspendus",   value: "suspended",online: undefined },
  { label: "Rejetés",     value: "rejected", online: undefined },
];

export function DriversSection() {
  const { toast } = useToast();
  const [filterIdx, setFilterIdx]       = useState(0);
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState<Driver | null>(null);
  const [toDelete, setToDelete]         = useState<Driver | null>(null);
  const [editTarget, setEditTarget]     = useState<Driver | null>(null);
  const [editName, setEditName]         = useState("");
  const [editPhone, setEditPhone]       = useState("");

  const f = FILTERS[filterIdx];
  const { data: drivers, isLoading, refetch } = useListDrivers(
    { status: f.value || undefined, online: f.online },
    { query: { refetchInterval: 15000 } }
  );

  const approve  = useApproveDriver();
  const reject   = useRejectDriver();
  const suspend  = useSuspendDriver();
  const activate = useActivateDriver();
  const remove   = useDeleteDriver();
  const updateDriver = useUpdateDriver();

  const act = (
    mutation: { mutate: Function },
    driverId: number,
    label: string,
    closeSheet = false,
  ) => {
    mutation.mutate({ driverId }, {
      onSuccess: () => {
        toast({ title: label });
        refetch();
        if (closeSheet) setSelected(null);
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  };

  const handleDelete = (d: Driver) => {
    remove.mutate({ driverId: d.id }, {
      onSuccess: () => {
        toast({ title: `Livreur ${d.name} supprimé` });
        refetch();
        setToDelete(null);
        setSelected(null);
      },
      onError: (e: any) => toast({ title: "Erreur lors de la suppression", description: e?.message, variant: "destructive" }),
    });
  };

  const openEdit = (d: Driver) => {
    setEditTarget(d);
    setEditName(d.name ?? "");
    setEditPhone(d.phone ?? "");
  };

  const handleEdit = () => {
    if (!editTarget) return;
    updateDriver.mutate(
      { driverId: editTarget.id, data: { name: editName || undefined, phone: editPhone || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Livreur mis à jour" });
          setEditTarget(null);
          refetch();
        },
        onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
      }
    );
  };

  const list = search
    ? (drivers ?? []).filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.email.toLowerCase().includes(search.toLowerCase()))
    : (drivers ?? []);

  const pendingCount   = (drivers ?? []).filter(d => d.status === "pending").length;
  const onlineCount    = (drivers ?? []).filter(d => d.isOnline).length;
  const suspendedCount = (drivers ?? []).filter(d => d.status === "suspended").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Livreurs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {drivers?.length ?? 0} livreurs
            {onlineCount > 0    && <span className="ml-2 text-green-600 font-medium">· {onlineCount} en ligne</span>}
            {pendingCount > 0   && <span className="ml-2 text-amber-600 font-medium">· {pendingCount} en attente</span>}
            {suspendedCount > 0 && <span className="ml-2 text-slate-500 font-medium">· {suspendedCount} suspendus</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
        </Button>
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
          <Truck className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{pendingCount} livreur{pendingCount > 1 ? "s" : ""}</strong> en attente d'approbation.
          </p>
          <Button size="sm" className="h-7 text-xs ml-auto" onClick={() => setFilterIdx(1)}>Voir</Button>
        </div>
      )}

      {/* Filter chips + search */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((fi, idx) => (
          <button
            key={idx}
            onClick={() => setFilterIdx(idx)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterIdx === idx
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {fi.label}
            {fi.online === true && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
          </button>
        ))}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input className="pl-8 h-8 text-sm" placeholder="Nom ou email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Livreur</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">En ligne</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Livraisons</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Note</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acceptation</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Échecs conf.</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">Chargement…</td></tr>
              )}
              {!isLoading && !list.length && (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">Aucun livreur</td></tr>
              )}
              {list.map(d => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{d.name}</div>
                    <div className="text-xs text-slate-400">{d.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] ?? "bg-slate-100"}`}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${d.isOnline ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
                      <span className={`text-xs font-medium ${d.isOnline ? "text-green-600" : "text-slate-400"}`}>
                        {d.isOnline ? "En ligne" : "Hors ligne"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">{d.totalDeliveries ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span className="font-medium">{d.avgRating ? Number(d.avgRating).toFixed(1) : "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Activity className="w-3 h-3 text-slate-400" />
                      <span className={`font-medium ${Number(d.acceptanceRate) < 70 ? "text-red-600" : "text-slate-700"}`}>
                        {d.acceptanceRate ? `${Number(d.acceptanceRate).toFixed(0)}%` : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${Number(d.failedConfirmations) > 3 ? "text-red-600" : "text-slate-600"}`}>
                      {d.failedConfirmations ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* View */}
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelected(d)} title="Voir détails">
                        <Eye className="w-3 h-3" />
                      </Button>
                      {/* Edit */}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEdit(d)} title="Modifier">
                        <Pencil className="w-3 h-3" />
                      </Button>
                      {/* Approve / Reject — pending only */}
                      {d.status === "pending" && (
                        <>
                          <Button size="sm" className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => act(approve, d.id, "Livreur approuvé")} title="Approuver">
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => act(reject, d.id, "Livreur rejeté")} title="Rejeter">
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {/* Suspend — approved only */}
                      {d.status === "approved" && (
                        <Button size="sm" variant="outline" className="h-7 px-2 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => act(suspend, d.id, "Livreur suspendu")} title="Suspendre">
                          <PauseCircle className="w-3 h-3" />
                        </Button>
                      )}
                      {/* Activate — suspended or rejected */}
                      {(d.status === "suspended" || d.status === "rejected") && (
                        <Button size="sm" variant="outline" className="h-7 px-2 border-green-300 text-green-700 hover:bg-green-50" onClick={() => act(activate, d.id, "Livreur réactivé")} title="Réactiver">
                          <PlayCircle className="w-3 h-3" />
                        </Button>
                      )}
                      {/* Delete */}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setToDelete(d)} title="Supprimer">
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

      {/* ── Detail drawer ── */}
      <Sheet open={selected !== null} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Truck className="w-4 h-4" /> {selected?.name}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status] ?? ""}`}>
                  {STATUS_LABELS[selected.status] ?? selected.status}
                </span>
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${selected.isOnline ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${selected.isOnline ? "bg-green-500 animate-pulse" : "bg-slate-400"}`} />
                  {selected.isOnline ? "En ligne" : "Hors ligne"}
                </span>
              </div>

              {/* Performance cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Livraisons</p>
                  <p className="text-xl font-bold text-slate-800">{selected.totalDeliveries ?? 0}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Note</p>
                  <p className="text-xl font-bold text-slate-800 flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-amber-400" />
                    {selected.avgRating ? Number(selected.avgRating).toFixed(1) : "—"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Taux acceptation</p>
                  <p className={`text-xl font-bold ${Number(selected.acceptanceRate) < 70 ? "text-red-600" : "text-slate-800"}`}>
                    {selected.acceptanceRate ? `${Number(selected.acceptanceRate).toFixed(0)}%` : "—"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Échecs confirmation</p>
                  <p className={`text-xl font-bold ${Number(selected.failedConfirmations) > 3 ? "text-red-600" : "text-slate-800"}`}>
                    {selected.failedConfirmations ?? 0}
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

              <Separator />

              {/* Sheet action buttons */}
              <div className="space-y-2">
                {selected.status === "pending" && (
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => act(approve, selected.id, "Livreur approuvé", true)}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Approuver
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => act(reject, selected.id, "Livreur rejeté", true)}>
                      <XCircle className="w-4 h-4 mr-2" /> Rejeter
                    </Button>
                  </div>
                )}
                {selected.status === "approved" && (
                  <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => act(suspend, selected.id, "Livreur suspendu", true)}>
                    <PauseCircle className="w-4 h-4 mr-2" /> Suspendre le compte
                  </Button>
                )}
                {(selected.status === "suspended" || selected.status === "rejected") && (
                  <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50" onClick={() => act(activate, selected.id, "Livreur réactivé", true)}>
                    <PlayCircle className="w-4 h-4 mr-2" /> Réactiver le compte
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={() => { setSelected(null); openEdit(selected); }}>
                  <Pencil className="w-4 h-4 mr-2" /> Modifier les informations
                </Button>
                <Button variant="destructive" className="w-full" onClick={() => { setToDelete(selected); setSelected(null); }}>
                  <Trash2 className="w-4 h-4 mr-2" /> Supprimer définitivement
                </Button>
              </div>

              {Number(selected.failedConfirmations) > 3 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Ce livreur a accumulé {selected.failedConfirmations} échecs de confirmation. Vérifiez son comportement.
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Edit dialog ── */}
      <Dialog open={editTarget !== null} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier le livreur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nom complet</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nom du livreur" />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+213 XXX XXX XXX" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={updateDriver.isPending}>
              {updateDriver.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation dialog ── */}
      <AlertDialog open={toDelete !== null} onOpenChange={open => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce livreur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte de <strong>{toDelete?.name}</strong> ({toDelete?.email}) sera supprimé définitivement.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => toDelete && handleDelete(toDelete)}
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
