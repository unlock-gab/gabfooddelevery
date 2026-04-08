import React from "react";
import { Order, OrderStatus } from "@workspace/api-client-react";
import { StatusBadge } from "./StatusBadge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  showCustomer?: boolean;
}

export function OrderCard({ order, onClick, showCustomer }: OrderCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:border-primary transition-colors duration-200" 
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-bold">Commande #{order.orderNumber}</CardTitle>
          <div className="text-xs text-muted-foreground mt-1">
            {format(new Date(order.createdAt), "dd MMM yyyy à HH:mm", { locale: fr })}
          </div>
        </div>
        <StatusBadge status={order.status} />
      </CardHeader>
      <CardContent className="p-4 py-2">
        <div className="grid gap-1 text-sm">
          <div className="font-medium">{order.restaurantName}</div>
          {showCustomer && <div className="text-muted-foreground">{order.deliveryAddress}</div>}
          <div className="font-semibold text-primary mt-2">{order.total.toFixed(2)} DA</div>
        </div>
      </CardContent>
    </Card>
  );
}
