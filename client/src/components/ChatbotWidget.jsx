import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

const nowId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const normalize = (text) => (text || "").toLowerCase().trim();

const pageDescriptionForPath = (path) => {
  if (!path) return "This is Greenbite.";
  if (path === "/login") {
    return "Login page: sign in to access dashboards, donation feed, heatmap, and AI Insights.";
  }
  if (path === "/register") {
    return "Register page: create an account as donor, NGO, or regular user.";
  }
  if (path === "/feed") {
    return "Feed: browse donations and claim them if you are an NGO or regular user.";
  }
  if (path === "/heatmap") {
    return "Hunger Heatmap: view donation/demand concentration on a map and open directions in Google Maps.";
  }
  if (path === "/ai-insights") {
    return "AI Insights: see top-impact and latest donations; you can claim donations if your role allows.";
  }
  if (path === "/dashboard/donor") {
    return "Donor Dashboard: publish donations, view your posted items, and see notifications when someone claims.";
  }
  if (path === "/dashboard/ngo") {
    return "NGO Dashboard: describe what you need and get suggested nearby donations to claim.";
  }
  if (path === "/dashboard") {
    return "Dashboard: your main landing page after login (varies by role).";
  }
  if (path === "/claim-flow") {
    return "Claim Flow: enter your requirements and get the best matches to claim.";
  }
  if (path === "/donate") {
    return "Donate: publish a donation (food, quantity, photo, and location).";
  }
  return "This page is part of Greenbite. Ask me what it does or where to go next.";
};

const ROUTES = [
  { key: "feed", label: "Feed", path: "/feed", requiresAuth: true },
  { key: "heatmap", label: "Heatmap", path: "/heatmap", requiresAuth: true },
  { key: "ai", label: "AI Insights", path: "/ai-insights", requiresAuth: true },
  { key: "donor", label: "Donor Dashboard", path: "/dashboard/donor", requiresAuth: true },
  { key: "ngo", label: "NGO Dashboard", path: "/dashboard/ngo", requiresAuth: true },
  { key: "dashboard", label: "Dashboard", path: "/dashboard", requiresAuth: true },
  { key: "claim", label: "Claim Flow", path: "/claim-flow", requiresAuth: true },
  { key: "donate", label: "Donate", path: "/donate", requiresAuth: true },
  { key: "login", label: "Login", path: "/login", requiresAuth: false },
  { key: "register", label: "Register", path: "/register", requiresAuth: false },
];

const matchRoute = (msg) => {
  const m = normalize(msg);
  if (!m) return null;

  // Prefer longer, more specific matches first.
  const checks = [
    { test: () => m.includes("ai insight") || (m.includes("ai") && m.includes("insight")), key: "ai" },
    { test: () => m.includes("donor dashboard") || (m.includes("donor") && m.includes("dashboard")), key: "donor" },
    { test: () => m.includes("ngo dashboard") || (m.includes("ngo") && m.includes("dashboard")), key: "ngo" },
    { test: () => m.includes("claim flow") || (m.includes("claim") && m.includes("flow")) || m.startsWith("claim"), key: "claim" },
    // "map" should route to Heatmap (common phrasing: "go to map", "open map")
    { test: () => m === "map" || m === "maps" || m.includes("go to map") || m.includes("open map") || m.includes("take me to map"), key: "heatmap" },
    { test: () => m.includes("heatmap") || m.includes("heat map") || (m.includes("map") && m.includes("heat")), key: "heatmap" },
    { test: () => m.includes("feed") || m.includes("donation feed"), key: "feed" },
    { test: () => m.includes("donate") || m.includes("add donation") || m.includes("publish donation"), key: "donate" },
    { test: () => m === "dashboard" || m.includes("main dashboard"), key: "dashboard" },
    { test: () => m.includes("login") || m.includes("sign in"), key: "login" },
    { test: () => m.includes("register") || m.includes("sign up") || m.includes("create account"), key: "register" },
  ];

  const hit = checks.find((c) => c.test());
  if (!hit) return null;
  return ROUTES.find((r) => r.key === hit.key) || null;
};

const isDescribeIntent = (msg) => {
  const m = normalize(msg);
  return (
    m.includes("what is this") ||
    m.includes("what does this page") ||
    m.includes("describe") ||
    m.includes("explain this page") ||
    m.includes("where am i") ||
    m === "help on this page"
  );
};

const isHelpIntent = (msg) => {
  const m = normalize(msg);
  return m === "help" || m.includes("what can you do") || m.includes("commands");
};

const isAvailableFoodIntent = (msg) => {
  const m = normalize(msg);
  if (!m) return false;
  const wantsList =
    m.includes("show") ||
    m.includes("list") ||
    m.includes("what") ||
    m.includes("any") ||
    m.includes("available");
  const mentionsFood = m.includes("food") || m.includes("donation") || m.includes("donations");
  const mentionsAvailable = m.includes("available") || m.includes("open") || m.includes("live");
  return wantsList && mentionsFood && mentionsAvailable;
};

const formatDonationLine = (d) => {
  const name = d?.foodName || "Donation";
  const people = d?.estimatedPeopleServed ? `${d.estimatedPeopleServed} people` : "";
  const kg = d?.quantityKg ? `${d.quantityKg} kg` : "";
  const units = d?.quantityUnits ? `${d.quantityUnits} units` : "";
  const qty = [people, kg, units].filter(Boolean).join(", ");
  const impact = d?.impactScore != null ? `impact ${d.impactScore}` : "";
  const spoil = d?.spoilageRisk != null ? `spoilage ${d.spoilageRisk}%` : "";
  const bits = [qty, impact, spoil].filter(Boolean).join(" · ");
  return bits ? `${name} (${bits})` : name;
};

const AssistantAvatar = ({ size = 28 }) => (
  <div
    className="flex shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm dark:text-slate-950"
    style={{ width: size, height: size }}
    aria-hidden="true"
    title="Greenbite Assistant"
  >
    <svg
      width={Math.max(14, Math.round(size * 0.6))}
      height={Math.max(14, Math.round(size * 0.6))}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 11h8M9.5 15h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 9.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM16 9.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
        fill="currentColor"
      />
      <path
        d="M7 20a7 7 0 1 1 10 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 2v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

export const ChatbotWidget = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [assistantStatus, setAssistantStatus] = useState(null);
  const [messages, setMessages] = useState(() => [
    {
      id: nowId(),
      role: "bot",
      text:
        "Hi, I can explain what each page does and take you to pages if you ask. Try: “describe this page”, “go to heatmap”, or “help”.",
    },
  ]);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api
      .get("/chat/status")
      .then((res) => {
        if (cancelled) return;
        setAssistantStatus(res.data || null);
      })
      .catch(() => {
        if (cancelled) return;
        setAssistantStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages.length]);

  const quickActions = useMemo(() => {
    const isAuthed = !!user;
    const base = [
      { label: "Describe this page", text: "describe this page" },
      { label: "Help", text: "help" },
    ];
    if (!isAuthed) {
      base.push({ label: "Go to login", text: "go to login" });
      base.push({ label: "Go to register", text: "go to register" });
      return base;
    }
    base.push({ label: "Show available food", text: "show available food" });
    base.push({ label: "Go to feed", text: "go to feed" });
    base.push({ label: "Go to heatmap", text: "go to heatmap" });
    base.push({ label: "Go to AI Insights", text: "go to ai insights" });
    return base;
  }, [user]);

  const pushBot = (text) => {
    setMessages((prev) => [...prev, { id: nowId(), role: "bot", text }]);
  };

  const handleIntent = async (raw) => {
    const msg = (raw || "").trim();
    if (!msg) return;

    // Fast local handling for tiny intents (keeps UI snappy even if LLM is down).
    const normalized = normalize(msg);
    if (isHelpIntent(normalized)) {
      pushBot(
        [
          "Ask me things like:",
          '- "describe this page"',
          '- "show available food"',
          '- "how do I claim a donation?"',
          '- "where can I see my donations?"',
          '- "go to heatmap" / "go to feed" / "go to ai insights"',
          '- "logout"',
        ].join("\n")
      );
      return;
    }
    if (normalized === "describe this page" || isDescribeIntent(normalized)) {
      pushBot(pageDescriptionForPath(location.pathname));
      return;
    }

    // Deterministic navigation: always reliable, even if the model response is imperfect.
    const directRoute = matchRoute(normalized);
    if (directRoute) {
      if (directRoute.requiresAuth && !user) {
        pushBot("That page requires login. Taking you to the login page first.");
        navigate("/login");
        return;
      }
      if (directRoute.key === "donor" && user?.role !== "donor") {
        pushBot("You are not logged in as a donor. Taking you to your dashboard instead.");
        navigate("/dashboard");
        return;
      }
      if (directRoute.key === "ngo" && user?.role !== "ngo") {
        pushBot("You are not logged in as an NGO. Taking you to your dashboard instead.");
        navigate("/dashboard");
        return;
      }
      pushBot(`Taking you to ${directRoute.label}.`);
      navigate(directRoute.path);
      return;
    }

    if (isAvailableFoodIntent(normalized)) {
      if (!user) {
        pushBot("To view available donations, you need to log in first. Taking you to the login page.");
        navigate("/login");
        return;
      }
      try {
        const res = await api.get("/donations?status=available");
        const items = Array.isArray(res?.data) ? res.data : [];
        if (items.length === 0) {
          pushBot("No available donations right now.");
          return;
        }
        const top = items.slice(0, 8);
        pushBot(
          ["Available donations:", ...top.map((d, i) => `${i + 1}. ${formatDonationLine(d)}`)].join("\n")
        );
        if (items.length > top.length) {
          pushBot(`Showing ${top.length} of ${items.length}. Say “go to feed” to see all.`);
        } else {
          pushBot('Say “go to feed” to view them on the page.');
        }
      } catch (err) {
        pushBot(err?.response?.data?.message || "Failed to load available donations.");
      }
      return;
    }

    // LLM-backed: send the recent conversation + current path.
    try {
      const payload = {
        currentPath: location.pathname,
        messages: [
          ...messages.slice(-12).map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),
          { role: "user", content: msg },
        ],
      };

      const res = await api.post("/chat", payload);
      const reply = res?.data?.reply;
      const actions = Array.isArray(res?.data?.actions) ? res.data.actions : [];

      pushBot(typeof reply === "string" ? reply : "Okay.");

      for (const a of actions) {
        if (!a || typeof a.type !== "string") continue;
        if (a.type === "logout") {
          logout();
          continue;
        }
        if (a.type === "navigate" && typeof a.path === "string") {
          navigate(a.path);
        }
      }
    } catch (err) {
      // If LLM fails, fall back to the old deterministic navigation matcher.
      const route = matchRoute(normalized);
      if (route) {
        if (route.requiresAuth && !user) {
          pushBot("That page requires login. Taking you to the login page first.");
          navigate("/login");
          return;
        }
        pushBot(`Taking you to ${route.label}.`);
        navigate(route.path);
        return;
      }

      pushBot(
        err?.response?.data?.message ||
          "Assistant is unavailable right now. Try “go to feed/heatmap/ai insights” or “describe this page”."
      );
    }
  };

  const send = async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: nowId(), role: "user", text: trimmed }]);
    await handleIntent(trimmed);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const text = input;
    setInput("");
    await send(text);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9000]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary-500 dark:text-slate-950"
          aria-label="Open assistant"
        >
          <AssistantAvatar size={24} />
          Assistant
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
            ?
          </span>
        </button>
      ) : (
        <div className="w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="flex min-w-0 items-start gap-3">
              <AssistantAvatar size={34} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Greenbite Assistant
                </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {user ? `Signed in as ${user.name} (${user.role})` : "Not signed in"}
              </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {assistantStatus?.ollama?.reachable
                  ? `AI: Ollama (${assistantStatus.ollama.model})`
                  : assistantStatus?.openai?.reachable
                  ? `AI: Local/OpenAI-compatible (${assistantStatus.openai.model})`
                  : assistantStatus?.openai?.configured
                  ? `AI: Configured (cannot reach)`
                  : "AI: Offline (enable Ollama or a local OpenAI-compatible server)"}
              </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          <div className="px-3 pt-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => send(a.text)}
                  className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={scrollRef}
            className="max-h-[320px] space-y-2 overflow-auto px-3 pb-3 text-sm"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary-600 px-3 py-2 text-[13px] text-white dark:text-slate-950"
                      : "max-w-[85%] whitespace-pre-wrap rounded-2xl bg-slate-100 px-3 py-2 text-[13px] text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="border-t border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask: describe this page, go to feed..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-500 dark:text-slate-950"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
              Tip: "go to map", "go to heatmap", "go to ai insights", "show available food", "logout".
            </p>
            {!assistantStatus?.ollama?.reachable && !assistantStatus?.openai?.configured && (
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                Enable Ollama: start Ollama, then set <span className="font-mono">OLLAMA_URL</span> and{" "}
                <span className="font-mono">OLLAMA_MODEL</span> in your server env (defaults:{" "}
                <span className="font-mono">http://localhost:11434</span>,{" "}
                <span className="font-mono">llama3.1</span>).
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
