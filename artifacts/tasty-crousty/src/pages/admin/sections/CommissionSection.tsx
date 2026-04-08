import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck, Store, RefreshCw, RotateCcw, TrendingUp } from "lucide-react";

const COMMISSION_RATE = 0.12;

function formatDA(n: number) {
  if (n === 0) return "0 DA";
  return n.toLocaleString("fr-DZ") + " DA";
}

async function fetchCommission() {
  const token = localStorage.getItem("tc_token");
  const res = await fetch("/api/admin/commission", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erreur chargement");
  return res.json();
}

async function resetDriverEarnings(driverId: number) {
  const token = localStorage.getItem("tc_token");
  const res = await fetch(`/api/admin/drivers/${driverId}/reset-earnings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erreur reset");
}

async function resetRestaurantCommission(restaurantId: number) {
  const token = localStorage.getItem("tc_token");
  const res = await fetch(`/api/admin/restaurants/${restaurantId}/reset-commission`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erreur reset");
}

export function CommissionSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [resetting, setResetting] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/commission"],
    queryFn: fetchCommission,
    refetchInterval: 30000,
  });

  const drivers: any[] = data?.drivers ?? [];
  const restaurants: any[] = data?.restaurants ?? [];

  const totalDriverCommission = drivers.reduce((s: number, d: any) => s + d.commission, 0);
  const totalRestaurantCommission = restaurants.reduce((s: number, r: any) => s + r.commission, 0);
  const grandTotal = totalDriverCommission + totalRestaurantCommission;

  const handleResetDriver = async (driver: any) => {
    if (!confirm(`Réinitialiser les gains de ${driver.name} à 0 DA ? (Commission de ${formatDA(driver.commission)} collectée)`)) return;
    setResetting(`driver-${driver.id}`);
    try {
      await resetDriverEarnings(driver.id);
      toast({ title: `✅ Gains de ${driver.name} remis à zéro` });
      refetch();
    } catch {
      toast({ title: "Erreur", description: "Impossible de réinitialiser", variant: "destructive" });
    } finally {
      setResetting(null);
    }
  };

  const handleResetRestaurant = async (restaurant: any) => {
    if (!confirm(`Marquer la commission de ${restaurant.name} comme collectée (${formatDA(restaurant.commission)}) ?`)) return;
    setResetting(`resto-${restaurant.id}`);
    try {
      await resetRestaurantCommission(restaurant.id);
      toast({ title: `✅ Commission de ${restaurant.name} remise à zéro` });
      refetch();
    } catch {
      toast({ title: "Erreur", description: "Impossible de réinitialiser", variant: "destructive" });
    } finally {
      setResetting(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commissions</h1>
          <p className="text-sm text-slate-500 mt-1">Taux : 12% — Livreurs sur gains · Restaurants sur CA</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Livreurs</p>
              <p className="text-xl font-bold text-amber-800">{formatDA(totalDriverCommission)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Store className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Restaurants</p>
              <p className="text-xl font-bold text-orange-800">{formatDA(totalRestaurantCommission)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Total à percevoir</p>
              <p className="text-xl font-bold text-green-800">{formatDA(grandTotal)}</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12 text-slate-400">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Drivers table */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-slate-800">Livreurs ({drivers.length})</h2>
            </div>
            <div className="divide-y">
              {drivers.length === 0 && (
                <p className="text-center py-8 text-slate-400 text-sm">Aucun livreur approuvé</p>
              )}
              {drivers.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 text-sm truncate">{d.name ?? "—"}</p>
                    <p className="text-xs text-slate-400 truncate">{d.email ?? "—"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{d.totalDeliveries} livraisons · Gains : {formatDA(d.earningsTotal)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-700">{formatDA(d.commission)}</p>
                      <p className="text-[10px] text-slate-400">12% commission</p>
                    </div>
                    {d.commission > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
                        disabled={resetting === `driver-${d.id}`}
                        onClick={() => handleResetDriver(d)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Collecté
                      </Button>
                    )}
                    {d.commission === 0 && (
                      <span className="text-xs text-green-600 font-medium px-2">✓ Soldé</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Restaurants table */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center gap-2">
              <Store className="w-4 h-4 text-orange-600" />
              <h2 className="font-semibold text-slate-800">Restaurants ({restaurants.length})</h2>
            </div>
            <div className="divide-y">
              {restaurants.length === 0 && (
                <p className="text-center py-8 text-slate-400 text-sm">Aucun restaurant approuvé</p>
              )}
              {restaurants.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 text-sm truncate">{r.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">CA : {formatDA(r.revenue)}</p>
                    {r.commissionResetAt && (
                      <p className="text-[10px] text-slate-400">
                        Dernier reset : {new Date(r.commissionResetAt).toLocaleDateString("fr-DZ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-700">{formatDA(r.commission)}</p>
                      <p className="text-[10px] text-slate-400">12% commission</p>
                    </div>
                    {r.commission > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
                        disabled={resetting === `resto-${r.id}`}
                        onClick={() => handleResetRestaurant(r)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Collecté
                      </Button>
                    )}
                    {r.commission === 0 && (
                      <span className="text-xs text-green-600 font-medium px-2">✓ Soldé</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
