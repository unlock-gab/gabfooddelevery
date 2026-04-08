import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useListRestaurants } from "@workspace/api-client-react";
import {
  ArrowRight, ShieldCheck, Clock, Truck, Star, Utensils,
  CheckCircle, Smartphone, ChefHat, Building2, MapPin, Zap, Lock
} from "lucide-react";

const CATEGORIES = [
  { label: "Fast Food",     emoji: "🍔" },
  { label: "Pizza",         emoji: "🍕" },
  { label: "Méditerranéen", emoji: "🥗" },
  { label: "Algérien",      emoji: "🥘" },
  { label: "Grillades",     emoji: "🥩" },
  { label: "Sandwichs",     emoji: "🥙" },
  { label: "Sushi",         emoji: "🍣" },
  { label: "Desserts",      emoji: "🍰" },
];

function HowItWorksStep({ num, icon: Icon, title, desc }: { num: number; icon: any; title: string; desc: string }) {
  return (
    <div className="flex gap-5 group">
      <div className="shrink-0 flex flex-col items-center">
        <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-md group-hover:scale-105 transition-transform">
          {num}
        </div>
        <div className="w-px flex-1 bg-gradient-to-b from-primary/30 to-transparent mt-2" />
      </div>
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-1.5">
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
      <Card className="group overflow-hidden cursor-pointer border shadow-sm hover:shadow-xl transition-all duration-300 card-hover h-full">
        <div className="relative h-44 bg-gradient-to-br from-primary/15 to-amber-100 overflow-hidden">
          {restaurant.coverUrl ? (
            <img src={restaurant.coverUrl} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Utensils className="w-14 h-14 text-primary/25" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute top-3 right-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 ${restaurant.isOpen ? "bg-green-500 text-white" : "bg-gray-600 text-white"}`}>
              {restaurant.isOpen ? "Ouvert" : "Fermé"}
            </span>
          </div>
          {restaurant.avgRating > 0 && (
            <div className="absolute bottom-3 left-3">
              <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-amber-400 font-semibold">
                <Star className="w-3 h-3 fill-current" />
                {Number(restaurant.avgRating).toFixed(1)}
              </span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-base leading-tight mb-1 group-hover:text-primary transition-colors">{restaurant.name}</h3>
          {restaurant.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{restaurant.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {restaurant.estimatedPrepTime} min
            </span>
            {restaurant.category && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 font-medium">{restaurant.category}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Home() {
  // Only show approved restaurants on the homepage
  const { data: restaurants } = useListRestaurants({ status: "approved" } as any);
  const featured = (restaurants as any[])?.slice(0, 4) ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-background to-orange-50/30">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-primary/8 -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-amber-100/50 translate-y-1/3 -translate-x-1/4 blur-3xl pointer-events-none" />

        <div className="container relative z-10 py-20 lg:py-32">
          <div className="max-w-3xl fade-in-up">
            <div className="inline-flex items-center gap-2 bg-white border border-green-200 rounded-full px-4 py-2 mb-7 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">Livraison de confiance — PrepLock™</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.05]">
              La livraison
              <br />
              <span className="gradient-text">réinventée</span>
              <br />
              pour l'Algérie.
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-9 leading-relaxed max-w-2xl">
              Votre repas ne commence à être préparé qu'une fois votre livreur confirmé.
              Fini les plats froids. Une synchronisation parfaite, à chaque commande.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Link href="/restaurants">
                <Button size="lg" className="h-13 px-8 text-base gap-2 rounded-xl shadow-md font-semibold">
                  Commander maintenant <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline" className="h-13 px-8 text-base rounded-xl font-medium">
                  Créer un compte gratuit
                </Button>
              </Link>
            </div>

            <div className="flex gap-8 pt-6 border-t border-border/40">
              {[
                { value: "6+", label: "Restaurants partenaires" },
                { value: "100%", label: "Livraisons synchronisées" },
                { value: "3 villes", label: "Disponible maintenant" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-extrabold text-primary tabular-nums">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CATEGORY CHIPS ─── */}
      <section className="bg-white border-b shadow-sm">
        <div className="container py-4">
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat, i) => (
              <Link href={`/restaurants?cat=${cat.label}`} key={cat.label}>
                <div className={`chip chip-inactive fade-in-up-${Math.min(i + 1, 4)}`}>
                  <span className="text-base leading-none">{cat.emoji}</span>
                  <span className="text-sm">{cat.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED RESTAURANTS ─── */}
      {featured.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Découvrez</p>
                <h2 className="text-2xl md:text-3xl font-bold">Restaurants populaires</h2>
                <p className="text-muted-foreground text-sm mt-1">Les établissements les mieux notés près de vous</p>
              </div>
              <Link href="/restaurants">
                <Button variant="ghost" className="gap-1 text-sm hidden md:flex font-medium">
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
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <Lock className="w-3.5 h-3.5" /> Comment ça marche
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Une commande, une synchronisation parfaite</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Notre technologie PrepLock™ garantit que votre repas arrive toujours chaud et frais.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <HowItWorksStep num={1} icon={Smartphone} title="Choisissez et commandez"
                desc="Parcourez les restaurants, sélectionnez vos plats et passez votre commande en quelques secondes." />
              <HowItWorksStep num={2} icon={Truck} title="Un livreur est assigné"
                desc="Notre algorithme choisit le meilleur livreur disponible selon sa note et son taux d'acceptation." />
              <HowItWorksStep num={3} icon={CheckCircle} title="PrepLock™ : confirmation avant préparation"
                desc="Le livreur confirme votre adresse. Le restaurant ne commence à préparer qu'APRÈS cette étape. Zéro risque de repas froid." />
              <HowItWorksStep num={4} icon={MapPin} title="Livraison synchronisée"
                desc="Le livreur arrive exactement quand votre repas est prêt. Suivi en temps réel à chaque étape." />
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-amber-50 rounded-3xl p-6 border border-primary/10 shadow-sm">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">Suivi en direct</p>
              <div className="space-y-3">
                {[
                  { icon: "✅", label: "Commande passée", status: "Confirmé", color: "text-green-700 bg-green-50 border-green-100" },
                  { icon: "🛵", label: "Livreur assigné", status: "Ahmed B. — 4.9 ⭐", color: "text-blue-700 bg-blue-50 border-blue-100" },
                  { icon: "🔒", label: "PrepLock™ activé", status: "Confirmation obtenue", color: "text-primary bg-primary/10 border-primary/20 font-semibold" },
                  { icon: "🍳", label: "Préparation lancée", status: "14 min restantes", color: "text-amber-700 bg-amber-50 border-amber-100" },
                  { icon: "📍", label: "En route vers vous", status: "Arrivée dans 3 min", color: "text-purple-700 bg-purple-50 border-purple-100" },
                ].map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${step.color} transition-all`}>
                    <span className="text-lg shrink-0">{step.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{step.label}</div>
                    </div>
                    <span className="text-xs font-medium opacity-70 shrink-0 text-end">{step.status}</span>
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
            <p className="text-muted-foreground max-w-xl mx-auto">Nous avons réinventé chaque étape de la livraison de repas pour l'Algérie.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Livraison garantie chaude",
                desc: "PrepLock™ synchronise le livreur et la cuisine — votre repas ne commence à être préparé qu'une fois le livreur confirmé.",
                color: "text-green-600", bg: "bg-green-50", ring: "ring-green-100",
              },
              {
                icon: Zap,
                title: "Dispatch intelligent",
                desc: "Notre algorithme sélectionne le livreur optimal selon sa note, son taux d'acceptation et sa proximité. Rapide et fiable.",
                color: "text-primary", bg: "bg-primary/10", ring: "ring-primary/15",
              },
              {
                icon: Smartphone,
                title: "Suivi en temps réel",
                desc: "17 statuts de suivi vous informent à chaque étape : préparation, collecte, trajet, arrivée imminente. Zéro surprise.",
                color: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-100",
              },
            ].map((prop, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 border shadow-sm hover:shadow-md transition-all group">
                <div className={`w-13 h-13 rounded-2xl ${prop.bg} ring-1 ${prop.ring} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}>
                  <prop.icon className={`w-6 h-6 ${prop.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2.5">{prop.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PARTNER CTAs ─── */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Rejoignez l'écosystème</h2>
            <p className="text-muted-foreground">Restaurateurs, livreurs — développez votre activité avec TastyCrousty.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8 flex flex-col justify-between min-h-[280px] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
                  <Building2 className="w-6 h-6 opacity-90" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Vous êtes restaurateur ?</h3>
                <p className="text-white/70 text-sm leading-relaxed mb-6">
                  Dashboard professionnel, stats en temps réel, gestion des commandes optimisée. Développez votre activité sans friction.
                </p>
              </div>
              <Link href="/auth/register">
                <Button className="gap-1.5 w-fit bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  Devenir partenaire <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-amber-500 via-amber-500 to-orange-500 text-white p-8 flex flex-col justify-between min-h-[280px] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-5">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Devenez livreur</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-6">
                  Gérez vos missions depuis votre téléphone. Dispatch transparent, gains quotidiens, liberté totale.
                </p>
              </div>
              <Link href="/auth/register">
                <Button variant="secondary" className="gap-1.5 w-fit bg-white text-amber-700 hover:bg-amber-50 font-semibold">
                  Rejoindre l'équipe <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-gray-950 text-gray-400 py-14">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <h3 className="font-extrabold text-xl text-white mb-3">TastyCrousty</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                La première plateforme de livraison de repas en Algérie avec préparation synchronisée PrepLock™.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-gray-300">Client</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/restaurants" className="hover:text-white transition-colors">Restaurants</Link></li>
                <li><Link href="/orders" className="hover:text-white transition-colors">Mes commandes</Link></li>
                <li><Link href="/auth/register" className="hover:text-white transition-colors">S'inscrire</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-gray-300">Partenaires</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/auth/register" className="hover:text-white transition-colors">Devenir restaurateur</Link></li>
                <li><Link href="/auth/register" className="hover:text-white transition-colors">Devenir livreur</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-gray-300">Contact</h4>
              <ul className="space-y-2.5 text-sm">
                <li>Alger, Algérie 🇩🇿</li>
                <li>support@tastycrousty.dz</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/8 pt-6 flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-xs text-gray-600">© 2026 TastyCrousty. Tous droits réservés.</p>
            <p className="text-xs text-gray-600">Fait avec passion en Algérie 🇩🇿</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
