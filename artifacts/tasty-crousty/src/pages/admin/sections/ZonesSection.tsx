import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useListCities, useCreateCity, useUpdateCity, useDeleteCity,
  useListZones, useCreateZone, useUpdateZone, useDeleteZone,
  City, Zone,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Plus, Trash2, RefreshCw, Globe, Building2, Check, X,
  Search, Clock, Truck, ChevronRight, AlertCircle,
} from "lucide-react";
import { formatDA } from "@/lib/format";

type FilterMode = "all" | "active" | "inactive";

export function ZonesSection() {
  const { toast } = useToast();
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [newCityName, setNewCityName] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneFee, setNewZoneFee] = useState("");
  const [newZoneEta, setNewZoneEta] = useState("");
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [editZoneFee, setEditZoneFee] = useState("");
  const [editZoneEta, setEditZoneEta] = useState("");
  const [zoneSearch, setZoneSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const { data: cities, refetch: refetchCities, isLoading: loadingCities } = useListCities(undefined, {
    query: { refetchInterval: 60000 },
  });
  const { data: zones, refetch: refetchZones, isLoading: loadingZones } = useListZones(
    selectedCityId!,
    { query: { enabled: !!selectedCityId, refetchInterval: 60000 } }
  );

  const createCity  = useCreateCity();
  const updateCity  = useUpdateCity();
  const deleteCity  = useDeleteCity();
  const createZone  = useCreateZone();
  const updateZone  = useUpdateZone();
  const deleteZone  = useDeleteZone();

  const selectedCity = cities?.find((c: any) => c.id === selectedCityId);

  const filteredZones = useMemo(() => {
    if (!zones) return [];
    let result = [...zones] as any[];
    if (filterMode === "active")   result = result.filter(z => z.isActive);
    if (filterMode === "inactive") result = result.filter(z => !z.isActive);
    if (zoneSearch.trim()) {
      const q = zoneSearch.toLowerCase();
      result = result.filter(z =>
        z.name?.toLowerCase().includes(q) ||
        z.nameAr?.includes(q) ||
        z.slug?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [zones, filterMode, zoneSearch]);

  const handleCreateCity = () => {
    if (!newCityName.trim()) return;
    createCity.mutate({ data: { name: newCityName.trim(), isActive: true } }, {
      onSuccess: () => { toast({ title: "Wilaya créée" }); setNewCityName(""); refetchCities(); },
      onError: () => toast({ title: "Erreur", variant: "destructive" } as any),
    });
  };

  const handleToggleCityActive = (city: City) => {
    updateCity.mutate({ cityId: city.id, data: { name: city.name, isActive: !city.isActive } }, {
      onSuccess: () => refetchCities(),
    });
  };

  const handleDeleteCity = (cityId: number) => {
    if (!confirm("Supprimer cette wilaya et toutes ses zones ?")) return;
    deleteCity.mutate({ cityId }, {
      onSuccess: () => { toast({ title: "Wilaya supprimée" }); refetchCities(); if (selectedCityId === cityId) setSelectedCityId(null); },
    });
  };

  const handleCreateZone = () => {
    if (!newZoneName.trim() || !selectedCityId) return;
    const fee = newZoneFee ? Number(newZoneFee) : undefined;
    const eta = newZoneEta ? Number(newZoneEta) : undefined;
    createZone.mutate({
      cityId: selectedCityId,
      data: { name: newZoneName.trim(), isActive: true, deliveryFee: fee, estimatedMinutes: eta }
    }, {
      onSuccess: () => { toast({ title: "Zone créée" }); setNewZoneName(""); setNewZoneFee(""); setNewZoneEta(""); refetchZones(); },
      onError: () => toast({ title: "Erreur", variant: "destructive" } as any),
    });
  };

  const handleToggleZoneActive = (zone: Zone) => {
    updateZone.mutate({ zoneId: zone.id, data: { name: zone.name, isActive: !zone.isActive } }, {
      onSuccess: () => refetchZones(),
    });
  };

  const handleSaveZone = (zone: Zone) => {
    updateZone.mutate({
      zoneId: zone.id,
      data: {
        name: zone.name,
        deliveryFee: editZoneFee !== "" ? Number(editZoneFee) : undefined,
        estimatedMinutes: editZoneEta !== "" ? Number(editZoneEta) : undefined,
      }
    }, {
      onSuccess: () => { toast({ title: "Zone mise à jour" }); setEditingZoneId(null); refetchZones(); },
      onError: () => toast({ title: "Erreur", variant: "destructive" } as any),
    });
  };

  const handleDeleteZone = (zoneId: number) => {
    deleteZone.mutate({ zoneId }, {
      onSuccess: () => { toast({ title: "Zone supprimée" }); refetchZones(); },
    });
  };

  const activeCitiesCount = cities?.filter((c: any) => c.isActive).length ?? 0;
  const activeZonesCount  = zones?.filter((z: any) => z.isActive).length ?? 0;
  const inactiveZonesCount = zones?.filter((z: any) => !z.isActive).length ?? 0;
  const avgFee = useMemo(() => {
    if (!zones?.length) return null;
    const withFee = (zones as any[]).filter(z => z.deliveryFee != null);
    if (!withFee.length) return null;
    return withFee.reduce((s, z) => s + Number(z.deliveryFee), 0) / withFee.length;
  }, [zones]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wilayas & Communes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestion géographique — Algérie • Zones de livraison et frais
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => { refetchCities(); refetchZones(); }}>
          <RefreshCw className="w-3 h-3" /> Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Left — Wilayas */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Wilayas ({cities?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  className="h-8 text-sm"
                  placeholder="Nouvelle wilaya…"
                  value={newCityName}
                  onChange={e => setNewCityName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreateCity()}
                />
                <Button size="sm" className="h-8 px-3 shrink-0" onClick={handleCreateCity} disabled={!newCityName.trim()}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              {loadingCities && <p className="text-xs text-slate-400 text-center py-3">Chargement…</p>}
              {!loadingCities && !cities?.length && (
                <p className="text-xs text-slate-400 text-center py-3">Aucune wilaya</p>
              )}

              <div className="space-y-1.5 max-h-[450px] overflow-y-auto">
                {cities?.map((city: any) => (
                  <div
                    key={city.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedCityId === city.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-slate-50 hover:bg-slate-100"
                    }`}
                    onClick={() => { setSelectedCityId(city.id === selectedCityId ? null : city.id); setZoneSearch(""); setFilterMode("all"); }}
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{city.name}</p>
                      <p className="text-xs text-slate-400 truncate">{city.nameAr ?? ""}{city.code ? ` — ${city.code}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className={`text-xs font-medium px-1.5 py-0.5 rounded-full transition-colors ${
                          city.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                        onClick={e => { e.stopPropagation(); handleToggleCityActive(city); }}
                      >
                        {city.isActive ? "Active" : "Off"}
                      </button>
                      <button
                        className="p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors"
                        onClick={e => { e.stopPropagation(); handleDeleteCity(city.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {selectedCityId === city.id && <ChevronRight className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats globales */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="pt-3 pb-3 px-3">
                <p className="text-xs font-semibold text-blue-700">Wilayas actives</p>
                <p className="text-2xl font-bold text-blue-900">{activeCitiesCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-100">
              <CardContent className="pt-3 pb-3 px-3">
                <p className="text-xs font-semibold text-amber-700">Zones totales</p>
                <p className="text-2xl font-bold text-amber-900">{zones?.length ?? "—"}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right — Zones de la wilaya sélectionnée */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                {selectedCity
                  ? <>Communes — <span className="text-primary">{selectedCity.name}</span>{selectedCity.code ? <Badge variant="outline" className="ml-2 text-xs">{selectedCity.code}</Badge> : null}</>
                  : "Communes — Sélectionnez une wilaya"
                }
              </CardTitle>
              {selectedCityId && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs gap-1 text-green-700 border-green-200 bg-green-50">
                    {activeZonesCount} actives
                  </Badge>
                  {inactiveZonesCount > 0 && (
                    <Badge variant="outline" className="text-xs text-slate-500">
                      {inactiveZonesCount} inactives
                    </Badge>
                  )}
                  {avgFee && (
                    <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50">
                      Moy. {formatDA(avgFee)}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 pt-4 space-y-3">
            {!selectedCityId ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MapPin className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">Aucune wilaya sélectionnée</p>
                <p className="text-xs text-slate-300 mt-1">Cliquez sur une wilaya à gauche pour gérer ses communes</p>
              </div>
            ) : (
              <>
                {/* Add zone */}
                <div className="flex gap-2 flex-wrap">
                  <Input
                    className="h-8 text-sm flex-[2] min-w-[140px]"
                    placeholder="Nom de la commune…"
                    value={newZoneName}
                    onChange={e => setNewZoneName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreateZone()}
                  />
                  <div className="relative w-28 shrink-0">
                    <Input
                      className="h-8 text-sm pr-8"
                      type="number"
                      placeholder="Frais"
                      value={newZoneFee}
                      onChange={e => setNewZoneFee(e.target.value)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">DA</span>
                  </div>
                  <div className="relative w-24 shrink-0">
                    <Input
                      className="h-8 text-sm pr-8"
                      type="number"
                      placeholder="ETA"
                      value={newZoneEta}
                      onChange={e => setNewZoneEta(e.target.value)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">min</span>
                  </div>
                  <Button size="sm" className="h-8 px-3 shrink-0" onClick={handleCreateZone} disabled={!newZoneName.trim()}>
                    <Plus className="w-3 h-3 mr-1" /> Ajouter
                  </Button>
                </div>

                {/* Search + filter */}
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <Input
                      className="h-8 text-sm pl-8"
                      placeholder="Rechercher une commune…"
                      value={zoneSearch}
                      onChange={e => setZoneSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 h-8 shrink-0">
                    {(["all", "active", "inactive"] as FilterMode[]).map(mode => (
                      <button
                        key={mode}
                        className={`px-2.5 text-xs font-medium transition-colors ${
                          filterMode === mode
                            ? "bg-primary text-white"
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                        onClick={() => setFilterMode(mode)}
                      >
                        {mode === "all" ? "Toutes" : mode === "active" ? "Actives" : "Inactives"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zone table */}
                {loadingZones && <p className="text-xs text-slate-400 text-center py-6">Chargement des communes…</p>}
                {!loadingZones && filteredZones.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <AlertCircle className="w-6 h-6 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">
                      {zoneSearch ? "Aucune commune ne correspond à votre recherche" : "Aucune commune dans cette wilaya"}
                    </p>
                  </div>
                )}

                {!loadingZones && filteredZones.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 min-w-[130px]">Commune (FR)</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 min-w-[110px]">عربي</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Slug</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Frais</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">ETA</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500">Statut</th>
                          <th className="py-2 px-3 text-xs font-semibold text-slate-500 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredZones.map((zone: any, i: number) => (
                          <tr key={zone.id} className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                                <span className="font-medium text-slate-800">{zone.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-slate-600" dir="rtl">{zone.nameAr ?? "—"}</span>
                            </td>
                            <td className="py-2 px-3">
                              <code className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{zone.slug ?? "—"}</code>
                            </td>

                            {/* Frais & ETA — inline edit */}
                            {editingZoneId === zone.id ? (
                              <>
                                <td className="py-2 px-3">
                                  <div className="relative w-24 ml-auto">
                                    <Input
                                      className="h-7 text-xs pr-8 text-right"
                                      type="number"
                                      value={editZoneFee}
                                      onChange={e => setEditZoneFee(e.target.value)}
                                      autoFocus
                                      placeholder={zone.deliveryFee ?? ""}
                                      onKeyDown={e => { if (e.key === "Enter") handleSaveZone(zone); if (e.key === "Escape") setEditingZoneId(null); }}
                                    />
                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">DA</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="relative w-20 ml-auto">
                                    <Input
                                      className="h-7 text-xs pr-8 text-right"
                                      type="number"
                                      value={editZoneEta}
                                      onChange={e => setEditZoneEta(e.target.value)}
                                      placeholder={zone.estimatedMinutes ?? ""}
                                      onKeyDown={e => { if (e.key === "Enter") handleSaveZone(zone); if (e.key === "Escape") setEditingZoneId(null); }}
                                    />
                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">min</span>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-3 text-right">
                                  <span className={`text-xs font-semibold ${zone.deliveryFee != null ? "text-primary" : "text-slate-300 italic"}`}>
                                    {zone.deliveryFee != null ? formatDA(zone.deliveryFee) : "—"}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {zone.estimatedMinutes != null ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span className="text-xs text-slate-600">{zone.estimatedMinutes} min</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-300">—</span>
                                  )}
                                </td>
                              </>
                            )}

                            <td className="py-2 px-3 text-center">
                              <button
                                className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                                  zone.isActive
                                    ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600"
                                    : "bg-slate-100 text-slate-500 hover:bg-green-100 hover:text-green-700"
                                }`}
                                onClick={() => handleToggleZoneActive(zone)}
                              >
                                {zone.isActive ? "Active" : "Inactive"}
                              </button>
                            </td>

                            <td className="py-2 px-3">
                              <div className="flex items-center justify-center gap-1">
                                {editingZoneId === zone.id ? (
                                  <>
                                    <button className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200" onClick={() => handleSaveZone(zone)}>
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200" onClick={() => setEditingZoneId(null)}>
                                      <X className="w-3 h-3" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      className="p-1 rounded hover:bg-blue-50 text-slate-300 hover:text-blue-600 transition-colors"
                                      title="Modifier les frais et l'ETA"
                                      onClick={() => {
                                        setEditingZoneId(zone.id);
                                        setEditZoneFee(zone.deliveryFee != null ? String(zone.deliveryFee) : "");
                                        setEditZoneEta(zone.estimatedMinutes != null ? String(zone.estimatedMinutes) : "");
                                      }}
                                    >
                                      <Truck className="w-3 h-3" />
                                    </button>
                                    <button
                                      className="p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors"
                                      onClick={() => handleDeleteZone(zone.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        {filteredZones.length} commune{filteredZones.length > 1 ? "s" : ""} affichée{filteredZones.length > 1 ? "s" : ""}
                        {zones?.length !== filteredZones.length ? ` (sur ${zones?.length} total)` : ""}
                      </p>
                      {avgFee && (
                        <p className="text-xs text-slate-500">
                          Frais moyen : <span className="font-semibold text-primary">{formatDA(avgFee)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
