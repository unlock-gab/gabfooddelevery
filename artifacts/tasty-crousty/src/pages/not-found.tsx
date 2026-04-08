import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { UtensilsCrossed } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50/60 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-6 max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <UtensilsCrossed className="w-12 h-12 text-primary/40" />
          </div>
          <h1 className="text-7xl font-black text-primary mb-2">404</h1>
          <h2 className="text-2xl font-bold mb-3">Page introuvable</h2>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            La page que vous cherchez n'existe pas ou a été déplacée.<br />
            Retournez à l'accueil pour continuer votre commande.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/"><Button className="font-semibold gap-2"><UtensilsCrossed className="w-4 h-4" /> Retour à l'accueil</Button></Link>
            <Link href="/restaurants"><Button variant="outline" className="font-medium">Voir les restaurants</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
