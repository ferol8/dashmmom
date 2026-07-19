import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Refresh ----------
export const refreshAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runFullRefresh } = await import("./refresh.server");
    const steps = await runFullRefresh(context.supabase, context.userId);
    return { steps };
  });

// ---------- Bootstrap (header + last refresh) ----------
export const getBootstrap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [snap, health, insights, lastRefresh] = await Promise.all([
      supabase.from("account_snapshot").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("account_health").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("account_insights_30d").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("refresh_log")
        .select("started_at, finished_at, status")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      snapshot: snap.data,
      health: health.data,
      insights: insights.data,
      lastRefresh: lastRefresh.data,
    };
  });

// ---------- Trend tab ----------
export const getTrendData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const [daily, followers] = await Promise.all([
      supabase
        .from("daily_metrics")
        .select("date, reach, views, likes, comments_count, saves, shares, interactions, engaged")
        .eq("user_id", userId)
        .gte("date", since.toISOString().slice(0, 10))
        .order("date"),
      supabase
        .from("follower_history")
        .select("date, followers_count")
        .eq("user_id", userId)
        .order("date"),
    ]);
    return { daily: daily.data ?? [], followers: followers.data ?? [] };
  });

// ---------- Audience tab ----------
export const getAudienceData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [age, gender, country, city] = await Promise.all([
      supabase.from("demographics_age").select("*").eq("user_id", userId),
      supabase.from("demographics_gender").select("*").eq("user_id", userId),
      supabase.from("demographics_country").select("*").eq("user_id", userId).order("percentage", { ascending: false, nullsFirst: false }),
      supabase.from("demographics_city").select("*").eq("user_id", userId).order("percentage", { ascending: false, nullsFirst: false }),
    ]);
    return {
      age: age.data ?? [],
      gender: gender.data ?? [],
      country: country.data ?? [],
      city: city.data ?? [],
    };
  });

// ---------- Posts tab ----------
export const getPostsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(200);
    return { posts: data ?? [] };
  });

export const getPostComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ postId: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("comments")
      .select("*")
      .eq("user_id", userId)
      .eq("post_id", data.postId)
      .order("created_at", { ascending: false });
    return { comments: rows ?? [] };
  });

// ---------- Best time / posting frequency / decay ----------
export const getScheduleData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [bestTime, freq, decay] = await Promise.all([
      supabase.from("best_time").select("*").eq("user_id", userId),
      supabase.from("posting_frequency").select("*").eq("user_id", userId).order("posts_per_week"),
      supabase.from("content_decay").select("*").eq("user_id", userId).order("bucket_order"),
    ]);
    return {
      bestTime: bestTime.data ?? [],
      frequency: freq.data ?? [],
      decay: decay.data ?? [],
    };
  });

// ---------- Ideas ----------
export const getIdeas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [ideas, discards] = await Promise.all([
      supabase
        .from("ideas")
        .select("*")
        .eq("user_id", userId)
        .eq("discarded", false)
        .order("generated_at", { ascending: false }),
      supabase
        .from("idea_discards")
        .select("*")
        .eq("user_id", userId)
        .order("discarded_at", { ascending: false })
        .limit(50),
    ]);
    return { ideas: ideas.data ?? [], discards: discards.data ?? [] };
  });

const bucketSchema = z.enum(["comments", "dms", "top_content"]);

export const generateIdeasAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { generateIdeas } = await import("./ideas.server");
    return generateIdeas(context.supabase, context.userId, "all");
  });

export const generateIdeasBucket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bucket: bucketSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const { generateIdeas } = await import("./ideas.server");
    return generateIdeas(context.supabase, context.userId, data.bucket);
  });

export const discardIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        ideaId: z.string().uuid(),
        reasonQuick: z.string().min(1).max(80),
        reasonText: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: idea } = await supabase
      .from("ideas")
      .select("angle, source_bucket")
      .eq("user_id", userId)
      .eq("id", data.ideaId)
      .maybeSingle();
    if (!idea) throw new Error("Idea not found");
    await supabase.from("idea_discards").insert({
      user_id: userId,
      idea_id: data.ideaId,
      angle: idea.angle,
      source_bucket: idea.source_bucket,
      reason_quick: data.reasonQuick,
      reason_text: data.reasonText ?? null,
    });
    await supabase
      .from("ideas")
      .update({ discarded: true })
      .eq("user_id", userId)
      .eq("id", data.ideaId);
    return { ok: true };
  });