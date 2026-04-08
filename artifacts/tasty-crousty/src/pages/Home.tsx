import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { useI18n } from "@/i18n";
import { ArrowRight, ShieldCheck, Clock, Utensils } from "lucide-react";

export default function Home() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden bg-primary/5">
          <div className="container relative z-10">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
                La livraison de repas, <span className="text-primary">réinventée pour la qualité.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                Une plateforme haute confiance où votre repas n'est préparé que lorsque votre livreur est confirmé. Zéro attente, zéro repas froid.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/restaurants">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
                    Commander maintenant <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base">
                    Devenir partenaire
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-background">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold mb-4">L'exigence opérationnelle</h2>
              <p className="text-muted-foreground">Notre modèle unique garantit une synchronisation parfaite entre la cuisine et la livraison.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-muted/50 border">
                <ShieldCheck className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Préparation Synchronisée</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Le restaurant ne commence la préparation qu'après assignation d'un livreur et votre confirmation. Fini les plats qui patientent sur un comptoir.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-muted/50 border">
                <Clock className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Timing Précis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Nos algorithmes calculent le temps de trajet exact du livreur pour qu'il arrive au moment précis où votre commande est emballée.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-muted/50 border">
                <Utensils className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Qualité Intacte</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Ce flux tendu garantit que vos frites restent croustillantes et vos plats chauds, de la poêle à votre porte.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t py-8 bg-muted/20">
        <div className="container text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Tasty Crousty. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
