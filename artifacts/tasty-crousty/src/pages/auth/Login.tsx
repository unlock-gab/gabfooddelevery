import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          login(data.user, data.token);
          toast({
            title: "Connexion réussie",
            description: `Bienvenue, ${data.user.name}`,
          });
          
          if (data.user.role === 'admin') setLocation('/admin');
          else if (data.user.role === 'restaurant') setLocation('/dashboard');
          else if (data.user.role === 'driver') setLocation('/driver');
          else setLocation('/restaurants');
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Erreur de connexion",
            description: "Email ou mot de passe incorrect.",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-primary/10">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight">Bon retour !</CardTitle>
            <CardDescription>
              Connectez-vous à votre compte Tasty Crousty
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </Form>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link href="/auth/register" className="text-primary font-medium hover:underline">
                Créer un compte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
