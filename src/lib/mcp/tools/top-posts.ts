import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, requireUser, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_top_posts",
  title: "Mejores posts",
  description:
    "Lista los posts de Instagram ordenados por fecha de publicación o por interacciones, con sus métricas principales.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(20).describe("Cuántos posts devolver."),
    sort_by: z
      .enum(["recent", "interactions", "reach", "likes"])
      .default("interactions")
      .describe("Criterio de orden."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, sort_by }, ctx) => {
    const userId = requireUser(ctx);
    const supabase = supabaseForUser(ctx);
    const column =
      sort_by === "recent"
        ? "published_at"
        : sort_by === "reach"
          ? "reach"
          : sort_by === "likes"
            ? "likes"
            : "interactions";
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order(column, { ascending: false, nullsFirst: false })
      .limit(limit ?? 20);
    if (error) {
      return { content: [{ type: "text" as const, text: error.message }], isError: true };
    }
    return jsonResult({ sort_by, posts: data ?? [] });
  },
});