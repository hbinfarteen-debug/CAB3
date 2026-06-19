import React, { useState, useEffect, useMemo } from "react";
import {
  Scale,
  ShieldCheck,
  Anchor,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Vote,
  Share2,
  Lock,
  ScrollText,
  Plus,
  Minus,
} from "lucide-react";

/* ----------------------------------------------------------------------- */
/* CONTENT                                                                  */
/* ----------------------------------------------------------------------- */

const CARDS = [
  {
    id: 1,
    label: "The Presidential Vote",
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
    },
  },
  {
    id: 2,
    label: "The Timeline",
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
    },
  },
  {
    id: 3,
    label: "The Chiefs",
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
    },
  },
  {
    id: 4,
    label: "The Voter Roll",
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
    },
  },
  {
    id: 5,
    label: "The Courtroom",
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
    },
  },
];

const REGIONS = [
  "Bulawayo",
  "Harare",
  "Manicaland",
  "Mashonaland Central",
  "Mashonaland East",
  "Mashonaland West",
  "Masvingo",
  "Matabeleland North",
  "Matabeleland South",
  "Midlands",
];

const AGE_GROUPS = ["18-25", "26-35", "36-50", "51-65", "66-90"];

/* ----------------------------------------------------------------------- */
/* DEVICE VOTE LOCK (client-side, anonymous — no PII stored)               */
/* ----------------------------------------------------------------------- */
/* This is a soft deterrent only: it stops a casual repeat visit on the
   same browser, not a determined attempt (incognito / clearing storage /
   a different browser still bypasses it). Real one-vote-per-device
   enforcement needs a server-side record. */

const LOCK_KEY = "mutemo_cab3_vote_lock_v1";
const IDB_NAME = "mutemo_cab3_db";
const IDB_STORE = "lock";
const IDB_RECORD_ID = "device_lock";

function readLocalLock() {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalLock(record) {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable — IndexedDB layer below still applies */
  }
}

function openLockDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("no idb"));
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readIdbLock() {
  try {
    const db = await openLockDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_RECORD_ID);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeIdbLock(record) {
  try {
    const db = await openLockDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put({ id: IDB_RECORD_ID, ...record });
  } catch {
    /* IndexedDB unavailable — localStorage layer above still applies */
  }
}

async function readDeviceLock() {
  const local = readLocalLock();
  if (local) return local;
  const idb = await readIdbLock();
  if (idb) {
    // resync localStorage so both layers agree again
    writeLocalLock(idb);
    return idb;
  }
  return null;
}

async function writeDeviceLock(record) {
  writeLocalLock(record);
  await writeIdbLock(record);
}

/* ----------------------------------------------------------------------- */
/* BACKEND VOTE API (Cloudflare Worker + D1)                               */
/* ----------------------------------------------------------------------- */
/* Paste your deployed Worker URL here once you've run `wrangler deploy`.
   Leave it blank to run in local-only mode (Layer 1/2 device lock,
   no server-side dedup, no real aggregate results). */

const API_BASE = ""; // e.g. "https://cab3-vote-backend.yoursubdomain.workers.dev"

// A stable, anonymous device signal. Only low-entropy, non-identifying
// signals go in; the hash is computed entirely client-side and nothing
// raw ever leaves the browser — the server only ever sees this string.
async function computeDeviceHash() {
  const parts = [
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.platform,
    navigator.hardwareConcurrency || "",
  ].join("|");

  const buf = new TextEncoder().encode(parts);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function submitVoteToServer(vote, ageGroup, region) {
  if (!API_BASE) return null; // local-only mode
  try {
    const deviceHash = await computeDeviceHash();
    const res = await fetch(`${API_BASE}/api/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceHash, vote, ageGroup, region }),
    });
    if (!res.ok) return null;
    return await res.json(); // { status: 'recorded' | 'duplicate', vote }
  } catch {
    return null; // offline or backend not reachable — fall back to local lock
  }
}

/* simulated, clearly-labelled national pulse data */
const NATIONAL_PULSE = { yes: 52, no: 48 };
const DEMO_PULSE = {
  "18-25": { yes: 30, no: 70 },
  "26-35": { yes: 41, no: 59 },
  "36-50": { yes: 53, no: 47 },
  "51-65": { yes: 61, no: 39 },
  "66-90": { yes: 65, no: 35 },
};

/* ----------------------------------------------------------------------- */
/* SMALL PRESENTATIONAL HELPERS                                            */
/* ----------------------------------------------------------------------- */

function Meter({ icon: Icon, label, value, leftTag, rightTag }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
      <div className="flex items-center gap-1.5 text-[0.7em] font-semibold uppercase tracking-wide text-slate-500">
        <Icon size={14} strokeWidth={2.5} />
        <span>{label}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="flex justify-between text-[0.62em] text-slate-400 font-medium">
        <span>{leftTag}</span>
        <span>{rightTag}</span>
      </div>
    </div>
  );
}

function TextSizeToggle({ scale, setScale }) {
  return (
    <div className="flex items-center rounded-full border border-slate-300 bg-white shadow-sm overflow-hidden shrink-0">
      <button
        onClick={() => setScale((s) => Math.max(0, s - 1))}
        aria-label="Decrease text size"
        className="h-12 w-12 flex items-center justify-center text-slate-700 active:bg-slate-100 disabled:opacity-30"
        disabled={scale === 0}
      >
        <Minus size={16} strokeWidth={3} />
      </button>
      <span className="px-2 text-[0.65em] font-bold text-slate-500 select-none">A</span>
      <button
        onClick={() => setScale((s) => Math.min(2, s + 1))}
        aria-label="Increase text size"
        className="h-12 w-12 flex items-center justify-center text-slate-700 active:bg-slate-100 disabled:opacity-30"
        disabled={scale === 2}
      >
        <Plus size={16} strokeWidth={3} />
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* MAIN APP                                                                 */
/* ----------------------------------------------------------------------- */

export default function App() {
  const [screen, setScreen] = useState("onboarding"); // onboarding | dilemma | ballot | results
  const [textScale, setTextScale] = useState(0); // 0,1,2
  const [ageGroup, setAgeGroup] = useState("");
  const [region, setRegion] = useState("");
  const [cardIndex, setCardIndex] = useState(0);
  const [choices, setChoices] = useState({}); // {cardId: 'keep'|'amend'}
  const [vote, setVote] = useState(null); // 'YES' | 'NO'
  const [filterAge, setFilterAge] = useState("18-25");
  const [checkingLock, setCheckingLock] = useState(true);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  useEffect(() => {
    const sizes = ["100%", "114%", "128%"];
    document.documentElement.style.fontSize = sizes[textScale];
    return () => {
      document.documentElement.style.fontSize = "100%";
    };
  }, [textScale]);

  // On load, check this device's anonymous vote lock. No PII involved —
  // just a vote choice and a timestamp.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const lock = await readDeviceLock();
      if (mounted && lock?.vote) {
        setVote(lock.vote);
        setAlreadyVoted(true);
        setScreen("results");
      }
      if (mounted) setCheckingLock(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const meters = useMemo(() => {
    let citizen = 50,
      checks = 50,
      continuity = 50;
    CARDS.forEach((c) => {
      const choice = choices[c.id];
      if (!choice) return;
      const dir = choice === "keep" ? 1 : -1;
      citizen += 10 * dir;
      checks += 10 * dir;
      continuity -= 10 * dir;
    });
    const clamp = (v) => Math.min(100, Math.max(0, v));
    return {
      citizen: clamp(citizen),
      checks: clamp(checks),
      continuity: clamp(continuity),
    };
  }, [choices]);

  const canStart = ageGroup && region;
  const currentCard = CARDS[cardIndex];
  const currentChoice = choices[currentCard?.id];
  const answeredCount = Object.keys(choices).length;

  function selectOption(cardId, option) {
    setChoices((prev) => ({ ...prev, [cardId]: option }));
  }

  function goNext() {
    if (cardIndex < CARDS.length - 1) {
      setCardIndex((i) => i + 1);
    } else {
      setScreen("ballot");
    }
  }
  function goBack() {
    if (cardIndex > 0) setCardIndex((i) => i - 1);
  }

  async function castVote(choice) {
    setVote(choice);
    setScreen("results");
    writeDeviceLock({ vote: choice, ts: Date.now() });

    const serverResult = await submitVoteToServer(choice, ageGroup, region);
    if (serverResult?.status === "duplicate" && serverResult.vote) {
      // The server's record is authoritative — this device already voted
      // (e.g. from another tab) even though no local lock caught it yet.
      setVote(serverResult.vote);
      setAlreadyVoted(true);
      writeDeviceLock({ vote: serverResult.vote, ts: Date.now() });
    }
  }

  if (checkingLock) {
    return (
      <Shell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-400 text-[0.85em] font-medium">
            <Scale size={16} className="animate-pulse" />
            Checking this device…
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------------------------------------------------------------- */
  /* RENDER: ONBOARDING                                                */
  /* ---------------------------------------------------------------- */

  if (screen === "onboarding") {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center max-w-md mx-auto px-5 pt-14 pb-10">
          <div className="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-5 shadow-lg shadow-slate-900/20">
            <Scale className="text-white" size={30} strokeWidth={2} />
          </div>
          <h1 className="text-[1.7em] font-bold text-slate-900 leading-tight tracking-tight">
            Mutemo
          </h1>
          <p className="text-[0.95em] font-semibold text-indigo-600 mt-1 mb-3">
            The CAB3 Simulator
          </p>
          <p className="text-[0.92em] text-slate-500 leading-relaxed mb-9">
            Simulate the future. See what the country is saying.
            <br />
            <span className="font-semibold text-slate-600">100% Anonymous.</span> No names. No
            numbers. No tracking.
          </p>

          <div className="w-full flex flex-col gap-4 text-left">
            <label className="block">
              <span className="block text-[0.78em] font-semibold text-slate-600 mb-1.5">
                Your age group
              </span>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-[0.95em] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select age group</option>
                {AGE_GROUPS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-[0.78em] font-semibold text-slate-600 mb-1.5">
                Your province
              </span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-[0.95em] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select province</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            disabled={!canStart}
            onClick={() => setScreen("dilemma")}
            className={`w-full h-14 rounded-xl mt-8 text-[1em] font-bold transition-all ${
              canStart
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 active:bg-indigo-700"
                : "bg-slate-200 text-slate-400"
            }`}
          >
            Start Simulation
          </button>

          <p className="text-[0.7em] text-slate-400 mt-5 leading-relaxed">
            We never collect your name, phone number, or email. Your selections stay in this
            browser only.
          </p>
        </div>
      </Shell>
    );
  }

  /* ---------------------------------------------------------------- */
  /* RENDER: DILEMMA DASHBOARD                                         */
  /* ---------------------------------------------------------------- */

  if (screen === "dilemma") {
    return (
      <Shell>
        <StickyHeader textScale={textScale} setTextScale={setTextScale} meters={meters} />

        <div className="max-w-md mx-auto px-5 pt-5 pb-28">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[0.72em] font-bold uppercase tracking-wider text-indigo-600">
              Card {cardIndex + 1} of {CARDS.length}
            </span>
            <div className="flex gap-1">
              {CARDS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-5 rounded-full ${
                    i <= cardIndex ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="text-[0.72em] font-semibold text-slate-400 mb-1">{currentCard.label}</p>
          <h2 className="text-[1.25em] font-bold text-slate-900 leading-snug mb-5">
            {currentCard.question}
          </h2>

          <div className="flex flex-col gap-3 mb-5">
            <OptionButton
              active={currentChoice === "keep"}
              title={currentCard.keep.title}
              desc={currentCard.keep.desc}
              tag="Keep Current"
              onClick={() => selectOption(currentCard.id, "keep")}
            />
            <OptionButton
              active={currentChoice === "amend"}
              title={currentCard.amend.title}
              desc={currentCard.amend.desc}
              tag="Amend"
              onClick={() => selectOption(currentCard.id, "amend")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ReasonColumn heading="Why stick with this?" items={currentCard.keep.stick} tone="slate" />
            <ReasonColumn heading="Why change this?" items={currentCard.amend.stick} tone="indigo" />
          </div>
        </div>

        <FooterNav
          onBack={goBack}
          onNext={goNext}
          backDisabled={cardIndex === 0}
          nextDisabled={!currentChoice}
          nextLabel={cardIndex === CARDS.length - 1 ? "Go to Ballot" : "Next Card"}
        />
      </Shell>
    );
  }

  /* ---------------------------------------------------------------- */
  /* RENDER: BALLOT BOX                                                */
  /* ---------------------------------------------------------------- */

  if (screen === "ballot") {
    return (
      <Shell>
        <div className="max-w-md mx-auto px-5 pt-10 pb-14">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <ScrollText className="text-slate-700" size={20} />
            <h2 className="text-[1.3em] font-bold text-slate-900">Your Simulated Model</h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-7 shadow-sm">
            <div className="flex flex-col gap-5">
              <Meter
                icon={Vote}
                label="Direct Citizen Power"
                value={meters.citizen}
                leftTag="Delegated"
                rightTag="Direct"
              />
              <Meter
                icon={ShieldCheck}
                label="Institutional Checks"
                value={meters.checks}
                leftTag="Centralized"
                rightTag="Independent"
              />
              <Meter
                icon={Anchor}
                label="Project Continuity"
                value={meters.continuity}
                leftTag="Frequent Renewal"
                rightTag="Long-Term Stability"
              />
            </div>
          </div>

          <p className="text-center text-[0.95em] font-semibold text-slate-700 leading-relaxed mb-1 px-2">
            Based on your simulated model, would you vote YES or NO to the Constitutional
            Amendment Bill No. 3 (CAB3) in its entirety?
          </p>
          <p className="text-center text-[0.72em] text-slate-400 mb-7">
            This is a personal reflection exercise — there is no right answer.
          </p>

          <div className="flex flex-col gap-3.5">
            <button
              onClick={() => castVote("YES")}
              className="h-16 rounded-2xl bg-emerald-600 text-white text-[1.1em] font-bold tracking-wide shadow-md shadow-emerald-600/25 active:bg-emerald-700 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={22} />
              VOTE YES
            </button>
            <button
              onClick={() => castVote("NO")}
              className="h-16 rounded-2xl bg-rose-600 text-white text-[1.1em] font-bold tracking-wide shadow-md shadow-rose-600/25 active:bg-rose-700 flex items-center justify-center gap-2"
            >
              <XCircle size={22} />
              VOTE NO
            </button>
          </div>

          <button
            onClick={() => setScreen("dilemma")}
            className="w-full text-center text-[0.78em] font-semibold text-slate-400 mt-6 underline"
          >
            Go back and review my answers
          </button>
        </div>
      </Shell>
    );
  }

  /* ---------------------------------------------------------------- */
  /* RENDER: RESULTS / PUBLIC PULSE                                    */
  /* ---------------------------------------------------------------- */

  if (screen === "results") {
    const demo = DEMO_PULSE[filterAge];
    return (
      <Shell>
        <div className="max-w-md mx-auto px-5 pt-10 pb-14">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <Lock className="text-emerald-600" size={20} />
            </div>
            <span className="text-[0.78em] font-bold uppercase tracking-wider text-emerald-600">
              {alreadyVoted ? "This Device Already Voted" : "Vote Cast Successfully"}
            </span>
            <h2 className="text-[1.3em] font-bold text-slate-900 mt-1">The Public Pulse</h2>
            {alreadyVoted && (
              <p className="text-[0.72em] text-slate-400 mt-2 leading-relaxed">
                One simulated vote per device. Your earlier choice is shown below.
              </p>
            )}
          </div>

          {/* national */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5 shadow-sm">
            <p className="text-[0.72em] font-bold uppercase tracking-wide text-slate-400 mb-3">
              National Vote (Simulated)
            </p>
            <PulseBar yes={NATIONAL_PULSE.yes} no={NATIONAL_PULSE.no} />
          </div>

          {/* demographic filter */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5 shadow-sm">
            <p className="text-[0.72em] font-bold uppercase tracking-wide text-slate-400 mb-3">
              Filter by Age Group
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1">
              {AGE_GROUPS.map((a) => (
                <button
                  key={a}
                  onClick={() => setFilterAge(a)}
                  className={`px-3 h-9 rounded-full text-[0.78em] font-semibold whitespace-nowrap shrink-0 ${
                    filterAge === a
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <PulseBar yes={demo.yes} no={demo.no} />
          </div>

          {/* share card */}
          <div className="rounded-2xl bg-slate-900 p-5 mb-6 text-white relative overflow-hidden">
            <div className="flex items-center gap-1.5 mb-3">
              <Scale size={15} />
              <span className="text-[0.7em] font-bold uppercase tracking-wider text-slate-300">
                Mutemo — CAB3 Simulator
              </span>
            </div>
            <p className="text-[0.85em] text-slate-300 mb-3">My simulated vote:</p>
            <p
              className={`text-[1.7em] font-extrabold mb-1 ${
                vote === "YES" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {vote}
            </p>
            <p className="text-[0.7em] text-slate-400">
              National pulse: {NATIONAL_PULSE.yes}% YES · {NATIONAL_PULSE.no}% NO
            </p>
          </div>

          <button className="w-full h-13 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-[0.9em] flex items-center justify-center gap-2 h-12 active:bg-slate-50">
            <Share2 size={17} />
            Share the Pulse
          </button>

          <p className="text-center text-[0.68em] text-slate-400 mt-6 leading-relaxed">
            Poll figures are simulated for illustrative purposes within this app and are not an
            official electoral result.
          </p>
        </div>
      </Shell>
    );
  }

  return null;
}

/* ----------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                           */
/* ----------------------------------------------------------------------- */

function Shell({ children }) {
  return <div className="min-h-screen bg-slate-50 font-sans text-slate-900">{children}</div>;
}

function StickyHeader({ textScale, setTextScale, meters }) {
  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Scale size={16} className="text-slate-900" />
          <span className="text-[0.85em] font-bold text-slate-900">Mutemo</span>
        </div>
        <TextSizeToggle scale={textScale} setScale={setTextScale} />
      </div>
      <div className="max-w-md mx-auto px-5 pb-3 flex gap-3 overflow-x-auto">
        <Meter icon={Vote} label="Citizen" value={meters.citizen} leftTag="Low" rightTag="High" />
        <Meter icon={ShieldCheck} label="Checks" value={meters.checks} leftTag="Low" rightTag="High" />
        <Meter icon={Anchor} label="Stability" value={meters.continuity} leftTag="Low" rightTag="High" />
      </div>
    </div>
  );
}

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

function FooterNav({ onBack, onNext, backDisabled, nextDisabled, nextLabel }) {
  return (
    <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200">
      <div className="max-w-md mx-auto px-5 py-3 flex gap-3">
        <button
          onClick={onBack}
          disabled={backDisabled}
          className="h-12 px-4 rounded-xl border border-slate-300 text-slate-600 font-semibold text-[0.85em] flex items-center gap-1 disabled:opacity-30"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className={`flex-1 h-12 rounded-xl font-bold text-[0.9em] flex items-center justify-center gap-1 ${
            nextDisabled
              ? "bg-slate-200 text-slate-400"
              : "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
          }`}
        >
          {nextLabel}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function PulseBar({ yes, no }) {
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden mb-2">
        <div className="bg-emerald-500" style={{ width: `${yes}%` }} />
        <div className="bg-rose-500" style={{ width: `${no}%` }} />
      </div>
      <div className="flex justify-between text-[0.8em] font-semibold">
        <span className="text-emerald-600">{yes}% YES</span>
        <span className="text-rose-600">{no}% NO</span>
      </div>
    </div>
  );
}
