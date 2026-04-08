import React, { useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useGetCart, useCreateOrder } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, MapPin, CreditCard, Truck, ChevronLeft, Banknote, Wifi, Lock, Shield } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

function SectionTitle({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-5 pb-4 border-b">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h2 className="font-bold text-base">{children}</h2>
    </div>
  );
}

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
    deliveryPhone: (user as any)?.phone ?? "",
    paymentMethod: "cash_on_delivery" as "cash_on_delivery" | "online",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || (cart as any).items.length === 0) {
      toast({ title: "Panier vide", variant: "destructive" });
      return;
    }
    if (!form.deliveryAddress.trim()) {
      toast({ title: "Adresse de livraison requise", description: "Veuillez saisir votre adresse.", variant: "destructive" });
      return;
    }

    createOrder.mutate(
      {
        data: {
          restaurantId: (cart as any).restaurantId!,
          deliveryAddress: form.deliveryAddress,
          deliveryLandmark: form.deliveryLandmark || undefined,
          deliveryFloor: form.deliveryFloor || undefined,
          deliveryInstructions: form.deliveryInstructions || undefined,
          deliveryPhone: form.deliveryPhone || undefined,
          paymentMethod: form.paymentMethod,
          items: (cart as any).items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price * item.quantity,
            notes: item.notes ?? undefined,
          })),
        },
      },
      {
        onSuccess: (order: any) => {
          toast({ title: "Commande passée !", description: `Commande ${order.orderNumber} créée avec succès.` });
          setLocation(`/orders/${order.id}`);
        },
        onError: () => {
          toast({ title: "Erreur", description: "Impossible de passer la commande. Réessayez.", variant: "destructive" });
        },
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
        <div className="container max-w-4xl py-10 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!cart || (cart as any).items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <Navbar />
        <div className="container max-w-md py-28 text-center">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-5">
            <ShoppingCart className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Votre panier est vide</h2>
          <p className="text-muted-foreground mb-6 text-sm">Ajoutez des plats depuis un restaurant pour passer commande.</p>
          <Link href="/restaurants"><Button className="font-semibold gap-1.5">Explorer les restaurants</Button></Link>
        </div>
      </div>
    );
  }

  const cartData = cart as any;
  const subtotal = cartData.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const deliveryFee = cartData.deliveryFee ?? 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/60">
      <Navbar />
      <div className="container max-w-4xl py-7">
        <Link href="/restaurants">
          <Button variant="ghost" size="sm" className="mb-5 -ml-2 gap-1 text-sm">
            <ChevronLeft className="w-4 h-4" /> Continuer mes achats
          </Button>
        </Link>
        <h1 className="text-2xl font-extrabold mb-7">Finaliser la commande</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-5">
              {/* Delivery */}
              <div className="bg-white rounded-2xl border p-6 shadow-sm">
                <SectionTitle icon={MapPin}>Adresse de livraison</SectionTitle>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Adresse <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="123 Rue Didouche Mourad, Alger"
                      value={form.deliveryAddress}
                      onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                      required
                      className="mt-1.5 h-11"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-semibold">Repère</Label>
                      <Input
                        placeholder="En face de..."
                        value={form.deliveryLandmark}
                        onChange={e => setForm(f => ({ ...f, deliveryLandmark: e.target.value }))}
                        className="mt-1.5 h-11"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Étage / Appartement</Label>
                      <Input
                        placeholder="2ème étage, appt 5"
                        value={form.deliveryFloor}
                        onChange={e => setForm(f => ({ ...f, deliveryFloor: e.target.value }))}
                        className="mt-1.5 h-11"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Instructions spéciales</Label>
                    <Input
                      placeholder="Code d'entrée, instructions pour le livreur..."
                      value={form.deliveryInstructions}
                      onChange={e => setForm(f => ({ ...f, deliveryInstructions: e.target.value }))}
                      className="mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Téléphone de contact</Label>
                    <Input
                      type="tel"
                      placeholder="+213 5XX XXX XXX"
                      value={form.deliveryPhone}
                      onChange={e => setForm(f => ({ ...f, deliveryPhone: e.target.value }))}
                      className="mt-1.5 h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-white rounded-2xl border p-6 shadow-sm">
                <SectionTitle icon={CreditCard}>Mode de paiement</SectionTitle>
                <div className="space-y-3">
                  {([
                    {
                      value: "cash_on_delivery",
                      label: "Paiement à la livraison",
                      desc: "Espèces ou carte à la réception",
                      icon: Banknote,
                    },
                    {
                      value: "online",
                      label: "Paiement en ligne",
                      desc: "Carte bancaire sécurisée (CIB, Dahabia...)",
                      icon: Wifi,
                    },
                  ] as const).map((method) => (
                    <label
                      key={method.value}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        form.paymentMethod === method.value
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/30 hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="radio" name="payment" value={method.value}
                        checked={form.paymentMethod === method.value}
                        onChange={() => setForm(f => ({ ...f, paymentMethod: method.value }))}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        form.paymentMethod === method.value ? "border-primary" : "border-muted-foreground/40"
                      }`}>
                        {form.paymentMethod === method.value && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        form.paymentMethod === method.value ? "bg-primary/10" : "bg-muted"
                      }`}>
                        <method.icon className={`w-4.5 h-4.5 ${form.paymentMethod === method.value ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{method.label}</div>
                        <div className="text-xs text-muted-foreground">{method.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Summary */}
            <div>
              <div className="bg-white rounded-2xl border shadow-sm sticky top-24 overflow-hidden">
                <div className="px-5 py-4 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-sm">Votre commande</h3>
                    <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {cartData.items.length} article{cartData.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {cartData.restaurantName && (
                    <p className="text-sm font-semibold text-muted-foreground">{cartData.restaurantName}</p>
                  )}

                  <div className="space-y-2 max-h-44 overflow-y-auto scrollbar-none">
                    {cartData.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="flex-1 truncate text-muted-foreground">
                          <span className="text-foreground font-medium">{item.quantity}×</span> {item.productName}
                        </span>
                        <span className="font-semibold ml-2 tabular-nums">{(item.price * item.quantity).toFixed(2)} DA</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Sous-total</span>
                      <span className="tabular-nums">{subtotal.toFixed(2)} DA</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Frais de livraison</span>
                      <span className="tabular-nums">{deliveryFee > 0 ? `${deliveryFee.toFixed(2)} DA` : "Gratuite"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base pt-1">
                      <span>Total</span>
                      <span className="text-primary tabular-nums">{total.toFixed(2)} DA</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <div className="flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700 leading-relaxed">
                        <strong>PrepLock™</strong> — Votre commande ne sera préparée qu'après confirmation de votre livreur. Repas toujours chaud.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold rounded-xl gap-2"
                    disabled={createOrder.isPending}
                  >
                    <Shield className="w-4 h-4" />
                    {createOrder.isPending ? "Traitement..." : `Confirmer — ${total.toFixed(2)} DA`}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Commande sécurisée · Annulation possible avant préparation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
