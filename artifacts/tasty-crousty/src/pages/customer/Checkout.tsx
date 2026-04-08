import React, { useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useGetCart, useCreateOrder } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, MapPin, CreditCard, Truck, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: cart, isLoading } = useGetCart();
  const createOrder = useCreateOrder();

  const [form, setForm] = useState({
    deliveryAddress: "",
    deliveryLandmark: "",
    deliveryFloor: "",
    deliveryInstructions: "",
    deliveryPhone: user?.phone ?? "",
    paymentMethod: "cash_on_delivery" as "cash_on_delivery" | "online",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || cart.items.length === 0) {
      toast({ title: "Panier vide", variant: "destructive" });
      return;
    }
    if (!form.deliveryAddress.trim()) {
      toast({ title: "Adresse de livraison requise", variant: "destructive" });
      return;
    }

    createOrder.mutate(
      {
        data: {
          restaurantId: cart.restaurantId!,
          deliveryAddress: form.deliveryAddress,
          deliveryLandmark: form.deliveryLandmark || undefined,
          deliveryFloor: form.deliveryFloor || undefined,
          deliveryInstructions: form.deliveryInstructions || undefined,
          deliveryPhone: form.deliveryPhone || undefined,
          paymentMethod: form.paymentMethod,
          items: cart.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price * item.quantity,
            notes: item.notes ?? undefined,
          })),
        }
      },
      {
        onSuccess: (order) => {
          toast({ title: "Commande passée !", description: `Commande ${order.orderNumber} créée` });
          setLocation(`/orders/${order.id}`);
        },
        onError: () => {
          toast({ title: "Erreur", description: "Impossible de passer la commande", variant: "destructive" });
        }
      }
    );
  };

  if (!user) {
    setLocation("/auth/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container max-w-4xl py-8 text-center">Chargement...</div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container max-w-4xl py-20 text-center">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-2xl font-bold mb-2">Votre panier est vide</h2>
          <Link href="/restaurants"><Button className="mt-4">Explorer les restaurants</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />
      <div className="container max-w-4xl py-6">
        <Link href="/restaurants">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Continuer les achats
          </Button>
        </Link>
        <h1 className="text-2xl font-bold mb-6">Finaliser la commande</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery info */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="w-4 h-4 text-primary" /> Adresse de livraison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="address">Adresse *</Label>
                    <Input
                      id="address"
                      placeholder="123 Rue de la Paix, Alger"
                      value={form.deliveryAddress}
                      onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="landmark">Repère</Label>
                      <Input
                        id="landmark"
                        placeholder="En face de..."
                        value={form.deliveryLandmark}
                        onChange={e => setForm(f => ({ ...f, deliveryLandmark: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="floor">Étage / Appartement</Label>
                      <Input
                        id="floor"
                        placeholder="3ème étage, appt 12"
                        value={form.deliveryFloor}
                        onChange={e => setForm(f => ({ ...f, deliveryFloor: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="instructions">Instructions de livraison</Label>
                    <Input
                      id="instructions"
                      placeholder="Code d'entrée, instructions spéciales..."
                      value={form.deliveryInstructions}
                      onChange={e => setForm(f => ({ ...f, deliveryInstructions: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone pour la livraison</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+213 ..."
                      value={form.deliveryPhone}
                      onChange={e => setForm(f => ({ ...f, deliveryPhone: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="w-4 h-4 text-primary" /> Mode de paiement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(["cash_on_delivery", "online"] as const).map(method => (
                    <label
                      key={method}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${form.paymentMethod === method ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method}
                        checked={form.paymentMethod === method}
                        onChange={() => setForm(f => ({ ...f, paymentMethod: method }))}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${form.paymentMethod === method ? "border-primary" : "border-muted-foreground"}`}>
                        {form.paymentMethod === method && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {method === "cash_on_delivery" ? "Paiement à la livraison" : "Paiement en ligne"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {method === "cash_on_delivery" ? "Espèces ou carte à la livraison" : "Carte bancaire sécurisée"}
                        </div>
                      </div>
                    </label>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right: Order summary */}
            <div>
              <Card className="sticky top-4">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingCart className="w-4 h-4 text-primary" /> Votre commande
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cart.restaurantName && (
                    <p className="text-sm font-medium text-muted-foreground border-b pb-2">{cart.restaurantName}</p>
                  )}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cart.items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="flex-1 truncate">{item.quantity}× {item.productName}</span>
                        <span className="font-medium ml-2">{(item.price * item.quantity).toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sous-total</span>
                      <span>{cart.subtotal.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Livraison</span>
                      <span>{cart.deliveryFee.toFixed(2)} €</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span className="text-primary">{cart.total.toFixed(2)} €</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2">
                    <div className="flex items-start gap-2">
                      <Truck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700">
                        Votre commande sera préparée uniquement après qu'un livreur vous confirme et confirme la commande.
                      </p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 text-base mt-2" disabled={createOrder.isPending}>
                    {createOrder.isPending ? "Traitement..." : "Confirmer la commande"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
