import axios from "axios";

const pickProvider = () => {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const openaiKey = process.env.OPENAI_API_KEY || "";
  const openaiBase = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  // Prefer Ollama when available for a "it just works" local setup.
  // If Ollama isn't running, the request will fail and the caller will fall back.
  return {
    ollamaUrl,
    ollamaModel: process.env.OLLAMA_MODEL || "llama3.1",
    openaiKey,
    openaiBase,
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  };
};

const isLocalBaseUrl = (baseUrl) => {
  if (!baseUrl || typeof baseUrl !== "string") return false;
  const b = baseUrl.toLowerCase();
  return (
    b.includes("localhost") ||
    b.includes("127.0.0.1") ||
    b.includes("0.0.0.0") ||
    b.startsWith("http://")
  );
};

const withTimeout = (ms) =>
  axios.create({
    timeout: ms,
    // Avoid huge payloads in logs if something goes wrong
    maxContentLength: 2 * 1024 * 1024,
    maxBodyLength: 2 * 1024 * 1024,
  });

export const getAssistantStatus = async () => {
  const provider = pickProvider();
  const http = withTimeout(1500);

  let ollamaReachable = false;
  try {
    // Ollama supports /api/tags for listing installed models.
    await http.get(`${provider.ollamaUrl}/api/tags`);
    ollamaReachable = true;
  } catch {
    ollamaReachable = false;
  }

  // OpenAI-compatible local servers (LM Studio/vLLM) often don't require an API key.
  const openaiConfigured =
    !!provider.openaiKey || (provider.openaiBase !== "https://api.openai.com/v1" && isLocalBaseUrl(provider.openaiBase));

  let openaiReachable = false;
  if (openaiConfigured) {
    try {
      // Try a lightweight endpoint used by OpenAI-compatible servers.
      await http.get(`${provider.openaiBase}/models`, {
        headers: provider.openaiKey ? { Authorization: `Bearer ${provider.openaiKey}` } : undefined,
      });
      openaiReachable = true;
    } catch {
      openaiReachable = false;
    }
  }

  return {
    ollama: {
      reachable: ollamaReachable,
      url: provider.ollamaUrl,
      model: provider.ollamaModel,
    },
    openai: {
      configured: openaiConfigured,
      reachable: openaiReachable,
      baseUrl: provider.openaiBase,
      model: provider.openaiModel,
    },
  };
};

const SYSTEM_PROMPT = `
You are the Greenbite in-app assistant.

Goals:
- Answer user questions about the app clearly and concretely.
- When asked to go somewhere, return a safe navigation action.
- You can also answer basic general questions (like current time/date) by telling the user to rely on their device/browser, or by asking where they are located if needed.

You must ONLY output strict JSON with this shape:
{
  "reply": "string",
  "actions": [
    { "type": "navigate", "path": "/feed" },
    { "type": "logout" }
  ]
}

Rules:
- "actions" may be empty.
- Allowed navigate paths:
  /login, /register, /feed, /heatmap, /ai-insights, /dashboard, /dashboard/donor, /dashboard/ngo, /claim-flow, /donate
- Never invent other paths.
- If the user is not logged in and asks for a protected page, set action navigate to /login and explain.
- If the user asks for donor dashboard but their role isn't donor, navigate to /dashboard and explain.
- If the user asks for NGO dashboard but their role isn't ngo, navigate to /dashboard and explain.
- If unsure, ask a short clarifying question in "reply" and do not take actions.
`.trim();

const allowedPaths = new Set([
  "/login",
  "/register",
  "/feed",
  "/heatmap",
  "/ai-insights",
  "/dashboard",
  "/dashboard/donor",
  "/dashboard/ngo",
  "/claim-flow",
  "/donate",
]);

export const sanitizeAssistantOutput = (obj) => {
  const safe = { reply: "", actions: [] };
  if (obj && typeof obj.reply === "string") safe.reply = obj.reply;
  if (Array.isArray(obj?.actions)) {
    safe.actions = obj.actions
      .filter((a) => a && typeof a.type === "string")
      .map((a) => {
        if (a.type === "logout") return { type: "logout" };
        if (a.type === "navigate" && typeof a.path === "string" && allowedPaths.has(a.path)) {
          return { type: "navigate", path: a.path };
        }
        return null;
      })
      .filter(Boolean);
  }
  if (!safe.reply) safe.reply = "I can help with that. What would you like to do next?";
  return safe;
};

const tryParseJson = (text) => {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Some models wrap JSON in code fences; strip simple fences.
    const unfenced = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    try {
      return JSON.parse(unfenced);
    } catch {
      return null;
    }
  }
};

export const chatWithAssistant = async ({ messages, context }) => {
  const provider = pickProvider();
  const http = withTimeout(12_000);

  const userSystemContext = {
    current_path: context?.currentPath || "/",
    is_logged_in: !!context?.user,
    user: context?.user
      ? {
          name: context.user.name || "",
          role: context.user.role || "",
          email: context.user.email || "",
        }
      : null,
  };

  const promptMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: `Context: ${JSON.stringify(userSystemContext)}` },
    ...messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || ""),
    })),
  ];

  // 1) Try Ollama (local)
  try {
    const ollama = await http.post(`${provider.ollamaUrl}/api/chat`, {
      model: provider.ollamaModel,
      messages: promptMessages,
      // Ask Ollama to produce strict JSON. If the model ignores this, we still
      // fall back to using plain text as the reply.
      format: "json",
      stream: false,
      options: { temperature: 0.2 },
    });
    const raw = ollama?.data?.message?.content;
    const parsed = tryParseJson(raw);
    if (parsed) return sanitizeAssistantOutput(parsed);
    if (typeof raw === "string" && raw.trim()) {
      return sanitizeAssistantOutput({ reply: raw.trim(), actions: [] });
    }
  } catch (err) {
    // Ignore and try OpenAI next
    console.warn("Ollama chat failed", err?.message || err);
  }

  // 2) Try OpenAI if key exists
  {
    const openaiConfigured =
      !!provider.openaiKey || (provider.openaiBase !== "https://api.openai.com/v1" && isLocalBaseUrl(provider.openaiBase));
    if (!openaiConfigured) {
      // skip
    } else {
    try {
      const openai = await http.post(
        `${provider.openaiBase}/chat/completions`,
        {
          model: provider.openaiModel,
          messages: promptMessages,
          temperature: 0.2,
        },
        {
          headers: {
            ...(provider.openaiKey ? { Authorization: `Bearer ${provider.openaiKey}` } : {}),
            "Content-Type": "application/json",
          },
        }
      );
      const raw = openai?.data?.choices?.[0]?.message?.content;
      const parsed = tryParseJson(raw);
      if (parsed) return sanitizeAssistantOutput(parsed);
      if (typeof raw === "string" && raw.trim()) {
        return sanitizeAssistantOutput({ reply: raw.trim(), actions: [] });
      }
    } catch (err) {
      console.warn("OpenAI chat failed", err?.message || err);
    }
    }
  }

  // 3) Final fallback (no LLM): basic behavior
  return sanitizeAssistantOutput({
    reply:
      "I can’t reach an AI engine right now. If you have Ollama running, set OLLAMA_MODEL (default llama3.1). Or set OPENAI_API_KEY on the server. You can still ask: “go to feed/heatmap/ai insights”.",
    actions: [],
  });
};
