import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getIdeas, generateIdeasAll, generateIdeasBucket, discardIdea,
} from "@/lib/dashboard.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Trash2, RefreshCw } from "lucide-react";

const BUCKETS = [
  { key: "top_current", label: "Refuerzo — top actual", color: "primary" },
  { key: "post_style", label: "Estilo de posts", color: "sage" },
  { key: "audience", label: "Audiencia", color: "sage" },
  { key: "posting_style", label: "Estilo de publicación", color: "primary" },
] as const;

export function TabIdeas() {
  const qc = useQueryClient();
  const listFn = useServerFn(getIdeas);
  const allFn = useServerFn(generateIdeasAll);
  const bucketFn = useServerFn(generateIdeasBucket);
  const discardFn = useServerFn(discardIdea);

  const { data, isLoading } = useQuery({ queryKey: ["ideas"], queryFn: () => listFn() });

  const genAll = useMutation({
    mutationFn: () => allFn(),
    onSuccess: () => {
      toast.success("Ideas generadas");
      qc.invalidateQueries({ queryKey: ["ideas"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });
  const genBucket = useMutation({
    mutationFn: (bucket: string) => bucketFn({ data: { bucket } }),
    onSuccess: () => {
      toast.success("Nuevas ideas");
      qc.invalidateQueries({ queryKey: ["ideas"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });
  const discard = useMutation({
    mutationFn: (id: string) => discardFn({ data: { ideaId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ideas"] }),
  });

  const ideas = data?.ideas ?? [];
  const busy = genAll.isPending || genBucket.isPending;

  return (
    <div className="space-y-6">
      <Card className="p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Ideas de contenido con IA
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Claude Sonnet analiza métricas, comentarios y demografía para proponer 8-12 ideas por bucket.
          </p>
        </div>
        <Button onClick={() => genAll.mutate()} disabled={busy}>
          {genAll.isPending ? "Generando…" : "Generar 4 buckets"}
        </Button>
      </Card>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Cargando…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {BUCKETS.map((b) => {
            const items = ideas.filter((i) => i.bucket === b.key);
            return (
              <Card key={b.key} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{b.label}</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => genBucket.mutate(b.key)}
                    disabled={busy}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerar
                  </Button>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aún sin ideas en este bucket.</p>
                ) : (
                  <ul className="space-y-3">
                    {items.map((i) => (
                      <li key={i.id} className="text-sm border-l-2 border-primary/30 pl-3 group">
                        <div className="flex justify-between gap-2 items-start">
                          <div className="font-medium">{i.title}</div>
                          <button
                            onClick={() => discard.mutate(i.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            title="No me interesa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {i.rationale ? (
                          <div className="text-xs text-muted-foreground mt-1">{i.rationale}</div>
                        ) : null}
                        {i.hook ? (
                          <div className="text-xs mt-1 italic">"{i.hook}"</div>
                        ) : null}
                        {i.tags && i.tags.length > 0 ? (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {i.tags.slice(0, 3).map((t) => (
                              <Badge key={t} variant="secondary" className="text-[10px]">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}