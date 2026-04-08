import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useListOrders } from "@workspace/api-client-react";
import { formatDA } from "@/lib/format";
import {
  User, Mail, MapPin, ShoppingBag, Clock, ChevronRight,
  CheckCircle, Package, Truck, AlertCircle, Lock, Eye, EyeOff,
  Star, TrendingUp, Calendar, LogOut,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: "Recherche livreur",
  dispatching_driver: "Dispatch",
  driver_assigned: "Livreur assigné",
  awaiting_customer_confirmation: "Confirmation attendue",
  confirmed_for_preparation: "Confirmé",
  preparing: "En préparation",
  ready_for_pickup: "Prêt",
  picked_up: "Collecté",
  on_the_way: "En route",
  arriving_soon: "Arrivée imminente",
  delivered: "Livré",
  cancelled: "Annulé",
  failed: "Échoué",
  refunded: "Remboursé",
};

const STATUS_STYLES: Record<string, string> = {
  pending_dispatch: "bg-blue-50 text-blue-700 border-blue-200",
  dispatching_driver: "bg-blue-50 text-blue-700 border-blue-200",
  driver_assigned: "bg-indigo-50 text-indigo-700 border-indigo-200",
  awaiting_customer_confirmation: "bg-amber-50 text-amber-800 border-amber-200",
  confirmed_for_preparation: "bg-green-50 text-green-700 border-green-200",
  preparing: "bg-purple-50 text-purple-700 border-purple-200",
  ready_for_pickup: "bg-indigo-50 text-indigo-700 border-indigo-200",
  picked_up: "bg-indigo-50 text-indigo-700 border-indigo-200",
  on_the_way: "bg-blue-50 text-blue-700 border-blue-200",
  arriving_soon: "bg-teal-50 text-teal-700 border-teal-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-100 text-gray-600 border-gray-200",
};

const ACTIVE_STATUSES = [
  "pending_dispatch", "dispatching_driver", "driver_assigned",
  "awaiting_customer_confirmation", "confirmed_for_preparation",
  "preparing", "ready_for_pickup", "picked_up", "on_the_way", "arriving_soon",
];

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function CustomerProfile() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [showPwForm, setShowPwForm] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const { data: ordersData, isLoading: ordersLoading } = useListOrders({} as any);
  const orders = (ordersData as any)?.orders ?? [];

  const delivered = orders.filter((o: any) => o.status === "delivered");
  const active = orders.filter((o: any) => ACTIVE_STATUSES.includes(o.status));
  const totalSpent = delivered.reduce((sum: number, o: any) => sum + Number(o.totalAmount ?? 0), 0);
  const recent = [...orders]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: "Erreur", description: "Le nouveau mot de passe doit faire au moins 6 caractères.", variant: "destructive" });
      return;
    }
    setPwLoading(true);
    try {
      const token = localStorage.getItem("tc_token");
      const res = await fetch(`/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: oldPw, newPassword: newPw }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur");
      }
      toast({ title: "Mot de passe modifié", description: "Votre mot de passe a été mis à jour avec succès." });
      setShowPwForm(false);
      setOldPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-500">Veuillez vous connecter pour accéder à votre profil.</p>
          <Link href="/connexion">
            <Button className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">Se connecter</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Hero card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-10">
              <div className="flex items-end gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-amber-500">{getInitials(user.name ?? "TC")}</span>
                </div>
                <div className="pb-1">
                  <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 border font-medium">
                  Client
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                  onClick={handleLogout}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: ShoppingBag, label: "Commandes", value: ordersLoading ? "—" : orders.length, color: "text-amber-500", bg: "bg-amber-50" },
            { icon: CheckCircle, label: "Livrées", value: ordersLoading ? "—" : delivered.length, color: "text-green-600", bg: "bg-green-50" },
            { icon: TrendingUp, label: "Total dépensé", value: ordersLoading ? "—" : formatDA(totalSpent), color: "text-blue-600", bg: "bg-blue-50" },
            { icon: Clock, label: "En cours", value: ordersLoading ? "—" : active.length, color: "text-purple-600", bg: "bg-purple-50" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{label}</p>
                <p className="text-base font-bold text-gray-900 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent orders */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                Commandes récentes
              </h2>
              <Link href="/orders">
                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 gap-1 text-xs">
                  Voir tout <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {ordersLoading ? (
              <div className="divide-y divide-gray-50">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="px-6 py-4 animate-pulse flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-32" />
                      <div className="h-3 bg-gray-100 rounded w-20" />
                    </div>
                    <div className="h-6 bg-gray-100 rounded w-20" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Aucune commande pour l'instant</p>
                <Link href="/restaurants">
                  <Button size="sm" className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">
                    Commander maintenant
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recent.map((order: any) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {order.restaurantName ?? `Commande #${order.id}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(order.createdAt)}
                          </span>
                          <span className="font-semibold text-gray-700">{formatDA(order.totalAmount)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={order.status} />
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Quick links */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50">
                <h2 className="font-semibold text-sm text-gray-900">Mon compte</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { href: "/orders", icon: ShoppingBag, label: "Mes commandes", sub: `${orders.length} au total` },
                  { href: "/account/addresses", icon: MapPin, label: "Mes adresses", sub: "Gérer mes adresses" },
                ].map(({ href, icon: Icon, label, sub }) => (
                  <Link key={href} href={href}>
                    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{label}</p>
                        <p className="text-xs text-gray-400">{sub}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  Sécurité
                </h2>
                <button
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                  onClick={() => setShowPwForm((v) => !v)}
                >
                  {showPwForm ? "Annuler" : "Modifier"}
                </button>
              </div>

              {!showPwForm ? (
                <div className="px-5 py-4">
                  <p className="text-xs text-gray-400">Mot de passe</p>
                  <p className="text-sm text-gray-600 mt-0.5">••••••••••••</p>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="px-5 py-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Mot de passe actuel</Label>
                    <div className="relative">
                      <Input
                        type={showOld ? "text" : "password"}
                        value={oldPw}
                        onChange={(e) => setOldPw(e.target.value)}
                        className="pr-9 text-sm h-9"
                        required
                      />
                      <button type="button" onClick={() => setShowOld(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                        {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Input
                        type={showNew ? "text" : "password"}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className="pr-9 text-sm h-9"
                        required
                        minLength={6}
                      />
                      <button type="button" onClick={() => setShowNew(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Confirmer</Label>
                    <Input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      className="text-sm h-9"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={pwLoading}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white h-9 text-sm"
                  >
                    {pwLoading ? "Modification..." : "Enregistrer"}
                  </Button>
                </form>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
