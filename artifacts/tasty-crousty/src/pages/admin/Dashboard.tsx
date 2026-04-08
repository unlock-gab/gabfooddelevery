import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetAdminDashboard } from "@workspace/api-client-react";
import {
  LayoutDashboard, ShoppingBag, Store, Truck, Users, MapPin,
  Radio, CheckSquare, Shield, CreditCard, Bell, Settings,
  LogOut, ChevronRight, AlertTriangle, RefreshCw,
} from "lucide-react";
import { OverviewSection } from "./sections/OverviewSection";
import { OrdersSection } from "./sections/OrdersSection";
import { RestaurantsSection } from "./sections/RestaurantsSection";
import { DriversSection } from "./sections/DriversSection";
import { CustomersSection } from "./sections/CustomersSection";
import { DispatchSection } from "./sections/DispatchSection";
import { ConfirmationSection } from "./sections/ConfirmationSection";
import { FraudSection } from "./sections/FraudSection";
import { PaymentsSection } from "./sections/PaymentsSection";
import { ZonesSection } from "./sections/ZonesSection";
import { SettingsSection } from "./sections/SettingsSection";

type Section =
  | "overview" | "orders" | "restaurants" | "drivers" | "customers"
  | "dispatch" | "confirmation" | "fraud" | "payments" | "zones" | "settings";

interface NavItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
  alertKey?: keyof typeof alertKeys;
}

const alertKeys = {} as Record<string, number>;

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Opérations",
    items: [
      { id: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: "orders", label: "Commandes", icon: <ShoppingBag className="w-4 h-4" /> },
      { id: "dispatch", label: "Centre dispatch", icon: <Radio className="w-4 h-4" /> },
      { id: "confirmation", label: "Confirmations", icon: <CheckSquare className="w-4 h-4" /> },
    ],
  },
  {
    title: "Gestion",
    items: [
      { id: "restaurants", label: "Restaurants", icon: <Store className="w-4 h-4" /> },
      { id: "drivers", label: "Livreurs", icon: <Truck className="w-4 h-4" /> },
      { id: "customers", label: "Clients", icon: <Users className="w-4 h-4" /> },
      { id: "zones", label: "Villes & Zones", icon: <MapPin className="w-4 h-4" /> },
    ],
  },
  {
    title: "Finance & Sécurité",
    items: [
      { id: "payments", label: "Paiements", icon: <CreditCard className="w-4 h-4" /> },
      { id: "fraud", label: "Fraude & Litiges", icon: <Shield className="w-4 h-4" /> },
    ],
  },
  {
    title: "Configuration",
    items: [
      { id: "settings", label: "Paramètres", icon: <Settings className="w-4 h-4" /> },
    ],
  },
];

function SidebarItem({ item, active, alerts, onClick }: {
  item: NavItem; active: boolean; alerts?: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <span className={active ? "text-primary-foreground" : "text-slate-400 group-hover:text-slate-600"}>
        {item.icon}
      </span>
      <span className="flex-1 text-left">{item.label}</span>
      {alerts && alerts > 0 ? (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-red-100 text-red-700"}`}>
          {alerts}
        </span>
      ) : null}
    </button>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const { data: dashboard, refetch } = useGetAdminDashboard(undefined, {
    query: { refetchInterval: 30000 },
  });

  if (!user || user.role !== "admin") {
    setLocation("/auth/login");
    return null;
  }

  const alertMap: Partial<Record<Section, number>> = {
    dispatch: dashboard?.pendingDispatch ?? 0,
    confirmation: (dashboard?.awaitingConfirmation ?? 0) + (dashboard?.failedConfirmationsToday ?? 0),
    restaurants: dashboard?.pendingRestaurantApprovals ?? 0,
    drivers: dashboard?.pendingDriverApprovals ?? 0,
    fraud: dashboard?.openFraudFlags ?? 0,
  };

  const totalAlerts = Object.values(alertMap).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TC</span>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">TastyCrousty</div>
              <div className="text-xs text-slate-400">Operations Center</div>
            </div>
          </div>
        </div>

        {/* Live status bar */}
        {dashboard && totalAlerts > 0 && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center gap-2 text-xs text-amber-700">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span className="font-medium">{totalAlerts} alerte{totalAlerts > 1 ? "s" : ""} en attente</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <ScrollArea className="flex-1 px-3 py-3">
          <div className="space-y-5">
            {navGroups.map(group => (
              <div key={group.title}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(item => (
                    <SidebarItem
                      key={item.id}
                      item={item}
                      active={activeSection === item.id}
                      alerts={alertMap[item.id]}
                      onClick={() => setActiveSection(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* User footer */}
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">{user.name}</div>
              <div className="text-xs text-slate-400 truncate">{user.email}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-slate-500 h-8"
            onClick={() => { logout(); setLocation("/"); }}
          >
            <LogOut className="w-3 h-3 mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="text-slate-400">Admin</span>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-slate-800">
              {navGroups.flatMap(g => g.items).find(i => i.id === activeSection)?.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {dashboard && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                <span>{dashboard.onlineDrivers} livreurs en ligne</span>
              </div>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()}>
              <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
            </Button>
          </div>
        </header>

        {/* Page content */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-7xl mx-auto">
            {activeSection === "overview" && <OverviewSection dashboard={dashboard} onNavigate={setActiveSection} />}
            {activeSection === "orders" && <OrdersSection />}
            {activeSection === "restaurants" && <RestaurantsSection />}
            {activeSection === "drivers" && <DriversSection />}
            {activeSection === "customers" && <CustomersSection />}
            {activeSection === "dispatch" && <DispatchSection />}
            {activeSection === "confirmation" && <ConfirmationSection />}
            {activeSection === "fraud" && <FraudSection />}
            {activeSection === "payments" && <PaymentsSection />}
            {activeSection === "zones" && <ZonesSection />}
            {activeSection === "settings" && <SettingsSection />}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
