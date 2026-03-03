import cloudinary from "../utils/cloudinary.js";
import FoodAnalysis from "../models/FoodAnalysis.js";
import { deriveFoodAiReport } from "../services/aiService.js";
import crypto from "crypto";

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

export const analyzeFood = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const preparedAt = req.body?.preparedAt ? new Date(req.body.preparedAt) : null;
    const imageHash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");

    // If the user clicks Analyze again with the same image, treat it as a retry.
    // Avoid repeating the same top label on retry.
    const last = await FoodAnalysis.findOne({
      donorId: req.user?._id,
      imageHash,
    })
      .sort({ createdAt: -1 })
      .select("foodType rawLabel analysisAttempt createdAt");

    const attempt = Math.max(1, Number(last?.analysisAttempt || 0) + 1);
    const avoidLabels =
      attempt >= 2
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
    const report = await deriveFoodAiReport({
      file: req.file,
      preparedAt,
      attempt,
      avoidLabels,
    });

    // 3) Persist AI results
    const doc = await FoodAnalysis.create({
      donorId: req.user?._id,
      foodType: report.foodType,
      estimatedServings: report.estimatedServings,
      freshnessRisk: report.freshnessRisk,
      aiConfidence: report.aiConfidence,
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

export const submitFoodAnalysisFeedback = async (req, res) => {
  try {
    const { analysisId, correctFoodType } = req.body || {};
    if (!analysisId) return res.status(400).json({ message: "analysisId is required" });
    if (!correctFoodType || typeof correctFoodType !== "string") {
      return res.status(400).json({ message: "correctFoodType is required" });
    }

    const updated = await FoodAnalysis.findOneAndUpdate(
      { _id: analysisId, donorId: req.user?._id },
      {
        userOverrideFoodType: correctFoodType.trim(),
        userFeedbackAt: new Date(),
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Analysis not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Food feedback error", err);
    res.status(500).json({ message: "Failed to save feedback" });
  }
};
