import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useGetCart } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatDA } from "@/lib/format";
import {
  ShoppingCart, Trash2, Plus, Minus, ChevronLeft,
  UtensilsCrossed, ArrowRight, Tag, Loader2,
} from "lucide-react";

function CartItemRow({
  item,
  onChangeQty,
  onRemove,
  loading,
}: {
  item: any;
  onChangeQty: (qty: number) => void;
  onRemove: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-4">
      {/* Product icon */}
      <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
        <UtensilsCrossed className="w-6 h-6 text-amber-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">{item.productName}</p>
        {item.notes && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{item.notes}</p>
        )}
        <p className="text-sm font-bold text-amber-600 mt-1">{formatDA(item.price)}</p>
      </div>

      {/* Qty stepper */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={loading}
          onClick={() => item.quantity === 1 ? onRemove() : onChangeQty(item.quantity - 1)}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          {item.quantity === 1
            ? <Trash2 className="w-3.5 h-3.5 text-red-400" />
            : <Minus className="w-3.5 h-3.5 text-gray-600" />}
        </button>
        <span className="w-7 text-center text-sm font-bold tabular-nums">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" /> : item.quantity}
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={() => onChangeQty(item.quantity + 1)}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-amber-400 hover:bg-amber-50 transition-colors disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5 text-gray-600" />
        </button>
      </div>

      {/* Line total */}
      <div className="text-right shrink-0 w-20">
        <p className="text-sm font-bold text-gray-900 tabular-nums">{formatDA(item.price * item.quantity)}</p>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: cart, isLoading, refetch } = useGetCart({
    query: { enabled: !!user },
  });

  const [loadingItemId, setLoadingItemId] = useState<number | null>(null);

  const token = localStorage.getItem("tc_token");

  const updateItem = async (itemId: number, quantity: number) => {
    setLoadingItemId(itemId);
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error();
      refetch();
    } catch {
      toast({ title: "Erreur", description: "Impossible de modifier la quantité.", variant: "destructive" });
    } finally {
      setLoadingItemId(null);
    }
  };

  const removeItem = async (itemId: number) => {
    setLoadingItemId(itemId);
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      refetch();
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer l'article.", variant: "destructive" });
    } finally {
      setLoadingItemId(null);
    }
  };

  const clearCart = async () => {
    try {
      const res = await fetch(`/api/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      refetch();
      toast({ title: "Panier vidé" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de vider le panier.", variant: "destructive" });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-28 text-center">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <ShoppingCart className="w-10 h-10 text-amber-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connectez-vous pour voir votre panier</h2>
          <Link href="/connexion">
            <Button className="mt-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold">
              Se connecter
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const items = (cart as any)?.items ?? [];
  const restaurantName = (cart as any)?.restaurantName;
  const subtotal = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const deliveryFee = (cart as any)?.deliveryFee ?? 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/restaurants">
              <button className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Mon panier</h1>
              {restaurantName && (
                <p className="text-sm text-gray-400">{restaurantName}</p>
              )}
            </div>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Vider
            </button>
          )}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
              <ShoppingCart className="w-10 h-10 text-amber-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Votre panier est vide</h2>
            <p className="text-sm text-gray-400 mb-6">Ajoutez des plats depuis nos restaurants partenaires.</p>
            <Link href="/restaurants">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-2">
                <UtensilsCrossed className="w-4 h-4" />
                Explorer les restaurants
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Items list */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm">
                  {items.length} article{items.length !== 1 ? "s" : ""}
                </h2>
                <Tag className="w-4 h-4 text-amber-400" />
              </div>

              <div className="divide-y divide-gray-50 px-6">
                {items.map((item: any) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    loading={loadingItemId === item.id}
                    onChangeQty={(qty) => updateItem(item.id, qty)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="lg:w-72 shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24 space-y-4">
                <h3 className="font-bold text-gray-900">Récapitulatif</h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Sous-total</span>
                    <span className="font-medium text-gray-900">{formatDA(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Livraison</span>
                    <span className={`font-medium ${deliveryFee === 0 ? "text-green-600" : "text-gray-900"}`}>
                      {deliveryFee === 0 ? "Gratuite" : formatDA(deliveryFee)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-lg font-extrabold text-amber-600">{formatDA(total)}</span>
                </div>

                <Link href="/checkout">
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 gap-2 text-base mt-1">
                    Confirmer la commande
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <p className="text-[11px] text-gray-400 text-center">
                  Commande sécurisée · Annulation possible avant préparation
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
