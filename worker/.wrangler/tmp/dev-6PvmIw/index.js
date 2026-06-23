var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization"
};
var json = /* @__PURE__ */ __name((body, init = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders,
    ...init.headers
  }
}), "json");
var notFound = /* @__PURE__ */ __name(() => json({ error: "Not found" }, { status: 404 }), "notFound");
var createId = /* @__PURE__ */ __name((prefix) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`, "createId");
var timeAgo = /* @__PURE__ */ __name((createdAt) => {
  const created = Date.parse(`${createdAt.replace(" ", "T")}Z`);
  const diff = Math.max(0, Date.now() - created);
  const minutes = Math.max(1, Math.floor(diff / 6e4));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}, "timeAgo");
async function getPolls(env, request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search")?.trim();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
  const where = [];
  const binds = [];
  if (category && category !== "all") {
    where.push("p.category = ?");
    binds.push(category);
  }
  if (search) {
    where.push("(p.question LIKE ? OR u.name LIKE ? OR u.handle LIKE ?)");
    binds.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const pollRows = await env.DB.prepare(
    `
    SELECT
      p.id, p.question, p.category, p.anonymous, p.comments_count, p.shares_count, p.created_at,
      u.id AS creator_id, u.name AS creator_name, u.handle AS creator_handle,
      u.avatar_url AS creator_avatar, u.is_creator, u.has_story,
      COALESCE(SUM(o.votes_count), 0) AS votes_count
    FROM polls p
    JOIN users u ON u.id = p.creator_id
    LEFT JOIN poll_options o ON o.poll_id = p.id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ?
    `
  ).bind(...binds, limit).all();
  const ids = pollRows.results.map((row) => String(row.id));
  const optionRows = ids.length ? await env.DB.prepare(
    `SELECT * FROM poll_options WHERE poll_id IN (${ids.map(() => "?").join(",")}) ORDER BY poll_id, position`
  ).bind(...ids).all() : { results: [] };
  const optionsByPoll = /* @__PURE__ */ new Map();
  optionRows.results.forEach((option) => {
    const pollId = String(option.poll_id);
    const list = optionsByPoll.get(pollId) ?? [];
    list.push({
      id: option.id,
      text: option.text,
      emoji: option.emoji,
      imageUrl: option.image_url,
      votes: option.votes_count
    });
    optionsByPoll.set(pollId, list);
  });
  const polls = pollRows.results.map((row) => ({
    id: row.id,
    question: row.question,
    category: row.category,
    anonymous: Boolean(row.anonymous),
    timeAgo: timeAgo(String(row.created_at)),
    votes: Number(row.votes_count),
    comments: Number(row.comments_count),
    shares: Number(row.shares_count),
    creator: {
      id: row.creator_id,
      name: row.creator_name,
      handle: row.creator_handle,
      avatar: row.creator_avatar,
      isCreator: Boolean(row.is_creator),
      hasStory: Boolean(row.has_story)
    },
    options: optionsByPoll.get(String(row.id)) ?? []
  }));
  const stories = await env.DB.prepare(
    "SELECT id, name, handle, avatar_url AS avatar, has_story AS hasStory, is_creator AS isCreator FROM users WHERE has_story = 1 ORDER BY created_at ASC LIMIT 12"
  ).all();
  const creators = await env.DB.prepare(
    `
    SELECT u.id, u.name, u.handle, u.avatar_url AS avatar, COUNT(p.id) AS polls
    FROM users u
    LEFT JOIN polls p ON p.creator_id = u.id
    GROUP BY u.id
    ORDER BY polls DESC, u.created_at ASC
    LIMIT 12
    `
  ).all();
  return json({ polls, stories: stories.results, creators: creators.results });
}
__name(getPolls, "getPolls");
async function getPoll(env, id) {
  const row = await env.DB.prepare(
    `
    SELECT
      p.id, p.question, p.category, p.anonymous, p.comments_count, p.shares_count, p.created_at,
      u.id AS creator_id, u.name AS creator_name, u.handle AS creator_handle,
      u.avatar_url AS creator_avatar, u.is_creator,
      COALESCE(SUM(o.votes_count), 0) AS votes_count
    FROM polls p
    JOIN users u ON u.id = p.creator_id
    LEFT JOIN poll_options o ON o.poll_id = p.id
    WHERE p.id = ?
    GROUP BY p.id
    `
  ).bind(id).first();
  if (!row) return notFound();
  const options = await env.DB.prepare(
    "SELECT id, text, emoji, image_url AS imageUrl, votes_count AS votes FROM poll_options WHERE poll_id = ? ORDER BY position"
  ).bind(id).all();
  const totalVotes = Number(row.votes_count);
  return json({
    poll: {
      id: row.id,
      question: row.question,
      category: row.category,
      anonymous: Boolean(row.anonymous),
      timeAgo: timeAgo(String(row.created_at)),
      votes: totalVotes,
      comments: Number(row.comments_count),
      shares: Number(row.shares_count),
      creator: {
        id: row.creator_id,
        name: row.creator_name,
        handle: row.creator_handle,
        avatar: row.creator_avatar,
        isCreator: Boolean(row.is_creator)
      },
      options: options.results.map((option) => ({
        ...option,
        percentage: totalVotes ? Math.round(Number(option.votes) / totalVotes * 100) : 0
      }))
    }
  });
}
__name(getPoll, "getPoll");
async function createPoll(env, request) {
  const body = await request.json();
  const question = body.question?.trim();
  const options = (body.options ?? []).map((option) => ({
    text: option.text?.trim() ?? "",
    emoji: option.emoji?.trim() ?? "",
    imageUrl: option.imageUrl?.trim() || null
  })).filter((option) => option.text.length > 0);
  if (!question || question.length > 140) {
    return json({ error: "Question must be 1-140 characters." }, { status: 400 });
  }
  if (options.length < 2 || options.length > 6) {
    return json({ error: "Polls need 2-6 answer options." }, { status: 400 });
  }
  const pollId = createId("poll");
  const creatorId = body.creatorId || "u0";
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO polls (id, creator_id, question, category, anonymous) VALUES (?, ?, ?, ?, ?)"
    ).bind(pollId, creatorId, question, body.category || "random", body.anonymous === false ? 0 : 1),
    ...options.map(
      (option, index) => env.DB.prepare(
        "INSERT INTO poll_options (id, poll_id, text, emoji, image_url, position) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(createId("opt"), pollId, option.text, option.emoji, option.imageUrl, index + 1)
    )
  ]);
  return getPoll(env, pollId);
}
__name(createPoll, "createPoll");
async function vote(env, request, pollId) {
  const body = await request.json();
  if (!body.optionId || !body.voterKey) {
    return json({ error: "optionId and voterKey are required." }, { status: 400 });
  }
  const option = await env.DB.prepare("SELECT id FROM poll_options WHERE id = ? AND poll_id = ?").bind(body.optionId, pollId).first();
  if (!option) return json({ error: "Option does not belong to this poll." }, { status: 400 });
  const voteId = createId("vote");
  const inserted = await env.DB.prepare(
    "INSERT OR IGNORE INTO votes (id, poll_id, option_id, voter_key) VALUES (?, ?, ?, ?)"
  ).bind(voteId, pollId, body.optionId, body.voterKey).run();
  if (inserted.meta.changes > 0) {
    await env.DB.prepare("UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = ?").bind(body.optionId).run();
  }
  const response = await getPoll(env, pollId);
  const payload = await response.json();
  return json({ ...payload, accepted: inserted.meta.changes > 0 });
}
__name(vote, "vote");
async function uploadMedia(env, request) {
  const body = await request.json();
  if (!body.base64 || !body.contentType) {
    return json({ error: "base64 and contentType are required." }, { status: 400 });
  }
  const extension = body.filename?.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
  const key = `poll-options/${crypto.randomUUID()}.${extension}`;
  const bytes = Uint8Array.from(atob(body.base64), (char) => char.charCodeAt(0));
  await env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: body.contentType }
  });
  const baseUrl = env.PUBLIC_MEDIA_BASE_URL || new URL(request.url).origin;
  return json({ key, url: `${baseUrl.replace(/\/$/, "")}/media/${key}` });
}
__name(uploadMedia, "uploadMedia");
async function getMedia(env, key) {
  const object = await env.MEDIA.get(key);
  if (!object) return notFound();
  return new Response(object.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
__name(getMedia, "getMedia");
var src_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const pollMatch = path.match(/^\/polls\/([^/]+)$/);
    const voteMatch = path.match(/^\/polls\/([^/]+)\/votes$/);
    const mediaMatch = path.match(/^\/media\/(.+)$/);
    try {
      if (request.method === "GET" && path === "/health") {
        const health = { service: "pollpop-api", ok: false, db: "unchecked", r2: "unchecked" };
        try {
          await env.DB.prepare("SELECT 1").first();
          health.db = "ok";
        } catch (e) {
          health.db = e instanceof Error ? e.message : "error";
        }
        try {
          await env.MEDIA.head("__healthcheck__");
          health.r2 = "ok";
        } catch (e) {
          health.r2 = e instanceof Error ? e.message : "error";
        }
        health.ok = health.db === "ok" && health.r2 === "ok";
        return json(health, { status: health.ok ? 200 : 503 });
      }
      if (request.method === "GET" && path === "/polls") return getPolls(env, request);
      if (request.method === "POST" && path === "/polls") return createPoll(env, request);
      if (request.method === "GET" && pollMatch) return getPoll(env, pollMatch[1]);
      if (request.method === "POST" && voteMatch) return vote(env, request, voteMatch[1]);
      if (request.method === "POST" && path === "/uploads") return uploadMedia(env, request);
      if (request.method === "GET" && mediaMatch) return getMedia(env, mediaMatch[1]);
      return notFound();
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Unexpected server error" },
        { status: 500 }
      );
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-LUpwXt/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-LUpwXt/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
