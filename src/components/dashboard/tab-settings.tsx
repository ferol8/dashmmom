import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardPreferences, saveDashboardPreferences } from "@/lib/dashboard.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Period = 7 | 28 | 90;

export function TabSettings() {
  const getFn = useServerFn(getDashboardPreferences);
  const saveFn = useServerFn(saveDashboardPreferences);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dashboard-preferences"], queryFn: () => getFn() });
  const [timezone, setTimezone] = useState("America/Mexico_City");
  const [defaultPeriod, setDefaultPeriod] = useState<Period>(28);
  const [currency, setCurrency] = useState<"MXN" | "USD" | "EUR">("MXN");
  useEffect(() => {
    if (!data?.preferences) return;
    setTimezone(data.preferences.timezone);
    setDefaultPeriod(data.preferences.default_period as Period);
    setCurrency(data.preferences.currency as "MXN" | "USD" | "EUR");
  }, [data]);
  const save = useMutation({
    mutationFn: () => saveFn({ data: { timezone, defaultPeriod, currency } }),
    onSuccess: () => { toast.success("Preferencias guardadas"); qc.invalidateQueries({ queryKey: ["dashboard-preferences"] }); },
    onError: () => toast.error("No se pudieron guardar las preferencias"),
  });
  return <div className="max-w-2xl space-y-4">
    <Card className="space-y-5 p-5 shadow-none">
      <div><h2 className="font-semibold">Preferencias del panel</h2><p className="mt-1 text-sm text-muted-foreground">Configura cómo se muestran tus datos.</p></div>
      <div className="space-y-2"><Label>Zona horaria</Label><Select value={timezone} onValueChange={setTimezone}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="America/Mexico_City">Ciudad de México</SelectItem><SelectItem value="America/Cancun">Cancún</SelectItem><SelectItem value="America/Tijuana">Tijuana</SelectItem><SelectItem value="America/New_York">Nueva York</SelectItem><SelectItem value="Europe/Madrid">Madrid</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Periodo predeterminado</Label><Select value={String(defaultPeriod)} onValueChange={(value) => setDefaultPeriod(Number(value) as Period)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Últimos 7 días</SelectItem><SelectItem value="28">Últimos 28 días</SelectItem><SelectItem value="90">Últimos 90 días</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Moneda</Label><Select value={currency} onValueChange={(value: "MXN" | "USD" | "EUR") => setCurrency(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MXN">MXN — Peso mexicano</SelectItem><SelectItem value="USD">USD — Dólar</SelectItem><SelectItem value="EUR">EUR — Euro</SelectItem></SelectContent></Select></div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar cambios"}</Button>
    </Card>
  </div>;
}