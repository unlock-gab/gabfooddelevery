import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useListRestaurants } from "@workspace/api-client-react";
import { Search, Star, Clock, Filter, Utensils, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_FILTERS = [
  { key: "all", label: "Tous" },
  { key: "Burgers", label: "🍔 Burgers" },
  { key: "Pizza", label: "🍕 Pizza" },
  { key: "Sandwichs", label: "🥙 Sandwichs" },
  { key: "Tajine", label: "🍲 Tajine" },
  { key: "Couscous", label: "🥘 Couscous" },
  { key: "Grillades", label: "🥩 Grillades" },
  { key: "Sushi", label: "🍣 Sushi" },
  { key: "Desserts", label: "🍰 Desserts" },
];

function RestaurantCard({ r }: { r: any }) {
  return (
    <Link href={`/restaurants/${r.id}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer h-full border-0 shadow-md">
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-primary/10 to-amber-50">
          {r.coverUrl ? (
            <img
              src={r.coverUrl}
              alt={r.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Utensils className="w-14 h-14 text-primary/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 flex gap-1.5">
            <Badge
              className={`text-xs font-semibold border-0 ${r.isOpen ? "bg-green-500 text-white" : "bg-gray-600 text-white"}`}
            >
              {r.isOpen ? "Ouvert" : "Fermé"}
            </Badge>
            {r.category && (
              <Badge variant="secondary" className="text-xs bg-white/90 text-foreground">
                {r.category}
              </Badge>
            )}
          </div>
          {r.logoUrl && (
            <div className="absolute bottom-3 right-3 w-12 h-12 rounded-full border-2 border-white bg-white overflow-hidden shadow-md">
              <img src={r.logoUrl} alt="logo" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-base leading-tight mb-2 group-hover:text-primary transition-colors">{r.name}</h3>
          {r.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{r.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs">
            {r.avgRating > 0 && (
              <span className="flex items-center gap-1 font-semibold text-amber-600">
                <Star className="w-3.5 h-3.5 fill-current" />
                {Number(r.avgRating).toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {r.estimatedPrepTime} min
            </span>
            {r.minimumOrder > 0 && (
              <span className="text-muted-foreground">Min. {Number(r.minimumOrder).toFixed(0)} €</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-2">
      <Skeleton className="w-full h-44 rounded-t-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export default function Restaurants() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  const { data: restaurants, isLoading } = useListRestaurants(undefined, {
    query: { refetchInterval: 60000 },
  });

  const filtered = (restaurants ?? []).filter((r: any) => {
    const matchesSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || r.category === activeCategory;
    const matchesOpen = !showOpenOnly || r.isOpen;
    return matchesSearch && matchesCategory && matchesOpen;
  });

  const openCount = (restaurants ?? []).filter((r: any) => r.isOpen).length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Page header */}
      <div className="bg-white border-b sticky top-16 z-30 shadow-sm">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold">Restaurants</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Chargement..." : `${filtered.length} restaurant${filtered.length !== 1 ? "s" : ""} • ${openCount} ouvert${openCount !== 1 ? "s" : ""} maintenant`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={showOpenOnly ? "default" : "outline"}
                size="sm"
                className="text-xs h-8 gap-1"
                onClick={() => setShowOpenOnly(!showOpenOnly)}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {showOpenOnly ? "Tous" : "Ouverts seulement"}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un restaurant, une cuisine..."
              className="pl-9 h-10 bg-muted/40 border-0 focus:bg-white focus:border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeCategory === cat.key
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-foreground border-gray-200 hover:border-primary/40"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <main className="flex-1 container py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Utensils className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-bold mb-2">Aucun restaurant trouvé</h2>
            <p className="text-muted-foreground mb-4">Essayez un autre terme de recherche ou retirez les filtres.</p>
            <Button variant="outline" onClick={() => { setSearch(""); setActiveCategory("all"); setShowOpenOnly(false); }}>
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((r: any) => (
              <RestaurantCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
