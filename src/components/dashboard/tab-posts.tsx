import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPostsData, getPostComments } from "@/lib/dashboard.functions";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { formatNumber } from "./health-badge";

export function TabPosts() {
  const fn = useServerFn(getPostsData);
  const { data, isLoading } = useQuery({ queryKey: ["posts"], queryFn: () => fn() });
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  const posts = data?.posts ?? [];
  if (posts.length === 0) {
    return <Card className="p-8 text-center text-muted-foreground">Aún no hay posts sincronizados.</Card>;
  }
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {posts.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpenPostId(p.id)}
            className="text-left"
          >
            <Card className="overflow-hidden hover:ring-2 hover:ring-primary/40 transition p-0">
              <div className="aspect-square bg-muted relative">
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>❤ {formatNumber(p.likes)}</span>
                  <span>💬 {formatNumber(p.comments_count)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>👁 {formatNumber(p.views)}</span>
                  <span>ER {p.engagement_rate != null ? Number(p.engagement_rate).toFixed(2) + "%" : "—"}</span>
                </div>
                {p.caption ? (
                  <div className="line-clamp-2 text-muted-foreground">{p.caption}</div>
                ) : null}
              </div>
            </Card>
          </button>
        ))}
      </div>
      <PostDialog postId={openPostId} onClose={() => setOpenPostId(null)} />
    </>
  );
}

function PostDialog({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const fn = useServerFn(getPostComments);
  const { data, isLoading } = useQuery({
    queryKey: ["post-comments", postId],
    queryFn: () => fn({ data: { postId: postId! } }),
    enabled: !!postId,
  });
  return (
    <Dialog open={!!postId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comentarios del post</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <div className="space-y-3">
            {(data?.comments ?? []).map((c) => (
              <div key={c.id} className="text-sm border-b border-border pb-2">
                <div className="font-medium">@{c.author_username ?? "?"}</div>
                <div className="text-muted-foreground">{c.text}</div>
              </div>
            ))}
            {(data?.comments ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin comentarios visibles.</div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
