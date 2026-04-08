import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetRestaurant, useListProducts, useListMenuCategories, useAddToCart } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Clock, Star, Plus, ChevronLeft, ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RestaurantDetail() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = Number(params.restaurantId);
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { data: restaurant, isLoading: loadingRestaurant } = useGetRestaurant(restaurantId);
  const { data: categories } = useListMenuCategories(restaurantId);
  const { data: products, isLoading: loadingProducts } = useListProducts(restaurantId, {
    categoryId: activeCategory !== "all" ? Number(activeCategory) : undefined,
  });
  const addToCart = useAddToCart();

  const handleAddToCart = (product: any) => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour commander", variant: "destructive" });
      setLocation("/auth/login");
      return;
    }
    addToCart.mutate(
      { data: { productId: product.id, quantity: 1 } },
      {
        onSuccess: () => {
          toast({ title: "Ajouté au panier", description: product.name });
        },
        onError: () => {
          toast({ title: "Erreur", description: "Impossible d'ajouter au panier", variant: "destructive" });
        }
      }
    );
  };

  if (loadingRestaurant) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container py-8 space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
    </div>
  );

  if (!restaurant) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Restaurant introuvable</h2>
        <Link href="/restaurants"><Button variant="outline" className="mt-4">Retour</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container py-6 max-w-5xl">
        <Link href="/restaurants">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
        </Link>

        {/* Hero */}
        <div className="relative h-52 md:h-72 rounded-2xl overflow-hidden bg-muted mb-6">
          {restaurant.coverUrl ? (
            <img src={restaurant.coverUrl} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary/30">{restaurant.name}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={restaurant.isOpen ? "default" : "secondary"} className="text-xs">
                {restaurant.isOpen ? "Ouvert" : "Fermé"}
              </Badge>
              {restaurant.category && <Badge variant="outline" className="text-white border-white/50 text-xs">{restaurant.category}</Badge>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{restaurant.name}</h1>
          </div>
          {restaurant.logoUrl && (
            <div className="absolute bottom-4 right-4 w-14 h-14 rounded-full border-2 border-white overflow-hidden bg-white shadow-lg">
              <img src={restaurant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Info strip */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b">
          {restaurant.avgRating && (
            <div className="flex items-center gap-1 text-amber-600 font-medium">
              <Star className="w-4 h-4 fill-current" />
              <span>{Number(restaurant.avgRating).toFixed(1)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{restaurant.estimatedPrepTime} min de préparation</span>
          </div>
          {restaurant.description && <p className="w-full text-foreground/70">{restaurant.description}</p>}
        </div>

        {/* Category tabs */}
        {categories && categories.length > 0 && (
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="all" className="text-sm">Tous</TabsTrigger>
              {categories.map((cat: any) => (
                <TabsTrigger key={cat.id} value={String(cat.id)} className="text-sm">{cat.name}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Products */}
        {loadingProducts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((product: any) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition-all group">
                <CardContent className="p-4 flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <h3 className="font-semibold text-base leading-tight">{product.name}</h3>
                      {!product.isAvailable && <Badge variant="outline" className="text-xs shrink-0">Indisponible</Badge>}
                    </div>
                    {product.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{product.description}</p>}
                    <div className="flex items-center justify-between mt-auto">
                      <span className="font-bold text-lg text-primary">{Number(product.price).toFixed(2)} €</span>
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(product)}
                        disabled={!product.isAvailable || addToCart.isPending}
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {product.imageUrl && (
                    <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-muted">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Aucun produit disponible pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
