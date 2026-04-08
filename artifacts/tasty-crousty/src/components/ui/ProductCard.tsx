import React from "react";
import { Product } from "@workspace/api-client-react";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <Card className="overflow-hidden flex flex-row sm:flex-col h-full">
      <div className="w-32 sm:w-full sm:aspect-video shrink-0 bg-muted relative">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50">
            <span className="text-xs text-muted-foreground">Image</span>
          </div>
        )}
      </div>
      <CardContent className="p-4 flex flex-col justify-between flex-1">
        <div>
          <h4 className="font-bold text-base mb-1">{product.name}</h4>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="font-bold text-primary">{product.price.toFixed(2)} DA</span>
          <Button 
            size="sm" 
            variant="secondary" 
            className="h-8 rounded-full px-3"
            onClick={() => onAdd(product)}
            disabled={!product.isAvailable}
          >
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
