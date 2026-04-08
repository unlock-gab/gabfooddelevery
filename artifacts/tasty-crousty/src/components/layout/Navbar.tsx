import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/i18n";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { CartBadge } from "@/components/ui/CartBadge";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { Button } from "@/components/ui/button";
import { Menu, X, UtensilsCrossed } from "lucide-react";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/" && location.startsWith(href));
  return (
    <Link href={href} className={`relative text-sm font-medium transition-colors hover:text-primary pb-0.5 ${isActive ? "text-primary" : "text-foreground/70"}`}>
      {children}
      {isActive && (
        <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </Link>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashHref = user?.role === "customer" ? "/profile" : user?.role === "restaurant" ? "/dashboard" : `/${user?.role ?? ""}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <UtensilsCrossed className="w-4.5 h-4.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-lg text-foreground tracking-tight">TastyCrousty</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="/restaurants">Restaurants</NavLink>
            {user && <NavLink href="/orders">{t("orders")}</NavLink>}
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user?.role === "customer" && <NotificationBell />}
          <CartBadge />

          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <Link href={dashHref}>
                <Button variant="ghost" size="sm" className="font-medium">{t("dashboard")}</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout} className="font-medium">{t("logout")}</Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="font-medium">{t("login")}</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="font-semibold">{t("register")}</Button>
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden w-9 h-9 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white py-4 px-4 space-y-2 shadow-lg">
          <Link href="/restaurants" onClick={() => setMobileOpen(false)} className="flex items-center py-2 px-3 rounded-lg hover:bg-muted text-sm font-medium">
            Restaurants
          </Link>
          {user && (
            <Link href="/orders" onClick={() => setMobileOpen(false)} className="flex items-center py-2 px-3 rounded-lg hover:bg-muted text-sm font-medium">
              {t("orders")}
            </Link>
          )}
          <div className="border-t pt-2 mt-2">
            {user ? (
              <div className="flex flex-col gap-2">
                <Link href={dashHref} onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">{t("dashboard")}</Button>
                </Link>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { logout(); setMobileOpen(false); }}>
                  {t("logout")}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">{t("login")}</Button>
                </Link>
                <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="flex-1">
                  <Button size="sm" className="w-full">{t("register")}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
