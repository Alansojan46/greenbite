import cloudinary from "../utils/cloudinary.js";
import FoodAnalysis from "../models/FoodAnalysis.js";
import { deriveFoodAiReport } from "../services/aiService.js";
import crypto from "crypto";
import axios from "axios";

const hasCloudinary =
  !!process.env.CLOUDINARY_KEY &&
  !!process.env.CLOUDINARY_SECRET &&
  !!process.env.CLOUDINARY_CLOUD_NAME;

const uploadToCloudinary = async (file) => {
  const uploadRes = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "greenbite/ai-analysis" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(file.buffer);
  });
  return uploadRes?.secure_url;
};

const pickImageFetchTimeoutMs = () => {
  const v = Number(process.env.FOOD_IMAGE_FETCH_TIMEOUT_MS || 15000);
  if (!Number.isFinite(v) || v < 1000) return 15000;
  return Math.min(v, 60000);
};

const pickMaxImageBytes = () => {
  const v = Number(process.env.FOOD_IMAGE_MAX_BYTES || 10 * 1024 * 1024);
  if (!Number.isFinite(v) || v < 1024 * 1024) return 10 * 1024 * 1024;
  return Math.min(v, 25 * 1024 * 1024);
};

const fetchImageAsMulterLikeFile = async (imageUrl) => {
  const url = String(imageUrl || "").trim();
  if (!url) {
    const err = new Error("imageUrl is required");
    err.status = 400;
    throw err;
  }
  if (!/^https?:\/\//i.test(url)) {
    const err = new Error("imageUrl must be an http(s) URL");
    err.status = 400;
    throw err;
  }

  const timeout = pickImageFetchTimeoutMs();
  const maxBytes = pickMaxImageBytes();

  let res;
  try {
    res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout,
      maxContentLength: maxBytes,
      maxBodyLength: maxBytes,
      validateStatus: (s) => s >= 200 && s < 400,
    });
  } catch (e) {
    const err = new Error("Failed to fetch imageUrl");
    err.status = 502;
    err.cause = e;
    throw err;
  }

  const contentType = String(res?.headers?.["content-type"] || "").trim();
  if (contentType && !contentType.toLowerCase().startsWith("image/")) {
    const err = new Error(`imageUrl did not return an image (content-type: ${contentType || "unknown"})`);
    err.status = 400;
    throw err;
  }

  const buffer = Buffer.from(res.data || Buffer.alloc(0));
  if (!buffer.length) {
    const err = new Error("imageUrl returned an empty body");
    err.status = 400;
    throw err;
  }

  return {
    buffer,
    mimetype: contentType || "application/octet-stream",
    size: buffer.length,
    originalname: "image",
  };
};

const computeImageHash = (buffer) =>
  crypto.createHash("sha256").update(buffer || Buffer.alloc(0)).digest("hex");

const sanitizeFoodLabel = (input) => {
  const raw = String(input || "");
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned.slice(0, 80);
};

const parseBooleanish = (value) => {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "y" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "n" || v === "off") return false;
  return null;
};

const buildUserLabelOverrides = async (donorId) => {
  if (!donorId) return {};

  const docs = await FoodAnalysis.find({
    donorId,
    rawLabel: { $ne: "" },
    $or: [{ userCorrectedFoodType: { $ne: "" } }, { userOverrideFoodType: { $ne: "" } }],
  })
    .sort({ userFeedbackAt: -1, createdAt: -1 })
    .limit(200)
    .select("rawLabel userCorrectedFoodType userOverrideFoodType userFeedbackAt");

  const perRaw = new Map(); // rawLabelLower -> Map(correctedLower -> {label, count, lastAt})

  for (const d of docs) {
    const rawKey = String(d?.rawLabel || "")
      .trim()
      .toLowerCase();
    const corrected = sanitizeFoodLabel(d?.userCorrectedFoodType || d?.userOverrideFoodType);
    if (!rawKey || !corrected) continue;

    const correctedKey = corrected.toLowerCase();
    if (!perRaw.has(rawKey)) perRaw.set(rawKey, new Map());
    const m = perRaw.get(rawKey);
    const prev = m.get(correctedKey) || { label: corrected, count: 0, lastAt: 0 };
    const lastAt = d?.userFeedbackAt ? Number(new Date(d.userFeedbackAt)) : 0;
    m.set(correctedKey, { label: corrected, count: prev.count + 1, lastAt: Math.max(prev.lastAt, lastAt) });
  }

  const overrides = {};
  const meta = {}; // rawLabelLower -> {label, count}
  for (const [rawKey, m] of perRaw.entries()) {
    let best = null;
    for (const v of m.values()) {
      if (!best) best = v;
      else if (v.count > best.count) best = v;
      else if (v.count === best.count && v.lastAt > best.lastAt) best = v;
    }
    if (best?.label) {
      overrides[rawKey] = best.label;
      meta[rawKey] = { label: best.label, count: best.count };
    }
  }
  return { overrides, meta };
};

const findImageHashFeedback = async ({ donorId, imageHash }) => {
  if (!donorId || !imageHash) return null;

  const doc = await FoodAnalysis.findOne({
    donorId,
    imageHash,
    $or: [
      { userCorrectedFoodType: { $ne: "" } },
      { userOverrideFoodType: { $ne: "" } },
      { isPredictionCorrect: true },
    ],
  })
    .sort({ userFeedbackAt: -1, updatedAt: -1, createdAt: -1 })
    .select("userCorrectedFoodType userOverrideFoodType isPredictionCorrect foodType userFeedbackAt");

  if (!doc) return null;

  const corrected = sanitizeFoodLabel(doc?.userCorrectedFoodType || doc?.userOverrideFoodType || "");
  return {
    correctedFoodType: corrected || "",
    isPredictionCorrect: doc?.isPredictionCorrect === true,
    lastFoodType: String(doc?.foodType || ""),
  };
};

const clampInt = (n, min, max) => Math.max(min, Math.min(max, Math.round(Number(n) || 0)));

const pickFeedbackConfidence = ({ source, evidenceCount }) => {
  if (source === "feedback_imagehash") return 92;
  if (source === "feedback_mapping") {
    const c = Math.max(1, Number(evidenceCount) || 1);
    return clampInt(80 + Math.min(15, (c - 1) * 5), 80, 95);
  }
  return null;
};

export const analyzeFood = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const retryRaw = String(req.body?.retry ?? "").trim().toLowerCase();
    const isRetry = retryRaw === "1" || retryRaw === "true" || retryRaw === "yes" || retryRaw === "on";

    const preparedAt = req.body?.preparedAt ? new Date(req.body.preparedAt) : null;
    const imageHash = computeImageHash(req.file.buffer);

    // If the user clicks Analyze again with the same image, treat it as a retry.
    // Avoid repeating the same top label on retry.
    const last = await FoodAnalysis.findOne({
      donorId: req.user?._id,
      imageHash,
    })
      .sort({ createdAt: -1 })
      .select("foodType rawLabel analysisAttempt createdAt");

    const attempt = isRetry ? Math.max(2, Number(last?.analysisAttempt || 1) + 1) : 1;
    const avoidLabels =
      isRetry && attempt >= 2
        ? [last?.foodType, last?.rawLabel].filter(Boolean)
        : [];

    // 1) Store image (Cloudinary if configured, else inline data URL)
    let originalImageUrl = "";
    if (hasCloudinary) {
      try {
        originalImageUrl = await uploadToCloudinary(req.file);
      } catch (err) {
        console.error("Cloudinary upload failed (AI analyze)", err);
        return res.status(502).json({
          message:
            "Image upload failed. Check CLOUDINARY_CLOUD_NAME/CLOUDINARY_KEY/CLOUDINARY_SECRET in your server environment.",
        });
      }
    } else {
      originalImageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    // 2) Vision API + rule-based freshness logic
    const { overrides, meta } = await buildUserLabelOverrides(req.user?._id);
    const imageFeedback = await findImageHashFeedback({ donorId: req.user?._id, imageHash });

    const report = await deriveFoodAiReport({
      file: req.file,
      preparedAt,
      attempt,
      avoidLabels,
      labelOverrides: overrides,
      labelOverrideMeta: meta,
    });

    if (imageFeedback?.correctedFoodType && String(imageFeedback.correctedFoodType).trim()) {
      // Same image was corrected before. Always treat this run as feedback-backed and boost confidence.
      report.wasCorrected = true;
      report.confidenceSource = "feedback_imagehash";
      report.aiConfidence = pickFeedbackConfidence({ source: "feedback_imagehash" }) ?? report.aiConfidence;

      if (
        String(imageFeedback.correctedFoodType).trim().toLowerCase() !==
        String(report.foodType || "").trim().toLowerCase()
      ) {
        report.foodType = imageFeedback.correctedFoodType;
      }

      report.candidates = Array.isArray(report.candidates) ? report.candidates : [];
      const has = report.candidates.some(
        (c) =>
          String(c?.label || "").trim().toLowerCase() === String(imageFeedback.correctedFoodType).trim().toLowerCase()
      );
      if (!has) {
        report.candidates = [
          { label: imageFeedback.correctedFoodType, confidence: report.aiConfidence },
          ...report.candidates,
        ].slice(0, 5);
      }
    } else if (imageFeedback?.isPredictionCorrect && report.confidenceSource === "model") {
      report.wasCorrected = true;
      report.confidenceSource = "feedback_imagehash";
      report.aiConfidence = pickFeedbackConfidence({ source: "feedback_imagehash" }) ?? report.aiConfidence;
    }

    // 3) Persist AI results
    const doc = await FoodAnalysis.create({
      donorId: req.user?._id,
      foodType: report.foodType,
      estimatedServings: report.estimatedServings,
      freshnessRisk: report.freshnessRisk,
      aiConfidence: report.aiConfidence,
      originalPredictedFoodType: report.foodTypeModel || report.foodType,
      originalAiConfidence: report.aiConfidenceModel ?? report.aiConfidence,
      analyzedAt: new Date(report.analyzedAt),
      originalImageUrl,
      imageHash,
      analysisAttempt: attempt,
      modelId: report.model?.modelId || "",
      rawLabel: report.model?.rawLabel || "",
      rawScore: report.model?.rawScore || 0,
      candidates: Array.isArray(report.candidates) ? report.candidates : [],
      preparedAt: preparedAt || undefined,
    });

    return res.json({
      ...report,
      analysisId: doc._id,
      originalImageUrl,
    });
  } catch (err) {
    console.error("Analyze food error", err);
    const status = err?.status || 500;
    return res.status(status).json({
      message: err?.message || "Failed to analyze food image",
    });
  }
};

export const recognizeFood = async (req, res) => {
  try {
    const preparedAt = req.body?.preparedAt ? new Date(req.body.preparedAt) : null;

    const file = req.file || (req.body?.imageUrl ? await fetchImageAsMulterLikeFile(req.body.imageUrl) : null);
    if (!file) {
      return res.status(400).json({ message: "Provide either an image file (multipart field: image) or imageUrl" });
    }

    const imageHash = computeImageHash(file.buffer);
    const { overrides, meta } = await buildUserLabelOverrides(req.user?._id);
    const imageFeedback = await findImageHashFeedback({ donorId: req.user?._id, imageHash });

    const report = await deriveFoodAiReport({
      file,
      preparedAt,
      attempt: 1,
      avoidLabels: [],
      labelOverrides: overrides,
      labelOverrideMeta: meta,
    });

    if (imageFeedback?.correctedFoodType && String(imageFeedback.correctedFoodType).trim()) {
      report.wasCorrected = true;
      report.confidenceSource = "feedback_imagehash";
      report.aiConfidence = pickFeedbackConfidence({ source: "feedback_imagehash" }) ?? report.aiConfidence;

      if (
        String(imageFeedback.correctedFoodType).trim().toLowerCase() !==
        String(report.foodType || "").trim().toLowerCase()
      ) {
        report.foodType = imageFeedback.correctedFoodType;
      }
    } else if (imageFeedback?.isPredictionCorrect && report.confidenceSource === "model") {
      report.wasCorrected = true;
      report.confidenceSource = "feedback_imagehash";
      report.aiConfidence = pickFeedbackConfidence({ source: "feedback_imagehash" }) ?? report.aiConfidence;
    }

    return res.json({
      label: report.foodType,
      confidence: report.aiConfidence,
      topK: Array.isArray(report.candidates) ? report.candidates : [],
      analyzedAt: report.analyzedAt,
      model: report.model,
      confidenceModel: report.aiConfidenceModel ?? report.aiConfidence,
      confidenceEffective: report.aiConfidence,
      confidenceSource: report.confidenceSource || "model",
      wasCorrected: !!report.wasCorrected,
    });
  } catch (err) {
    console.error("Recognize food error", err);
    const status = err?.status || 500;
    return res.status(status).json({
      message: err?.message || "Failed to recognize food image",
    });
  }
};

export const submitFoodAnalysisFeedback = async (req, res) => {
  try {
    const { analysisId, isCorrect, correctedFoodType, correctFoodType } = req.body || {};
    if (!analysisId) return res.status(400).json({ message: "analysisId is required" });

    const parsed = parseBooleanish(isCorrect);
    const isCorrectBool = parsed !== null ? parsed : null;

    // Backward compatible: old payload {correctFoodType} implies "incorrect" + correction.
    const correctionRaw = correctedFoodType ?? correctFoodType ?? "";
    const correction = sanitizeFoodLabel(correctionRaw);

    const doc = await FoodAnalysis.findOne({ _id: analysisId, donorId: req.user?._id }).select(
      "candidates foodType aiConfidence rawLabel"
    );
    if (!doc) return res.status(404).json({ message: "Analysis not found" });

    if (isCorrectBool === null) {
      // If boolean not provided, require correction to avoid ambiguous feedback.
      if (!correction) return res.status(400).json({ message: "isCorrect is required (true/false)" });
    }

    const treatingAsCorrect = isCorrectBool === true;
    const treatingAsIncorrect = isCorrectBool === false || (isCorrectBool === null && !!correction);

    if (treatingAsIncorrect && !correction) {
      return res.status(400).json({ message: "correctedFoodType is required when isCorrect=false" });
    }

    let source = "";
    if (treatingAsIncorrect && correction) {
      const candidates = Array.isArray(doc.candidates) ? doc.candidates : [];
      const inTopK = candidates.some(
        (c) => String(c?.label || "").trim().toLowerCase() === String(correction).trim().toLowerCase()
      );
      source = inTopK ? "topk" : "custom";
    }

    const patch = {
      userFeedbackAt: new Date(),
      originalPredictedFoodType: String(doc.foodType || ""),
      originalAiConfidence: Number(doc.aiConfidence || 0),
    };

    if (treatingAsCorrect) {
      patch.isPredictionCorrect = true;
      patch.userCorrectedFoodTypeRaw = "";
      patch.userCorrectedFoodType = "";
      patch.userOverrideFoodType = "";
      patch.feedbackSource = "";
    } else if (treatingAsIncorrect) {
      patch.isPredictionCorrect = false;
      patch.userCorrectedFoodTypeRaw = String(correctionRaw || "").trim().slice(0, 200);
      patch.userCorrectedFoodType = correction;
      patch.userOverrideFoodType = correction; // keep legacy field in sync
      patch.feedbackSource = source;
    }

    const updated = await FoodAnalysis.findOneAndUpdate({ _id: analysisId, donorId: req.user?._id }, patch, {
      new: true,
    }).select("_id isPredictionCorrect userCorrectedFoodType feedbackSource userFeedbackAt");

    if (!updated) return res.status(404).json({ message: "Analysis not found" });
    res.json({ ok: true, feedback: updated });
  } catch (err) {
    console.error("Food feedback error", err);
    res.status(500).json({ message: "Failed to save feedback" });
  }
};
