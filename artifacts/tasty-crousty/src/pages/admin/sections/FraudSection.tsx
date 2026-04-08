import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useListFraudFlags, useResolveFraudFlag } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Eye } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-yellow-100 text-yellow-800 border-yellow-200",
  medium: "bg-orange-100 text-orange-800 border-orange-200",
  high: "bg-red-100 text-red-800 border-red-200",
  critical: "bg-red-200 text-red-900 border-red-300",
};
const SEVERITY_LABELS: Record<string, string> = {
  low: "Faible", medium: "Moyen", high: "Élevé", critical: "Critique",
};
const CARD_BORDER: Record<string, string> = {
  low: "", medium: "border-orange-200", high: "border-red-200", critical: "border-red-400 bg-red-50/30",
};

const SEVERITY_FILTERS = [
  { label: "Tous", value: "" },
  { label: "Non résolus", resolved: false },
  { label: "Critique", value: "critical" },
  { label: "Élevé", value: "high" },
  { label: "Moyen", value: "medium" },
  { label: "Faible", value: "low" },
  { label: "Résolus", resolved: true },
];

export function FraudSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [severity, setSeverity] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState<boolean | undefined>(false);
  const [filterIdx, setFilterIdx] = useState(1);

  const { data: flags, isLoading, refetch } = useListFraudFlags(
    { severity: severity || undefined, resolved: resolvedFilter },
    { query: { refetchInterval: 30000 } }
  );

  const resolve = useResolveFraudFlag();

  const handleResolve = (flagId: number) => {
    resolve.mutate({ flagId }, {
      onSuccess: () => { toast({ title: "Flag résolu" }); refetch(); },
    });
  };

  const handleFilter = (idx: number) => {
    const f = SEVERITY_FILTERS[idx];
    setFilterIdx(idx);
    setSeverity((f as any).value ?? "");
    setResolvedFilter((f as any).resolved);
  };

  const criticalCount = (flags ?? []).filter(f => f.severity === "critical" && !f.isResolved).length;
  const highCount = (flags ?? []).filter(f => f.severity === "high" && !f.isResolved).length;
  const openCount = (flags ?? []).filter(f => !f.isResolved).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fraude & Litiges</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {openCount} flag{openCount !== 1 ? "s" : ""} non résolu{openCount !== 1 ? "s" : ""}
            {criticalCount > 0 && <span className="ml-2 text-red-600 font-medium">· {criticalCount} critique{criticalCount > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
        </Button>
      </div>

      {/* Critical alert */}
      {criticalCount > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">{criticalCount} alerte{criticalCount > 1 ? "s" : ""} critique{criticalCount > 1 ? "s" : ""}</p>
            <p className="text-xs text-red-700 mt-0.5">Des comportements frauduleux critiques ont été détectés. Intervention immédiate recommandée.</p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700 shrink-0" onClick={() => handleFilter(2)}>
            Voir
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {["critical", "high", "medium", "low"].map(sev => {
          const count = (flags ?? []).filter(f => f.severity === sev && !f.isResolved).length;
          return (
            <Card key={sev} className={count > 0 ? CARD_BORDER[sev] : ""}>
              <CardContent className="pt-3 pb-3 px-3">
                <p className="text-xs text-slate-500 capitalize">{SEVERITY_LABELS[sev]}</p>
                <p className={`text-xl font-bold mt-0.5 ${count > 0 && sev !== "low" ? "text-red-600" : "text-slate-800"}`}>
                  {count}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {SEVERITY_FILTERS.map((f, idx) => (
          <button
            key={idx}
            onClick={() => handleFilter(idx)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterIdx === idx
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Flags list */}
      {isLoading && (
        <div className="text-center py-10 text-sm text-slate-400">Chargement…</div>
      )}
      {!isLoading && !flags?.length && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-10 h-10 mx-auto mb-3 text-green-400" />
            <p className="font-medium text-slate-700">Aucun flag de fraude</p>
            <p className="text-sm text-slate-400 mt-1">La plateforme est sécurisée.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {flags?.map(flag => (
          <Card key={flag.id} className={`border ${CARD_BORDER[flag.severity]} ${flag.isResolved ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${
                      flag.severity === "critical" ? "text-red-700" :
                      flag.severity === "high" ? "text-red-500" :
                      flag.severity === "medium" ? "text-orange-500" : "text-yellow-500"
                    }`} />
                    <span className="font-medium text-sm text-slate-800">{flag.userName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_COLORS[flag.severity]}`}>
                      {SEVERITY_LABELS[flag.severity]}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {flag.userRole === "customer" ? "Client" : flag.userRole === "driver" ? "Livreur" : flag.userRole}
                    </span>
                    {flag.isResolved && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Résolu
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{flag.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <span>{flag.type}</span>
                    <span>·</span>
                    <span>{new Date(flag.createdAt).toLocaleString("fr-FR")}</span>
                    {flag.relatedOrderId && <span>· Commande #{flag.relatedOrderId}</span>}
                  </div>
                </div>
                {!flag.isResolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={() => handleResolve(flag.id)}
                    disabled={resolve.isPending}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Résoudre
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
