import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  Clock, 
  User, 
  Star,
  Car,
  MapPin,
  Settings,
  ShieldAlert,
  BarChart3,
  CreditCard,
  Users
} from "lucide-react";

export function RoleSidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const links = {
    restaurant: [
      { href: "/dashboard", label: "Aperçu", icon: LayoutDashboard },
      { href: "/dashboard/orders", label: "Commandes", icon: ShoppingBag },
      { href: "/dashboard/menu", label: "Menu", icon: UtensilsCrossed },
      { href: "/dashboard/hours", label: "Horaires", icon: Clock },
      { href: "/dashboard/profile", label: "Profil", icon: User },
      { href: "/dashboard/ratings", label: "Avis", icon: Star },
    ],
    driver: [
      { href: "/driver", label: "Missions", icon: Car },
      { href: "/driver/history", label: "Historique", icon: Clock },
      { href: "/driver/stats", label: "Statistiques", icon: BarChart3 },
    ],
    admin: [
      { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Commandes", icon: ShoppingBag },
      { href: "/admin/dispatch", label: "Dispatch", icon: MapPin },
      { href: "/admin/restaurants", label: "Restaurants", icon: UtensilsCrossed },
      { href: "/admin/drivers", label: "Livreurs", icon: Car },
      { href: "/admin/customers", label: "Clients", icon: Users },
      { href: "/admin/fraud", label: "Fraude", icon: ShieldAlert },
      { href: "/admin/payments", label: "Paiements", icon: CreditCard },
      { href: "/admin/analytics", label: "Analytique", icon: BarChart3 },
      { href: "/admin/cities", label: "Villes & Zones", icon: MapPin },
      { href: "/admin/settings", label: "Paramètres", icon: Settings },
    ]
  };

  const roleLinks = links[user.role as keyof typeof links] || [];

  if (roleLinks.length === 0) return null;

  return (
    <div className="w-64 border-r bg-muted/30 min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="p-4 flex-1">
        <nav className="grid gap-1">
          {roleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href || location.startsWith(`${link.href}/`);
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
