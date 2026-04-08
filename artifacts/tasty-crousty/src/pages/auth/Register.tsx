import React from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRegister, useListCities, useListZones } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Building2, Truck, UtensilsCrossed, ChevronRight, MapPin, LayoutGrid } from "lucide-react";

const registerSchema = z.object({
  name:     z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email:    z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  phone:    z.string().optional(),
  role:     z.enum(["customer", "restaurant", "driver"]),
  cityId:   z.number({ invalid_type_error: "Veuillez choisir une wilaya" }).nullable().optional(),
  zoneId:   z.number().nullable().optional(),
});

type FormValues = z.infer<typeof registerSchema>;

const ROLE_CONFIG = {
  customer: {
    icon: ShoppingBag,
    label: "Client",
    headline: "Commandez en toute confiance",
    desc: "Accédez aux meilleurs restaurants d'Alger avec livraison synchronisée PrepLock™.",
    perks: ["Suivi de commande en temps réel", "PrepLock™ : repas toujours chaud", "Historique et récapitulatifs"],
    requireCity: true,
    requireZone: true,
  },
  restaurant: {
    icon: Building2,
    label: "Restaurant",
    headline: "Boostez votre activité",
    desc: "Dashboard professionnel avec statistiques en temps réel et gestion simplifiée.",
    perks: ["Tableau de bord opérationnel", "Stats chiffre d'affaires", "Gestion des menus et catégories"],
    requireCity: true,
    requireZone: true,
  },
  driver: {
    icon: Truck,
    label: "Livreur",
    headline: "Travaillez à votre rythme",
    desc: "Gérez vos missions depuis votre téléphone avec un système de dispatch équitable.",
    perks: ["Missions gérées en temps réel", "Dispatch transparent", "Gains quotidiens suivis"],
    requireCity: true,
    requireZone: true,
  },
};

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegister();
  const [activeRole, setActiveRole] = React.useState<"customer" | "restaurant" | "driver">("customer");

  const { data: allCities } = useListCities();
  const activeCities = (allCities ?? []).filter((c: any) => c.isActive);

  const form = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", phone: "", role: "customer", cityId: null, zoneId: null },
  });

  const selectedCityId = form.watch("cityId");
  const roleConfig = ROLE_CONFIG[activeRole];
  const showZone = roleConfig.requireZone && selectedCityId != null;

  const { data: zones } = useListZones(
    selectedCityId ?? 0,
    { query: { enabled: showZone } }
  );
  const activeZones = (zones ?? []).filter((z: any) => z.isActive);

  const onSubmit = (values: FormValues) => {
    registerMutation.mutate(
      { data: { ...values, cityId: values.cityId ?? null, zoneId: values.zoneId ?? null } },
      {
        onSuccess: (data) => {
          login(data.user, data.token);
          toast({ title: "Bienvenue !", description: `Compte créé avec succès, ${data.user.name} !` });
          if (data.user.role === "restaurant") setLocation("/dashboard");
          else if (data.user.role === "driver") setLocation("/driver");
          else setLocation("/restaurants");
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Erreur d'inscription", description: err.message || "Une erreur est survenue." });
        },
      }
    );
  };

  const RoleIcon = roleConfig.icon;

  return (
    <div className="min-h-screen flex">
      {/* Left dynamic branding */}
      <div className="hidden lg:flex flex-col w-[44%] bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white relative overflow-hidden p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-transparent pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />

        <div className="relative z-10 flex flex-col h-full">
          <Link href="/" className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-xl">TastyCrousty</span>
          </Link>

          <div className="my-auto transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
              <RoleIcon className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-3xl font-extrabold leading-tight mb-3">{roleConfig.headline}</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-xs">{roleConfig.desc}</p>

            <div className="space-y-3">
              {roleConfig.perks.map((perk) => (
                <div key={perk} className="flex items-center gap-3 text-white/70 text-sm">
                  <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/30 text-xs">Algérie 🇩🇿 — TastyCrousty 2026</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        <div className="lg:hidden flex items-center gap-3 p-5 border-b">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-base">TastyCrousty</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
          <div className="w-full max-w-md fade-in-up">
            <div className="mb-7">
              <h1 className="text-3xl font-extrabold tracking-tight mb-2">Créez votre compte</h1>
              <p className="text-muted-foreground">Rejoignez TastyCrousty dès maintenant — c'est gratuit.</p>
            </div>

            <Tabs defaultValue="customer" onValueChange={(val) => {
              form.setValue("role", val as any);
              form.setValue("cityId", null);
              form.setValue("zoneId", null);
              setActiveRole(val as any);
            }}>
              <TabsList className="grid w-full grid-cols-3 mb-6 h-11">
                <TabsTrigger value="customer"   className="text-sm font-semibold">👤 Client</TabsTrigger>
                <TabsTrigger value="restaurant" className="text-sm font-semibold">🍽️ Restaurant</TabsTrigger>
                <TabsTrigger value="driver"     className="text-sm font-semibold">🛵 Livreur</TabsTrigger>
              </TabsList>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                  {/* Nom */}
                  <FormField control={form.control} name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-sm">
                          {activeRole === "restaurant" ? "Nom du restaurant" : "Nom complet"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={activeRole === "restaurant" ? "Le Jardin du Goût" : "Mohammed Amine"}
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField control={form.control} name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-sm">Adresse email</FormLabel>
                        <FormControl>
                          <Input placeholder="nom@exemple.com" type="email" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Téléphone */}
                  <FormField control={form.control} name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-sm">
                          Téléphone <span className="text-muted-foreground font-normal">(optionnel)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="+213 5XX XXX XXX" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Wilaya — tous les rôles */}
                  <FormField control={form.control} name="cityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-sm flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          Wilaya
                        </FormLabel>
                        <Select
                          value={field.value != null ? String(field.value) : ""}
                          onValueChange={(val) => {
                            field.onChange(val ? Number(val) : null);
                            form.setValue("zoneId", null);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder={
                                activeCities.length === 0
                                  ? "Aucune wilaya disponible pour l'instant"
                                  : "Sélectionnez votre wilaya…"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeCities.length === 0 ? (
                              <div className="py-4 text-center text-sm text-muted-foreground">Aucune wilaya disponible</div>
                            ) : (
                              activeCities.map((city: any) => (
                                <SelectItem key={city.id} value={String(city.id)}>{city.name}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Seules les wilayas où TastyCrousty est disponible sont affichées.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Zone — restaurant et livreur, si wilaya sélectionnée */}
                  {showZone && (
                    <FormField control={form.control} name="zoneId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-sm flex items-center gap-1.5">
                            <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                            {activeRole === "driver" ? "Zone de livraison préférée" : activeRole === "restaurant" ? "Zone du restaurant" : "Commune"}
                            <span className="text-muted-foreground font-normal ml-1">(optionnel)</span>
                          </FormLabel>
                          <Select
                            value={field.value != null ? String(field.value) : ""}
                            onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder={
                                  activeZones.length === 0
                                    ? "Aucune zone disponible"
                                    : "Sélectionnez une zone…"
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activeZones.length === 0 ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">Aucune zone pour cette wilaya</div>
                              ) : (
                                activeZones.map((zone: any) => (
                                  <SelectItem key={zone.id} value={String(zone.id)}>
                                    {zone.name}
                                    {zone.deliveryFee ? ` — ${Number(zone.deliveryFee).toLocaleString("fr-DZ")} DA` : ""}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {activeRole === "customer" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Indiquez votre commune pour voir les restaurants qui livrent chez vous.
                            </p>
                          )}
                          {activeRole === "driver" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Vous pourrez livrer dans toute la wilaya. La zone est votre préférence par défaut.
                            </p>
                          )}
                          {activeRole === "restaurant" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              La zone de votre restaurant permet d'optimiser la recherche clients.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Mot de passe */}
                  <FormField control={form.control} name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-sm">Mot de passe</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Minimum 6 caractères" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold rounded-xl mt-1"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Création du compte..." : "Créer mon compte"}
                  </Button>
                </form>
              </Form>
            </Tabs>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <Link href="/auth/login" className="text-primary font-semibold hover:underline">
                Se connecter
              </Link>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-6">
              En créant un compte, vous acceptez les conditions d'utilisation de TastyCrousty.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
