import React, { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  useGetRestaurant, useListProducts, useListMenuCategories,
  useAddToCart, useGetCart, useUpdateCartItem, useRemoveCartItem,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Clock, Star, Plus, Minus, ChevronLeft, ShoppingCart, Trash2, Utensils, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Small cart quantity control ────────────────────────────────────────────
function QtyControl({ value, onInc, onDec, loading }: {
  value: number;
  onInc: () => void;
  onDec: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onDec}
        disabled={loading}
        className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
      >
        {value === 1 ? <Trash2 className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3" />}
      </button>
      <span className="w-5 text-center text-sm font-semibold">{value}</span>
      <button
        onClick={onInc}
        disabled={loading}
        className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Product Card ────────────────────────────────────────────────────────────
function ProductCard({ product, cartQty, onAdd, onInc, onDec, isUpdating }: {
  product: any;
  cartQty: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  isUpdating: boolean;
}) {
  return (
    <div className={`flex gap-4 p-4 rounded-2xl border bg-white hover:shadow-md transition-all ${!product.isAvailable ? "opacity-60" : ""}`}>
      {/* Image */}
      <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-muted">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Utensils className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">Indisponible</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-base leading-tight mb-1">{product.name}</h3>
          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-primary text-lg tabular-nums">{Number(product.price).toFixed(2)} DA</span>
          {product.isAvailable && (
            cartQty > 0 ? (
              <QtyControl value={cartQty} onInc={onInc} onDec={onDec} loading={isUpdating} />
            ) : (
              <button
                onClick={onAdd}
                disabled={isUpdating}
                className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cart Panel ──────────────────────────────────────────────────────────────
function CartPanel({ cart, restaurant, onCheckout }: {
  cart: any;
  restaurant: any;
  onCheckout: () => void;
}) {
  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-6 text-center shadow-sm">
        <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Votre panier est vide</p>
        <p className="text-xs text-muted-foreground mt-1">Ajoutez des plats pour commencer</p>
      </div>
    );
  }

  const subtotal = cart.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const deliveryFee = restaurant?.deliveryFee ? Number(restaurant.deliveryFee) : 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Votre panier</h3>
          <Badge variant="secondary" className="ml-auto text-xs">{cart.items.length} article{cart.items.length !== 1 ? "s" : ""}</Badge>
        </div>
      </div>
      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {cart.items.map((item: any) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
              {item.quantity}
            </span>
            <span className="flex-1 truncate text-sm">{item.productName}</span>
            <span className="font-semibold text-sm shrink-0 tabular-nums">{(item.price * item.quantity).toFixed(2)} DA</span>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4 space-y-3">
        <Separator />
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Sous-total</span>
            <span className="tabular-nums">{subtotal.toFixed(2)} DA</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Livraison</span>
            <span className="tabular-nums">{deliveryFee > 0 ? `${deliveryFee.toFixed(2)} DA` : "Gratuite"}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-1 border-t">
            <span>Total</span>
            <span className="text-primary tabular-nums">{total.toFixed(2)} DA</span>
          </div>
        </div>
        <Button className="w-full gap-2 h-11 text-sm font-semibold rounded-xl" onClick={onCheckout}>
          <ShoppingCart className="w-4 h-4" />
          Commander — {total.toFixed(2)} DA
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function RestaurantDetail() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = Number(params.restaurantId);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const { data: restaurant, isLoading: loadingRestaurant } = useGetRestaurant(restaurantId);
  const { data: categories } = useListMenuCategories(restaurantId);
  const { data: products, isLoading: loadingProducts } = useListProducts(restaurantId, {
    categoryId: activeCategory !== "all" ? Number(activeCategory) : undefined,
  });
  const { data: cart, refetch: refetchCart } = useGetCart({
    query: { enabled: !!user, staleTime: 5000 },
  });

  const addToCart = useAddToCart();
  const updateCart = useUpdateCartItem();
  const removeFromCart = useRemoveCartItem();

  const getCartItem = (productId: number) =>
    cart?.items?.find((i: any) => i.productId === productId);

  const handleAdd = (product: any) => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour commander", variant: "destructive" });
      setLocation("/auth/login");
      return;
    }
    setUpdatingId(product.id);
    addToCart.mutate(
      { data: { productId: product.id, quantity: 1 } },
      {
        onSuccess: () => { refetchCart(); },
        onError: (e: any) => {
          const msg = e?.response?.data?.error ?? "Impossible d'ajouter au panier";
          toast({ title: "Erreur", description: msg, variant: "destructive" });
        },
        onSettled: () => setUpdatingId(null),
      }
    );
  };

  const handleInc = (product: any) => {
    const item = getCartItem(product.id);
    if (!item) return;
    setUpdatingId(product.id);
    updateCart.mutate(
      { itemId: item.id, data: { quantity: item.quantity + 1 } },
      { onSuccess: () => refetchCart(), onSettled: () => setUpdatingId(null) }
    );
  };

  const handleDec = (product: any) => {
    const item = getCartItem(product.id);
    if (!item) return;
    setUpdatingId(product.id);
    if (item.quantity === 1) {
      removeFromCart.mutate(
        { itemId: item.id },
        { onSuccess: () => refetchCart(), onSettled: () => setUpdatingId(null) }
      );
    } else {
      updateCart.mutate(
        { itemId: item.id, data: { quantity: item.quantity - 1 } },
        { onSuccess: () => refetchCart(), onSettled: () => setUpdatingId(null) }
      );
    }
  };

  const cartTotal = cart?.items?.reduce((s: number, i: any) => s + i.price * i.quantity, 0) ?? 0;
  const cartCount = cart?.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0;

  if (loadingRestaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container py-8 max-w-6xl space-y-4">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container py-20 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Restaurant introuvable</h2>
          <Link href="/restaurants"><Button variant="outline">Retour aux restaurants</Button></Link>
        </div>
      </div>
    );
  }

  // Group products by category for section display
  const categoriesMap: Record<string, any> = {};
  if (categories) {
    categories.forEach((c: any) => { categoriesMap[c.id] = c.name; });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero banner */}
      <div className="relative h-48 md:h-64 overflow-hidden bg-muted">
        {restaurant.coverUrl ? (
          <img src={restaurant.coverUrl} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-amber-100 flex items-center justify-center">
            <Utensils className="w-16 h-16 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <Link href="/restaurants">
          <button className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition-colors shadow">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end gap-4">
          {restaurant.logoUrl && (
            <div className="w-16 h-16 shrink-0 rounded-2xl border-2 border-white overflow-hidden bg-white shadow-lg">
              <img src={restaurant.logoUrl} alt="logo" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="text-white">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">{restaurant.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-white/80">
              {restaurant.category && <span>{restaurant.category}</span>}
              <Badge className={`text-xs border-0 ${restaurant.isOpen ? "bg-green-500" : "bg-gray-600"}`}>
                {restaurant.isOpen ? "Ouvert" : "Fermé"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Info strip */}
      <div className="bg-white border-b shadow-sm">
        <div className="container max-w-6xl py-4">
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground items-center">
            {Number(restaurant.avgRating) > 0 && (
              <span className="flex items-center gap-1.5 font-semibold text-amber-600">
                <Star className="w-4 h-4 fill-current" />
                {Number(restaurant.avgRating).toFixed(1)} / 5
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {restaurant.estimatedPrepTime} min de préparation
            </span>
            {restaurant.minimumOrder > 0 && (
              <span>Commande min. {Number(restaurant.minimumOrder).toFixed(0)} DA</span>
            )}
            {restaurant.description && (
              <span className="w-full text-sm text-foreground/70 flex items-start gap-1.5">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                {restaurant.description}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="container max-w-6xl py-6">
        <div className="flex gap-8">
          {/* ─── LEFT: Menu ─── */}
          <div className="flex-1 min-w-0">
            {/* Sticky category bar */}
            {categories && categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    activeCategory === "all"
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-foreground border-gray-200 hover:border-primary/40"
                  }`}
                >
                  Tous
                </button>
                {categories.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(String(cat.id))}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                      activeCategory === String(cat.id)
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-foreground border-gray-200 hover:border-primary/40"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Products */}
            {loadingProducts ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl border bg-white">
                    <Skeleton className="w-24 h-24 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className="space-y-3">
                {products.map((product: any) => {
                  const cartItem = getCartItem(product.id);
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      cartQty={cartItem?.quantity ?? 0}
                      onAdd={() => handleAdd(product)}
                      onInc={() => handleInc(product)}
                      onDec={() => handleDec(product)}
                      isUpdating={updatingId === product.id}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <Utensils className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucun article disponible</p>
              </div>
            )}
          </div>

          {/* ─── RIGHT: Cart panel (desktop) ─── */}
          <div className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-28">
              <CartPanel
                cart={cart}
                restaurant={restaurant}
                onCheckout={() => setLocation("/checkout")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── MOBILE: Sticky bottom cart bar ─── */}
      {cartCount > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-background border-t shadow-lg">
          <Button
            className="w-full h-13 text-sm font-semibold gap-3 rounded-xl"
            onClick={() => setLocation("/checkout")}
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {cartCount}
              </span>
              Voir le panier
            </div>
            <span className="ml-auto font-bold tabular-nums">{cartTotal.toFixed(2)} DA</span>
          </Button>
        </div>
      )}
    </div>
  );
}
