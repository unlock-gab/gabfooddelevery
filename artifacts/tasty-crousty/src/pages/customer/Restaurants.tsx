import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useListRestaurants } from "@workspace/api-client-react";
import { Search, Star, Clock, Utensils, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_FILTERS = [
  { key: "all", label: "Tous", emoji: "" },
  { key: "Burgers", label: "Burgers", emoji: "🍔" },
  { key: "Pizza", label: "Pizza", emoji: "🍕" },
  { key: "Sandwichs", label: "Sandwichs", emoji: "🥙" },
  { key: "Tajine", label: "Tajine", emoji: "🍲" },
  { key: "Couscous", label: "Couscous", emoji: "🥘" },
  { key: "Grillades", label: "Grillades", emoji: "🥩" },
  { key: "Sushi", label: "Sushi", emoji: "🍣" },
  { key: "Desserts", label: "Desserts", emoji: "🍰" },
];

function RestaurantCard({ r }: { r: any }) {
  return (
    <Link href={`/restaurants/${r.id}`}>
      <Card className="group overflow-hidden cursor-pointer h-full border shadow-sm hover:shadow-xl transition-all duration-300 card-hover">
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/10 to-amber-50">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

          {/* Open / closed badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${r.isOpen ? "bg-green-500 text-white" : "bg-gray-700 text-white"}`}>
              {r.isOpen ? "Ouvert" : "Fermé"}
            </span>
          </div>

          {/* Rating overlay */}
          {r.avgRating > 0 && (
            <div className="absolute bottom-3 left-3">
              <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-amber-400 font-semibold">
                <Star className="w-3 h-3 fill-current" />
                {Number(r.avgRating).toFixed(1)}
              </span>
            </div>
          )}

          {/* Logo */}
          {r.logoUrl && (
            <div className="absolute bottom-3 right-3 w-11 h-11 rounded-xl border-2 border-white bg-white overflow-hidden shadow-md">
              <img src={r.logoUrl} alt="logo" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-bold text-base leading-tight mb-1.5 group-hover:text-primary transition-colors">{r.name}</h3>
          {r.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{r.description}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {r.estimatedPrepTime} min
            </span>
            {r.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 font-medium">{r.category}</span>
            )}
            {r.minimumOrder > 0 && (
              <span className="text-xs text-muted-foreground">Min. {Number(r.minimumOrder).toFixed(0)} DA</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden border shadow-sm bg-white">
      <Skeleton className="w-full h-48" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
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

  const filtered = ((restaurants as any[]) ?? []).filter((r: any) => {
    const matchesSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || r.category === activeCategory;
    const matchesOpen = !showOpenOnly || r.isOpen;
    return matchesSearch && matchesCategory && matchesOpen;
  });

  const openCount = ((restaurants as any[]) ?? []).filter((r: any) => r.isOpen).length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/60">
      <Navbar />

      {/* Sticky page header */}
      <div className="bg-white border-b sticky top-16 z-30 shadow-sm">
        <div className="container py-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold">Restaurants</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Chargement..."
                  : `${filtered.length} restaurant${filtered.length !== 1 ? "s" : ""} — ${openCount} ouvert${openCount !== 1 ? "s" : ""}`}
              </p>
            </div>
            <Button
              variant={showOpenOnly ? "default" : "outline"}
              size="sm"
              className="text-xs h-9 gap-1.5 shrink-0"
              onClick={() => setShowOpenOnly(!showOpenOnly)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {showOpenOnly ? "Voir tous" : "Ouverts maintenant"}
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un restaurant, une cuisine..."
              className="pl-9 h-10 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 focus:bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`chip ${activeCategory === cat.key ? "chip-active" : "chip-inactive"}`}
              >
                {cat.emoji && <span>{cat.emoji}</span>}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 container py-7">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-5">
              <Utensils className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h2 className="text-xl font-bold mb-2">Aucun restaurant trouvé</h2>
            <p className="text-muted-foreground mb-5 text-sm">Essayez un autre terme ou retirez les filtres.</p>
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
