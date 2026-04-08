import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useListRestaurants } from "@workspace/api-client-react";
import {
  ArrowRight, ShieldCheck, Clock, Truck, Star, Utensils,
  CheckCircle, Smartphone, ChefHat, Users, Building2, MapPin, Zap
} from "lucide-react";

const CATEGORIES = [
  { label: "Burgers", emoji: "🍔" },
  { label: "Pizza", emoji: "🍕" },
  { label: "Sushi", emoji: "🍣" },
  { label: "Sandwichs", emoji: "🥙" },
  { label: "Tajine", emoji: "🍲" },
  { label: "Couscous", emoji: "🥘" },
  { label: "Grillades", emoji: "🥩" },
  { label: "Desserts", emoji: "🍰" },
];

function HowItWorksStep({ num, icon: Icon, title, desc }: { num: number; icon: any; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
        {num}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-base">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function FeaturedRestaurantCard({ restaurant }: { restaurant: any }) {
  return (
    <Link href={`/restaurants/${restaurant.id}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md">
        <div className="relative h-40 bg-gradient-to-br from-primary/20 to-amber-100 overflow-hidden">
          {restaurant.coverUrl ? (
            <img src={restaurant.coverUrl} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Utensils className="w-12 h-12 text-primary/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute top-3 right-3">
            <Badge className={restaurant.isOpen ? "bg-green-500 text-white border-0" : "bg-gray-500 text-white border-0"}>
              {restaurant.isOpen ? "Ouvert" : "Fermé"}
            </Badge>
          </div>
          {restaurant.logoUrl && (
            <div className="absolute bottom-3 left-3 w-10 h-10 rounded-full border-2 border-white bg-white overflow-hidden shadow">
              <img src={restaurant.logoUrl} alt="logo" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-base leading-tight mb-1">{restaurant.name}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {restaurant.avgRating && (
              <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                <Star className="w-3 h-3 fill-current" />
                {Number(restaurant.avgRating).toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {restaurant.estimatedPrepTime} min
            </span>
            {restaurant.category && <span className="text-primary/70">{restaurant.category}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Home() {
  const { data: restaurants } = useListRestaurants();
  const featured = restaurants?.slice(0, 4) ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-amber-50">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 -translate-y-1/2 translate-x-1/4 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-amber-100/60 translate-y-1/3 -translate-x-1/4 blur-3xl" />

        <div className="container relative z-10 py-20 lg:py-28">
          <div className="max-w-3xl">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-white border rounded-full px-4 py-1.5 mb-6 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Livraison de confiance — PrepLock™</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
              La livraison de repas
              <span className="block text-primary"> réinventée pour l'Algérie.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
              Votre repas ne commence à être préparé qu'une fois votre livreur confirmé.
              Fini les plats froids. Fini l'attente inutile. Une synchronisation parfaite, à chaque commande.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/restaurants">
                <Button size="lg" className="h-13 px-8 text-base gap-2 rounded-xl shadow-md">
                  Commander maintenant <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline" className="h-13 px-8 text-base rounded-xl">
                  Créer un compte gratuit
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-10 pt-8 border-t border-border/50">
              <div>
                <div className="text-2xl font-bold text-primary">2</div>
                <div className="text-xs text-muted-foreground mt-0.5">Restaurants partenaires</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">100%</div>
                <div className="text-xs text-muted-foreground mt-0.5">Livraisons synchronisées</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">Alger</div>
                <div className="text-xs text-muted-foreground mt-0.5">Disponible maintenant</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CATEGORY CHIPS ─── */}
      <section className="bg-white border-b py-4 shadow-sm">
        <div className="container">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <Link href={`/restaurants?cat=${cat.label}`} key={cat.label}>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-muted/40 hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer whitespace-nowrap text-sm font-medium">
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED RESTAURANTS ─── */}
      {featured.length > 0 && (
        <section className="py-16 bg-muted/20">
          <div className="container">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Restaurants populaires</h2>
                <p className="text-muted-foreground mt-1">Découvrez les établissements les mieux notés</p>
              </div>
              <Link href="/restaurants">
                <Button variant="ghost" className="gap-1 text-sm hidden md:flex">
                  Voir tout <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((r: any) => (
                <FeaturedRestaurantCard key={r.id} restaurant={r} />
              ))}
            </div>
            <div className="text-center mt-6 md:hidden">
              <Link href="/restaurants">
                <Button variant="outline" className="gap-1">Voir tous les restaurants <ArrowRight className="w-4 h-4" /></Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 bg-white">
        <div className="container max-w-5xl">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm font-medium">Comment ça marche</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Une commande, une synchronisation parfaite</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Notre technologie PrepLock™ garantit que votre repas arrive chaud à chaque fois.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Steps */}
            <div className="space-y-8">
              <HowItWorksStep
                num={1}
                icon={Smartphone}
                title="Choisissez et commandez"
                desc="Parcourez les restaurants, sélectionnez vos plats et passez votre commande en quelques secondes."
              />
              <HowItWorksStep
                num={2}
                icon={Truck}
                title="Un livreur est assigné"
                desc="Notre système choisit automatiquement le meilleur livreur disponible et lui envoie une notification."
              />
              <HowItWorksStep
                num={3}
                icon={CheckCircle}
                title="PrepLock™ : confirmation avant préparation"
                desc="Le livreur vous contacte pour confirmer votre adresse. Le restaurant ne commence à préparer qu'APRÈS cette confirmation. Zéro risque de repas froid."
              />
              <HowItWorksStep
                num={4}
                icon={MapPin}
                title="Livraison synchronisée"
                desc="Le livreur arrive exactement au moment où votre repas est prêt. Suivi en temps réel dans l'application."
              />
            </div>

            {/* Illustration */}
            <div className="bg-gradient-to-br from-primary/5 to-amber-50 rounded-3xl p-8 border">
              <div className="space-y-4">
                {[
                  { icon: "✅", label: "Commande passée", status: "Confirmé", color: "text-green-700 bg-green-50" },
                  { icon: "🛵", label: "Livreur assigné", status: "Ahmed B. — 4.9 ⭐", color: "text-blue-700 bg-blue-50" },
                  { icon: "🔒", label: "PrepLock activé", status: "Confirmation obtenue", color: "text-primary bg-primary/10" },
                  { icon: "🍳", label: "Préparation lancée", status: "15 min restantes", color: "text-amber-700 bg-amber-50" },
                  { icon: "📍", label: "En route vers vous", status: "Arrivée dans 3 min", color: "text-purple-700 bg-purple-50" },
                ].map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${step.color}`}>
                    <span className="text-lg">{step.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{step.label}</div>
                    </div>
                    <span className="text-xs font-medium opacity-80">{step.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── VALUE PROPS ─── */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Pourquoi TastyCrousty ?</h2>
            <p className="text-muted-foreground">Nous avons réinventé chaque étape de la livraison de repas.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Livraison garantie chaude",
                desc: "Grâce à PrepLock™, le restaurant ne prépare votre repas qu'une fois le livreur confirmé. Votre plat arrive toujours frais.",
                color: "text-green-600",
                bg: "bg-green-50",
              },
              {
                icon: Zap,
                title: "Dispatch intelligent",
                desc: "Notre algorithme choisit le livreur optimal selon sa note, son taux d'acceptation et son expérience. Vitesse et qualité garanties.",
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: Smartphone,
                title: "Suivi en temps réel",
                desc: "17 statuts de suivi détaillés vous informent à chaque étape : préparation, collecte, trajet, arrivée imminente.",
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
            ].map((prop, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-2xl ${prop.bg} flex items-center justify-center mb-4`}>
                  <prop.icon className={`w-6 h-6 ${prop.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">{prop.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PARTNER CTAs ─── */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Restaurant CTA */}
            <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-white p-8 flex flex-col justify-between min-h-[260px]">
              <div>
                <Building2 className="w-8 h-8 mb-4 opacity-80" />
                <h3 className="text-2xl font-bold mb-2">Vous êtes restaurateur ?</h3>
                <p className="opacity-80 text-sm leading-relaxed mb-6">
                  Rejoignez TastyCrousty et accédez à un dashboard professionnel, des stats en temps réel, et un système de livraison entièrement optimisé.
                </p>
              </div>
              <Link href="/auth/register">
                <Button variant="secondary" className="gap-1 w-fit">
                  Devenir partenaire <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Driver CTA */}
            <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 text-white p-8 flex flex-col justify-between min-h-[260px]">
              <div>
                <Truck className="w-8 h-8 mb-4 opacity-80" />
                <h3 className="text-2xl font-bold mb-2">Devenez livreur</h3>
                <p className="opacity-80 text-sm leading-relaxed mb-6">
                  Travaillez à votre rythme, gérez vos missions depuis votre téléphone, et bénéficiez d'un système de dispatch transparent et équitable.
                </p>
              </div>
              <Link href="/auth/register">
                <Button variant="secondary" className="gap-1 w-fit bg-white text-amber-700 hover:bg-amber-50">
                  Rejoindre l'équipe <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-foreground text-background py-12">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <h3 className="font-bold text-xl mb-3">TastyCrousty</h3>
              <p className="text-sm text-background/60 leading-relaxed">
                La première plateforme de livraison de repas en Algérie avec préparation synchronisée.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Client</h4>
              <ul className="space-y-2 text-sm text-background/60">
                <li><Link href="/restaurants" className="hover:text-background transition-colors">Restaurants</Link></li>
                <li><Link href="/orders" className="hover:text-background transition-colors">Mes commandes</Link></li>
                <li><Link href="/auth/register" className="hover:text-background transition-colors">S'inscrire</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Partenaires</h4>
              <ul className="space-y-2 text-sm text-background/60">
                <li><Link href="/auth/register" className="hover:text-background transition-colors">Devenir restaurateur</Link></li>
                <li><Link href="/auth/register" className="hover:text-background transition-colors">Devenir livreur</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Contact</h4>
              <ul className="space-y-2 text-sm text-background/60">
                <li>Alger, Algérie</li>
                <li>support@tastycrousty.dz</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-xs text-background/40">© 2026 TastyCrousty. Tous droits réservés.</p>
            <p className="text-xs text-background/40">🇩🇿 Fait avec passion en Algérie</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
