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
    throw new Error("No hay cuentas de Instagram conectadas");
  }
  const first = accounts[0]!;
  const accountId =
    pickStr(first, "_id", "id", "accountId") ??
    (() => {
      throw new Error("No pude leer el _id de la cuenta");
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

// ---------- helpers ----------
type Obj = Record<string, unknown>;
const asObj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const asArr = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
async function must(p: PromiseLike<{ error: { message: string } | null }>, label: string) {
  const { error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
}
const now = () => new Date().toISOString();

// ---------- Snapshot / health / insights ----------
async function upsertSnapshot(sb: SB, userId: string, accountId: string, account: Obj) {
  const profile = asObj(asObj(account.metadata).profileData);
  const extra = asObj(profile.extraData);
  const followers = pickNum(account, "followersCount") ?? pickNum(profile, "followersCount");
  await must(sb.from("account_snapshot").upsert({
    user_id: userId,
    account_id: accountId,
    username: pickStr(account, "username") ?? pickStr(profile, "username"),
    display_name: pickStr(account, "displayName") ?? pickStr(profile, "displayName"),
    profile_picture_url: pickStr(account, "profilePicture") ?? pickStr(profile, "profilePicture"),
    followers_count: followers,
    following_count: pickNum(extra, "followsCount"),
    media_count: pickNum(extra, "mediaCount"),
    biography: pickStr(profile, "bio"),
    raw: account,
    updated_at: now(),
  }), "snapshot");
  if (followers !== null) {
    await must(sb.from("follower_history").upsert({
      user_id: userId,
      date: now().slice(0, 10),
      followers_count: followers,
      following_count: pickNum(extra, "followsCount"),
      updated_at: now(),
    }, { onConflict: "user_id,date" }), "follower_history");
  }
}

async function refreshHealth(sb: SB, userId: string, accountId: string) {
  const obj = unwrapObj<Obj>(await zernio.getAccountHealth(accountId));
  await must(sb.from("account_health").upsert({
    user_id: userId,
    status: pickStr(obj, "status") ?? "unknown",
    score: pickNum(obj, "score"),
    issues: (obj.issues as unknown) ?? null,
    raw: obj,
    updated_at: now(),
  }), "health");
}

async function refreshInsights(sb: SB, userId: string, accountId: string) {
  const obj = asObj(await zernio.getAccountInsights(accountId));
  const m = asObj(obj.metrics);
  const t = (k: string) => pickNum(asObj(m[k]), "total");
  const reach = t("reach");
  const interactions = t("total_interactions");
  await must(sb.from("account_insights_30d").upsert({
    user_id: userId,
    reach,
    views: t("views"),
    engaged: t("accounts_engaged"),
    interactions,
    likes: t("likes"),
    comments_count: t("comments"),
    saves: t("saves"),
    shares: t("shares"),
    engagement_rate: reach && interactions !== null ? (interactions / reach) * 100 : null,
    raw: obj,
    updated_at: now(),
  }), "insights");
}

async function refreshDailyMetrics(sb: SB, userId: string, accountId: string) {
  const res = asObj(await zernio.getDailyMetrics(accountId, 180));
  const rows = asArr(res.dailyData);
  const upserts = rows.flatMap((r) => {
    const date = pickStr(r, "date");
    if (!date) return [];
    const m = asObj(asObj(r.platformMetrics).instagram);
    const mm = Object.keys(m).length ? m : asObj(r.metrics);
    const likes = pickNum(mm, "likes") ?? 0, comments = pickNum(mm, "comments") ?? 0;
    const shares = pickNum(mm, "shares") ?? 0, saves = pickNum(mm, "saves") ?? 0;
    return [{
      user_id: userId,
      date: date.slice(0, 10),
      reach: pickNum(mm, "reach"),
      views: pickNum(mm, "views", "impressions"),
      engaged: null,
      interactions: likes + comments + shares + saves,
      likes, comments_count: comments, saves, shares,
      posts_count: pickNum(r, "postCount"),
      raw: r,
      updated_at: now(),
    }];
  });
  if (upserts.length) await must(sb.from("daily_metrics").upsert(upserts, { onConflict: "user_id,date" }), "daily_metrics");
  return upserts.length;
}

async function refreshDemographics(sb: SB, userId: string, accountId: string) {
  const obj = asObj(await zernio.getDemographics(accountId));
  const demo = asObj(obj.demographics);
  async function writeDim(table: string, source: unknown) {
    const rows = asArr(source);
    const total = rows.reduce((s, r) => s + (pickNum(r, "value") ?? 0), 0);
    const map = new Map<string, Obj>();
    for (const r of rows) {
      const bucket = pickStr(r, "dimension", "bucket", "label");
      const count = pickNum(r, "value", "count");
      if (!bucket) continue;
      map.set(bucket, {
        user_id: userId, bucket, count,
        percentage: total && count !== null ? (count / total) * 100 : null,
        updated_at: now(),
      });
    }
    await must(sb.from(table).delete().eq("user_id", userId), table);
    if (map.size) await must(sb.from(table).upsert([...map.values()], { onConflict: "user_id,bucket" }), table);
  }
  await writeDim("demographics_age", demo.age);
  await writeDim("demographics_gender", demo.gender);
  await writeDim("demographics_country", demo.country);
  await writeDim("demographics_city", demo.city);
}

async function refreshFollowerHistory(sb: SB, userId: string, accountId: string) {
  // Zernio returns only period totals; daily points are captured by upsertSnapshot.
  const obj = asObj(await zernio.getFollowerHistory(accountId));
  const fc = pickNum(asObj(asObj(obj.metrics).follower_count), "total");
  if (fc === null) return 0;
  await must(sb.from("follower_history").upsert(
    { user_id: userId, date: now().slice(0, 10), followers_count: fc, updated_at: now() },
    { onConflict: "user_id,date" },
  ), "follower_history");
  return 1;
}

async function refreshBestTime(sb: SB, userId: string, accountId: string) {
  const rows = asArr(asObj(await zernio.getBestTime(accountId)).slots);
  const upserts = rows.flatMap((r) => {
    const dow = pickNum(r, "day_of_week"), hour = pickNum(r, "hour");
    if (dow === null || hour === null) return [];
    const eng = pickNum(r, "avg_engagement");
    return [{ user_id: userId, day_of_week: dow, hour, score: eng, engagement: eng, posts_count: pickNum(r, "post_count") ?? 0, updated_at: now() }];
  });
  await must(sb.from("best_time").delete().eq("user_id", userId), "best_time");
  if (upserts.length) await must(sb.from("best_time").upsert(upserts, { onConflict: "user_id,day_of_week,hour" }), "best_time");
  return upserts.length;
}

async function refreshPostingFrequency(sb: SB, userId: string, accountId: string) {
  const rows = asArr(asObj(await zernio.getPostingFrequency(accountId)).frequency);
  const map = new Map<number, Obj>();
  for (const r of rows) {
    const ppw = pickNum(r, "posts_per_week");
    if (ppw === null) continue;
    map.set(ppw, { user_id: userId, posts_per_week: ppw, avg_engagement: pickNum(r, "avg_engagement_rate", "avg_engagement"), weeks_count: pickNum(r, "weeks_count") ?? 0, updated_at: now() });
  }
  await must(sb.from("posting_frequency").delete().eq("user_id", userId), "posting_frequency");
  if (map.size) await must(sb.from("posting_frequency").upsert([...map.values()], { onConflict: "user_id,posts_per_week" }), "posting_frequency");
  return map.size;
}

async function refreshContentDecay(sb: SB, userId: string, accountId: string) {
  const rows = asArr(asObj(await zernio.getContentDecay(accountId)).buckets);
  const upserts = rows.map((r, i) => ({
    user_id: userId,
    bucket_order: pickNum(r, "bucket_order") ?? i,
    bucket_label: pickStr(r, "bucket_label"),
    cumulative_pct: pickNum(r, "avg_pct_of_final"),
    updated_at: now(),
  }));
  await must(sb.from("content_decay").delete().eq("user_id", userId), "content_decay");
  if (upserts.length) await must(sb.from("content_decay").upsert(upserts, { onConflict: "user_id,bucket_order" }), "content_decay");
  return upserts.length;
}

// ---------- Posts (analytics) + comments ----------
async function refreshInboxCommentsAndPosts(sb: SB, userId: string, accountId: string) {
  const res = asObj(await zernio.listPosts(accountId, 100));
  const posts = asArr(res.posts);
  const postUpserts = posts.flatMap((p) => {
    const plat = asArr(p.platforms).find((x) => pickStr(x, "accountId") === accountId) ?? asArr(p.platforms)[0] ?? {};
    const id = pickStr(plat, "platformPostId") ?? pickStr(p, "_id");
    if (!id) return [];
    const a = asObj(plat.analytics ?? p.analytics);
    const likes = pickNum(a, "likes") ?? 0, comments = pickNum(a, "comments") ?? 0;
    const shares = pickNum(a, "shares") ?? 0, saves = pickNum(a, "saves") ?? 0;
    const url = pickStr(plat, "platformPostUrl") ?? pickStr(p, "platformPostUrl");
    const type = url?.includes("/reel/") ? "VIDEO" : asArr(p.mediaItems).length > 1 ? "CAROUSEL_ALBUM" : "IMAGE";
    const media = asArr(p.mediaItems)[0] ?? {};
    return [{
      id, user_id: userId, post_type: type,
      caption: pickStr(p, "content"),
      permalink: url,
      thumbnail_url: pickStr(p, "thumbnailUrl") ?? pickStr(media, "thumbnail", "url"),
      media_url: pickStr(media, "url"),
      published_at: pickStr(p, "publishedAt"),
      likes, comments_count: comments, shares, saves,
      views: pickNum(a, "views"), impressions: pickNum(a, "impressions"), reach: pickNum(a, "reach"),
      interactions: likes + comments + shares + saves,
      engagement_rate: pickNum(a, "engagementRate"),
      raw: p, updated_at: now(),
    }];
  });
  if (postUpserts.length) await must(sb.from("posts").upsert(postUpserts, { onConflict: "user_id,id" }), "posts");

  // Comments for the 20 most recent posts
  const recent = [...postUpserts].sort((x, y) => String(y.published_at).localeCompare(String(x.published_at))).slice(0, 20);
  const commentUpserts: Obj[] = [];
  for (const p of recent) {
    try {
      const list = asArr(asObj(await zernio.getPostComments(p.id, accountId)).comments);
      const push = (c: Obj, parent: string | null) => {
        const cid = pickStr(c, "id");
        if (!cid) return;
        const from = asObj(c.from);
        commentUpserts.push({
          id: cid, user_id: userId, post_id: p.id,
          author_username: pickStr(from, "username"), author_id: pickStr(from, "id"),
          text: pickStr(c, "message", "text") ?? "",
          created_at: pickStr(c, "createdTime"),
          like_count: pickNum(c, "likeCount"),
          is_reply: parent !== null, parent_comment_id: parent,
          raw: c, fetched_at: now(),
        });
        for (const r of asArr(c.replies)) push(r, cid);
      };
      for (const c of list) push(c, null);
    } catch (err) {
      console.warn("[refresh] comments failed for", p.id, err);
    }
  }
  if (commentUpserts.length) await must(sb.from("comments").upsert(commentUpserts, { onConflict: "user_id,id" }), "comments");
  return postUpserts.length;
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

  const stored = await getStoredAccountId(sb, userId);
  let accountId: string;
  let account: Record<string, unknown> = {};
  if (stored) {
    accountId = stored;
    // Try to enrich with live account data, but don't fail refresh if listAccounts errors.
    try {
      const res = await zernio.listAccounts();
      const accounts = unwrapList<Record<string, unknown>>(res);
      const match = accounts.find(
        (a) => pickStr(a, "_id", "id", "accountId") === accountId,
      );
      if (match) account = match;
    } catch (err) {
      console.warn("[refresh] listAccounts failed, using stored id only:", err);
    }
  } else {
    const resolved = await resolveAccountId(sb, userId);
    accountId = resolved.accountId;
    account = resolved.account;
  }

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
