import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBootstrap } from "@/lib/dashboard.functions";
import { KpiCard } from "./kpi-card";
import { formatNumber } from "./health-badge";
import { Card } from "@/components/ui/card";

export function TabResumen() {
  const fn = useServerFn(getBootstrap);
  const { data, isLoading } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => fn(),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  const i = data?.insights;
  if (!i) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Sin datos aún. Pulsa <b>Refrescar datos</b> arriba para traer las métricas de los últimos 30 días.
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard label="Alcance" value={formatNumber(i.reach)} accent="primary" />
      <KpiCard label="Vistas" value={formatNumber(i.views)} />
      <KpiCard label="Cuentas engaged" value={formatNumber(i.engaged)} accent="sage" />
      <KpiCard label="Interacciones" value={formatNumber(i.interactions)} />
      <KpiCard label="Likes" value={formatNumber(i.likes)} />
      <KpiCard label="Comentarios" value={formatNumber(i.comments_count)} />
      <KpiCard label="Guardados" value={formatNumber(i.saves)} accent="sage" />
      <KpiCard label="Compartidos" value={formatNumber(i.shares)} />
      <KpiCard
        label="Tasa de engagement"
        value={i.engagement_rate != null ? `${Number(i.engagement_rate).toFixed(2)}%` : "—"}
        accent="primary"
        className="md:col-span-4"
      />
    </div>
  );
}
*** End Patch