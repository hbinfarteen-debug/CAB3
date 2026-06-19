var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var ALLOWED_VOTES = /* @__PURE__ */ new Set(["YES", "NO"]);
var ALLOWED_AGE_GROUPS = /* @__PURE__ */ new Set(["18-25", "26-35", "36-50", "51-65", "66-90"]);
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }
    if (url.pathname === "/api/polls" && request.method === "GET") {
      return handleGetPolls(env);
    }
    if (url.pathname === "/api/polls" && request.method === "POST") {
      return handleCreatePoll(request, env);
    }
    if (url.pathname === "/api/vote" && request.method === "POST") {
      return handleVote(request, env);
    }
    const resultsMatch = url.pathname.match(/^\/api\/results\/(.+)$/);
    if (resultsMatch && request.method === "GET") {
      return handleResults(resultsMatch[1], env);
    }
    if (url.pathname === "/api/results" && request.method === "GET") {
      return json({ error: "missing poll id" }, 400);
    }
    return json({ error: "not found" }, 404);
  }
};
async function handleGetPolls(env) {
  const polls = await env.DB.prepare(`
      SELECT p.id, p.title, p.cards, p.created_at, COUNT(v.device_hash) as total_votes
      FROM polls p
      LEFT JOIN votes v ON p.id = v.poll_id
      GROUP BY p.id
      ORDER BY total_votes DESC, p.created_at DESC
    `).all();
  const parsed = polls.results.map((p) => ({
    ...p,
    cards: JSON.parse(p.cards)
  }));
  return json({ polls: parsed });
}
__name(handleGetPolls, "handleGetPolls");
async function handleCreatePoll(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const { title, cards } = body || {};
  if (!title || typeof title !== "string") return json({ error: "invalid title" }, 400);
  if (!cards || !Array.isArray(cards) || cards.length !== 5) return json({ error: "must provide 5 cards" }, 400);
  const pollId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO polls (id, title, cards, created_at) VALUES (?, ?, ?, ?)`
  ).bind(pollId, title, JSON.stringify(cards), Date.now()).run();
  return json({ id: pollId });
}
__name(handleCreatePoll, "handleCreatePoll");
async function handleVote(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const { deviceHash, pollId, vote, ageGroup, region, cardChoices } = body || {};
  if (typeof deviceHash !== "string" || deviceHash.length < 16 || deviceHash.length > 128) {
    return json({ error: "invalid deviceHash" }, 400);
  }
  if (!pollId || typeof pollId !== "string") {
    return json({ error: "invalid pollId" }, 400);
  }
  if (!ALLOWED_VOTES.has(vote)) {
    return json({ error: "invalid vote" }, 400);
  }
  if (ageGroup && !ALLOWED_AGE_GROUPS.has(ageGroup)) {
    return json({ error: "invalid ageGroup" }, 400);
  }
  if (region && (typeof region !== "string" || region.length > 64)) {
    return json({ error: "invalid region" }, 400);
  }
  let cardChoicesJson = null;
  if (cardChoices && typeof cardChoices === "object" && !Array.isArray(cardChoices)) {
    const valid = Object.entries(cardChoices).every(
      ([k, v]) => !isNaN(Number(k)) && (v === "keep" || v === "amend")
    );
    if (valid) cardChoicesJson = JSON.stringify(cardChoices);
  }
  const insert = await env.DB.prepare(
    `INSERT INTO votes (device_hash, poll_id, vote, age_group, region, card_choices, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(device_hash, poll_id) DO NOTHING`
  ).bind(deviceHash, pollId, vote, ageGroup || null, region || null, cardChoicesJson, Date.now()).run();
  if (insert.meta.changes === 0) {
    const existing = await env.DB.prepare("SELECT vote FROM votes WHERE device_hash = ? AND poll_id = ?").bind(deviceHash, pollId).first();
    return json({ status: "duplicate", vote: existing?.vote ?? null });
  }
  return json({ status: "recorded", vote });
}
__name(handleVote, "handleVote");
async function handleResults(pollId, env) {
  const totals = await env.DB.prepare("SELECT vote, COUNT(*) as count FROM votes WHERE poll_id = ? GROUP BY vote").bind(pollId).all();
  const byAge = await env.DB.prepare(
    `SELECT age_group, vote, COUNT(*) as count
       FROM votes
       WHERE poll_id = ? AND age_group IS NOT NULL
       GROUP BY age_group, vote`
  ).bind(pollId).all();
  const allChoices = await env.DB.prepare("SELECT card_choices FROM votes WHERE poll_id = ? AND card_choices IS NOT NULL").bind(pollId).all();
  const cardMap = {};
  for (const row of allChoices.results) {
    try {
      const parsed = JSON.parse(row.card_choices);
      for (const [cardId, choice] of Object.entries(parsed)) {
        if (!cardMap[cardId]) cardMap[cardId] = { cardId: Number(cardId), keepCount: 0, amendCount: 0 };
        if (choice === "keep") cardMap[cardId].keepCount++;
        else if (choice === "amend") cardMap[cardId].amendCount++;
      }
    } catch {
    }
  }
  const byCard = Object.values(cardMap).sort((a, b) => a.cardId - b.cardId);
  return json({ totals: totals.results, byAge: byAge.results, byCard });
}
__name(handleResults, "handleResults");
function cors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
__name(cors, "cors");
function json(data, status = 200) {
  return cors(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  );
}
__name(json, "json");

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
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

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
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

// .wrangler/tmp/bundle-TW1iqQ/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
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

// .wrangler/tmp/bundle-TW1iqQ/middleware-loader.entry.ts
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
