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

const periodSchema = z.object({ days: z.union([z.literal(7), z.literal(28), z.literal(90)]) });

export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => periodSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const currentStart = new Date();
    currentStart.setUTCHours(0, 0, 0, 0);
    currentStart.setUTCDate(currentStart.getUTCDate() - data.days + 1);
    const previousStart = new Date(currentStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - data.days);
    const [metricsResult, postsResult] = await Promise.all([
      supabase
        .from("daily_metrics")
        .select("date, reach, views, likes, comments_count, shares, interactions")
        .eq("user_id", userId)
        .gte("date", previousStart.toISOString().slice(0, 10))
        .order("date"),
      supabase
        .from("posts")
        .select("id, post_type, caption, permalink, thumbnail_url, media_url, published_at, views, reach, interactions, engagement_rate, likes, comments_count, shares")
        .eq("user_id", userId)
        .order("interactions", { ascending: false, nullsFirst: false })
        .limit(5),
    ]);
    const rows = metricsResult.data ?? [];
    const current = rows.filter((row) => row.date >= currentStart.toISOString().slice(0, 10));
    const previous = rows.filter((row) => row.date < currentStart.toISOString().slice(0, 10));
    const sum = (items: typeof rows, key: keyof (typeof rows)[number]) =>
      items.reduce((total, row) => total + Number(row[key] ?? 0), 0);
    const totals = {
      views: sum(current, "views"), likes: sum(current, "likes"),
      comments_count: sum(current, "comments_count"), shares: sum(current, "shares"),
      reach: sum(current, "reach"), interactions: sum(current, "interactions"),
    };
    const previousTotals = {
      views: sum(previous, "views"), likes: sum(previous, "likes"),
      comments_count: sum(previous, "comments_count"), shares: sum(previous, "shares"),
      reach: sum(previous, "reach"), interactions: sum(previous, "interactions"),
    };
    const engagement = totals.reach > 0 ? (totals.interactions / totals.reach) * 100 : 0;
    const previousEngagement = previousTotals.reach > 0 ? (previousTotals.interactions / previousTotals.reach) * 100 : 0;
    return { daily: current, totals, previousTotals, engagement, previousEngagement, featured: postsResult.data ?? [] };
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

// ---------- Revenue ----------
export const getRevenueEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("revenue_entries")
      .select("*")
      .eq("user_id", context.userId)
      .order("entry_date", { ascending: false });
    if (error) throw error;
    return { entries: data ?? [] };
  });

const revenueSchema = z.object({
  id: z.string().uuid().optional(),
  concept: z.string().trim().min(1).max(120),
  entryDate: z.string().date(),
  amount: z.number().min(0).max(999999999),
  status: z.enum(["pending", "paid"]),
  notes: z.string().max(500).optional(),
});

export const saveRevenueEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => revenueSchema.parse(d))
  .handler(async ({ context, data }) => {
    const payload = {
      user_id: context.userId,
      concept: data.concept,
      entry_date: data.entryDate,
      amount: data.amount,
      status: data.status,
      notes: data.notes || null,
    };
    const query = data.id
      ? context.supabase.from("revenue_entries").update(payload).eq("id", data.id).eq("user_id", context.userId)
      : context.supabase.from("revenue_entries").insert(payload);
    const { error } = await query;
    if (error) throw error;
    return { ok: true };
  });

export const deleteRevenueEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("revenue_entries").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Preferences ----------
export const getDashboardPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("dashboard_preferences").select("*").eq("user_id", context.userId).maybeSingle();
    return { preferences: data ?? { timezone: "America/Mexico_City", default_period: 28, currency: "MXN" } };
  });

export const saveDashboardPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    timezone: z.string().min(1).max(80),
    defaultPeriod: z.union([z.literal(7), z.literal(28), z.literal(90)]),
    currency: z.enum(["MXN", "USD", "EUR"]),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("dashboard_preferences").upsert({
      user_id: context.userId,
      timezone: data.timezone,
      default_period: data.defaultPeriod,
      currency: data.currency,
    });
    if (error) throw error;
    return { ok: true };
  });

export const getReportData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => periodSchema.parse(d))
  .handler(async ({ context, data }) => {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - data.days + 1);
    const date = since.toISOString().slice(0, 10);
    const [daily, posts, age, gender, country, city, revenue] = await Promise.all([
      context.supabase.from("daily_metrics").select("date, reach, views, likes, comments_count, saves, shares, interactions, engaged, posts_count").eq("user_id", context.userId).gte("date", date).order("date"),
      context.supabase.from("posts").select("id, post_type, caption, permalink, published_at, views, reach, likes, comments_count, shares, saves, interactions, engagement_rate").eq("user_id", context.userId).gte("published_at", since.toISOString()).order("published_at", { ascending: false }),
      context.supabase.from("demographics_age").select("bucket, percentage, count").eq("user_id", context.userId),
      context.supabase.from("demographics_gender").select("bucket, percentage, count").eq("user_id", context.userId),
      context.supabase.from("demographics_country").select("bucket, percentage, count").eq("user_id", context.userId),
      context.supabase.from("demographics_city").select("bucket, percentage, count").eq("user_id", context.userId),
      context.supabase.from("revenue_entries").select("concept, entry_date, amount, status, notes").eq("user_id", context.userId).gte("entry_date", date).order("entry_date", { ascending: false }),
    ]);
    return { daily: daily.data ?? [], posts: posts.data ?? [], audience: [...(age.data ?? []).map((r) => ({ category: "Edad", ...r })), ...(gender.data ?? []).map((r) => ({ category: "Género", ...r })), ...(country.data ?? []).map((r) => ({ category: "País", ...r })), ...(city.data ?? []).map((r) => ({ category: "Ciudad", ...r }))], revenue: revenue.data ?? [] };
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