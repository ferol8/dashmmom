import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getReportData } from "@/lib/dashboard.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart3, Download, FileSpreadsheet, Users } from "lucide-react";
import { toast } from "sonner";

type Period = 7 | 28 | 90;
type Row = Record<string, unknown>;

function downloadCsv(filename: string, rows: Row[]) {
  if (!rows.length) { toast.info("No hay datos para exportar en este periodo"); return; }
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

export function TabReports({ days }: { days: Period }) {
  const reportFn = useServerFn(getReportData);
  const report = useMutation({ mutationFn: () => reportFn({ data: { days } }), onError: () => toast.error("No se pudo preparar el reporte") });
  const run = async (kind: "daily" | "posts" | "audience" | "revenue") => {
    const data = await report.mutateAsync();
    downloadCsv(`mueblemom-${kind}-${days}d.csv`, data[kind] as Row[]);
  };
  const options = [
    { key: "daily", title: "Resumen diario", description: "Alcance, vistas e interacciones por fecha", icon: BarChart3 },
    { key: "posts", title: "Rendimiento de contenido", description: "Métricas y enlaces de cada publicación", icon: FileSpreadsheet },
    { key: "audience", title: "Audiencia", description: "Edad, género, países y ciudades", icon: Users },
    { key: "revenue", title: "Ingresos", description: "Importes, estados y conceptos registrados", icon: Download },
  ] as const;
  return <div className="grid gap-4 md:grid-cols-2">{options.map((option) => { const Icon = option.icon; return <Card key={option.key} className="flex items-center gap-4 p-5 shadow-none"><span className="grid size-11 place-items-center rounded-md bg-primary/10"><Icon className="size-5 text-primary" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{option.title}</h2><p className="mt-1 text-sm text-muted-foreground">{option.description}</p></div><Button variant="outline" size="icon" title={`Descargar ${option.title}`} onClick={() => run(option.key)} disabled={report.isPending}><Download className="size-4" /></Button></Card>; })}</div>;
}