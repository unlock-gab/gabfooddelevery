import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  useListRestaurants, useApproveRestaurant, useRejectRestaurant,
  useToggleRestaurantOpen, useUpdateRestaurant, Restaurant,
} from "@workspace/api-client-react";
import { useDeleteRestaurant } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Search, CheckCircle, XCircle, Eye, Store, Clock, ToggleLeft, ToggleRight,
  RefreshCw, Pencil, Trash2,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente", approved: "Approuvé", rejected: "Rejeté", suspended: "Suspendu",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-slate-100 text-slate-600",
};

const STATUS_FILTERS = [
  { label: "Tous", value: "" },
  { label: "En attente", value: "pending" },
  { label: "Approuvés", value: "approved" },
  { label: "Rejetés", value: "rejected" },
];

export function RestaurantsSection() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [editTarget, setEditTarget] = useState<Restaurant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);

  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDelay, setEditDelay] = useState("");

  const { data: restaurants, isLoading, refetch } = useListRestaurants(
    { status: statusFilter || undefined, search: search || undefined },
    { query: { refetchInterval: 20000 } }
  );

  const approve = useApproveRestaurant();
  const reject = useRejectRestaurant();
  const toggle = useToggleRestaurantOpen();
  const updateRestaurant = useUpdateRestaurant();
  const deleteRestaurant = useDeleteRestaurant();

  const handleApprove = (restaurantId: number) => {
    approve.mutate({ restaurantId }, {
      onSuccess: () => { toast({ title: "Restaurant approuvé" }); refetch(); },
    });
  };
  const handleReject = (restaurantId: number) => {
    reject.mutate({ restaurantId }, {
      onSuccess: () => { toast({ title: "Restaurant rejeté" }); refetch(); },
    });
  };
  const handleToggle = (restaurantId: number) => {
    toggle.mutate({ restaurantId }, { onSuccess: () => refetch() });
  };

  const openEdit = (r: Restaurant) => {
    setEditTarget(r);
    setEditName(r.name ?? "");
    setEditAddress(r.address ?? "");
    setEditCategory(r.category ?? "");
    setEditDescription(r.description ?? "");
    setEditDelay(r.estimatedDeliveryMinutes != null ? String(r.estimatedDeliveryMinutes) : "");
  };

  const handleEdit = () => {
    if (!editTarget) return;
    updateRestaurant.mutate(
      {
        restaurantId: editTarget.id,
        data: {
          name: editName || undefined,
          address: editAddress || undefined,
          category: editCategory || undefined,
          description: editDescription || undefined,
          estimatedPrepTime: editDelay ? Number(editDelay) : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Restaurant mis à jour" });
          setEditTarget(null);
          refetch();
        },
        onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteRestaurant.mutate(
      { restaurantId: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: "Restaurant supprimé" });
          setDeleteTarget(null);
          if (selected?.id === deleteTarget.id) setSelected(null);
          refetch();
        },
        onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
      }
    );
  };

  const pendingCount = restaurants?.filter(r => r.status === "pending").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Restaurants</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {restaurants?.length ?? 0} restaurants
            {pendingCount > 0 && <span className="ml-2 text-amber-600 font-medium">· {pendingCount} en attente d'approbation</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
        </Button>
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
          <Store className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{pendingCount} restaurant{pendingCount > 1 ? "s" : ""}</strong> en attente d'approbation — vérifiez et traitez rapidement.
          </p>
          <Button size="sm" className="h-7 text-xs ml-auto" onClick={() => setStatusFilter("pending")}>Voir</Button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
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
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input className="pl-8 h-8 text-sm" placeholder="Rechercher un restaurant…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Restaurant</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Catégorie</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ouvert</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Délai</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Chargement…</td></tr>
              )}
              {!isLoading && !restaurants?.length && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Aucun restaurant</td></tr>
              )}
              {restaurants?.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{r.name}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[180px]">{r.address ?? "Adresse N/A"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600">{r.category ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(r.id)}
                      className={`flex items-center gap-1 text-xs font-medium ${r.isOpen ? "text-green-600" : "text-slate-400"}`}
                    >
                      {r.isOpen
                        ? <><ToggleRight className="w-4 h-4" /> Ouvert</>
                        : <><ToggleLeft className="w-4 h-4" /> Fermé</>
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {r.estimatedDeliveryMinutes ?? "—"} min
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" title="Voir" onClick={() => setSelected(r)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Modifier" onClick={() => openEdit(r)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" title="Supprimer" onClick={() => setDeleteTarget(r)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(r.id)}>
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => handleReject(r.id)}>
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </>
                      )}
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
              <Store className="w-4 h-4" /> {selected?.name}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status] ?? ""}`}>
                  {STATUS_LABELS[selected.status] ?? selected.status}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${selected.isOpen ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {selected.isOpen ? "Ouvert" : "Fermé"}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Catégorie</span>
                  <span className="font-medium">{selected.category ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Adresse</span>
                  <span className="font-medium text-right max-w-[60%]">{selected.address ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Délai moyen</span>
                  <span className="font-medium">{selected.estimatedDeliveryMinutes ?? "—"} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Note</span>
                  <span className="font-medium">{selected.avgRating ? `${Number(selected.avgRating).toFixed(1)} ⭐` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Inscrit le</span>
                  <span className="font-medium">{new Date(selected.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>

              {selected.description && (
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">{selected.description}</div>
              )}

              <Separator />
              <div className="flex gap-2 flex-wrap">
                {selected.status === "pending" && (
                  <>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => { handleApprove(selected.id); setSelected(null); }}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Approuver
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => { handleReject(selected.id); setSelected(null); }}>
                      <XCircle className="w-4 h-4 mr-2" /> Rejeter
                    </Button>
                  </>
                )}
                {selected.status === "approved" && (
                  <Button variant="outline" className="flex-1" onClick={() => handleToggle(selected.id)}>
                    {selected.isOpen ? <><ToggleLeft className="w-4 h-4 mr-2" /> Fermer</> : <><ToggleRight className="w-4 h-4 mr-2" /> Ouvrir</>}
                  </Button>
                )}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le restaurant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nom du restaurant</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nom" />
            </div>
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Adresse complète" />
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Input value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="Ex: Pizza, Algérien, Fast Food…" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Description courte" />
            </div>
            <div className="space-y-1.5">
              <Label>Délai de livraison estimé (min)</Label>
              <Input type="number" min={0} value={editDelay} onChange={e => setEditDelay(e.target.value)} placeholder="Ex: 30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={updateRestaurant.isPending}>
              {updateRestaurant.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le restaurant</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.name}</strong> ? Cette action est irréversible et supprimera le menu et toutes les données associées.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRestaurant.isPending}>
              {deleteRestaurant.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
