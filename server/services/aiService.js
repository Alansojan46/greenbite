import axios from "axios";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pickFoodAnalysisProvider = () =>
  String(process.env.FOOD_ANALYSIS_PROVIDER || "auto").trim().toLowerCase();

const isDoublePassEnabled = () => {
  const v = String(process.env.FOOD_ANALYSIS_DOUBLE_PASS || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
};

const pickOllamaUrl = () =>
  String(process.env.OLLAMA_URL || "http://localhost:11434").trim().replace(/\/+$/, "");

const pickOllamaVisionModel = () =>
  String(process.env.OLLAMA_VISION_MODEL || process.env.OLLAMA_MODEL || "llava").trim();

const pickOpenAiKey = () => String(process.env.OPENAI_API_KEY || "").trim();
const pickOpenAiBase = () =>
  String(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").trim().replace(/\/+$/, "");

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

const isOpenAiVisionConfigured = () => {
  const base = pickOpenAiBase();
  const key = pickOpenAiKey();
  return !!key || (base !== "https://api.openai.com/v1" && isLocalBaseUrl(base));
};

const pickOpenAiVisionModel = () =>
  String(process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4.1").trim();

// HuggingFace deprecated/changed some legacy inference routes. The router endpoint
// is the most reliable default for "Inference Providers".
const HF_API_BASE =
  process.env.HF_INFERENCE_BASE_URL ||
  "https://router.huggingface.co/hf-inference/models";

const pickHfToken = () =>
  process.env.HF_API_TOKEN ||
  process.env.HUGGINGFACE_API_TOKEN ||
  process.env.HF_TOKEN ||
  "";

const pickHfModel = () =>
  process.env.HF_VISION_MODEL_ID ||
  process.env.HF_MODEL_ID ||
  // Indian-food specialized model (15 classes including biryani/dosa/naan/paneer/etc.)
  "therealcyberlord/vit-indian-food";

const pickHfFallbackModel = () =>
  process.env.HF_FALLBACK_VISION_MODEL_ID ||
  // General food classifier (Food101). Used only when primary confidence is low.
  "VinnyVortex004/Food101-Classifier";

const pickMinConfidence = () => {
  const v = Number(process.env.HF_MIN_CONFIDENCE || 55);
  if (!Number.isFinite(v)) return 55;
  return Math.max(0, Math.min(100, v));
};

const pickHfTimeoutMs = () => {
  const v = Number(process.env.HF_TIMEOUT_MS || process.env.HF_INFERENCE_TIMEOUT_MS || 60000);
  if (!Number.isFinite(v) || v < 5000) return 60000;
  return Math.min(v, 120000);
};

const stripCodeFences = (text) =>
  String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

const tryParseJson = (text) => {
  const t = stripCodeFences(text);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    // Try best-effort extraction of the first JSON object.
    const first = t.indexOf("{");
    const last = t.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(t.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const isOllamaConfigured = () => {
  const url = pickOllamaUrl();
  const model = pickOllamaVisionModel();
  return !!url && !!model;
};

const normalizeLabel = (label) =>
  String(label || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();

const clampInt = (n, min, max) => Math.max(min, Math.min(max, Math.round(Number(n) || 0)));

const normalizeCandidates = (candidates) => {
  const list = Array.isArray(candidates) ? candidates : [];
  const merged = new Map();

  for (const c of list) {
    const label = normalizeLabel(c?.label);
    if (!label) continue;
    const conf = clampInt(c?.confidence, 0, 100);
    const prev = merged.get(label);
    if (!prev || conf > prev.confidence) merged.set(label, { label, confidence: conf });
  }

  return [...merged.values()].sort((a, b) => b.confidence - a.confidence).slice(0, 8);
};

const computeCalibratedConfidence = ({ provider, rawConfidence, candidates, agreement }) => {
  const norm = normalizeCandidates(candidates);

  const top1 = norm?.[0]?.confidence ?? 0;
  const top2 = norm?.[1]?.confidence ?? 0;
  const gap = Math.max(0, top1 - top2);

  let conf;
  if (top1 > 0 && top2 > 0) conf = top1 * 0.65 + gap * 0.35;
  else if (top1 > 0) conf = top1 * 0.8;
  else conf = (Number(rawConfidence) || 0) * 0.75;

  if (agreement === true) conf += 12;
  if (agreement === false) conf -= 10;

  // Self-reported confidence from LLMs isn't calibrated; dampen it.
  if (provider === "ollama") conf *= 0.85;
  if (provider === "openai") conf *= 0.9;

  return clampInt(conf, 0, 100);
};

const titleCase = (s) =>
  String(s || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const canonicalizeFoodType = (rawLabel) => {
  const l = normalizeLabel(rawLabel).toLowerCase();

  // Keep direct dish names when the model already returns them.
  const indianDishWords = [
    "biryani",
    "chole",
    "bhature",
    "dabeli",
    "dal",
    "dhokla",
    "dosa",
    "jalebi",
    "kathi",
    "roll",
    "kofta",
    "naan",
    "pakora",
    "paneer",
    "pani puri",
    "panipuri",
    "pav bhaji",
    "pavbhaji",
    "vada pav",
    "vadapav",
    "idli",
    "samosa",
    "poha",
    "upma",
  ];
  if (indianDishWords.some((w) => l.includes(w))) return titleCase(normalizeLabel(rawLabel));

  // Keep this small and predictable. Expand as you collect real data.
  // Many food models (Food-101 etc) don't have "biryani" and will label it as similar rice dishes.
  const riceWords = [
    "rice",
    "biryani",
    "fried rice",
    "pulao",
    "pilaf",
    "paella",
    "risotto",
    "jollof",
  ];
  const curryWords = [
    "curry",
    "gravy",
    "masala",
    "stew",
    "dal",
    "sambar",
    "chili",
    "chilli",
  ];
  const breadWords = [
    "bread",
    "bun",
    "naan",
    "roti",
    "chapati",
    "paratha",
    "bagel",
    "garlic bread",
    "toast",
  ];

  if (riceWords.some((w) => l.includes(w))) return "Cooked rice";
  if (curryWords.some((w) => l.includes(w))) return "Curry";
  if (breadWords.some((w) => l.includes(w))) return "Bread";

  // Fall back to the model label as a human-readable food type.
  return normalizeLabel(rawLabel) || "Food";
};

const freshnessCategoryForFoodType = (foodType) => {
  const l = normalizeLabel(foodType).toLowerCase();
  if (l.includes("biryani") || l.includes("rice") || l.includes("pulao") || l.includes("fried rice")) return "Cooked rice";
  if (l.includes("naan") || l.includes("bread") || l.includes("roti") || l.includes("chapati") || l.includes("paratha")) return "Bread";
  if (l.includes("curry") || l.includes("dal") || l.includes("kofta") || l.includes("masala") || l.includes("gravy")) return "Curry";
  return "Cooked meal";
};

const estimateServingsHeuristic = ({ canonicalFoodType, imageBytes }) => {
  // This is intentionally heuristic. Vision-only quantity estimation is unreliable without depth/scale.
  // You can later replace this with a better model or user calibration.
  const baseByType = {
    "Cooked rice": 4,
    Curry: 4,
    Bread: 6,
    "Cooked meal": 4,
  };

  const category = freshnessCategoryForFoodType(canonicalFoodType);
  const base = baseByType[category] || baseByType[canonicalFoodType] || 3;

  // Very rough adjustment by file size (often correlates with resolution/scene complexity).
  const kb = Math.max(1, Math.round((Number(imageBytes) || 0) / 1024));
  if (kb < 120) return Math.max(1, Math.round(base * 0.75));
  if (kb < 400) return base;
  if (kb < 900) return Math.round(base * 1.25);
  return Math.round(base * 1.5);
};

export const computeFreshnessRisk = ({ canonicalFoodType, preparedAt }) => {
  const now = new Date();
  const prepared = preparedAt ? new Date(preparedAt) : now;
  const hoursSincePrepared = Math.max(
    0,
    (now.getTime() - prepared.getTime()) / (1000 * 60 * 60)
  );

  const thresholdsHours = {
    "Cooked rice": 6,
    Curry: 5,
    Bread: 24,
    "Cooked meal": 8,
  };

  const category = freshnessCategoryForFoodType(canonicalFoodType);
  const safeHours = thresholdsHours[category] ?? 8;

  if (hoursSincePrepared >= safeHours) {
    return { freshnessRisk: "High", safeHours, hoursSincePrepared };
  }
  if (hoursSincePrepared >= safeHours * 0.8) {
    return { freshnessRisk: "Medium", safeHours, hoursSincePrepared };
  }
  return { freshnessRisk: "Low", safeHours, hoursSincePrepared };
};

export const urgencyFromRisk = (freshnessRisk) => {
  if (freshnessRisk === "High") return 5;
  if (freshnessRisk === "Medium") return 3;
  return 1;
};

export const buildAutoSummary = ({
  canonicalFoodType,
  freshnessRisk,
  safeHours,
  hoursSincePrepared,
}) => {
  const remaining = Math.max(0, safeHours - hoursSincePrepared);
  const windowText =
    freshnessRisk === "High"
      ? "not recommended for redistribution"
      : `suitable for redistribution within ${Math.max(1, Math.round(remaining))} hours`;

  const freshnessAdjective =
    freshnessRisk === "Low"
      ? "freshly prepared"
      : freshnessRisk === "Medium"
      ? "moderately fresh"
      : "high-risk";

  return `This appears to be ${freshnessAdjective} ${canonicalFoodType.toLowerCase()} ${windowText}.`;
};

export const analyzeFoodImage = async ({ imageBuffer, mimeType }) => {
  const token = pickHfToken();
  if (!token) {
    const err = new Error("HF_API_TOKEN is not set");
    err.status = 500;
    throw err;
  }

  const modelId = pickHfModel();
  return analyzeFoodImageWithModel({ imageBuffer, mimeType, modelId, token });
};

const pickZeroShotModel = () =>
  process.env.HF_ZERO_SHOT_MODEL_ID ||
  // Fast CLIP model suitable for zero-shot image classification with custom labels.
  "openai/clip-vit-base-patch32";

const pickIndianLabelSet = () => {
  // Comma-separated list override for demos/iteration.
  const raw = String(process.env.AI_INDIAN_LABELS || "").trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 80);
  }

  // Include common Indian foods + common non-Indian items to avoid forced mislabels.
  return [
    // Rice / meals
    "mutton biryani",
    "chicken biryani",
    "vegetable biryani",
    "biryani",
    "khichdi",
    "pulao",
    "veg pulao",
    "jeera rice",
    "fried rice",
    "curd rice",
    "lemon rice",
    "sambar rice",
    "dal rice",
    "thali",

    // South Indian tiffin
    "idli",
    "idli sambar",
    "dosa",
    "masala dosa",
    "uttapam",
    "vada",
    "sambar",
    "rasam",
    "pongal",
    "upma",
    "poha",

    // Breads
    "chapati",
    "roti",
    "aloo paratha",
    "paratha",
    "naan",
    "puri",
    "bhature",
    "bread",
    "bun",
    "pav",

    // Street food / snacks
    "pav bhaji",
    "vada pav",
    "samosa",
    "pakora",
    "kachori",
    "pani puri",
    "bhel puri",
    "sev puri",
    "chole bhature",

    // Curries / gravies
    "paneer butter masala",
    "paneer tikka",
    "paneer curry",
    "dal",
    "dal fry",
    "dal tadka",
    "rajma",
    "chole",
    "palak paneer",
    "aloo curry",
    "chicken curry",
    "butter chicken",
    "tandoori chicken",
    "mutton curry",
    "fish curry",
    "vegetable curry",
    "korma",
    "kadai",
    "biryani (dum)",

    // Fast food / misc
    "fried chicken",
    "noodles",
    "pizza",
    "burger",
    "packaged food",

    // Common non-Indian / generic foods
    "french fries",
    "fries",
    "chips",
    "potato chips",
    "sandwich",
    "pasta",
    "salad",
    "soup",
    "omelette",
    "boiled eggs",
    "cake",
    "biscuits",
    "cookies",

    // Sweets (often donated)
    "gulab jamun",
    "jalebi",
    "kheer",
    "halwa",
  ];
};

const pickZeroShotMinConfidence = () => {
  const v = Number(process.env.HF_ZERO_SHOT_MIN_CONFIDENCE || 35);
  if (!Number.isFinite(v)) return 35;
  return Math.max(0, Math.min(100, v));
};

const isLikelyClipModel = (modelId) => {
  const m = String(modelId || "").toLowerCase();
  return m.includes("clip");
};

const analyzeFoodImageZeroShotClip = async ({
  imageBuffer,
  mimeType,
  modelId,
  token,
  candidateLabels,
}) => {
  const url = `${HF_API_BASE}/${encodeURIComponent(modelId)}`;
  const timeoutMs = pickHfTimeoutMs();

  // HF zero-shot-image-classification expects JSON with base64 image + candidate labels.
  const imageB64 = Buffer.from(imageBuffer || Buffer.alloc(0)).toString("base64");
  const body = {
    inputs: imageB64,
    parameters: {
      candidate_labels: Array.isArray(candidateLabels) ? candidateLabels : [],
    },
  };

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let res;
    try {
      res = await axios.post(url, body, { headers, timeout: timeoutMs });
    } catch (err) {
      const status = err?.response?.status;
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Vision API request failed";

      if (err?.code === "ECONNABORTED" || String(detail).toLowerCase().includes("timeout")) {
        if (attempt < 3) {
          await sleep(750 * attempt);
          continue;
        }
        const e = new Error(
          `Vision API timed out after ${timeoutMs}ms. Try again, or set HF_TIMEOUT_MS higher, or choose a faster HF model.`
        );
        e.status = 504;
        throw e;
      }

      if (status === 401 || status === 403) {
        const e = new Error(
          "HuggingFace authentication failed. Verify HF_API_TOKEN and that the token has 'Make calls to Inference Providers' enabled."
        );
        e.status = 502;
        throw e;
      }
      if (status === 404 || status === 410) {
        const e = new Error(
          `HuggingFace model '${modelId}' is not available via the inference API. Set HF_ZERO_SHOT_MODEL_ID to a supported CLIP model. (${detail})`
        );
        e.status = 502;
        throw e;
      }
      if (status === 429) {
        const e = new Error(
          "HuggingFace rate limit reached. Try again in a moment or use a different model/provider."
        );
        e.status = 503;
        throw e;
      }

      const e = new Error(detail);
      e.status = 502;
      throw e;
    }

    const data = res?.data;

    if (data && typeof data === "object" && data.error && String(data.error).toLowerCase().includes("loading")) {
      if (attempt === 3) {
        const err = new Error("Vision model is still loading. Try again.");
        err.status = 503;
        throw err;
      }
      const wait = Math.min(5000, Math.round((data.estimated_time || 2) * 1000));
      await sleep(wait);
      continue;
    }

    if (!Array.isArray(data) || data.length === 0) {
      const err = new Error("Unexpected vision API response");
      err.status = 502;
      throw err;
    }

    const sorted = [...data]
      .map((x) => ({
        label: normalizeLabel(x?.label),
        score: Number(x?.score) || 0,
      }))
      .sort((a, b) => b.score - a.score);

    const top = sorted[0];
    const rawLabel = top?.label || "";
    const rawScore = top?.score || 0;
    const aiConfidence = Math.max(0, Math.min(100, Math.round(rawScore * 100)));

    const candidates = sorted.slice(0, 5).map((c) => ({
      label: c.label,
      confidence: Math.max(0, Math.min(100, Math.round((c.score || 0) * 100))),
    }));

    return { modelId, rawLabel, rawScore, aiConfidence, candidates };
  }

  const err = new Error("Failed to analyze image");
  err.status = 502;
  throw err;
};

export const analyzeFoodImageWithModel = async ({ imageBuffer, mimeType, modelId, token }) => {
  const url = `${HF_API_BASE}/${encodeURIComponent(modelId)}`;
  const timeoutMs = pickHfTimeoutMs();

  const headers = {
    Authorization: `Bearer ${token || pickHfToken()}`,
    "Content-Type": mimeType || "application/octet-stream",
    Accept: "application/json",
  };

  // HF may cold-start models or be slow. Retry a couple times with backoff.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let res;
    try {
      res = await axios.post(url, imageBuffer, { headers, timeout: timeoutMs });
    } catch (err) {
      const status = err?.response?.status;
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Vision API request failed";

      // Axios timeout / slow inference
      if (err?.code === "ECONNABORTED" || String(detail).toLowerCase().includes("timeout")) {
        if (attempt < 3) {
          await sleep(750 * attempt);
          continue;
        }
        const e = new Error(
          `Vision API timed out after ${timeoutMs}ms. Try again, or set HF_TIMEOUT_MS higher, or choose a faster HF_VISION_MODEL_ID.`
        );
        e.status = 504;
        throw e;
      }

      // Provide actionable messages for common HF failures.
      if (status === 401 || status === 403) {
        const e = new Error(
          "HuggingFace authentication failed. Verify HF_API_TOKEN and that the token has 'Make calls to Inference Providers' enabled."
        );
        e.status = 502;
        throw e;
      }
      if (status === 404 || status === 410) {
        const e = new Error(
          `HuggingFace model '${modelId}' is not available via the inference API. Set HF_VISION_MODEL_ID to a supported image-classification model. (${detail})`
        );
        e.status = 502;
        throw e;
      }
      if (status === 429) {
        const e = new Error(
          "HuggingFace rate limit reached. Try again in a moment or use a different model/provider."
        );
        e.status = 503;
        throw e;
      }

      const e = new Error(detail);
      e.status = 502;
      throw e;
    }

    const data = res?.data;

    if (data && typeof data === "object" && data.error && String(data.error).toLowerCase().includes("loading")) {
      if (attempt === 3) {
        const err = new Error("Vision model is still loading. Try again.");
        err.status = 503;
        throw err;
      }
      const wait = Math.min(5000, Math.round((data.estimated_time || 2) * 1000));
      await sleep(wait);
      continue;
    }

    // Expected: [{label, score}, ...]
    if (!Array.isArray(data) || data.length === 0) {
      const err = new Error("Unexpected vision API response");
      err.status = 502;
      throw err;
    }

    const sorted = [...data]
      .map((x) => ({
        label: normalizeLabel(x?.label),
        score: Number(x?.score) || 0,
      }))
      .sort((a, b) => b.score - a.score);

    const top = sorted[0];
    const rawLabel = top?.label || "";
    const rawScore = top?.score || 0;
    const aiConfidence = Math.max(0, Math.min(100, Math.round(rawScore * 100)));

    const candidates = sorted.slice(0, 5).map((c) => ({
      label: c.label,
      confidence: Math.max(0, Math.min(100, Math.round((c.score || 0) * 100))),
    }));

    return { modelId, rawLabel, rawScore, aiConfidence, candidates };
  }

  const err = new Error("Failed to analyze image");
  err.status = 502;
  throw err;
};

export const analyzeFoodImageWithOpenAiVision = async ({
  imageBuffer,
  mimeType,
  candidateLabels,
  avoidLabels,
  attempt,
  fileName,
}) => {
  const baseUrl = pickOpenAiBase();
  const modelId = pickOpenAiVisionModel();
  const apiKey = pickOpenAiKey();

  if (!isOpenAiVisionConfigured()) {
    const err = new Error("OpenAI vision is not configured. Set OPENAI_API_KEY (or use a local OPENAI_BASE_URL).");
    err.status = 500;
    throw err;
  }

  const timeoutMs = Number(process.env.OPENAI_VISION_TIMEOUT_MS || 25000);
  const b64 = Buffer.from(imageBuffer).toString("base64");
  const dataUrl = `data:${mimeType || "image/jpeg"};base64,${b64}`;

  const safeAttempt = Math.max(1, Math.min(5, Number(attempt) || 1));
  const labels = Array.isArray(candidateLabels) ? candidateLabels.filter(Boolean).slice(0, 80) : [];
  const avoid = Array.isArray(avoidLabels) ? avoidLabels.filter(Boolean).slice(0, 12) : [];
  const fileHint = String(fileName || "").trim();

  const labelGuide = labels.length
    ? `Candidate labels (prefer choosing from this list when possible):
${labels.map((l) => `- ${l}`).join("\n")}
If none fit, you may output a better label not in the list (avoid over-specific guesses).`
    : "";

  const avoidGuide = avoid.length
    ? `Important: the user clicked Analyze again because the previous result was wrong.
Do NOT output any of these as the top "label" unless you are extremely sure (>92%):
${avoid.map((l) => `- ${l}`).join("\n")}`
    : "";

  const prompt = `Identify the food/dish in this image.
Focus on Indian foods common in redistribution (tiffin items, curries, rice dishes, snacks).
Return ONLY strict JSON with this shape:
{
  "label": "string",
  "confidence": 0-100,
  "candidates": [{"label":"string","confidence":0-100}]
}
Rules:
- "label" must be the best guess (short, human-readable; prefer Indian dish names when applicable, but do not force Indian dishes).
- Provide up to 5 candidates total (including the top label).
- If the dish isn't clear, choose the closest category (e.g., "biryani", "dosa", "idli", "rice", "dal", "curry", "roti", "bread", "snack", "packaged food").`;

  const nameGuide = fileHint ? `Hint: uploaded filename is "${fileHint}" (weak signal; may be wrong).` : "";
  const finalPrompt = [prompt, nameGuide, labelGuide, avoidGuide].filter(Boolean).join("\n\n");

  let res;
  try {
    res = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: modelId,
        temperature: Math.min(0.8, 0.2 + (safeAttempt - 1) * 0.15),
        max_tokens: 320,
        messages: [
          {
            role: "system",
            content: "You are a food image classifier. Output strict JSON only.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: finalPrompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      },
      {
        timeout: Number.isFinite(timeoutMs) ? timeoutMs : 20000,
        headers: {
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    const status = err?.response?.status;
    const detail =
      err?.response?.data?.error?.message ||
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      "OpenAI vision request failed";

    if (err?.code === "ECONNABORTED" || String(detail).toLowerCase().includes("timeout")) {
      const e = new Error("OpenAI vision timed out. Try again or increase OPENAI_VISION_TIMEOUT_MS.");
      e.status = 504;
      throw e;
    }
    if (status === 401 || status === 403) {
      const e = new Error("OpenAI authentication failed. Verify OPENAI_API_KEY.");
      e.status = 502;
      throw e;
    }
    if (status === 404) {
      const e = new Error(`OpenAI vision model '${modelId}' not found on '${baseUrl}'. Set OPENAI_VISION_MODEL.`);
      e.status = 502;
      throw e;
    }

    const e = new Error(detail);
    e.status = 502;
    throw e;
  }

  const raw = res?.data?.choices?.[0]?.message?.content;
  const parsed = tryParseJson(raw);
  const label = String(parsed?.label || "").trim() || String(raw || "").trim().split("\n")[0] || "Food";
  const confidence = Math.max(0, Math.min(100, Number(parsed?.confidence ?? 60) || 60));

  const candidatesRaw = Array.isArray(parsed?.candidates) ? parsed.candidates : [];
  const candidates = candidatesRaw
    .map((c) => ({
      label: normalizeLabel(c?.label),
      confidence: Math.max(0, Math.min(100, Number(c?.confidence) || 0)),
    }))
    .filter((c) => c.label)
    .slice(0, 5);

  if (candidates.length === 0) {
    candidates.push({ label: normalizeLabel(label), confidence });
  }

  return {
    modelId,
    rawLabel: normalizeLabel(label),
    rawScore: confidence / 100,
    aiConfidence: Math.round(confidence),
    candidates,
  };
};

export const analyzeFoodImageWithOllamaVision = async ({
  imageBuffer,
  mimeType,
  candidateLabels,
  avoidLabels,
  attempt,
  fileName,
}) => {
  const ollamaUrl = pickOllamaUrl();
  const modelId = pickOllamaVisionModel();
  const safeAttempt = Math.max(1, Math.min(5, Number(attempt) || 1));
  const labels = Array.isArray(candidateLabels) ? candidateLabels.filter(Boolean).slice(0, 80) : [];
  const avoid = Array.isArray(avoidLabels) ? avoidLabels.filter(Boolean).slice(0, 12) : [];
  const fileHint = String(fileName || "").trim();

  const labelGuide = labels.length
    ? `Candidate labels (prefer these when possible):\n${labels.map((l) => `- ${l}`).join("\n")}`
    : "";

  const avoidGuide = avoid.length
    ? `Do NOT return any of these as the top label unless you are extremely sure (>92%):\n${avoid
        .map((l) => `- ${l}`)
        .join("\n")}`
    : "";

  const prompt = `Identify the food/dish in this image.
Focus on Indian foods common in redistribution (tiffin items, curries, rice dishes, snacks).
Return ONLY strict JSON:
{"label":"string","confidence":0-100,"candidates":[{"label":"string","confidence":0-100}]}`;

  const nameGuide = fileHint ? `Hint: uploaded filename is "${fileHint}" (weak signal; may be wrong).` : "";
  const finalPrompt = [prompt, nameGuide, labelGuide, avoidGuide].filter(Boolean).join("\n\n");
  const timeoutMs = Number(process.env.OLLAMA_VISION_TIMEOUT_MS || 30000);
  const b64 = Buffer.from(imageBuffer).toString("base64");

  let res;
  try {
    res = await axios.post(
      `${ollamaUrl}/api/chat`,
      {
        model: modelId,
        stream: false,
        format: "json",
        options: { temperature: Math.min(0.8, 0.2 + (safeAttempt - 1) * 0.15) },
        messages: [
          {
            role: "user",
            content: finalPrompt,
            images: [b64],
          },
        ],
      },
      { timeout: Number.isFinite(timeoutMs) ? timeoutMs : 30000 }
    );
  } catch (err) {
    const detail = err?.response?.data?.error || err?.message || "Ollama vision request failed";
    if (err?.code === "ECONNABORTED" || String(detail).toLowerCase().includes("timeout")) {
      const e = new Error("Ollama vision timed out. Try again or increase OLLAMA_VISION_TIMEOUT_MS.");
      e.status = 504;
      throw e;
    }
    const e = new Error(detail);
    e.status = 502;
    throw e;
  }

  const raw = res?.data?.message?.content;
  const parsed = tryParseJson(raw);
  const label = String(parsed?.label || "").trim() || String(raw || "").trim().split("\n")[0] || "Food";
  const confidence = Math.max(0, Math.min(100, Number(parsed?.confidence ?? 55) || 55));

  const candidatesRaw = Array.isArray(parsed?.candidates) ? parsed.candidates : [];
  const candidates = candidatesRaw
    .map((c) => ({
      label: normalizeLabel(c?.label),
      confidence: Math.max(0, Math.min(100, Number(c?.confidence) || 0)),
    }))
    .filter((c) => c.label)
    .slice(0, 5);

  if (candidates.length === 0) {
    candidates.push({ label: normalizeLabel(label), confidence });
  }

  return {
    modelId,
    rawLabel: normalizeLabel(label),
    rawScore: confidence / 100,
    aiConfidence: Math.round(confidence),
    candidates,
    mimeType: mimeType || "",
  };
};

export const deriveFoodAiReport = async ({ file, preparedAt, attempt, avoidLabels }) => {
  const provider = pickFoodAnalysisProvider();
  const token = pickHfToken();
  const openaiOk = isOpenAiVisionConfigured();
  const hfOk = !!token;
  const ollamaOk = isOllamaConfigured();
  const doublePass = isDoublePassEnabled();

  const allowOllama = provider === "ollama" || provider === "auto";
  const allowOpenAi = provider === "openai" || provider === "auto";
  const allowHf = provider === "huggingface" || provider === "auto";

  let vision = null;
  let used = "";
  let minConfidence = pickMinConfidence();
  let lastProviderError = "";
  let agreement = null;

  if (allowOllama && ollamaOk) {
    try {
      const labelSet = pickIndianLabelSet();
      vision = await analyzeFoodImageWithOllamaVision({
        imageBuffer: file.buffer,
        mimeType: file.mimetype,
        candidateLabels: labelSet,
        avoidLabels: Array.isArray(avoidLabels) ? avoidLabels : [],
        attempt: Number(attempt) || 1,
        fileName: file?.originalname || "",
      });
      used = "ollama_vision";
      minConfidence = 0;

      if (doublePass) {
        try {
          const second = await analyzeFoodImageWithOllamaVision({
            imageBuffer: file.buffer,
            mimeType: file.mimetype,
            candidateLabels: labelSet,
            avoidLabels: Array.isArray(avoidLabels) ? avoidLabels : [],
            attempt: Math.max(1, Number(attempt) || 1) + 1,
            fileName: file?.originalname || "",
          });
          const a = canonicalizeFoodType(vision?.rawLabel).toLowerCase();
          const b = canonicalizeFoodType(second?.rawLabel).toLowerCase();
          if (a && b) agreement = a === b;
          vision.candidates = normalizeCandidates([...(vision.candidates || []), ...(second.candidates || [])]);
        } catch {
          // ignore double-pass failures
        }
      }
    } catch (err) {
      vision = null;
      used = "";
      lastProviderError = err?.message ? String(err.message) : String(err || "");
    }
  }

  if (allowOpenAi && openaiOk) {
    try {
      const labelSet = pickIndianLabelSet();
      vision = await analyzeFoodImageWithOpenAiVision({
        imageBuffer: file.buffer,
        mimeType: file.mimetype,
        candidateLabels: labelSet,
        avoidLabels: Array.isArray(avoidLabels) ? avoidLabels : [],
        attempt: Number(attempt) || 1,
        fileName: file?.originalname || "",
      });
      used = "openai_vision";
      // OpenAI returns its own confidence; keep HF thresholds for HF only.
      minConfidence = 0;

      if (doublePass) {
        try {
          const second = await analyzeFoodImageWithOpenAiVision({
            imageBuffer: file.buffer,
            mimeType: file.mimetype,
            candidateLabels: labelSet,
            avoidLabels: Array.isArray(avoidLabels) ? avoidLabels : [],
            attempt: Math.max(1, Number(attempt) || 1) + 1,
            fileName: file?.originalname || "",
          });
          const a = canonicalizeFoodType(vision?.rawLabel).toLowerCase();
          const b = canonicalizeFoodType(second?.rawLabel).toLowerCase();
          if (a && b) agreement = a === b;
          vision.candidates = normalizeCandidates([...(vision.candidates || []), ...(second.candidates || [])]);
        } catch {
          // ignore double-pass failures
        }
      }
    } catch (err) {
      // fall back
      vision = null;
      used = "";
      lastProviderError = err?.message ? String(err.message) : String(err || "");
    }
  }

  if (!vision && allowHf) {
    if (!hfOk) {
      const err = new Error("HF_API_TOKEN is not set (and OpenAI vision is not configured)");
      err.status = 500;
      throw err;
    }

    // 0) Zero-shot CLIP on an Indian-food label set (best for Indian dishes like biryani/dosa/idli/etc.)
    const zeroShotModelId = pickZeroShotModel();
    const zeroShotLabels = pickIndianLabelSet();
    const zeroShotMin = pickZeroShotMinConfidence();

    let visionZero = null;
    if (isLikelyClipModel(zeroShotModelId) && zeroShotLabels.length > 0) {
      try {
        const r = await analyzeFoodImageZeroShotClip({
          imageBuffer: file.buffer,
          mimeType: file.mimetype,
          modelId: zeroShotModelId,
          token,
          candidateLabels: zeroShotLabels,
        });
        if (r?.aiConfidence >= zeroShotMin) visionZero = r;
      } catch {
        // ignore zero-shot errors; fall back to standard classifiers
      }
    }

    const primaryModelId = pickHfModel();
    const fallbackModelId = pickHfFallbackModel();

    let visionPrimary;
    try {
      visionPrimary = await analyzeFoodImageWithModel({
        imageBuffer: file.buffer,
        mimeType: file.mimetype,
        modelId: primaryModelId,
        token,
      });
    } catch (err) {
      lastProviderError = err?.message ? String(err.message) : String(err || "");
      throw err;
    }

    vision = visionPrimary;
    used = "primary";

    if (visionZero && visionZero.aiConfidence >= vision.aiConfidence) {
      vision = visionZero;
      used = "zero_shot";
    }

    // If primary confidence is low, try a fallback general food model and use it if better.
    if (fallbackModelId && fallbackModelId !== primaryModelId && visionPrimary.aiConfidence < minConfidence) {
      try {
        const visionFallback = await analyzeFoodImageWithModel({
          imageBuffer: file.buffer,
          mimeType: file.mimetype,
          modelId: fallbackModelId,
          token,
        });
        if (visionFallback.aiConfidence > visionPrimary.aiConfidence) {
          vision = visionFallback;
          used = "fallback";
        }
      } catch {
        // ignore fallback errors
      }
    }
  }

  if (!vision) {
    const parts = [];
    parts.push("Food analysis is not available.");
    if (lastProviderError) parts.push(`Last provider error: ${lastProviderError}`);
    parts.push("Choose one:");
    parts.push("- Ollama: set FOOD_ANALYSIS_PROVIDER=ollama and OLLAMA_VISION_MODEL (and make sure Ollama is running).");
    parts.push("- OpenAI-compatible: set FOOD_ANALYSIS_PROVIDER=openai and OPENAI_BASE_URL/OPENAI_VISION_MODEL (and optionally OPENAI_API_KEY).");
    parts.push("- Hugging Face: set FOOD_ANALYSIS_PROVIDER=huggingface and HF_API_TOKEN.");
    const err = new Error(parts.join(" "));
    err.status = 503;
    throw err;
  }

  const avoidSet = new Set(
    (Array.isArray(avoidLabels) ? avoidLabels : [])
      .map((x) => canonicalizeFoodType(String(x || "")))
      .filter(Boolean)
      .map((x) => x.toLowerCase())
  );

  let foodType = canonicalizeFoodType(vision.rawLabel);
  if (foodType && avoidSet.has(foodType.toLowerCase())) {
    const candidate = (Array.isArray(vision.candidates) ? vision.candidates : [])
      .map((c) => canonicalizeFoodType(c?.label))
      .find((c) => c && !avoidSet.has(String(c).toLowerCase()));
    if (candidate) foodType = candidate;
  }

  const providerName = used.startsWith("ollama") ? "ollama" : used.startsWith("openai") ? "openai" : "huggingface";
  const calibratedConfidence = computeCalibratedConfidence({
    provider: providerName,
    rawConfidence: vision.aiConfidence,
    candidates: vision.candidates,
    agreement,
  });
  const estimatedServings = estimateServingsHeuristic({
    canonicalFoodType: foodType,
    imageBytes: file.size,
  });

  const freshness = computeFreshnessRisk({ canonicalFoodType: foodType, preparedAt });
  const urgencyLevel = urgencyFromRisk(freshness.freshnessRisk);
  const summary = buildAutoSummary({
    canonicalFoodType: foodType,
    freshnessRisk: freshness.freshnessRisk,
    safeHours: freshness.safeHours,
    hoursSincePrepared: freshness.hoursSincePrepared,
  });

  return {
    foodType,
    estimatedServings,
    freshnessRisk: freshness.freshnessRisk,
    aiConfidence: calibratedConfidence,
    urgencyLevel,
    analyzedAt: new Date().toISOString(),
    model: {
      provider: providerName,
      modelId: vision.modelId,
      rawLabel: vision.rawLabel,
      rawScore: vision.rawScore,
      selection: used,
      minConfidence,
    },
    candidates: Array.isArray(vision.candidates) ? normalizeCandidates(vision.candidates) : [],
    freshnessMeta: {
      category: freshnessCategoryForFoodType(foodType),
      safeHours: freshness.safeHours,
      hoursSincePrepared: Number(freshness.hoursSincePrepared.toFixed(2)),
    },
    summary,
  };
};
