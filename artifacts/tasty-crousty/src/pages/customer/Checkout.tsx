import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useGetCart, useCreateOrder, useListCities, useListZones } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, MapPin, CreditCard, ChevronLeft, Banknote, Wifi, Lock, Shield, ChevronDown, Tag, CheckCircle, X, Home, Briefcase, Navigation, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDA } from "@/lib/format";

interface SavedAddress {
  id: number;
  label: string;
  fullAddress: string;
  building: string | null;
  landmark: string | null;
  floor: string | null;
  phone: string | null;
  instructions: string | null;
  cityId: number | null;
  zoneId: number | null;
  isDefault: boolean;
}

const LABEL_ICONS: Record<string, React.ReactNode> = {
  Domicile: <Home className="w-3.5 h-3.5" />,
  Travail: <Briefcase className="w-3.5 h-3.5" />,
};

interface AppliedPromo {
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  description: string | null;
}

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

  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [zoneDeliveryFee, setZoneDeliveryFee] = useState<number | null>(null);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const [gpsLoading, setGpsLoading] = useState(false);

  const handleGpsLocate = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS non supporté", description: "Votre navigateur ne supporte pas la géolocalisation.", variant: "destructive" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=fr`,
            { headers: { "User-Agent": "TastyCrousty/1.0" } }
          );
          const data = await res.json();
          const addr = data.address ?? {};
          const parts = [
            addr.house_number,
            addr.road ?? addr.pedestrian ?? addr.footway,
            addr.suburb ?? addr.neighbourhood ?? addr.quarter,
            addr.city ?? addr.town ?? addr.village ?? addr.county,
          ].filter(Boolean);
          const fullAddress = parts.join(", ") || data.display_name?.split(",").slice(0, 3).join(",").trim() || "";
          if (fullAddress) {
            setForm(f => ({ ...f, deliveryAddress: fullAddress }));
            toast({ title: "Position détectée", description: "Adresse remplie automatiquement. Vérifiez et ajustez si besoin." });
          } else {
            toast({ title: "Adresse introuvable", description: "Impossible de convertir votre position en adresse.", variant: "destructive" });
          }
        } catch {
          toast({ title: "Erreur GPS", description: "Impossible de récupérer votre adresse.", variant: "destructive" });
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        const msg = err.code === 1
          ? "Accès à la localisation refusé. Autorisez la géolocalisation dans votre navigateur."
          : "Impossible de détecter votre position.";
        toast({ title: "Localisation impossible", description: msg, variant: "destructive" });
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    const token = localStorage.getItem("tc_token");
    if (!token) return;
    fetch("/api/addresses", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: SavedAddress[]) => {
        setSavedAddresses(data ?? []);
        const def = data?.find(a => a.isDefault);
        if (def) applyAddress(def);
      })
      .catch(() => {});
  }, []);

  const applyAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setForm(f => ({
      ...f,
      deliveryAddress: addr.fullAddress,
      deliveryLandmark: addr.landmark ?? "",
      deliveryFloor: addr.floor ?? "",
      deliveryInstructions: addr.instructions ?? "",
      deliveryPhone: addr.phone ?? f.deliveryPhone,
    }));
    if (addr.cityId) setSelectedCityId(addr.cityId);
    if (addr.zoneId) setSelectedZoneId(addr.zoneId);
  };

  const handleValidatePromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    const token = localStorage.getItem("tc_token");
    const subtotal = (cart as any)?.items?.reduce((s: number, i: any) => s + i.price * i.quantity, 0) ?? 0;
    const delFee = zoneDeliveryFee ?? ((cart as any)?.deliveryFee ?? 0);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: promoInput.trim(), subtotal, deliveryFee: delFee }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? "Code invalide", variant: "destructive" }); }
      else { setAppliedPromo(data); toast({ title: `Code ${data.code} appliqué !`, description: data.description ?? undefined }); }
    } finally { setPromoLoading(false); }
  };

  const { data: cities } = useListCities(undefined, { query: { staleTime: 60000 } });
  const { data: zones } = useListZones(selectedCityId!, {
    query: { enabled: !!selectedCityId, staleTime: 30000 },
  });

  // When zone changes, update the delivery fee preview
  useEffect(() => {
    if (selectedZoneId && zones) {
      const zone = zones.find((z: any) => z.id === selectedZoneId);
      setZoneDeliveryFee(zone?.deliveryFee != null ? Number(zone.deliveryFee) : null);
    } else {
      setZoneDeliveryFee(null);
    }
  }, [selectedZoneId, zones]);

  // Reset zone when city changes
  const handleCityChange = (cityId: number | null) => {
    setSelectedCityId(cityId);
    setSelectedZoneId(null);
    setZoneDeliveryFee(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || (cart as any).items.length === 0) {
      toast({ title: "Panier vide", variant: "destructive" });
      return;
    }
    if (!form.deliveryPhone.trim()) {
      toast({ title: "Numéro de téléphone requis", description: "Le livreur doit pouvoir vous contacter à la livraison.", variant: "destructive" });
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
          zoneId: selectedZoneId ?? undefined,
          paymentMethod: form.paymentMethod,
          promoCode: appliedPromo?.code ?? undefined,
          items: (cart as any).items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price * item.quantity,
            notes: item.notes ?? undefined,
          })),
        } as any,
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
  // Use zone fee if selected, else fall back to cart's stored fee
  const deliveryFee = zoneDeliveryFee ?? (cartData.deliveryFee ?? 0);
  const promoDiscount = appliedPromo?.discountAmount ?? 0;
  const total = Math.max(0, subtotal + deliveryFee - promoDiscount);

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
                  {/* Saved address selector */}
                  {savedAddresses.length > 0 && (
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Adresses enregistrées</Label>
                      <div className="flex flex-col gap-2">
                        {savedAddresses.map(addr => (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => applyAddress(addr)}
                            className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedAddressId === addr.id ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40 bg-white"}`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${selectedAddressId === addr.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {LABEL_ICONS[addr.label] ?? <MapPin className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-semibold">{addr.label}</span>
                                {addr.isDefault && <Badge variant="outline" className="text-[10px] h-4 px-1.5">Par défaut</Badge>}
                                {selectedAddressId === addr.id && <CheckCircle className="w-3.5 h-3.5 text-primary ml-auto" />}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{addr.fullAddress}</p>
                              {addr.landmark && <p className="text-xs text-muted-foreground/70 truncate">{addr.landmark}</p>}
                            </div>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => { setSelectedAddressId(null); setForm(f => ({ ...f, deliveryAddress: "", deliveryLandmark: "", deliveryFloor: "", deliveryInstructions: "" })); }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed text-sm transition-all ${selectedAddressId === null ? "border-primary text-primary" : "border-muted text-muted-foreground hover:border-primary/40"}`}
                        >
                          <MapPin className="w-3.5 h-3.5" /> Nouvelle adresse
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Zone selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-semibold">Ville</Label>
                      <div className="relative mt-1.5">
                        <select
                          className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          value={selectedCityId ?? ""}
                          onChange={e => handleCityChange(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">Sélectionner une ville…</option>
                          {cities?.filter((c: any) => c.isActive).map((city: any) => (
                            <option key={city.id} value={city.id}>{city.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">
                        Zone de livraison
                        {selectedZoneId && zoneDeliveryFee != null && (
                          <span className="ml-2 text-xs font-normal text-primary">
                            — {formatDA(zoneDeliveryFee)}
                          </span>
                        )}
                      </Label>
                      <div className="relative mt-1.5">
                        <select
                          className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                          value={selectedZoneId ?? ""}
                          onChange={e => setSelectedZoneId(e.target.value ? Number(e.target.value) : null)}
                          disabled={!selectedCityId}
                        >
                          <option value="">{selectedCityId ? "Sélectionner une zone…" : "Ville d'abord"}</option>
                          {zones?.filter((z: any) => z.isActive).map((zone: any) => (
                            <option key={zone.id} value={zone.id}>
                              {zone.name}{zone.deliveryFee ? ` — ${formatDA(zone.deliveryFee)}` : ""}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-sm font-semibold">Adresse</Label>
                      <button
                        type="button"
                        onClick={handleGpsLocate}
                        disabled={gpsLoading}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors bg-primary/8 hover:bg-primary/15 px-2.5 py-1 rounded-lg"
                      >
                        {gpsLoading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Navigation className="w-3.5 h-3.5" />}
                        {gpsLoading ? "Localisation…" : "Ma position GPS"}
                      </button>
                    </div>
                    <Input
                      placeholder="123 Rue Didouche Mourad, Alger"
                      value={form.deliveryAddress}
                      onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Facultatif — le livreur vous contactera par téléphone si besoin.</p>
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
                    <Label className="text-sm font-semibold">Téléphone de contact <span className="text-red-500">*</span></Label>
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
                        <span className="font-semibold ml-2 tabular-nums">{formatDA(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Promo code input */}
                  <div className="pt-1">
                    {appliedPromo ? (
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                        <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-emerald-800 font-mono">{appliedPromo.code}</span>
                          {appliedPromo.description && <span className="text-xs text-emerald-600 ml-1.5">{appliedPromo.description}</span>}
                        </div>
                        <button type="button" onClick={() => { setAppliedPromo(null); setPromoInput(""); }} className="text-emerald-400 hover:text-emerald-700">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Code promo"
                            value={promoInput}
                            onChange={e => setPromoInput(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleValidatePromo())}
                            className="h-9 text-sm pl-8 uppercase font-mono"
                          />
                        </div>
                        <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={handleValidatePromo} disabled={promoLoading || !promoInput.trim()}>
                          {promoLoading ? "…" : "Appliquer"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Sous-total</span>
                      <span className="tabular-nums">{formatDA(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        Frais de livraison
                        {selectedZoneId && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">zone</span>
                        )}
                        {appliedPromo?.discountType === "free_delivery" && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">promo</span>
                        )}
                      </span>
                      <span className="tabular-nums">
                        {appliedPromo?.discountType === "free_delivery" ? (
                          <span className="line-through text-muted-foreground/50 mr-1">{formatDA(deliveryFee + promoDiscount)}</span>
                        ) : null}
                        {deliveryFee > 0 ? formatDA(deliveryFee) : "Gratuite"}
                      </span>
                    </div>
                    {appliedPromo && appliedPromo.discountType !== "free_delivery" && promoDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Réduction ({appliedPromo.code})
                        </span>
                        <span className="tabular-nums font-semibold">−{formatDA(promoDiscount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-base pt-1">
                      <span>Total</span>
                      <span className="text-primary tabular-nums">{formatDA(total)}</span>
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
                    {createOrder.isPending ? "Traitement..." : `Confirmer — ${formatDA(total)}`}
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
