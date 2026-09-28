import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deleteRevenueEntry, getRevenueEntries, saveRevenueEntry } from "@/lib/dashboard.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Banknote, Clock3, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type RevenueForm = { id?: string; concept: string; entryDate: string; amount: string; status: "pending" | "paid"; notes: string };
const EMPTY: RevenueForm = { concept: "", entryDate: new Date().toISOString().slice(0, 10), amount: "", status: "pending", notes: "" };

export function TabRevenue({ currency }: { currency: string }) {
  const listFn = useServerFn(getRevenueEntries);
  const saveFn = useServerFn(saveRevenueEntry);
  const deleteFn = useServerFn(deleteRevenueEntry);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["revenue"], queryFn: () => listFn() });
  const [form, setForm] = useState<RevenueForm>(EMPTY);
  const [open, setOpen] = useState(false);
  const save = useMutation({
    mutationFn: () => saveFn({ data: { id: form.id, concept: form.concept, entryDate: form.entryDate, amount: Number(form.amount), status: form.status, notes: form.notes } }),
    onSuccess: () => { toast.success("Ingreso guardado"); setOpen(false); setForm(EMPTY); qc.invalidateQueries({ queryKey: ["revenue"] }); },
    onError: () => toast.error("No se pudo guardar el ingreso"),
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteFn({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["revenue"] }) });
  const entries = data?.entries ?? [];
  const paid = entries.filter((entry) => entry.status === "paid").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const pending = entries.filter((entry) => entry.status === "pending").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const money = (value: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(value);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5 shadow-none"><p className="text-sm text-muted-foreground">Total registrado</p><p className="mt-2 text-3xl font-semibold">{money(paid + pending)}</p></Card>
        <Card className="p-5 shadow-none"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Banknote className="size-4 text-success" /> Cobrado</p><p className="mt-2 text-3xl font-semibold">{money(paid)}</p></Card>
        <Card className="p-5 shadow-none"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4 text-chart-3" /> Pendiente</p><p className="mt-2 text-3xl font-semibold">{money(pending)}</p></Card>
      </div>
      <Card className="overflow-hidden shadow-none">
        <div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">Colaboraciones y ventas</h2><p className="mt-1 text-xs text-muted-foreground">Registro manual de tus ingresos</p></div><Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="size-4" /> Añadir</Button></div>
        {isLoading ? <div className="p-8 text-sm text-muted-foreground">Cargando…</div> : entries.length ? (
          <div className="divide-y">
            {entries.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center gap-3 p-4">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setForm({ id: entry.id, concept: entry.concept, entryDate: entry.entry_date, amount: String(entry.amount), status: entry.status as "pending" | "paid", notes: entry.notes ?? "" }); setOpen(true); }}>
                  <p className="truncate font-medium">{entry.concept}</p><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${entry.entry_date}T00:00:00Z`))}</p>
                </button>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${entry.status === "paid" ? "bg-success/10 text-success" : "bg-chart-3/10 text-chart-3"}`}>{entry.status === "paid" ? "Cobrado" : "Pendiente"}</span>
                <strong>{money(Number(entry.amount))}</strong>
                <Button variant="ghost" size="icon" title="Eliminar" onClick={() => remove.mutate(entry.id)}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
        ) : <div className="p-10 text-center text-sm text-muted-foreground">Aún no has registrado ingresos.</div>}
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{form.id ? "Editar ingreso" : "Nuevo ingreso"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2"><Label htmlFor="concept">Concepto</Label><Input id="concept" value={form.concept} onChange={(e) => setForm((prev) => ({ ...prev, concept: e.target.value }))} placeholder="Colaboración, afiliados, venta…" /></div>
            <div className="space-y-2"><Label htmlFor="entry-date">Fecha</Label><Input id="entry-date" type="date" value={form.entryDate} onChange={(e) => setForm((prev) => ({ ...prev, entryDate: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="amount">Importe ({currency})</Label><Input id="amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Estado</Label><Select value={form.status} onValueChange={(value: "pending" | "paid") => setForm((prev) => ({ ...prev, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendiente</SelectItem><SelectItem value="paid">Cobrado</SelectItem></SelectContent></Select></div>
            <div className="sm:col-span-2 space-y-2"><Label htmlFor="notes">Notas</Label><Textarea id="notes" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
          </div>
          <Button onClick={() => save.mutate()} disabled={!form.concept || !form.amount || save.isPending}>{save.isPending ? "Guardando…" : "Guardar ingreso"}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}