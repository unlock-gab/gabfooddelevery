import React from "react";
import { Restaurant } from "@workspace/api-client-react";
import { Card, CardContent } from "./card";
import { Star, Clock } from "lucide-react";
import { Link } from "wouter";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link href={`/restaurants/${restaurant.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-all duration-300 group cursor-pointer border-transparent hover:border-primary/20">
        <div className="aspect-video w-full bg-muted relative overflow-hidden">
          {restaurant.coverUrl ? (
            <img 
              src={restaurant.coverUrl} 
              alt={restaurant.name} 
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary/40">
              <span className="font-medium">No Image</span>
            </div>
          )}
          {!restaurant.isOpen && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-sm">
              <span className="font-bold text-lg text-foreground px-4 py-2 bg-background rounded-full shadow-sm">
                Fermé actuellement
              </span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg truncate pr-2">{restaurant.name}</h3>
            {restaurant.avgRating && (
              <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded text-xs font-semibold shrink-0">
                <Star className="w-3 h-3 fill-current" />
                <span>{restaurant.avgRating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {restaurant.category && <span>{restaurant.category}</span>}
            {restaurant.estimatedPrepTime && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{restaurant.estimatedPrepTime} min</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
