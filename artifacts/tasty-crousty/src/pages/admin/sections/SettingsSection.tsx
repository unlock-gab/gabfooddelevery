import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Radio, Clock, CreditCard, Shield, Bell, Globe, Save, RefreshCw,
} from "lucide-react";

interface SettingsGroup {
  title: string;
  icon: React.ReactNode;
  fields: {
    key: string; label: string; description?: string;
    type: "number" | "boolean" | "text"; unit?: string;
  }[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    title: "Dispatch",
    icon: <Radio className="w-4 h-4 text-blue-500" />,
    fields: [
      { key: "dispatchRadiusKm", label: "Rayon de dispatch", description: "Distance max pour proposer une mission à un livreur", type: "number", unit: "km" },
      { key: "dispatchTimeoutSeconds", label: "Timeout dispatch", description: "Durée avant expiration d'une proposition de mission", type: "number", unit: "sec" },
    ],
  },
  {
    title: "Livraison",
    icon: <Clock className="w-4 h-4 text-purple-500" />,
    fields: [
      { key: "defaultDeliveryFee", label: "Frais de livraison par défaut", description: "Appliqués si le restaurant ne définit pas les siens", type: "number", unit: "€" },
    ],
  },
  {
    title: "Finance",
    icon: <CreditCard className="w-4 h-4 text-green-500" />,
    fields: [
      { key: "platformCommissionRate", label: "Commission plateforme", description: "Pourcentage prélevé sur chaque commande", type: "number", unit: "%" },
    ],
  },
  {
    title: "Sécurité & Fraude",
    icon: <Shield className="w-4 h-4 text-red-500" />,
    fields: [
      { key: "maxCancellationsBeforeFlag", label: "Annulations max avant flag", description: "Nombre d'annulations client déclenchant un flag fraude", type: "number" },
      { key: "maxUnreachableBeforeFlag", label: "Injoignable max avant flag", description: "Nombre de fois injoignable avant flag automatique", type: "number" },
    ],
  },
];

export function SettingsSection() {
  const { toast } = useToast();
  const { data: settings, isLoading, refetch } = useGetSettings(undefined, {
    query: { staleTime: 10000 },
  });
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({ ...settings });
      setDirty(false);
    }
  }, [settings]);

  const handleChange = (key: string, value: any) => {
    setForm(f => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    updateSettings.mutate({ data: form }, {
      onSuccess: () => {
        toast({ title: "Paramètres sauvegardés" });
        setDirty(false);
        refetch();
      },
      onError: () => toast({ title: "Erreur de sauvegarde", variant: "destructive" } as any),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configuration opérationnelle de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3 mr-1" /> Réinitialiser
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={handleSave}
            disabled={!dirty || updateSettings.isPending}
          >
            <Save className="w-3 h-3 mr-1" />
            {updateSettings.isPending ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
          Des modifications non sauvegardées sont en attente.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SETTINGS_GROUPS.map(group => (
          <Card key={group.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                {group.icon} {group.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.fields.map(field => (
                <div key={field.key}>
                  <Label className="text-sm font-medium text-slate-700">{field.label}</Label>
                  {field.description && (
                    <p className="text-xs text-slate-400 mt-0.5 mb-1.5">{field.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {field.type === "boolean" ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div
                          className={`w-10 h-5 rounded-full transition-colors relative ${form[field.key] ? "bg-primary" : "bg-slate-300"}`}
                          onClick={() => handleChange(field.key, !form[field.key])}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[field.key] ? "translate-x-5" : "translate-x-0.5"}`} />
                        </div>
                        <span className="text-sm text-slate-600">{form[field.key] ? "Activé" : "Désactivé"}</span>
                      </label>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type={field.type}
                          value={form[field.key] ?? ""}
                          onChange={e => handleChange(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                          className="h-8 text-sm"
                        />
                        {field.unit && <span className="text-sm text-slate-500 shrink-0">{field.unit}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Maintenance mode card */}
      <Card className={settings?.maintenanceMode ? "border-red-300 bg-red-50/30" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
            <Globe className="w-4 h-4 text-slate-500" /> Mode maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700 font-medium">
                {form.maintenanceMode ? "Mode maintenance ACTIVÉ" : "Plateforme opérationnelle"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Lorsqu'activé, aucun client ne peut passer de commande. Réservé à la maintenance technique.
              </p>
            </div>
            <div
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${form.maintenanceMode ? "bg-red-500" : "bg-slate-300"}`}
              onClick={() => handleChange("maintenanceMode", !form.maintenanceMode)}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.maintenanceMode ? "translate-x-6" : "translate-x-1"}`} />
            </div>
          </div>
          {form.maintenanceMode && (
            <div className="mt-3 bg-red-100 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">
              ⚠️ La plateforme est actuellement en maintenance. Les clients ne peuvent pas passer de commandes.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-500">
              <Bell className="w-4 h-4" /> Notifications (à venir)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Configuration des templates et canaux de notification (SMS, email, push). Disponible prochainement.</p>
          </CardContent>
        </Card>
        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-500">
              <Globe className="w-4 h-4" /> Localisation (à venir)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Gestion des langues, devise, et fuseau horaire par zone. Disponible prochainement.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
