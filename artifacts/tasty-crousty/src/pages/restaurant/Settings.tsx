import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  User, Clock, Save, Store, Phone, MapPin, ChefHat, Tag,
  ToggleLeft, ToggleRight, AlertCircle, CheckCircle2,
} from "lucide-react";

const DAYS = [
  { id: 0, label: "Dimanche",  labelAr: "الأحد" },
  { id: 1, label: "Lundi",     labelAr: "الاثنين" },
  { id: 2, label: "Mardi",     labelAr: "الثلاثاء" },
  { id: 3, label: "Mercredi",  labelAr: "الأربعاء" },
  { id: 4, label: "Jeudi",     labelAr: "الخميس" },
  { id: 5, label: "Vendredi",  labelAr: "الجمعة" },
  { id: 6, label: "Samedi",    labelAr: "السبت" },
];

const CATEGORIES = [
  "Méditerranéen", "Algérien", "Fast-food", "Pizza", "Burgers",
  "Sandwichs", "Fruits de mer", "Grillades", "Pâtisserie", "Couscous",
  "Tajine", "Sushi", "Indien", "Libanais", "Végétarien",
];

const DEFAULT_HOURS = DAYS.map(d => ({
  dayOfWeek: d.id,
  openTime: "09:00",
  closeTime: "22:00",
  isOpen: d.id !== 5,
}));

type HourEntry = { dayOfWeek: number; openTime: string; closeTime: string; isOpen: boolean };

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h2 className="font-bold text-slate-900 text-sm">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = "text", className,
}: {
  value: string | number; onChange: (v: string) => void;
  placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all",
        className
      )}
    />
  );
}

function Textarea({
  value, onChange, placeholder, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
    />
  );
}

function Select({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

export default function RestaurantSettings({ restaurant, onUpdate }: {
  restaurant: any;
  onUpdate: (updated: any) => void;
}) {
  const { toast } = useToast();

  /* ─── Profile state ─── */
  const [profile, setProfile] = useState({
    name:              restaurant?.name              ?? "",
    nameAr:            restaurant?.nameAr            ?? "",
    description:       restaurant?.description       ?? "",
    phone:             restaurant?.phone             ?? "",
    address:           restaurant?.address           ?? "",
    category:          restaurant?.category          ?? CATEGORIES[0],
    estimatedPrepTime: restaurant?.estimatedPrepTime ?? 25,
    minimumOrder:      restaurant?.minimumOrder      ?? 0,
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved,   setProfileSaved]   = useState(false);

  /* ─── Hours state ─── */
  const [hours, setHours] = useState<HourEntry[]>(DEFAULT_HOURS);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [hoursFetching, setHoursFetching] = useState(true);
  const [hoursSaved,    setHoursSaved]    = useState(false);

  /* fetch hours */
  useEffect(() => {
    if (!restaurant?.id) return;
    const token = localStorage.getItem("tc_token");
    fetch(`/api/restaurants/${restaurant.id}/hours`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.length > 0) {
          const filled = DAYS.map(d => {
            const found = data.find((h: HourEntry) => h.dayOfWeek === d.id);
            return found ?? { dayOfWeek: d.id, openTime: "09:00", closeTime: "22:00", isOpen: true };
          });
          setHours(filled);
        }
        setHoursFetching(false);
      })
      .catch(() => setHoursFetching(false));
  }, [restaurant?.id]);

  /* sync profile when restaurant prop changes */
  useEffect(() => {
    if (!restaurant) return;
    setProfile({
      name:              restaurant.name              ?? "",
      nameAr:            restaurant.nameAr            ?? "",
      description:       restaurant.description       ?? "",
      phone:             restaurant.phone             ?? "",
      address:           restaurant.address           ?? "",
      category:          restaurant.category          ?? CATEGORIES[0],
      estimatedPrepTime: restaurant.estimatedPrepTime ?? 25,
      minimumOrder:      restaurant.minimumOrder      ?? 0,
    });
  }, [restaurant?.id]);

  /* ─── save profile ─── */
  const saveProfile = async () => {
    setProfileLoading(true);
    const token = localStorage.getItem("tc_token");
    const res = await fetch(`/api/restaurants/${restaurant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...profile,
        estimatedPrepTime: Number(profile.estimatedPrepTime),
        minimumOrder:      Number(profile.minimumOrder),
      }),
    });
    setProfileLoading(false);
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
      setProfileSaved(true);
      toast({ title: "Profil mis à jour" });
      setTimeout(() => setProfileSaved(false), 2500);
    } else {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    }
  };

  /* ─── save hours ─── */
  const saveHours = async () => {
    setHoursLoading(true);
    const token = localStorage.getItem("tc_token");
    const res = await fetch(`/api/restaurants/${restaurant.id}/hours`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ hours }),
    });
    setHoursLoading(false);
    if (res.ok) {
      setHoursSaved(true);
      toast({ title: "Horaires enregistrés" });
      setTimeout(() => setHoursSaved(false), 2500);
    } else {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    }
  };

  const updateHour = (dayId: number, field: keyof HourEntry, value: any) => {
    setHours(prev => prev.map(h => h.dayOfWeek === dayId ? { ...h, [field]: value } : h));
  };

  const applyAllDays = (source: HourEntry) => {
    setHours(prev => prev.map(h => ({
      ...h,
      openTime:  source.openTime,
      closeTime: source.closeTime,
    })));
    toast({ title: "Horaires appliqués à tous les jours" });
  };

  /* ─── render ─── */
  return (
    <div className="space-y-6">

      {/* ════ PROFIL ════ */}
      <SectionCard title="Profil du restaurant" icon={<Store className="w-4 h-4" />}>
        <div className="grid md:grid-cols-2 gap-5">
          <Field label="Nom (FR)" hint="Affiché sur la plateforme">
            <Input
              value={profile.name}
              onChange={v => setProfile(p => ({ ...p, name: v }))}
              placeholder="Ex: Le Jardin du Goût"
            />
          </Field>

          <Field label="الاسم (AR)" hint="يظهر للعملاء بالعربية">
            <Input
              value={profile.nameAr}
              onChange={v => setProfile(p => ({ ...p, nameAr: v }))}
              placeholder="حديقة الذوق"
              className="text-right font-arabic"
            />
          </Field>

          <Field label="Catégorie" hint="Type de cuisine">
            <Select
              value={profile.category}
              onChange={v => setProfile(p => ({ ...p, category: v }))}
              options={CATEGORIES}
            />
          </Field>

          <Field label="Téléphone" hint="Numéro de contact">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={profile.phone}
                onChange={v => setProfile(p => ({ ...p, phone: v }))}
                placeholder="+213 XX XX XX XX"
                className="pl-9"
              />
            </div>
          </Field>

          <Field label="Adresse" hint="Adresse complète de votre restaurant" >
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Textarea
                value={profile.address}
                onChange={v => setProfile(p => ({ ...p, address: v }))}
                placeholder="12 Rue Didouche Mourad, Alger"
                rows={2}
              />
            </div>
          </Field>

          <Field label="Description" hint="Décrivez votre restaurant en quelques mots">
            <Textarea
              value={profile.description}
              onChange={v => setProfile(p => ({ ...p, description: v }))}
              placeholder="Cuisine fraîche et raffinée..."
              rows={2}
            />
          </Field>

          <Field label="Temps de préparation (min)" hint="Durée moyenne estimée">
            <div className="relative">
              <ChefHat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="number"
                value={profile.estimatedPrepTime}
                onChange={v => setProfile(p => ({ ...p, estimatedPrepTime: Number(v) }))}
                className="pl-9"
              />
            </div>
          </Field>

          <Field label="Commande minimum (DA)" hint="Montant minimum par commande">
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="number"
                value={profile.minimumOrder}
                onChange={v => setProfile(p => ({ ...p, minimumOrder: Number(v) }))}
                className="pl-9"
              />
            </div>
          </Field>
        </div>

        <div className="flex items-center justify-end mt-6 pt-5 border-t border-slate-100 gap-3">
          {profileSaved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Sauvegardé
            </span>
          )}
          <Button onClick={saveProfile} disabled={profileLoading} className="gap-2 rounded-xl">
            <Save className="w-4 h-4" />
            {profileLoading ? "Enregistrement…" : "Enregistrer le profil"}
          </Button>
        </div>
      </SectionCard>

      {/* ════ HORAIRES ════ */}
      <SectionCard title="Horaires d'ouverture" icon={<Clock className="w-4 h-4" />}>
        {hoursFetching ? (
          <div className="py-8 text-center text-sm text-slate-400">Chargement des horaires…</div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
              <p className="text-xs text-blue-700">
                Activez ou désactivez chaque jour. Définissez les horaires d'ouverture et de fermeture.
                Cliquez sur <strong>Copier vers tous</strong> pour appliquer un horaire à tous les jours.
              </p>
            </div>

            {/* Header */}
            <div className="grid grid-cols-[2rem_1fr_6.5rem_6.5rem_7rem] gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span />
              <span>Jour</span>
              <span className="text-center">Ouverture</span>
              <span className="text-center">Fermeture</span>
              <span className="text-center">Action</span>
            </div>

            {/* Rows */}
            <div className="space-y-1.5">
              {DAYS.map(day => {
                const h = hours.find(x => x.dayOfWeek === day.id) ?? {
                  dayOfWeek: day.id, openTime: "09:00", closeTime: "22:00", isOpen: true,
                };
                return (
                  <div
                    key={day.id}
                    className={cn(
                      "grid grid-cols-[2rem_1fr_6.5rem_6.5rem_7rem] gap-3 items-center px-3 py-3 rounded-xl border transition-all",
                      h.isOpen
                        ? "bg-white border-slate-200"
                        : "bg-slate-50 border-slate-100 opacity-60"
                    )}
                  >
                    {/* Toggle */}
                    <button
                      onClick={() => updateHour(day.id, "isOpen", !h.isOpen)}
                      className={cn("flex items-center justify-center transition-colors",
                        h.isOpen ? "text-emerald-500" : "text-slate-400"
                      )}
                    >
                      {h.isOpen
                        ? <ToggleRight className="w-6 h-6" />
                        : <ToggleLeft className="w-6 h-6" />
                      }
                    </button>

                    {/* Day name */}
                    <div>
                      <p className={cn("text-sm font-semibold", h.isOpen ? "text-slate-900" : "text-slate-400")}>
                        {day.label}
                      </p>
                      <p className="text-[11px] text-slate-400">{day.labelAr}</p>
                    </div>

                    {/* Open time */}
                    <input
                      type="time"
                      value={h.openTime}
                      onChange={e => updateHour(day.id, "openTime", e.target.value)}
                      disabled={!h.isOpen}
                      className={cn(
                        "text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-center w-full bg-white",
                        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all",
                        !h.isOpen && "opacity-40 cursor-not-allowed bg-slate-50"
                      )}
                    />

                    {/* Close time */}
                    <input
                      type="time"
                      value={h.closeTime}
                      onChange={e => updateHour(day.id, "closeTime", e.target.value)}
                      disabled={!h.isOpen}
                      className={cn(
                        "text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-center w-full bg-white",
                        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all",
                        !h.isOpen && "opacity-40 cursor-not-allowed bg-slate-50"
                      )}
                    />

                    {/* Copy action */}
                    <div className="flex justify-center">
                      {h.isOpen ? (
                        <button
                          onClick={() => applyAllDays(h)}
                          className="text-[11px] text-primary font-semibold hover:underline whitespace-nowrap px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          Copier → tous
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Fermé</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{hours.filter(h => h.isOpen).length}</span> jours ouverts sur 7
              </p>
              <span className="text-slate-300">·</span>
              <div className="flex gap-1">
                {DAYS.map(day => {
                  const h = hours.find(x => x.dayOfWeek === day.id);
                  return (
                    <span
                      key={day.id}
                      className={cn(
                        "text-[10px] font-bold w-7 h-5 flex items-center justify-center rounded",
                        h?.isOpen ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                      )}
                      title={day.label}
                    >
                      {day.label.slice(0, 2)}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end mt-6 pt-5 border-t border-slate-100 gap-3">
              {hoursSaved && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Horaires sauvegardés
                </span>
              )}
              <Button onClick={saveHours} disabled={hoursLoading} className="gap-2 rounded-xl">
                <Save className="w-4 h-4" />
                {hoursLoading ? "Enregistrement…" : "Enregistrer les horaires"}
              </Button>
            </div>
          </>
        )}
      </SectionCard>

    </div>
  );
}
