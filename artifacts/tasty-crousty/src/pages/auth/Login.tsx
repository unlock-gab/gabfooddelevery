import React from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { ShieldCheck, Truck, ChefHat, Star, UtensilsCrossed, Lock } from "lucide-react";
import { Link as WouterLink } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          login(data.user, data.token);
          toast({ title: "Connexion réussie", description: `Bienvenue, ${data.user.name} !` });
          if (data.user.role === "admin") setLocation("/admin");
          else if (data.user.role === "restaurant") setLocation("/dashboard");
          else if (data.user.role === "driver") setLocation("/driver");
          else setLocation("/restaurants");
        },
        onError: () => {
          toast({ variant: "destructive", title: "Identifiants incorrects", description: "Vérifiez votre email et mot de passe." });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col w-[44%] bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white relative overflow-hidden p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 flex flex-col h-full">
          <Link href="/" className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-xl">food delivery</span>
          </Link>

          <div className="my-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6 font-medium">
              <Lock className="w-3.5 h-3.5 text-primary" />
              Technologie PrepLock™
            </div>
            <h2 className="text-4xl font-extrabold leading-tight mb-4">
              La livraison de repas<br />
              <span className="text-primary">synchronisée</span>
            </h2>
            <p className="text-white/60 text-base leading-relaxed max-w-sm">
              Votre repas ne commence à être préparé qu'une fois votre livreur confirmé. Toujours chaud, toujours frais.
            </p>

            <div className="mt-10 space-y-4">
              {[
                { icon: ShieldCheck, label: "Livraison garantie fraîche", color: "text-green-400" },
                { icon: Truck, label: "Dispatch intelligent en temps réel", color: "text-blue-400" },
                { icon: ChefHat, label: "Restaurants partenaires sélectionnés", color: "text-primary" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-3 text-white/70 text-sm">
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 text-white/30 text-xs">
            <Star className="w-3 h-3 text-primary fill-primary" />
            <span>Alger, Algérie — 2026</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 p-5 border-b">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-base">food delivery</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md fade-in-up">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight mb-2">Bon retour !</h1>
              <p className="text-muted-foreground">Connectez-vous à votre compte food delivery</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                <FormField control={form.control} name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-sm">Mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 text-base font-semibold mt-1 rounded-xl" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Connexion en cours..." : "Se connecter"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link href="/auth/register" className="text-primary font-semibold hover:underline">
                Créer un compte gratuit
              </Link>
            </div>

            <div className="mt-10 pt-6 border-t">
              <p className="text-xs text-muted-foreground text-center mb-3">Accès démo</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {[
                  { role: "Client", email: "customer@tc.dz", pass: "client123" },
                  { role: "Restaurant", email: "restaurant@tc.dz", pass: "resto123" },
                  { role: "Livreur", email: "driver@tc.dz", pass: "driver123" },
                  { role: "Admin", email: "admin@tastycrousty.dz", pass: "admin123456" },
                ].map((demo) => (
                  <button key={demo.role}
                    type="button"
                    onClick={() => { form.setValue("email", demo.email); form.setValue("password", demo.pass); }}
                    className="text-left p-2.5 rounded-lg border hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <div className="font-semibold text-foreground">{demo.role}</div>
                    <div className="text-muted-foreground/70 truncate">{demo.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
