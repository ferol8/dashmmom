// Server-only refresh orchestrator: pulls all Zernio data, upserts into
// the DB using the user-scoped supabase client (RLS as caller).

import type { SupabaseClient } from "@supabase/supabase-js";
import { zernio, unwrapList, unwrapObj, ZernioError } from "./zernio.server";

type SB = SupabaseClient;

export interface RefreshStepResult {
  name: string;
  ok: boolean;
  count?: number;
  error?: string;
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}
function pickNum(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

// ---------- account resolution ----------
export async function resolveAccountId(
  sb: SB,
  userId: string,
): Promise<{ accountId: string; account: Record<string, unknown> }> {
  const res = await zernio.listAccounts();
  const accounts = unwrapList<Record<string, unknown>>(res);
  if (accounts.length === 0) {
    throw new Error("No hay cuentas de Instagram conectadas en Zernio");
  }
  const first = accounts[0]!;
  const accountId =
    pickStr(first, "_id", "id", "accountId") ??
    (() => {
      throw new Error("No pude leer el _id de la cuenta desde Zernio");
    })();
  await sb.from("meta").upsert(
    { user_id: userId, key: "zernio_account_id", value: accountId },
    { onConflict: "user_id,key" },
  );
  return { accountId, account: first };
}

export async function getStoredAccountId(sb: SB, userId: string): Promise<string | null> {
  const { data } = await sb
    .from("meta")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "zernio_account_id")
    .maybeSingle();
  if (!data) return null;
  const val = data.value as unknown;
  return typeof val === "string" ? val : null;
}

// ---------- Snapshot / health / insights ----------
async function upsertSnapshot(
  sb: SB,
  userId: string,
  accountId: string,
  account: Record<string, unknown>,
) {
  await sb.from("account_snapshot").upsert({
    user_id: userId,
    account_id: accountId,
    username: pickStr(account, "username", "handle"),
    display_name: pickStr(account, "displayName", "name", "fullName"),
    profile_picture_url: pickStr(account, "profilePictureUrl", "profile_picture_url", "avatarUrl", "avatar"),
    followers_count: pickNum(account, "followersCount", "followers_count", "followers"),
    following_count: pickNum(account, "followingCount", "following_count", "following"),
    media_count: pickNum(account, "mediaCount", "media_count", "posts"),
    biography: pickStr(account, "biography", "bio"),
    raw: account,
    updated_at: new Date().toISOString(),
  });
}

async function refreshHealth(sb: SB, userId: string, accountId: string) {
  const res = await zernio.getAccountHealth(accountId);
  const obj = unwrapObj<Record<string, unknown>>(res);
  await sb.from("account_health").upsert({
    user_id: userId,
    status: pickStr(obj, "status", "health", "level") ?? "unknown",
    score: pickNum(obj, "score"),
    issues: (obj.issues as unknown) ?? null,
    raw: obj,
    updated_at: new Date().toISOString(),
  });
}

async function refreshInsights(sb: SB, userId: string, accountId: string) {
  const res = await zernio.getAccountInsights(accountId);
  const obj = unwrapObj<Record<string, unknown>>(res);
  const totals = (obj.totals as Record<string, unknown> | undefined) ?? obj;
  await sb.from("account_insights_30d").upsert({
    user_id: userId,
    reach: pickNum(totals, "reach", "totalReach"),
    views: pickNum(totals, "views", "impressions"),
    engaged: pickNum(totals, "engaged", "engagedAccounts"),
    interactions: pickNum(totals, "interactions", "totalInteractions"),
    likes: pickNum(totals, "likes"),
    comments_count: pickNum(totals, "comments"),
    saves: pickNum(totals, "saves", "saved"),
    shares: pickNum(totals, "shares", "shared"),
    engagement_rate: pickNum(totals, "engagementRate", "engagement_rate", "er"),
    raw: obj,
    updated_at: new Date().toISOString(),
  });
}

async function refreshDailyMetrics(sb: SB, userId: string, accountId: string) {
  const res = await zernio.getDailyMetrics(accountId, 180);
  const rows = unwrapList<Record<string, unknown>>(res);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 180);
  const upserts = rows
    .map((r) => {
      const dateRaw = pickStr(r, "date", "day");
      if (!dateRaw) return null;
      const d = new Date(dateRaw);
      if (Number.isNaN(d.getTime())) return null;
      return {
        user_id: userId,
        date: d.toISOString().slice(0, 10),
        reach: pickNum(r, "reach"),
        views: pickNum(r, "views", "impressions"),
        engaged: pickNum(r, "engaged", "engagedAccounts"),
        interactions: pickNum(r, "interactions"),
        likes: pickNum(r, "likes"),
        comments_count: pickNum(r, "comments"),
        saves: pickNum(r, "saves"),
        shares: pickNum(r, "shares"),
        posts_count: pickNum(r, "postsCount", "posts"),
        raw: r,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
  if (upserts.length > 0) {
    await sb.from("daily_metrics").upsert(upserts, { onConflict: "user_id,date" });
  }
  // Retention: 180 days
  await sb
    .from("daily_metrics")
    .delete()
    .eq("user_id", userId)
    .lt("date", cutoff.toISOString().slice(0, 10));
  return upserts.length;
}

async function refreshDemographics(sb: SB, userId: string, accountId: string) {
  const res = await zernio.getDemographics(accountId);
  const obj = unwrapObj<Record<string, unknown>>(res);

  async function writeDim(table: string, source: unknown) {
    await sb.from(table).delete().eq("user_id", userId);
    const rows = unwrapList<Record<string, unknown>>(source);
    const upserts = rows
      .map((r) => ({
        user_id: userId,
        bucket: pickStr(r, "bucket", "label", "name", "value", "key") ?? "",
        percentage: pickNum(r, "percentage", "percent", "pct"),
        count: pickNum(r, "count", "value"),
        updated_at: new Date().toISOString(),
      }))
      .filter((r) => r.bucket !== "");
    if (upserts.length > 0) {
      await sb.from(table).upsert(upserts, { onConflict: "user_id,bucket" });
    }
  }

  await writeDim("demographics_age", obj.age ?? obj.ageRanges ?? obj.ages);
  await writeDim("demographics_gender", obj.gender ?? obj.genders);
  await writeDim("demographics_country", obj.country ?? obj.countries ?? obj.topCountries);
  await writeDim("demographics_city", obj.city ?? obj.cities ?? obj.topCities);
}

async function refreshFollowerHistory(sb: SB, userId: string, accountId: string) {
  const res = await zernio.getFollowerHistory(accountId);
  const rows = unwrapList<Record<string, unknown>>(res);
  const upserts = rows
    .map((r) => {
      const dateRaw = pickStr(r, "date", "day");
      if (!dateRaw) return null;
      const d = new Date(dateRaw);
      if (Number.isNaN(d.getTime())) return null;
      return {
        user_id: userId,
        date: d.toISOString().slice(0, 10),
        followers_count: pickNum(r, "followers", "followersCount", "count"),
        following_count: pickNum(r, "following", "followingCount"),
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
  if (upserts.length > 0) {
    await sb.from("follower_history").upsert(upserts, { onConflict: "user_id,date" });
  }
  return upserts.length;
}

async function refreshBestTime(sb: SB, userId: string, accountId: string) {
  const res = await zernio.getBestTime(accountId);
  const rows = unwrapList<Record<string, unknown>>(res);
  await sb.from("best_time").delete().eq("user_id", userId);
  const upserts = rows
    .map((r) => {
      const dow = pickNum(r, "dayOfWeek", "day_of_week", "dow", "day");
      const hour = pickNum(r, "hour", "hourUtc", "hourOfDay");
      if (dow === null || hour === null) return null;
      return {
        user_id: userId,
        day_of_week: dow,
        hour,
        score: pickNum(r, "score", "engagementScore"),
        engagement: pickNum(r, "engagement", "avgEngagement"),
        posts_count: pickNum(r, "postsCount", "posts", "count") ?? 0,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
  if (upserts.length > 0) {
    await sb.from("best_time").upsert(upserts, { onConflict: "user_id,day_of_week,hour" });
  }
}

async function refreshPostingFrequency(sb: SB, userId: string, accountId: string) {
  const res = await zernio.getPostingFrequency(accountId);
  const rows = unwrapList<Record<string, unknown>>(res);
  await sb.from("posting_frequency").delete().eq("user_id", userId);
  const upserts = rows
    .map((r) => {
      const ppw = pickNum(r, "postsPerWeek", "posts_per_week", "frequency", "cadence");
      if (ppw === null) return null;
      return {
        user_id: userId,
        posts_per_week: ppw,
        avg_engagement: pickNum(r, "avgEngagement", "engagement", "engagementRate"),
        weeks_count: pickNum(r, "weeksCount", "weeks", "count") ?? 0,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
  if (upserts.length > 0) {
    await sb.from("posting_frequency").upsert(upserts, { onConflict: "user_id,posts_per_week" });
  }
}

async function refreshContentDecay(sb: SB, userId: string, accountId: string) {
  const res = await zernio.getContentDecay(accountId);
  const obj = unwrapObj<Record<string, unknown>>(res);
  const rows = unwrapList<Record<string, unknown>>(obj.buckets ?? obj.data ?? res);
  await sb.from("content_decay").delete().eq("user_id", userId);
  const upserts = rows.map((r, i) => ({
    user_id: userId,
    bucket_order: pickNum(r, "order", "index", "bucketOrder") ?? i,
    bucket_label: pickStr(r, "label", "bucket", "range"),
    cumulative_pct: pickNum(r, "cumulativePct", "cumulative", "pct", "percentage"),
    updated_at: new Date().toISOString(),
  }));
  if (upserts.length > 0) {
    await sb.from("content_decay").upsert(upserts, { onConflict: "user_id,bucket_order" });
  }
}

// ---------- Posts + comments (via inbox) ----------
async function refreshInboxCommentsAndPosts(
  sb: SB,
  userId: string,
  accountId: string,
) {
  const res = await zernio.listInboxComments(accountId, 500);
  const rows = unwrapList<Record<string, unknown>>(res);

  const postsMap = new Map<string, Record<string, unknown>>();
  const commentUpserts: Array<Record<string, unknown>> = [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  for (const r of rows) {
    const commentId = pickStr(r, "id", "_id", "commentId");
    const postObj = (r.post as Record<string, unknown> | undefined) ?? {};
    const postId = pickStr(r, "postId", "post_id") ?? pickStr(postObj, "id", "_id");
    const createdAtStr = pickStr(r, "createdAt", "created_at", "timestamp");
    if (!commentId || !postId) continue;

    commentUpserts.push({
      id: commentId,
      user_id: userId,
      post_id: postId,
      author_username: pickStr(r, "authorUsername", "author_username", "username")
        ?? pickStr((r.author as Record<string, unknown>) ?? {}, "username"),
      author_id: pickStr(r, "authorId", "author_id")
        ?? pickStr((r.author as Record<string, unknown>) ?? {}, "id", "_id"),
      text: pickStr(r, "text", "message", "body") ?? "",
      created_at: createdAtStr ?? null,
      like_count: pickNum(r, "likeCount", "likes"),
      is_reply: Boolean(r.isReply ?? r.is_reply ?? r.parentCommentId),
      parent_comment_id: pickStr(r, "parentCommentId", "parent_comment_id"),
      raw: r,
      fetched_at: new Date().toISOString(),
    });

    // Aggregate a post shell from what we see
    const existing = postsMap.get(postId) ?? {};
    postsMap.set(postId, {
      ...existing,
      id: postId,
      user_id: userId,
      post_type: pickStr(postObj, "type", "mediaType") ?? existing.post_type ?? null,
      caption: pickStr(postObj, "caption", "text") ?? existing.caption ?? null,
      permalink: pickStr(postObj, "permalink", "url") ?? existing.permalink ?? null,
      thumbnail_url: pickStr(postObj, "thumbnailUrl", "thumbnail_url", "coverUrl")
        ?? existing.thumbnail_url ?? null,
      media_url: pickStr(postObj, "mediaUrl", "media_url") ?? existing.media_url ?? null,
      published_at: pickStr(postObj, "publishedAt", "published_at", "timestamp")
        ?? existing.published_at ?? null,
      likes: pickNum(postObj, "likes", "likeCount") ?? existing.likes ?? null,
      comments_count: pickNum(postObj, "commentsCount", "comments") ?? existing.comments_count ?? null,
      shares: pickNum(postObj, "shares") ?? existing.shares ?? null,
      saves: pickNum(postObj, "saves") ?? existing.saves ?? null,
      views: pickNum(postObj, "views") ?? existing.views ?? null,
      impressions: pickNum(postObj, "impressions") ?? existing.impressions ?? null,
      reach: pickNum(postObj, "reach") ?? existing.reach ?? null,
      interactions: pickNum(postObj, "interactions") ?? existing.interactions ?? null,
      engagement_rate: pickNum(postObj, "engagementRate", "engagement_rate")
        ?? existing.engagement_rate ?? null,
      raw: { ...(existing.raw as Record<string, unknown> ?? {}), ...postObj },
      updated_at: new Date().toISOString(),
    });
  }

  if (postsMap.size > 0) {
    await sb.from("posts").upsert(Array.from(postsMap.values()), {
      onConflict: "user_id,id",
    });
  }
  if (commentUpserts.length > 0) {
    await sb.from("comments").upsert(commentUpserts, { onConflict: "user_id,id" });
  }
  // Retention: 90 days for comments
  await sb
    .from("comments")
    .delete()
    .eq("user_id", userId)
    .lt("created_at", cutoff.toISOString());

  return { posts: postsMap.size, comments: commentUpserts.length };
}

// ---------- Conversations + messages (DMs) ----------
async function refreshConversationsAndMessages(
  sb: SB,
  userId: string,
  accountId: string,
) {
  const res = await zernio.listConversations(accountId, 100);
  const convs = unwrapList<Record<string, unknown>>(res);
  const convUpserts: Array<Record<string, unknown>> = [];

  for (const c of convs) {
    const convId = pickStr(c, "id", "_id", "conversationId");
    if (!convId) continue;
    convUpserts.push({
      id: convId,
      user_id: userId,
      participant_username: pickStr(c, "participantUsername", "username")
        ?? pickStr((c.participant as Record<string, unknown>) ?? {}, "username"),
      participant_id: pickStr(c, "participantId", "userId")
        ?? pickStr((c.participant as Record<string, unknown>) ?? {}, "id", "_id"),
      last_message_at: pickStr(c, "lastMessageAt", "last_message_at", "updatedAt"),
      message_count: pickNum(c, "messageCount", "messages"),
      raw: c,
      updated_at: new Date().toISOString(),
    });
  }
  if (convUpserts.length > 0) {
    await sb.from("conversations").upsert(convUpserts, { onConflict: "user_id,id" });
  }

  // Only fetch messages from the 40 most recent conversations to bound cost
  const recent = convUpserts
    .slice()
    .sort((a, b) => String(b.last_message_at ?? "").localeCompare(String(a.last_message_at ?? "")))
    .slice(0, 40);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString();

  const msgUpserts: Array<Record<string, unknown>> = [];

  for (const c of recent) {
    const convId = c.id as string;
    try {
      const mres = await zernio.getConversationMessages(convId, accountId);
      const messages = unwrapList<Record<string, unknown>>(mres);
      for (const m of messages) {
        const id = pickStr(m, "id", "_id", "messageId");
        const createdAt = pickStr(m, "createdAt", "created_at", "timestamp");
        if (!id) continue;
        if (createdAt && createdAt < cutoffIso) continue; // 30d retention at ingest
        msgUpserts.push({
          id,
          user_id: userId,
          conversation_id: convId,
          sender_id: pickStr(m, "senderId", "sender_id")
            ?? pickStr((m.sender as Record<string, unknown>) ?? {}, "id", "_id"),
          sender_username: pickStr(m, "senderUsername", "sender_username")
            ?? pickStr((m.sender as Record<string, unknown>) ?? {}, "username"),
          is_from_me: Boolean(m.isFromMe ?? m.is_from_me ?? m.fromMe),
          text: pickStr(m, "text", "message", "body"),
          created_at: createdAt,
          raw: m,
          fetched_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      if (err instanceof ZernioError && err.status === 404) continue;
      throw err;
    }
  }

  if (msgUpserts.length > 0) {
    await sb.from("messages").upsert(msgUpserts, { onConflict: "user_id,id" });
  }
  await sb
    .from("messages")
    .delete()
    .eq("user_id", userId)
    .lt("created_at", cutoffIso);

  return { conversations: convUpserts.length, messages: msgUpserts.length };
}

// ---------- Orchestrator ----------
export async function runFullRefresh(sb: SB, userId: string): Promise<RefreshStepResult[]> {
  const steps: RefreshStepResult[] = [];

  async function step<T>(name: string, fn: () => Promise<T>) {
    try {
      const out = await fn();
      const count = typeof out === "number" ? out : undefined;
      steps.push({ name, ok: true, count });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({ name, ok: false, error: msg });
      console.error(`[refresh] step ${name} failed:`, msg);
    }
  }

  const logInsert = await sb
    .from("refresh_log")
    .insert({ user_id: userId, status: "running" })
    .select("id")
    .single();
  const logId = logInsert.data?.id as string | undefined;

  const { accountId, account } = await resolveAccountId(sb, userId);

  await step("snapshot", () => upsertSnapshot(sb, userId, accountId, account));
  await step("health", () => refreshHealth(sb, userId, accountId));
  await step("insights_30d", () => refreshInsights(sb, userId, accountId));
  await step("daily_metrics", () => refreshDailyMetrics(sb, userId, accountId));
  await step("demographics", () => refreshDemographics(sb, userId, accountId));
  await step("follower_history", () => refreshFollowerHistory(sb, userId, accountId));
  await step("best_time", () => refreshBestTime(sb, userId, accountId));
  await step("posting_frequency", () => refreshPostingFrequency(sb, userId, accountId));
  await step("content_decay", () => refreshContentDecay(sb, userId, accountId));
  await step("posts_and_comments", () =>
    refreshInboxCommentsAndPosts(sb, userId, accountId),
  );
  await step("conversations_messages", () =>
    refreshConversationsAndMessages(sb, userId, accountId),
  );

  const anyFail = steps.some((s) => !s.ok);
  if (logId) {
    await sb
      .from("refresh_log")
      .update({
        finished_at: new Date().toISOString(),
        status: anyFail ? "partial" : "ok",
        steps: steps as unknown as Record<string, unknown>,
      })
      .eq("id", logId);
  }

  return steps;
}