// Server-only idea generation: assembles cached context, calls Claude,
// parses ideas, persists them.

import type { SupabaseClient } from "@supabase/supabase-js";
import { anthropicGenerate, parseJsonFromText } from "./anthropic.server";
import { IDEAS_SYSTEM_PROMPT } from "./system-prompt.server";
import {
  isSubstantiveComment,
  isSubstantiveDm,
  isLikelyBotMessage,
} from "./idea-filters.server";

type SB = SupabaseClient;
export type IdeaBucket = "comments" | "dms" | "top_content";

interface ClaudeIdea {
  source_bucket?: string;
  angle?: string;
  format?: string;
  evidence_quotes?: string[];
  why_good_idea?: string;
  suggested_angle?: string;
  rationale?: string;
  basis_post_ids?: string[];
  basis_comment_ids?: string[];
  basis_message_ids?: string[];
}

interface ClaudeResponse {
  ideas?: ClaudeIdea[];
}

async function loadContext(sb: SB, userId: string) {
  const [
    topPostsRes,
    commentsRes,
    messagesRes,
    demoAgeRes,
    demoGenderRes,
    demoCountryRes,
    bestTimeRes,
  ] = await Promise.all([
    sb
      .from("posts")
      .select("id, caption, permalink, published_at, likes, comments_count, saves, shares, views, engagement_rate")
      .eq("user_id", userId)
      .order("engagement_rate", { ascending: false, nullsFirst: false })
      .limit(15),
    sb
      .from("comments")
      .select("id, post_id, author_username, text, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(400),
    sb
      .from("messages")
      .select("id, conversation_id, sender_username, is_from_me, text, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(300),
    sb.from("demographics_age").select("bucket, percentage").eq("user_id", userId),
    sb.from("demographics_gender").select("bucket, percentage").eq("user_id", userId),
    sb
      .from("demographics_country")
      .select("bucket, percentage")
      .eq("user_id", userId)
      .order("percentage", { ascending: false, nullsFirst: false })
      .limit(10),
    sb.from("best_time").select("day_of_week, hour, score").eq("user_id", userId).limit(50),
  ]);

  const topPosts = topPostsRes.data ?? [];
  const allComments = commentsRes.data ?? [];
  const allMessages = messagesRes.data ?? [];

  const substantiveComments = allComments.filter(
    (c) => c.text && isSubstantiveComment(c.text),
  );
  const substantiveDms = allMessages.filter(
    (m) => !m.is_from_me && m.text && isSubstantiveDm(m.text) && !isLikelyBotMessage(m.text),
  );

  return {
    topPosts,
    substantiveComments,
    substantiveDms,
    demographics: {
      age: demoAgeRes.data ?? [],
      gender: demoGenderRes.data ?? [],
      country: demoCountryRes.data ?? [],
    },
    bestTime: bestTimeRes.data ?? [],
  };
}

function formatCachedContext(ctx: Awaited<ReturnType<typeof loadContext>>): string {
  const lines: string[] = [];
  lines.push("# CONTEXTO DE LA CUENTA (usado como base para las ideas)\n");

  lines.push("## TOP POSTS (ordenados por engagement)");
  for (const p of ctx.topPosts) {
    lines.push(
      `- id=${p.id} | likes=${p.likes ?? 0} coments=${p.comments_count ?? 0} views=${p.views ?? 0} ER=${p.engagement_rate ?? "-"} | ${p.permalink ?? ""}`,
    );
    if (p.caption) {
      const caption = p.caption.slice(0, 500).replace(/\s+/g, " ");
      lines.push(`  caption: "${caption}"`);
    }
  }
  lines.push("");

  lines.push("## COMENTARIOS SUSTANTIVOS (pre-filtrados)");
  for (const c of ctx.substantiveComments.slice(0, 250)) {
    const t = (c.text ?? "").replace(/\s+/g, " ").slice(0, 400);
    lines.push(`- id=${c.id} post=${c.post_id} @${c.author_username ?? "?"} : "${t}"`);
  }
  lines.push("");

  lines.push("## DMs SUSTANTIVOS de la audiencia (pre-filtrados, excluye respuestas de la creadora)");
  for (const m of ctx.substantiveDms.slice(0, 200)) {
    const t = (m.text ?? "").replace(/\s+/g, " ").slice(0, 400);
    lines.push(`- id=${m.id} @${m.sender_username ?? "?"} : "${t}"`);
  }
  lines.push("");

  lines.push("## DEMOGRAFÍA");
  lines.push(
    `Edad: ${ctx.demographics.age.map((d) => `${d.bucket}=${d.percentage ?? "-"}%`).join(", ") || "—"}`,
  );
  lines.push(
    `Género: ${ctx.demographics.gender.map((d) => `${d.bucket}=${d.percentage ?? "-"}%`).join(", ") || "—"}`,
  );
  lines.push(
    `País top: ${ctx.demographics.country.map((d) => `${d.bucket}=${d.percentage ?? "-"}%`).join(", ") || "—"}`,
  );
  lines.push("");

  lines.push("## MEJOR HORA HISTÓRICA (UTC)");
  const bt = ctx.bestTime
    .slice()
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 8);
  for (const b of bt) {
    lines.push(`- dow=${b.day_of_week} hora=${b.hour} score=${b.score ?? "-"}`);
  }

  return lines.join("\n");
}

async function loadRecentDiscards(sb: SB, userId: string, limit = 50) {
  const { data } = await sb
    .from("idea_discards")
    .select("angle, source_bucket, reason_quick, reason_text, discarded_at")
    .eq("user_id", userId)
    .order("discarded_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

function formatDiscardsBlock(
  discards: Array<{
    angle: string | null;
    source_bucket: string | null;
    reason_quick: string | null;
    reason_text: string | null;
  }>,
): string {
  if (discards.length === 0) return "";
  const lines = [
    "",
    "## Ideas que el usuario YA descartó previamente (NO repitas ni hagas variantes muy similares)",
  ];
  for (const d of discards) {
    const reason = [d.reason_quick, d.reason_text].filter(Boolean).join(" — ");
    lines.push(
      `- [${d.source_bucket ?? "?"}] "${d.angle ?? ""}"${reason ? ` — razón: ${reason}` : ""}`,
    );
  }
  lines.push(
    "",
    "Aprende de estos descartes: identifica el patrón (qué ángulos, formatos",
    "o temas no le gustan) y NO propongas variantes similares en esta generación.",
  );
  return lines.join("\n");
}

function buildInstruction(mode: "all" | IdeaBucket, discardsBlock: string): string {
  const targetLine =
    mode === "all"
      ? "Genera hasta 25 ideas distribuidas así (son objetivos, no mínimos): 10 de `comments`, 5 de `dms`, 10 de `top_content`."
      : mode === "comments"
        ? "Genera hasta 10 ideas del bucket `comments` únicamente."
        : mode === "dms"
          ? "Genera hasta 5 ideas del bucket `dms` únicamente."
          : "Genera hasta 10 ideas del bucket `top_content` únicamente.";

  return [
    `# Instrucción para esta generación`,
    targetLine,
    "Devuelve SOLO el JSON en el formato indicado en el system prompt. Sin texto extra.",
    discardsBlock,
  ].join("\n");
}

export async function generateIdeas(
  sb: SB,
  userId: string,
  mode: "all" | IdeaBucket,
): Promise<{ inserted: number; batchId: string }> {
  const [ctx, discards] = await Promise.all([
    loadContext(sb, userId),
    loadRecentDiscards(sb, userId),
  ]);

  const cachedContext = formatCachedContext(ctx);
  const instruction = buildInstruction(mode, formatDiscardsBlock(discards));

  const result = await anthropicGenerate({
    system: IDEAS_SYSTEM_PROMPT,
    cachedContext,
    userInstruction: instruction,
    maxTokens: 16000,
  });

  const parsed = parseJsonFromText<ClaudeResponse>(result.text);
  const ideas = parsed.ideas ?? [];

  const batchId = `batch_${Date.now()}`;
  const validBuckets = new Set(["comments", "dms", "top_content"]);

  const rows = ideas
    .filter((idea) => {
      const bucket = idea.source_bucket ?? "top_content";
      if (!validBuckets.has(bucket)) return false;
      // Enforce evidence rule: must have at least one basis id and one quote
      const hasBasis =
        (idea.basis_post_ids?.length ?? 0) +
          (idea.basis_comment_ids?.length ?? 0) +
          (idea.basis_message_ids?.length ?? 0) >
        0;
      const hasQuote = (idea.evidence_quotes?.length ?? 0) > 0;
      return hasBasis && hasQuote && idea.angle;
    })
    .map((idea) => ({
      user_id: userId,
      batch_id: batchId,
      source_bucket: idea.source_bucket ?? "top_content",
      angle: idea.angle ?? null,
      format: idea.format ?? null,
      rationale: idea.rationale ?? null,
      basis_post_ids: idea.basis_post_ids ?? [],
      basis_comment_ids: idea.basis_comment_ids ?? [],
      basis_message_ids: idea.basis_message_ids ?? [],
      evidence_quotes: idea.evidence_quotes ?? [],
      why_good_idea: idea.why_good_idea ?? null,
      suggested_angle: idea.suggested_angle ?? null,
      discarded: false,
    }));

  if (rows.length > 0) {
    // For "bucket" regen, remove previous non-discarded ideas of that bucket first
    if (mode !== "all") {
      await sb
        .from("ideas")
        .delete()
        .eq("user_id", userId)
        .eq("source_bucket", mode)
        .eq("discarded", false);
    } else {
      await sb.from("ideas").delete().eq("user_id", userId).eq("discarded", false);
    }
    await sb.from("ideas").insert(rows);
  }

  return { inserted: rows.length, batchId };
}