import React from "react";
import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import { useGetCart } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

export function CartBadge() {
  const { user } = useAuth();
  
  if (user?.role && user.role !== "customer") return null;

  const { data: cart } = useGetCart({
    query: {
      enabled: !!user && user.role === "customer"
    }
  });

  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <Link href="/cart" className="relative inline-flex items-center p-2 text-foreground hover:text-primary transition-colors">
      <ShoppingCart className="w-5 h-5" />
      {itemCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground transform translate-x-1/4 -translate-y-1/4 bg-primary rounded-full">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
