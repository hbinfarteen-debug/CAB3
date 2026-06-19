import React, { useState, useEffect } from "react";
import {
  Scale, ShieldCheck, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Lock, ScrollText,
  Plus, Minus, ArrowLeft, Loader2, TrendingUp
} from "lucide-react";

const REGIONS = [
  "Bulawayo", "Harare", "Manicaland", "Mashonaland Central",
  "Mashonaland East", "Mashonaland West", "Masvingo",
  "Matabeleland North", "Matabeleland South", "Midlands",
];

const AGE_GROUPS = ["18-25", "26-35", "36-50", "51-65", "66-90"];

const ORIGINAL_CAB3_POLL = {
  id: "official-cab3",
  title: "Constitutional Amendment Bill No. 3",
  cards: [
    {
      id: 1, label: "The Presidential Vote",
      question: "How should the country's President be chosen?",
      keep: {
        title: "Direct Election",
        desc: "By all citizens nationwide.",
        stick: [
          "Gives every individual citizen a direct say.",
          "Provides a clear national mandate.",
        ],
        change: [
          "National campaigns are highly expensive.",
          "Can polarize communities along party lines.",
        ],
      },
      amend: {
        title: "Indirect Election",
        desc: "By a joint vote of elected MPs.",
        stick: [
          "Saves massive state funds.",
          "Encourages cooperative governance between Executive and Parliament.",
        ],
        change: [
          "Reduces direct citizen influence.",
          "Shifts choosing power to political parties.",
        ],
      }
    },
    {
      id: 2, label: "The Timeline",
      question: "How long should a government term last before the next election?",
      keep: {
        title: "5-Year Term",
        desc: "Maintain the current term limit.",
        stick: [
          "Allows citizens to hold government accountable more frequently.",
          "Aligns with global standards.",
        ],
        change: [
          "Short cycles cause economic uncertainty.",
          "Frequent election campaign fatigue.",
        ],
      },
      amend: {
        title: "7-Year Term",
        desc: "Extend the limit for President and Parliament.",
        stick: [
          "More uninterrupted time to finish long-term development projects.",
          "Saves tax money on frequent elections.",
        ],
        change: [
          "Citizens wait nearly a decade to vote out underperformance.",
          "Weakens short-term accountability.",
        ],
      }
    },
    {
      id: 3, label: "The Chiefs",
      question: "What role should traditional leaders play in national party politics?",
      keep: {
        title: "Strictly Neutral",
        desc: "Chiefs remain non-partisan.",
        stick: [
          "Ensures chiefs remain unifying figures for all community members.",
          "Keeps traditional structures above party politics.",
        ],
        change: [
          "Limits the personal political freedoms of traditional leaders.",
        ],
      },
      amend: {
        title: "Active Politics",
        desc: "Chiefs may legally join political parties.",
        stick: [
          "Recognizes chiefs as figures who can directly influence national policy.",
        ],
        change: [
          "Risks splitting rural communities along party lines.",
          "Can bias local resource distribution.",
        ],
      }
    },
    {
      id: 4, label: "The Voter Roll",
      question: "Who should manage voter registration and the national voter roll?",
      keep: {
        title: "Independent ZEC",
        desc: "The Electoral Commission keeps the roll.",
        stick: [
          "Keeps the roll under a constitutionally independent body.",
          "Separate from government ministries.",
        ],
        change: [
          "Standalone systems create administrative overlaps and delays.",
        ],
      },
      amend: {
        title: "Civil Registry",
        desc: "The Registrar-General manages the roll.",
        stick: [
          "Integrates voter rolls with national ID databases.",
          "Enables automatic, seamless registration updates.",
        ],
        change: [
          "A government department faces higher scrutiny over political bias.",
        ],
      }
    },
    {
      id: 5, label: "The Courtroom",
      question: "What should be the primary focus of the highest Constitutional Court?",
      keep: {
        title: "Constitutional Disputes Only",
        desc: "Focus strictly on constitutional matters.",
        stick: [
          "Keeps the highest court focused, without backlog.",
        ],
        change: [
          "Restricts citizens from a swift, final say on broader societal issues.",
        ],
      },
      amend: {
        title: "Widened Jurisdiction",
        desc: "Hear broader public-interest law and appeals.",
        stick: [
          "Easier for citizens to bring major human-rights cases to the top.",
        ],
        change: [
          "Risks overwhelming the apex court with severe bottlenecks.",
        ],
      }
    }
  ]
};

const LOCK_KEY = "indaba_vote_lock_v2";

function readLocalLocks() {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalLock(pollId, record) {
  try {
    const locks = readLocalLocks();
    locks[pollId] = record;
    localStorage.setItem(LOCK_KEY, JSON.stringify(locks));
  } catch { /* storage unavailable */ }
}

function clearLocalLock(pollId) {
  try {
    const locks = readLocalLocks();
    delete locks[pollId];
    localStorage.setItem(LOCK_KEY, JSON.stringify(locks));
  } catch { /* storage unavailable */ }
}

const API_BASE = "https://cab3-vote-backend.cab3.workers.dev";

async function computeDeviceHash() {
  const parts = [
    screen.width, screen.height, screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language, navigator.platform,
    navigator.hardwareConcurrency || "",
  ].join("|");
  const buf = new TextEncoder().encode(parts);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function OptionButton({ active, title, desc, tag, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all min-h-[48px] ${
        active
          ? "border-indigo-600 bg-indigo-50"
          : "border-slate-200 bg-white active:border-slate-300"
      }`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span
          className={`text-[0.66em] font-bold uppercase tracking-wide ${
            active ? "text-indigo-600" : "text-slate-400"
          }`}
        >
          {tag}
        </span>
        {active && <CheckCircle2 size={16} className="text-indigo-600" />}
      </div>
      <p className="text-[0.98em] font-bold text-slate-900 leading-snug">{title}</p>
      <p className="text-[0.8em] text-slate-500 mt-0.5">{desc}</p>
    </button>
  );
}

function ReasonColumn({ heading, items, tone }) {
  if (!items || items.length === 0) return null;
  const dot = tone === "indigo" ? "bg-indigo-500" : "bg-slate-400";
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-3.5">
      <p className="text-[0.7em] font-bold text-slate-600 mb-2 leading-snug">{heading}</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5 text-[0.72em] text-slate-500 leading-snug">
            <span className={`mt-1.5 h-1 w-1 rounded-full shrink-0 ${dot}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


export default function App() {
  const [view, setView] = useState("home");
  const [activePoll, setActivePoll] = useState(null);

  if (view === "home") {
    return <HomeView
      onGoCreate={() => setView("create")}
      onTakePoll={(p) => { setActivePoll(p); setView("take"); }}
    />;
  }
  if (view === "create") {
    return <CreateView onBack={() => setView("home")} onCreated={(p) => { setActivePoll(p); setView("take"); }} />;
  }
  if (view === "take" && activePoll) {
    return <TakePollView poll={activePoll} onBack={() => setView("home")} />;
  }
  return null;
}

// ─── Home ────────────────────────────────────────────────────────────────────

function HomeView({ onGoCreate, onTakePoll }) {
  const [polls, setPolls] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function loadPolls() {
    setLoading(true);
    setErrorMsg("");
    fetch(`${API_BASE}/api/polls`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setPolls(d.polls || []); setLoading(false); })
      .catch((e) => {
        setErrorMsg(e.message || "Network error");
        setLoading(false);
      });
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 px-5 pt-14 pb-10 max-w-md mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-5 shadow-lg shadow-slate-900/20">
          <Scale className="text-white" size={30} strokeWidth={2} />
        </div>
        <h1 className="text-[1.7em] font-bold text-slate-900 leading-tight tracking-tight">Indaba</h1>
        <p className="text-[0.95em] font-semibold text-indigo-600 mt-1">The Civic Simulator</p>
      </div>

      {/* Create button */}
      <button onClick={onGoCreate} className="w-full h-14 rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25 active:bg-indigo-700 mb-8 flex items-center justify-center gap-2">
        <Plus size={20} /> Create a New Poll
      </button>

      {/* Official Poll */}
      <h2 className="text-[1.1em] font-bold mb-3">Official Poll</h2>
      <button
        onClick={() => onTakePoll(ORIGINAL_CAB3_POLL)}
        className="w-full bg-white p-4 rounded-xl border-2 border-indigo-200 text-left active:bg-slate-50 shadow-sm flex flex-col mb-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
        <span className="font-bold text-slate-800 text-[1.05em] pl-2">{ORIGINAL_CAB3_POLL.title}</span>
        <span className="text-xs text-indigo-500 mt-1 font-semibold pl-2">Official · 5 cards</span>
      </button>

      {/* Trending Polls */}
      {!polls && !loading && !errorMsg && (
        <button
          onClick={loadPolls}
          className="w-full h-12 rounded-xl bg-slate-200 text-slate-700 font-bold active:bg-slate-300 transition-colors flex items-center justify-center gap-2"
        >
          <TrendingUp size={18} /> Show Trending Polls
        </button>
      )}

      {(polls || loading || errorMsg) && (
        <>
          <h2 className="text-[1.1em] font-bold mb-4 mt-2">Trending Polls</h2>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : errorMsg ? (
            <div className="text-rose-500 text-center text-sm p-4 bg-rose-50 rounded-xl border border-rose-200">
              Could not load polls: <strong>{errorMsg}</strong>
              <br /><span className="text-xs">Is the backend running at {API_BASE}?</span>
            </div>
          ) : polls.length === 0 ? (
            <p className="text-slate-500 text-center text-sm py-6">No community polls yet. Be the first to create one!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {polls.map(p => (
                <button
                  key={p.id}
                  onClick={() => onTakePoll(p)}
                  className="bg-white p-4 rounded-xl border border-slate-200 text-left active:bg-slate-50 shadow-sm flex justify-between items-center"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-[1.05em]">{p.title}</span>
                    <span className="text-xs text-slate-500 mt-1">{p.total_votes} votes cast</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Create ───────────────────────────────────────────────────────────────────

function CreateView({ onBack, onCreated }) {
  const [title, setTitle] = useState("");
  const [cards, setCards] = useState(Array(5).fill(null).map((_, i) => ({
    id: i + 1, label: `Card ${i + 1}`, question: "",
    keep: { title: "", desc: "", whyTitle: "Why keep this?", why: "" },
    amend: { title: "", desc: "", whyTitle: "Why amend this?", why: "" }
  })));
  const [saving, setSaving] = useState(false);

  const canSave = title.trim() && cards.every(c =>
    c.question.trim() && c.keep.title.trim() && c.amend.title.trim()
  );

  function updateCard(i, side, field, val) {
    const n = cards.map((c, ci) => {
      if (ci !== i) return c;
      return { ...c, [side]: { ...c[side], [field]: val } };
    });
    setCards(n);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, cards })
      });
      const data = await res.json();
      if (data.id) onCreated({ id: data.id, title, cards });
    } catch {}
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 px-5 pt-8 pb-20 max-w-md mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-slate-500 font-semibold mb-6 text-sm">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-[1.5em] font-bold mb-6">Create 5-Card Poll</h1>

      <div className="mb-6">
        <label className="block text-[0.8em] font-semibold text-slate-600 mb-1.5">Poll Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-[0.95em]"
          placeholder="e.g. Local Budget Priorities"
        />
      </div>

      <div className="flex flex-col gap-8">
        {cards.map((c, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-indigo-600 mb-3 text-sm uppercase tracking-wide">Card {i + 1}</h3>

            <label className="block text-[0.8em] font-semibold text-slate-600 mb-1">Question</label>
            <input
              value={c.question}
              onChange={e => { const n = [...cards]; n[i] = { ...n[i], question: e.target.value }; setCards(n); }}
              className="w-full h-10 rounded-lg border border-slate-300 bg-slate-50 px-3 text-[0.9em] mb-4"
              placeholder="What should happen?"
            />

            <div className="grid grid-cols-2 gap-3">
              {[["keep", "emerald"], ["amend", "rose"]].map(([side, color]) => (
                <div key={side}>
                  <label className={`block text-[0.7em] font-bold text-${color}-600 mb-1`}>
                    {side === "keep" ? "Option A (Keep)" : "Option B (Amend)"}
                  </label>
                  <input
                    value={c[side].title}
                    onChange={e => updateCard(i, side, "title", e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-300 px-2 text-[0.8em] mb-1"
                    placeholder="Short title"
                  />
                  <textarea
                    value={c[side].desc}
                    onChange={e => updateCard(i, side, "desc", e.target.value)}
                    className="w-full h-14 rounded-md border border-slate-300 px-2 py-1 text-[0.75em] mb-1"
                    placeholder="One-line description..."
                  />
                  <textarea
                    value={c[side].why}
                    onChange={e => updateCard(i, side, "why", e.target.value)}
                    className="w-full h-16 rounded-md border border-slate-300 px-2 py-1 text-[0.75em]"
                    placeholder={side === "keep" ? "Why keep this? (explain the case)" : "Why amend this? (explain the case)"}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        disabled={!canSave || saving}
        onClick={handleSave}
        className="w-full h-14 mt-8 rounded-xl bg-indigo-600 text-white font-bold shadow-md active:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="animate-spin" size={18} />} Publish Poll
      </button>
    </div>
  );
}

// ─── Take Poll ────────────────────────────────────────────────────────────────

function TakePollView({ poll, onBack }) {
  const [screen, setScreen] = useState("onboarding");
  const [textScale, setTextScale] = useState(0);
  const [ageGroup, setAgeGroup] = useState("");
  const [region, setRegion] = useState("");
  const [cardIndex, setCardIndex] = useState(0);
  const [choices, setChoices] = useState({});
  const [vote, setVote] = useState(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [checkingLock, setCheckingLock] = useState(true);
  // which card's reasoning panel is open: null | "keep" | "amend"
  const [openReason, setOpenReason] = useState(null);

  const CARDS = poll.cards;

  useEffect(() => {
    const sizes = ["100%", "114%", "128%"];
    document.documentElement.style.fontSize = sizes[textScale];
    return () => { document.documentElement.style.fontSize = "100%"; };
  }, [textScale]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const locks = readLocalLocks();
      const lock = locks[poll.id];
      if (mounted && lock?.vote) {
        setVote(lock.vote);
        setAlreadyVoted(true);
        setScreen("results");
        loadResults();

        // Set lock checking to false immediately so the user isn't stuck on a spinner
        if (mounted) setCheckingLock(false);

        // Silently re-submit to backend in case the vote was never recorded
        // (e.g. wrangler wasn't running on a previous session)
        (async () => {
          try {
            const deviceHash = await computeDeviceHash();
            await fetch(`${API_BASE}/api/vote`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deviceHash,
                pollId: poll.id,
                vote: lock.vote,
                cardChoices: lock.cardChoices || null,
              })
            });
            // After re-submit attempt, reload results to get fresh counts
            if (mounted) loadResults();
          } catch (e) {
            console.warn("Re-submit failed:", e);
          }
        })();
      } else {
        if (mounted) setCheckingLock(false);
      }
    })();
    return () => { mounted = false; };
  }, [poll.id]);

  // Reset reason panel when card changes
  useEffect(() => { setOpenReason(null); }, [cardIndex]);

  async function loadResults() {
    setResultsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/results/${poll.id}`);
      if (res.ok) {
        const data = await res.json();
        setResultsData(data);
      }
    } catch (e) {
      console.warn("Results fetch failed:", e);
    } finally {
      setResultsLoading(false);
    }
  }

  async function castVote(choice) {
    setVote(choice);
    setScreen("results");
    setResultsLoading(true);

    try {
      const deviceHash = await computeDeviceHash();
      const res = await fetch(`${API_BASE}/api/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceHash,
          pollId: poll.id,
          vote: choice,
          ageGroup,
          region,
          cardChoices: choices   // {1:"keep", 2:"amend", ...}
        })
      });
      if (!res.ok) {
        console.error("Vote API error:", res.status, await res.text());
      } else {
        const serverResult = await res.json();
        console.log("Vote result:", serverResult);
        if (serverResult?.status === "duplicate" && serverResult.vote) {
          setVote(serverResult.vote);
          setAlreadyVoted(true);
          writeLocalLock(poll.id, { vote: serverResult.vote, ts: Date.now(), cardChoices: choices });
        } else {
          // Successfully recorded — write lock WITH card choices so re-submit has them too
          writeLocalLock(poll.id, { vote: choice, ts: Date.now(), cardChoices: choices });
        }
      }
    } catch (e) {
      console.error("Vote fetch failed:", e);
      // Still write local lock so the user isn't left in limbo
      writeLocalLock(poll.id, { vote: choice, ts: Date.now(), cardChoices: choices });
    }

    loadResults();
  }

  const canStart = ageGroup && region;
  const currentCard = CARDS[cardIndex];
  const currentChoice = choices[currentCard?.id];

  if (checkingLock) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  // ── Onboarding ──────────────────────────────────────────────────────────────
  if (screen === "onboarding") {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col items-center text-center max-w-md mx-auto px-5 pt-14 pb-10">
        <button onClick={onBack} className="self-start flex items-center gap-1 text-slate-500 font-semibold mb-6 text-sm">
          <ArrowLeft size={16} /> All Polls
        </button>
        <div className="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-5 shadow-lg shadow-slate-900/20">
          <Scale className="text-white" size={30} strokeWidth={2} />
        </div>
        <h1 className="text-[1.7em] font-bold text-slate-900 leading-tight tracking-tight">{poll.title}</h1>
        <p className="text-[0.95em] font-semibold text-indigo-600 mt-1 mb-3">Indaba Simulator</p>
        <p className="text-[0.92em] text-slate-500 leading-relaxed mb-9">
          100% Anonymous. No names. No numbers. No tracking.
        </p>
        <div className="w-full flex flex-col gap-4 text-left">
          <label className="block">
            <span className="block text-[0.78em] font-semibold text-slate-600 mb-1.5">Your age group</span>
            <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4">
              <option value="">Select age group</option>
              {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[0.78em] font-semibold text-slate-600 mb-1.5">Your province</span>
            <select value={region} onChange={e => setRegion(e.target.value)} className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4">
              <option value="">Select province</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
        <button
          disabled={!canStart}
          onClick={() => setScreen("dilemma")}
          className={`w-full h-14 rounded-xl mt-8 text-[1em] font-bold transition-all ${canStart ? "bg-indigo-600 text-white active:bg-indigo-700 shadow-md" : "bg-slate-200 text-slate-400"}`}
        >
          Start Simulation
        </button>
      </div>
    );
  }

  // ── Dilemma cards ──────────────────────────────────────────────────────────
  if (screen === "dilemma") {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-28">
        {/* Text-size toolbar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-5 py-3 flex justify-between items-center shadow-sm">
          <button onClick={() => setTextScale(s => Math.max(0, s - 1))} className="p-2 bg-slate-100 rounded-md"><Minus size={16} /></button>
          <span className="font-bold text-slate-700 text-sm">Text Size</span>
          <button onClick={() => setTextScale(s => Math.min(2, s + 1))} className="p-2 bg-slate-100 rounded-md"><Plus size={16} /></button>
        </div>

        <div className="max-w-md mx-auto px-5 pt-5">
          {/* Progress */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[0.72em] font-bold uppercase tracking-wider text-indigo-600">
              Card {cardIndex + 1} of {CARDS.length}
            </span>
            <div className="flex gap-1">
              {CARDS.map((_, i) => (
                <div key={i} className={`h-1.5 w-5 rounded-full ${i <= cardIndex ? "bg-indigo-600" : "bg-slate-200"}`} />
              ))}
            </div>
          </div>

          <p className="text-[0.72em] font-semibold text-slate-400 mb-1">{currentCard.label}</p>
          <h2 className="text-[1.25em] font-bold text-slate-900 leading-snug mb-5">{currentCard.question}</h2>

          {/* Option cards */}
          <div className="flex flex-col gap-3 mb-5">
            <OptionButton
              active={currentChoice === "keep"}
              title={currentCard.keep.title}
              desc={currentCard.keep.desc}
              tag="Keep Current"
              onClick={() => setChoices({ ...choices, [currentCard.id]: "keep" })}
            />
            <OptionButton
              active={currentChoice === "amend"}
              title={currentCard.amend.title}
              desc={currentCard.amend.desc}
              tag="Amend"
              onClick={() => setChoices({ ...choices, [currentCard.id]: "amend" })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <ReasonColumn heading="Why stick with this?" items={currentCard.keep.stick} tone="slate" />
            <ReasonColumn heading="Why change this?" items={currentCard.amend.stick} tone="indigo" />
          </div>
        </div>

        {/* Bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <button
              disabled={cardIndex === 0}
              onClick={() => setCardIndex(i => i - 1)}
              className="h-12 w-12 rounded-xl border border-slate-300 flex items-center justify-center text-slate-600 disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              disabled={!currentChoice}
              onClick={() => cardIndex < CARDS.length - 1 ? setCardIndex(i => i + 1) : setScreen("ballot")}
              className="h-12 flex-1 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {cardIndex === CARDS.length - 1 ? "Go to Ballot" : "Next Card"} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Ballot ──────────────────────────────────────────────────────────────────
  if (screen === "ballot") {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 max-w-md mx-auto px-5 pt-10 pb-14 text-center">
        <ScrollText className="text-slate-700 mx-auto mb-4" size={32} />
        <h2 className="text-[1.3em] font-bold text-slate-900 mb-2">Cast Your Vote</h2>
        <p className="text-[0.95em] font-semibold text-slate-700 leading-relaxed mb-7">
          Based on your choices across all 5 cards, would you vote YES or NO to this proposal?
        </p>

        {/* Summary of choices */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8 text-left shadow-sm">
          <p className="text-[0.72em] font-bold uppercase tracking-wide text-slate-400 mb-3">Your Choices</p>
          {CARDS.map(card => {
            const choice = choices[card.id];
            const opt = choice ? card[choice] : null;
            const color = choice === "keep" ? "emerald" : "rose";
            return (
              <div key={card.id} className="flex items-start justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
                <span className="text-[0.82em] text-slate-600 leading-tight flex-1">{card.label}</span>
                {opt && (
                  <span className={`text-[0.78em] font-bold text-${color}-600 text-right flex-shrink-0`}>{opt.title}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3.5 mb-6">
          <button
            onClick={() => castVote("YES")}
            className="h-16 rounded-2xl bg-emerald-600 text-white text-[1.1em] font-bold flex items-center justify-center gap-2 active:bg-emerald-700"
          >
            <CheckCircle2 size={22} /> VOTE YES
          </button>
          <button
            onClick={() => castVote("NO")}
            className="h-16 rounded-2xl bg-rose-600 text-white text-[1.1em] font-bold flex items-center justify-center gap-2 active:bg-rose-700"
          >
            <XCircle size={22} /> VOTE NO
          </button>
        </div>
        <button onClick={() => setScreen("dilemma")} className="text-[0.8em] font-semibold text-slate-400 underline">
          Go back and review
        </button>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  if (screen === "results") {
    let yesCount = 0, noCount = 0;
    if (resultsData?.totals) {
      const y = resultsData.totals.find(t => t.vote === "YES");
      const n = resultsData.totals.find(t => t.vote === "NO");
      yesCount = y ? y.count : 0;
      noCount = n ? n.count : 0;
    }
    const total = yesCount + noCount;
    const yesPct = total > 0 ? Math.round((yesCount / total) * 100) : 50;
    const noPct = total > 0 ? Math.round((noCount / total) * 100) : 50;

    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 max-w-md mx-auto px-5 pt-10 pb-14">
        <button onClick={onBack} className="flex items-center gap-1 text-slate-500 font-semibold mb-6 text-sm">
          <ArrowLeft size={16} /> All Polls
        </button>

        <div className="flex flex-col items-center text-center mb-7">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <Lock className="text-emerald-600" size={20} />
          </div>
          <span className="text-[0.78em] font-bold uppercase tracking-wider text-emerald-600">
            {alreadyVoted ? "Device Already Voted" : "Vote Cast Successfully"}
          </span>
          <h2 className="text-[1.3em] font-bold text-slate-900 mt-1">{poll.title}</h2>
          <p className="text-[0.85em] text-slate-500 mt-1">The Public Pulse</p>
        </div>

        {/* My vote badge */}
        <div className={`rounded-2xl p-4 text-center mb-5 ${vote === "YES" ? "bg-emerald-600" : "bg-rose-600"}`}>
          <p className="text-[0.8em] text-white/80 mb-1">Your vote</p>
          <p className="text-[2em] font-extrabold text-white">{vote}</p>
        </div>

        {/* Results bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[0.72em] font-bold uppercase tracking-wide text-slate-400">Overall Results</p>
            {resultsLoading
              ? <Loader2 size={14} className="animate-spin text-slate-400" />
              : <span className="text-[0.72em] font-semibold text-slate-500">{total} total votes</span>
            }
          </div>
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex mb-3">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${yesPct}%` }} />
            <div className="h-full bg-rose-500 transition-all" style={{ width: `${noPct}%` }} />
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span className="text-emerald-600">YES — {yesPct}% ({yesCount})</span>
            <span className="text-rose-600">NO — {noPct}% ({noCount})</span>
          </div>
        </div>

        {/* Per-card breakdown of user choices */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[0.72em] font-bold uppercase tracking-wide text-slate-400 mb-3">Your Choices</p>
          {CARDS.map(card => {
            const choice = choices[card.id];
            const opt = choice ? card[choice] : null;
            const isKeep = choice === "keep";

            // Per-card vote counts from backend if available
            const cardStats = resultsData?.byCard?.find(b => b.cardId === card.id);
            const keepCount = cardStats?.keepCount ?? 0;
            const amendCount = cardStats?.amendCount ?? 0;
            const cardTotal = keepCount + amendCount;
            const keepPct = cardTotal > 0 ? Math.round((keepCount / cardTotal) * 100) : null;
            const amendPct = cardTotal > 0 ? Math.round((amendCount / cardTotal) * 100) : null;

            return (
              <div key={card.id} className="py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[0.82em] text-slate-600 flex-1 leading-tight">{card.label}</span>
                  {opt ? (
                    isKeep ? (
                      <span className="text-[0.78em] font-bold text-emerald-600 text-right flex-shrink-0">{opt.title}</span>
                    ) : (
                      <span className="text-[0.78em] font-bold text-rose-600 text-right flex-shrink-0">{opt.title}</span>
                    )
                  ) : (
                    <span className="text-[0.78em] text-slate-400 text-right flex-shrink-0">—</span>
                  )}
                </div>

                {/* Per-card vote bar — only show when backend data available */}
                {keepPct !== null && (
                  <div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-400" style={{ width: `${keepPct}%` }} />
                      <div className="h-full bg-rose-400" style={{ width: `${amendPct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[0.62em] text-emerald-600 font-semibold">Keep {keepPct}% ({keepCount})</span>
                      <span className="text-[0.62em] text-rose-600 font-semibold">Amend {amendPct}% ({amendCount})</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* If stats still zero, explain why */}
        {!resultsLoading && total === 0 && (
          <p className="text-center text-[0.72em] text-slate-400 mt-4 leading-relaxed px-2">
            No results yet — make sure the backend is running at{" "}
            <span className="font-mono text-slate-500">{API_BASE}</span> and try voting again below.
          </p>
        )}

        {/* Reset — lets user clear lock and vote fresh (only for custom polls) */}
        {poll.id !== "official-cab3" && (
          <div className="mt-5 text-center">
            <button
              onClick={() => {
                clearLocalLock(poll.id);
                setScreen("onboarding");
                setVote(null);
                setAlreadyVoted(false);
                setChoices({});
                setCardIndex(0);
                setResultsData(null);
              }}
              className="text-[0.72em] text-slate-400 underline"
            >
              Reset &amp; vote again (Creator Only)
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
