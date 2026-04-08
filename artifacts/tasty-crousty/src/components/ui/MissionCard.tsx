import React from "react";
import { MissionRequest } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter } from "./card";
import { Button } from "./button";
import { MapPin, Navigation, Clock, Euro } from "lucide-react";

interface MissionCardProps {
  mission: MissionRequest;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
}

export function MissionCard({ mission, onAccept, onReject }: MissionCardProps) {
  return (
    <Card className="border-2 border-primary/20 shadow-md">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold animate-pulse">
            Nouvelle Mission
          </div>
          <div className="text-lg font-bold text-primary flex items-center gap-1">
            <Euro className="w-5 h-5" />
            {mission.estimatedEarnings?.toFixed(2) || "N/A"}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="mt-1 bg-amber-100 p-1.5 rounded-full shrink-0">
              <MapPin className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Collecte</div>
              <div className="font-bold">{mission.restaurantName}</div>
              <div className="text-sm text-muted-foreground line-clamp-1">{mission.restaurantAddress}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-1 bg-green-100 p-1.5 rounded-full shrink-0">
              <Navigation className="w-4 h-4 text-green-700" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Livraison</div>
              <div className="font-bold">Client</div>
              <div className="text-sm text-muted-foreground line-clamp-1">{mission.deliveryAddress}</div>
            </div>
          </div>
        </div>

        {mission.estimatedDistance && (
          <div className="mt-4 flex items-center gap-2 text-sm bg-muted p-2 rounded-md justify-center font-medium">
            <Clock className="w-4 h-4" />
            Est. ~{mission.estimatedDistance.toFixed(1)} km
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 gap-3">
        <Button variant="outline" className="flex-1" onClick={() => onReject(mission.orderId)}>
          Refuser
        </Button>
        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => onAccept(mission.orderId)}>
          Accepter
        </Button>
      </CardFooter>
    </Card>
  );
}
