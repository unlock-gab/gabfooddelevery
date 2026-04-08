import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/i18n";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { CartBadge } from "@/components/ui/CartBadge";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl text-primary tracking-tight">TastyCrousty</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="/restaurants" className="transition-colors hover:text-primary">
              Restaurants
            </Link>
            {user && (
              <Link href="/orders" className="transition-colors hover:text-primary">
                {t("orders")}
              </Link>
            )}
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
          {user?.role === "customer" && <NotificationBell />}
          <CartBadge />
          
          {user ? (
            <div className="flex items-center gap-4">
              <Link href={user.role === 'customer' ? '/profile' : `/${user.role}`}>
                <Button variant="ghost" size="sm">{t("dashboard")}</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout}>{t("logout")}</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">{t("login")}</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">{t("register")}</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
