import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const donationSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    foodName: { type: String, required: true, trim: true },
    quantityUnits: { type: Number },
    quantityKg: { type: Number },
    estimatedPeopleServed: { type: Number },
    remainingPeopleServed: { type: Number, default: null },
    remainingUnits: { type: Number, default: null },
    remainingKg: { type: Number, default: null },
    preparedAt: { type: Date, required: true },
    expiryEstimate: { type: Date },
    foodImage: { type: String, required: true },
    foodAnalysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodAnalysis",
      required: false,
    },
    status: {
      type: String,
      enum: ["available", "claimed", "completed"],
      default: "available",
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastClaimedAt: { type: Date },
    claims: {
      type: [
        new mongoose.Schema(
          {
            claimerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            servings: { type: Number, default: null },
            units: { type: Number, default: null },
            kg: { type: Number, default: null },
            location: { type: locationSchema, required: false },
            claimedAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    impactScore: { type: Number, default: 0 },
    spoilageRisk: { type: Number, default: 0 },
    location: locationSchema,
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

const Donation = mongoose.model("Donation", donationSchema);

export default Donation;
