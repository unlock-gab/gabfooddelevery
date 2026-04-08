import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/ui/StatCard";
import {
  useGetAdminDashboard, useListOrders, useListDrivers, useListCustomers,
  useListFraudFlags, useResolveFraudFlag, useApproveDriver, useRejectDriver,
  useApproveRestaurant, useRejectRestaurant, useListRestaurants,
  useGetOrderAnalytics, useGetSettings, useUpdateSettings,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, ShoppingBag, Users, Truck, AlertTriangle, Settings,
  TrendingUp, Store, RefreshCw, CheckCircle, XCircle, Clock, Shield,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!user || user.role !== "admin") {
    setLocation("/auth/login");
    return null;
  }

  const { data: dashboard, isLoading: loadingDash, refetch: refetchDash } = useGetAdminDashboard(undefined, {
    query: { refetchInterval: 30000 }
  });
  const { data: orders } = useListOrders({}, { query: { enabled: activeTab === "orders" } });
  const { data: drivers, refetch: refetchDrivers } = useListDrivers({}, { query: { enabled: activeTab === "drivers" } });
  const { data: customers } = useListCustomers({}, { query: { enabled: activeTab === "customers" } });
  const { data: flagsData, refetch: refetchFlags } = useListFraudFlags({}, { query: { enabled: activeTab === "fraud" } });
  const { data: restaurants, refetch: refetchRestaurants } = useListRestaurants({}, { query: { enabled: activeTab === "restaurants" } });
  const { data: settings } = useGetSettings(undefined, { query: { enabled: activeTab === "settings" } });

  const resolveFlag = useResolveFraudFlag();
  const approveDriver = useApproveDriver();
  const rejectDriver = useRejectDriver();
  const approveRestaurant = useApproveRestaurant();
  const rejectRestaurant = useRejectRestaurant();
  const updateSettings = useUpdateSettings();

  const handleResolveFlag = (flagId: number) => {
    resolveFlag.mutate({ flagId }, {
      onSuccess: () => { toast({ title: "Résolu" }); refetchFlags(); },
    });
  };

  const handleApproveDriver = (driverId: number) => {
    approveDriver.mutate({ driverId }, {
      onSuccess: () => { toast({ title: "Livreur approuvé" }); refetchDrivers(); },
    });
  };
  const handleRejectDriver = (driverId: number) => {
    rejectDriver.mutate({ driverId }, {
      onSuccess: () => { toast({ title: "Livreur rejeté", variant: "destructive" } as any); refetchDrivers(); },
    });
  };

  const handleApproveRestaurant = (restaurantId: number) => {
    approveRestaurant.mutate({ restaurantId }, {
      onSuccess: () => { toast({ title: "Restaurant approuvé" }); refetchRestaurants(); },
    });
  };
  const handleRejectRestaurant = (restaurantId: number) => {
    rejectRestaurant.mutate({ restaurantId }, {
      onSuccess: () => { toast({ title: "Restaurant rejeté" }); refetchRestaurants(); },
    });
  };

  const navItems = [
    { id: "dashboard", label: "Tableau de bord", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "orders", label: "Commandes", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "restaurants", label: "Restaurants", icon: <Store className="w-4 h-4" /> },
    { id: "drivers", label: "Livreurs", icon: <Truck className="w-4 h-4" /> },
    { id: "customers", label: "Clients", icon: <Users className="w-4 h-4" /> },
    { id: "fraud", label: "Fraude", icon: <Shield className="w-4 h-4" /> },
    { id: "settings", label: "Paramètres", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-60 bg-card border-r flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h1 className="font-bold text-lg text-primary">TastyCrousty</h1>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavItem key={item.id} icon={item.icon} label={item.label} active={activeTab === item.id} onClick={() => setActiveTab(item.id)} />
          ))}
        </nav>
        <div className="p-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">{user.name}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => { logout(); setLocation("/"); }}>
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <ScrollArea className="h-screen">
          <div className="p-6 max-w-6xl">
            {/* Dashboard */}
            {activeTab === "dashboard" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Tableau de bord</h2>
                  <Button variant="outline" size="sm" onClick={() => refetchDash()}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Actualiser
                  </Button>
                </div>
                {dashboard && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <StatCard title="Commandes actives" value={dashboard.activeDeliveries} icon={<Truck className="w-5 h-5" />} variant="info" />
                      <StatCard title="En attente dispatch" value={dashboard.pendingDispatch} icon={<Clock className="w-5 h-5" />} variant="warning" />
                      <StatCard title="Livrées aujourd'hui" value={dashboard.deliveredToday} icon={<CheckCircle className="w-5 h-5" />} variant="success" />
                      <StatCard title="Revenu du jour" value={`${Number(dashboard.revenueToday).toFixed(2)} €`} icon={<TrendingUp className="w-5 h-5" />} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <StatCard title="Livreurs en ligne" value={`${dashboard.onlineDrivers}/${dashboard.totalDrivers}`} icon={<Truck className="w-5 h-5" />} />
                      <StatCard title="Restaurants" value={dashboard.totalRestaurants} icon={<Store className="w-5 h-5" />} />
                      <StatCard title="Clients" value={dashboard.totalCustomers} icon={<Users className="w-5 h-5" />} />
                      <StatCard title="Flags fraude" value={dashboard.openFraudFlags} icon={<AlertTriangle className="w-5 h-5" />} variant="danger" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Approbations en attente</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Restaurants</span>
                            <Badge variant="secondary">{dashboard.pendingRestaurantApprovals}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Livreurs</span>
                            <Badge variant="secondary">{dashboard.pendingDriverApprovals}</Badge>
                          </div>
                          {(dashboard.pendingRestaurantApprovals > 0 || dashboard.pendingDriverApprovals > 0) && (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setActiveTab("restaurants")}>
                                Restaurants →
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setActiveTab("drivers")}>
                                Livreurs →
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">En attente confirmation</CardTitle></CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-orange-600">{dashboard.awaitingConfirmation}</div>
                          <p className="text-xs text-muted-foreground mt-1">commandes en attente de confirmation client</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">En préparation</CardTitle></CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-purple-600">{dashboard.preparingOrders}</div>
                          <p className="text-xs text-muted-foreground mt-1">commandes en cours de préparation</p>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Orders */}
            {activeTab === "orders" && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Commandes</h2>
                <div className="space-y-2">
                  {orders?.orders?.map((order: any) => (
                    <Card key={order.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm">{order.orderNumber}</span>
                            <Badge variant="outline" className="text-xs">{order.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{order.restaurantName} • {new Date(order.createdAt).toLocaleString("fr-FR")}</p>
                        </div>
                        <span className="font-bold text-sm text-primary shrink-0">{Number(order.total).toFixed(2)} €</span>
                      </CardContent>
                    </Card>
                  ))}
                  {!orders?.orders?.length && <p className="text-center text-muted-foreground py-10">Aucune commande</p>}
                </div>
              </div>
            )}

            {/* Restaurants */}
            {activeTab === "restaurants" && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Restaurants</h2>
                <div className="space-y-2">
                  {restaurants?.map((r: any) => (
                    <Card key={r.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{r.name}</span>
                            <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                              {r.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{r.category ?? "Catégorie N/A"} • {r.address ?? "Adresse N/A"}</p>
                        </div>
                        {r.status === "pending" && (
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700" onClick={() => handleApproveRestaurant(r.id)}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Approuver
                            </Button>
                            <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => handleRejectRestaurant(r.id)}>
                              <XCircle className="w-3 h-3 mr-1" /> Rejeter
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {!restaurants?.length && <p className="text-center text-muted-foreground py-10">Aucun restaurant</p>}
                </div>
              </div>
            )}

            {/* Drivers */}
            {activeTab === "drivers" && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Livreurs</h2>
                <div className="space-y-2">
                  {drivers?.map((driver: any) => (
                    <Card key={driver.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{driver.name}</span>
                            <Badge variant={driver.status === "approved" ? "default" : driver.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                              {driver.status}
                            </Badge>
                            {driver.isOnline && <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">En ligne</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {driver.totalDeliveries} livraisons • {Number(driver.avgRating).toFixed(1)}⭐ • {Number(driver.acceptanceRate).toFixed(0)}% acceptation
                          </p>
                        </div>
                        {driver.status === "pending" && (
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700" onClick={() => handleApproveDriver(driver.id)}>
                              Approuver
                            </Button>
                            <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => handleRejectDriver(driver.id)}>
                              Rejeter
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {!drivers?.length && <p className="text-center text-muted-foreground py-10">Aucun livreur</p>}
                </div>
              </div>
            )}

            {/* Customers */}
            {activeTab === "customers" && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Clients</h2>
                <div className="space-y-2">
                  {customers?.map((customer: any) => (
                    <Card key={customer.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{customer.name}</span>
                            <Badge variant={customer.riskScore === "high" ? "destructive" : customer.riskScore === "medium" ? "secondary" : "outline"} className="text-xs">
                              Risque: {customer.riskScore}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {customer.email} • {customer.totalOrders} commandes • {customer.cancellationCount} annulations
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {!customers?.length && <p className="text-center text-muted-foreground py-10">Aucun client</p>}
                </div>
              </div>
            )}

            {/* Fraud */}
            {activeTab === "fraud" && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Flags de fraude</h2>
                <div className="space-y-2">
                  {flagsData?.map((flag: any) => (
                    <Card key={flag.id} className={flag.severity === "critical" ? "border-red-300" : flag.severity === "high" ? "border-orange-300" : ""}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className={`w-4 h-4 ${flag.severity === "critical" ? "text-red-600" : flag.severity === "high" ? "text-orange-600" : "text-yellow-600"}`} />
                            <span className="font-medium text-sm">{flag.userName}</span>
                            <Badge variant={flag.severity === "critical" || flag.severity === "high" ? "destructive" : "secondary"} className="text-xs">
                              {flag.severity}
                            </Badge>
                            {flag.isResolved && <Badge variant="outline" className="text-xs text-green-600">Résolu</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{flag.description}</p>
                        </div>
                        {!flag.isResolved && (
                          <Button size="sm" variant="outline" className="text-xs h-7 shrink-0" onClick={() => handleResolveFlag(flag.id)}>
                            Résoudre
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {!flagsData?.length && (
                    <div className="text-center py-10">
                      <Shield className="w-12 h-12 mx-auto mb-3 text-green-500/40" />
                      <p className="text-muted-foreground">Aucun flag de fraude actif</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Settings */}
            {activeTab === "settings" && settings && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Paramètres de la plateforme</h2>
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {[
                      { key: "dispatchRadiusKm", label: "Rayon de dispatch (km)", type: "number" },
                      { key: "dispatchTimeoutSeconds", label: "Timeout dispatch (secondes)", type: "number" },
                      { key: "defaultDeliveryFee", label: "Frais de livraison par défaut (€)", type: "number" },
                      { key: "platformCommissionRate", label: "Commission plateforme (%)", type: "number" },
                      { key: "maxCancellationsBeforeFlag", label: "Annulations max avant flag", type: "number" },
                      { key: "maxUnreachableBeforeFlag", label: "Injoignable max avant flag", type: "number" },
                    ].map(field => (
                      <div key={field.key} className="flex items-center justify-between gap-4">
                        <label className="text-sm font-medium flex-1">{field.label}</label>
                        <input
                          type={field.type}
                          defaultValue={(settings as any)[field.key]}
                          className="w-24 h-8 px-2 text-sm border rounded-md text-right"
                          onBlur={(e) => {
                            updateSettings.mutate({ data: { [field.key]: Number(e.target.value) } }, {
                              onSuccess: () => toast({ title: "Paramètre mis à jour" }),
                            });
                          }}
                        />
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <div className="text-sm font-medium">Mode maintenance</div>
                        <div className="text-xs text-muted-foreground">Désactive l'accès à la plateforme</div>
                      </div>
                      <Badge variant={settings.maintenanceMode ? "destructive" : "default"}>
                        {settings.maintenanceMode ? "Activé" : "Désactivé"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
