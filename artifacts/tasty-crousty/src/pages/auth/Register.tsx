import React from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  phone: z.string().optional(),
  role: z.enum(["customer", "restaurant", "driver"]),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "customer",
    },
  });

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          login(data.user, data.token);
          toast({
            title: "Inscription réussie",
            description: `Bienvenue sur Tasty Crousty, ${data.user.name}`,
          });
          
          if (data.user.role === 'restaurant') setLocation('/dashboard');
          else if (data.user.role === 'driver') setLocation('/driver');
          else setLocation('/restaurants');
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Erreur d'inscription",
            description: err.message || "Une erreur est survenue.",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-md shadow-lg border-primary/10">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight">Rejoignez-nous</CardTitle>
            <CardDescription>
              Créez votre compte Tasty Crousty
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="customer" onValueChange={(val) => form.setValue("role", val as any)}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="customer">Client</TabsTrigger>
                <TabsTrigger value="restaurant">Resto</TabsTrigger>
                <TabsTrigger value="driver">Livreur</TabsTrigger>
              </TabsList>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input placeholder="Jean Dupont" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="nom@exemple.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone (Optionnel)</FormLabel>
                        <FormControl>
                          <Input placeholder="06 12 34 56 78" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-11 text-base mt-2" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Création..." : "Créer mon compte"}
                  </Button>
                </form>
              </Form>
            </Tabs>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                Se connecter
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
