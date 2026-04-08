import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  useListCities, useCreateCity, useUpdateCity, useDeleteCity,
  useListZones, useCreateZone, useUpdateZone, useDeleteZone,
  City, Zone,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Trash2, Edit, RefreshCw, Globe, Building } from "lucide-react";

export function ZonesSection() {
  const { toast } = useToast();
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [newCityName, setNewCityName] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [editCity, setEditCity] = useState<City | null>(null);
  const [editZone, setEditZone] = useState<Zone | null>(null);

  const { data: cities, refetch: refetchCities, isLoading: loadingCities } = useListCities(undefined, {
    query: { refetchInterval: 60000 },
  });
  const { data: zones, refetch: refetchZones } = useListZones(
    selectedCityId ? { cityId: selectedCityId } : undefined,
    { query: { enabled: true, refetchInterval: 60000 } }
  );

  const createCity = useCreateCity();
  const updateCity = useUpdateCity();
  const deleteCity = useDeleteCity();
  const createZone = useCreateZone();
  const updateZone = useUpdateZone();
  const deleteZone = useDeleteZone();

  const handleCreateCity = () => {
    if (!newCityName.trim()) return;
    createCity.mutate({ data: { name: newCityName.trim(), isActive: true } }, {
      onSuccess: () => { toast({ title: "Ville créée" }); setNewCityName(""); refetchCities(); },
      onError: () => toast({ title: "Erreur", variant: "destructive" } as any),
    });
  };

  const handleToggleCityActive = (city: City) => {
    updateCity.mutate({ cityId: city.id, data: { name: city.name, isActive: !city.isActive } }, {
      onSuccess: () => refetchCities(),
    });
  };

  const handleDeleteCity = (cityId: number) => {
    deleteCity.mutate({ cityId }, {
      onSuccess: () => { toast({ title: "Ville supprimée" }); refetchCities(); if (selectedCityId === cityId) setSelectedCityId(null); },
    });
  };

  const handleCreateZone = () => {
    if (!newZoneName.trim() || !selectedCityId) return;
    createZone.mutate({ data: { name: newZoneName.trim(), cityId: selectedCityId, isActive: true } }, {
      onSuccess: () => { toast({ title: "Zone créée" }); setNewZoneName(""); refetchZones(); },
      onError: () => toast({ title: "Erreur", variant: "destructive" } as any),
    });
  };

  const handleToggleZoneActive = (zone: Zone) => {
    updateZone.mutate({ zoneId: zone.id, data: { name: zone.name, isActive: !zone.isActive } }, {
      onSuccess: () => refetchZones(),
    });
  };

  const handleDeleteZone = (zoneId: number) => {
    deleteZone.mutate({ zoneId }, {
      onSuccess: () => { toast({ title: "Zone supprimée" }); refetchZones(); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Villes & Zones</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestion géographique de la plateforme</p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => { refetchCities(); refetchZones(); }}>
          <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cities panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Villes ({cities?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Add city */}
            <div className="flex gap-2">
              <Input
                className="h-8 text-sm"
                placeholder="Nom de la ville…"
                value={newCityName}
                onChange={e => setNewCityName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateCity()}
              />
              <Button size="sm" className="h-8 px-3 shrink-0" onClick={handleCreateCity} disabled={!newCityName.trim()}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            {loadingCities && <p className="text-xs text-slate-400 text-center py-4">Chargement…</p>}
            {!loadingCities && !cities?.length && (
              <p className="text-xs text-slate-400 text-center py-4">Aucune ville</p>
            )}

            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {cities?.map(city => (
                <div
                  key={city.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedCityId === city.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-slate-50 hover:bg-slate-100"
                  }`}
                  onClick={() => setSelectedCityId(city.id === selectedCityId ? null : city.id)}
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-slate-800">{city.name}</span>
                  <button
                    className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                      city.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                    onClick={e => { e.stopPropagation(); handleToggleCityActive(city); }}
                  >
                    {city.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                    onClick={e => { e.stopPropagation(); handleDeleteCity(city.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Zones panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              {selectedCityId
                ? `Zones — ${cities?.find(c => c.id === selectedCityId)?.name ?? ""} (${zones?.length ?? 0})`
                : "Zones — Sélectionnez une ville"
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedCityId ? (
              <>
                <div className="flex gap-2">
                  <Input
                    className="h-8 text-sm"
                    placeholder="Nom de la zone…"
                    value={newZoneName}
                    onChange={e => setNewZoneName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreateZone()}
                  />
                  <Button size="sm" className="h-8 px-3 shrink-0" onClick={handleCreateZone} disabled={!newZoneName.trim()}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                {!zones?.length && (
                  <p className="text-xs text-slate-400 text-center py-4">Aucune zone dans cette ville</p>
                )}

                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {zones?.map(zone => (
                    <div key={zone.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="flex-1 text-sm font-medium text-slate-800">{zone.name}</span>
                      <button
                        className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                          zone.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                        onClick={() => handleToggleZoneActive(zone)}
                      >
                        {zone.isActive ? "Active" : "Inactive"}
                      </button>
                      <button
                        className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                        onClick={() => handleDeleteZone(zone.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Sélectionnez une ville à gauche pour gérer ses zones</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs font-semibold text-blue-700 mb-1">Villes actives</p>
            <p className="text-xl font-bold text-blue-900">{cities?.filter(c => c.isActive).length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs font-semibold text-green-700 mb-1">Zones actives</p>
            <p className="text-xl font-bold text-green-900">—</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">Couverture</p>
            <p className="text-xl font-bold text-amber-900">Alger</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
