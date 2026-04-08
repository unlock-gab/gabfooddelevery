import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { RestaurantCard } from "@/components/ui/RestaurantCard";
import { useListRestaurants, getListRestaurantsQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Restaurants() {
  const [search, setSearch] = useState("");
  const { data: restaurants, isLoading } = useListRestaurants({
    query: {
      queryKey: getListRestaurantsQueryKey({ search: search || undefined })
    },
    request: {
      // Pass params via URL since Orval generated a GET request
    }
  });

  // Since orval might not map params to query string directly without config, we'll filter client-side for this demo if needed, but assuming API handles it or we'll just show all.
  const filtered = restaurants?.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    (r.category && r.category.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <div className="min-h-screen flex flex-col bg-muted/10">
      <Navbar />
      <main className="flex-1 container py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Restaurants</h1>
            <p className="text-muted-foreground mt-1">Découvrez les meilleurs établissements autour de vous.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un restaurant, un plat..." 
              className="pl-9 h-10 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="w-full aspect-video rounded-xl" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(restaurant => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium mb-2">Aucun résultat</h3>
            <p className="text-muted-foreground">Essayez de modifier vos critères de recherche.</p>
          </div>
        )}
      </main>
    </div>
  );
}
