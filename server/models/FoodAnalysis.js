import mongoose from "mongoose";

const foodAnalysisSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    foodType: { type: String, required: true, trim: true },
    estimatedServings: { type: Number, required: true, min: 1 },
    freshnessRisk: {
      type: String,
      enum: ["Low", "Medium", "High"],
      required: true,
    },
    aiConfidence: { type: Number, required: true, min: 0, max: 100 },
    analyzedAt: { type: Date, default: Date.now },
    originalImageUrl: { type: String, required: true },
    imageHash: { type: String, default: "", index: true },
    analysisAttempt: { type: Number, default: 1, min: 1 },

    // Optional metadata for debugging/iteration
    modelId: { type: String, default: "" },
    rawLabel: { type: String, default: "" },
    rawScore: { type: Number, default: 0 },
    candidates: {
      type: [
        {
          label: { type: String, default: "" },
          confidence: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    preparedAt: { type: Date, required: false },

    // Human-in-the-loop improvement signal (for later fine-tuning)
    userOverrideFoodType: { type: String, default: "" },
    isPredictionCorrect: { type: Boolean, required: false },
    userCorrectedFoodTypeRaw: { type: String, default: "" },
    userCorrectedFoodType: { type: String, default: "" },
    feedbackSource: { type: String, default: "" }, // "topk" | "custom"
    originalPredictedFoodType: { type: String, default: "" },
    originalAiConfidence: { type: Number, default: 0, min: 0, max: 100 },
    userFeedbackAt: { type: Date, required: false },
  },
  { timestamps: true }
);

const FoodAnalysis = mongoose.model("FoodAnalysis", foodAnalysisSchema);

export default FoodAnalysis;
