/**
 * Indaba anonymous vote backend with dynamic polls.
 *
 * GET  /api/polls
 *   -> list of polls with their total votes
 *
 * POST /api/polls     { title, cards }
 *   -> { id }
 *
 * POST /api/vote      { deviceHash, pollId, vote, ageGroup?, region?, cardChoices? }
 *   -> { status: "recorded", vote }
 *   -> { status: "duplicate", vote }
 *
 * GET  /api/results/:pollId
 *   -> { totals: [{vote, count}], byAge: [{age_group, vote, count}], byCard: [{cardId, keepCount, amendCount}] }
 */

const ALLOWED_VOTES = new Set(["YES", "NO"]);
const ALLOWED_AGE_GROUPS = new Set(["18-25", "26-35", "36-50", "51-65", "66-90"]);

export default {
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
    
    // Fallback for missing endpoint
    if (url.pathname === "/api/results" && request.method === "GET") {
      return json({ error: "missing poll id" }, 400);
    }

    return json({ error: "not found" }, 404);
  },
};

async function handleGetPolls(env) {
  // get polls and their total vote count
  const polls = await env.DB
    .prepare(`
      SELECT p.id, p.title, p.cards, p.created_at, COUNT(v.device_hash) as total_votes
      FROM polls p
      LEFT JOIN votes v ON p.id = v.poll_id
      GROUP BY p.id
      ORDER BY total_votes DESC, p.created_at DESC
    `)
    .all();

  // parse cards
  const parsed = polls.results.map(p => ({
    ...p,
    cards: JSON.parse(p.cards)
  }));
  return json({ polls: parsed });
}

async function handleCreatePoll(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const { title, cards } = body || {};
  if (!title || typeof title !== 'string') return json({ error: "invalid title" }, 400);
  if (!cards || !Array.isArray(cards) || cards.length !== 5) return json({ error: "must provide 5 cards" }, 400);

  const pollId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO polls (id, title, cards, created_at) VALUES (?, ?, ?, ?)`
  ).bind(pollId, title, JSON.stringify(cards), Date.now()).run();

  return json({ id: pollId });
}

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

  // Validate and serialise per-card choices if provided
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
  )
    .bind(deviceHash, pollId, vote, ageGroup || null, region || null, cardChoicesJson, Date.now())
    .run();

  if (insert.meta.changes === 0) {
    const existing = await env.DB
      .prepare("SELECT vote FROM votes WHERE device_hash = ? AND poll_id = ?")
      .bind(deviceHash, pollId)
      .first();
    return json({ status: "duplicate", vote: existing?.vote ?? null });
  }

  return json({ status: "recorded", vote });
}

async function handleResults(pollId, env) {
  const totals = await env.DB
    .prepare("SELECT vote, COUNT(*) as count FROM votes WHERE poll_id = ? GROUP BY vote")
    .bind(pollId)
    .all();

  const byAge = await env.DB
    .prepare(
      `SELECT age_group, vote, COUNT(*) as count
       FROM votes
       WHERE poll_id = ? AND age_group IS NOT NULL
       GROUP BY age_group, vote`
    )
    .bind(pollId)
    .all();

  // Aggregate per-card keep/amend counts from stored JSON choices
  const allChoices = await env.DB
    .prepare("SELECT card_choices FROM votes WHERE poll_id = ? AND card_choices IS NOT NULL")
    .bind(pollId)
    .all();

  const cardMap = {};
  for (const row of allChoices.results) {
    try {
      const parsed = JSON.parse(row.card_choices);
      for (const [cardId, choice] of Object.entries(parsed)) {
        if (!cardMap[cardId]) cardMap[cardId] = { cardId: Number(cardId), keepCount: 0, amendCount: 0 };
        if (choice === "keep") cardMap[cardId].keepCount++;
        else if (choice === "amend") cardMap[cardId].amendCount++;
      }
    } catch {}
  }
  const byCard = Object.values(cardMap).sort((a, b) => a.cardId - b.cardId);

  return json({ totals: totals.results, byAge: byAge.results, byCard });
}

function cors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

function json(data, status = 200) {
  return cors(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}
