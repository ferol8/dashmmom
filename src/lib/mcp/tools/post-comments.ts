import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, requireUser, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_post_comments",
  title: "Comentarios de un post",
  description:
    "Devuelve los comentarios guardados de un post concreto. Usa get_top_posts para obtener el post_id.",
  inputSchema: {
    post_id: z.string().min(1).describe("ID del post tal como aparece en get_top_posts."),
    limit: z.number().int().min(1).max(200).default(100).describe("Máximo de comentarios."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ post_id, limit }, ctx) => {
    const userId = requireUser(ctx);
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("user_id", userId)
      .eq("post_id", post_id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 100);
    if (error) {
      return { content: [{ type: "text" as const, text: error.message }], isError: true };
    }
    return jsonResult({ post_id, comments: data ?? [] });
  },
});