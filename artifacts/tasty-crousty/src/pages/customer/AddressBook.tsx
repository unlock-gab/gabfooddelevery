import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useListCities, useListZones } from "@workspace/api-client-react";
import { MapPin, Home, Briefcase, Plus, Pencil, Trash2, Star, X, Check, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

interface SavedAddress {
  id: number;
  label: string;
  fullAddress: string;
  building: string | null;
  landmark: string | null;
  floor: string | null;
  phone: string | null;
  instructions: string | null;
  cityId: number | null;
  zoneId: number | null;
  isDefault: boolean;
}

const LABEL_OPTIONS = ["Domicile", "Travail", "Autre"];
const LABEL_ICONS: Record<string, React.ReactNode> = {
  Domicile: <Home className="w-4 h-4" />,
  Travail: <Briefcase className="w-4 h-4" />,
  Autre: <MapPin className="w-4 h-4" />,
};

function AddressForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<SavedAddress>;
  onSave: (data: Partial<SavedAddress>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    label: initial?.label ?? "Domicile",
    fullAddress: initial?.fullAddress ?? "",
    building: initial?.building ?? "",
    landmark: initial?.landmark ?? "",
    floor: initial?.floor ?? "",
    phone: initial?.phone ?? "",
    instructions: initial?.instructions ?? "",
    cityId: initial?.cityId ?? null as number | null,
    zoneId: initial?.zoneId ?? null as number | null,
    isDefault: initial?.isDefault ?? false,
  });

  const { data: cities } = useListCities(undefined, { query: { staleTime: 60000 } });
  const { data: zones } = useListZones(form.cityId!, {
    query: { enabled: !!form.cityId, staleTime: 30000 },
  });

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
      <h3 className="font-semibold text-sm">{initial?.id ? "Modifier l'adresse" : "Nouvelle adresse"}</h3>

      {/* Label */}
      <div>
        <Label className="text-xs text-slate-500 mb-2 block">Type d'adresse</Label>
        <div className="flex gap-2">
          {LABEL_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setForm(f => ({ ...f, label: opt }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${form.label === opt ? "border-primary bg-primary/10 text-primary font-medium" : "border-slate-200 text-slate-600 hover:border-primary/40"}`}
            >
              {LABEL_ICONS[opt]} {opt}
            </button>
          ))}
        </div>
      </div>

      {/* City / Zone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Ville</Label>
          <select
            value={form.cityId ?? ""}
            onChange={e => setForm(f => ({ ...f, cityId: e.target.value ? Number(e.target.value) : null, zoneId: null }))}
            className="w-full h-10 border rounded-lg px-3 text-sm bg-white"
          >
            <option value="">Sélectionner…</option>
            {cities?.filter((c: any) => c.isActive).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Zone</Label>
          <select
            value={form.zoneId ?? ""}
            onChange={e => setForm(f => ({ ...f, zoneId: e.target.value ? Number(e.target.value) : null }))}
            disabled={!form.cityId}
            className="w-full h-10 border rounded-lg px-3 text-sm bg-white disabled:opacity-50"
          >
            <option value="">{form.cityId ? "Sélectionner…" : "Ville d'abord"}</option>
            {zones?.filter((z: any) => z.isActive).map((z: any) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Full address */}
      <div>
        <Label className="text-xs text-slate-500 mb-1 block">Adresse complète <span className="text-red-500">*</span></Label>
        <Input
          value={form.fullAddress}
          onChange={e => setForm(f => ({ ...f, fullAddress: e.target.value }))}
          placeholder="Rue, quartier, numéro…"
          className="h-10 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Bâtiment / Résidence</Label>
          <Input value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))} placeholder="Bâtiment A" className="h-10 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Étage / Appartement</Label>
          <Input value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} placeholder="3ème étage, appt 12" className="h-10 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Repère</Label>
          <Input value={form.landmark} onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))} placeholder="En face de la pharmacie…" className="h-10 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Téléphone</Label>
          <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+213 5XX XXX XXX" className="h-10 text-sm" />
        </div>
      </div>

      <div>
        <Label className="text-xs text-slate-500 mb-1 block">Instructions de livraison</Label>
        <Input value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Code portail, consignes pour le livreur…" className="h-10 text-sm" />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4 accent-primary" />
        <span className="text-sm text-slate-700">Définir comme adresse par défaut</span>
      </label>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" className="h-9" onClick={onCancel}><X className="w-3.5 h-3.5 mr-1.5" />Annuler</Button>
        <Button size="sm" className="h-9" onClick={() => {
          if (!form.fullAddress.trim()) return;
          onSave({
            label: form.label,
            fullAddress: form.fullAddress,
            building: form.building || undefined,
            landmark: form.landmark || undefined,
            floor: form.floor || undefined,
            phone: form.phone || undefined,
            instructions: form.instructions || undefined,
            cityId: form.cityId,
            zoneId: form.zoneId,
            isDefault: form.isDefault,
          });
        }}><Check className="w-3.5 h-3.5 mr-1.5" />Enregistrer</Button>
      </div>
    </div>
  );
}

export default function AddressBook() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const token = () => localStorage.getItem("tc_token");

  if (!user) { setLocation("/auth/login"); return null; }

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/addresses", { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) setAddresses(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (data: Partial<SavedAddress>) => {
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(data),
    });
    if (res.ok) { toast({ title: "Adresse ajoutée" }); setCreating(false); load(); }
    else toast({ title: "Erreur", variant: "destructive" });
  };

  const handleUpdate = async (id: number, data: Partial<SavedAddress>) => {
    const res = await fetch(`/api/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(data),
    });
    if (res.ok) { toast({ title: "Adresse mise à jour" }); setEditingId(null); load(); }
    else toast({ title: "Erreur", variant: "destructive" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette adresse ?")) return;
    await fetch(`/api/addresses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    toast({ title: "Adresse supprimée" });
    load();
  };

  const handleSetDefault = async (id: number) => {
    await fetch(`/api/addresses/${id}/set-default`, { method: "POST", headers: { Authorization: `Bearer ${token()}` } });
    toast({ title: "Adresse par défaut mise à jour" });
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50/60 flex flex-col">
      <Navbar />
      <div className="container max-w-xl py-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">Mes adresses</h1>
            <p className="text-sm text-slate-500 mt-0.5">{addresses.length} adresse{addresses.length !== 1 ? "s" : ""} enregistrée{addresses.length !== 1 ? "s" : ""}</p>
          </div>
          {!creating && (
            <Button size="sm" className="h-9 gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          )}
        </div>

        {creating && (
          <AddressForm onSave={handleCreate} onCancel={() => setCreating(false)} />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : addresses.length === 0 && !creating ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">Aucune adresse enregistrée</h3>
            <p className="text-sm text-slate-400 mb-4">Ajoutez vos adresses pour commander plus rapidement</p>
            <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Ajouter une adresse
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => (
              editingId === addr.id ? (
                <AddressForm key={addr.id} initial={addr} onSave={data => handleUpdate(addr.id, data)} onCancel={() => setEditingId(null)} />
              ) : (
                <div key={addr.id} className={`bg-white rounded-2xl border p-4 shadow-sm ${addr.isDefault ? "border-primary/30" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${addr.isDefault ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}>
                      {LABEL_ICONS[addr.label] ?? <MapPin className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{addr.label}</span>
                        {addr.isDefault && <Badge className="text-[10px] h-4 px-1.5 gap-0.5"><Star className="w-2.5 h-2.5" /> Par défaut</Badge>}
                      </div>
                      <p className="text-sm text-slate-700">{addr.fullAddress}</p>
                      {addr.building && <p className="text-xs text-slate-500">{addr.building}{addr.floor ? `, ${addr.floor}` : ""}</p>}
                      {addr.landmark && <p className="text-xs text-slate-400 italic">{addr.landmark}</p>}
                      {addr.phone && <p className="text-xs text-slate-500 mt-0.5">📞 {addr.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    {!addr.isDefault && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 gap-1" onClick={() => handleSetDefault(addr.id)}>
                        <Star className="w-3 h-3" /> Par défaut
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 gap-1" onClick={() => setEditingId(addr.id)}>
                      <Pencil className="w-3 h-3" /> Modifier
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 gap-1 ml-auto" onClick={() => handleDelete(addr.id)}>
                      <Trash2 className="w-3 h-3" /> Supprimer
                    </Button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
