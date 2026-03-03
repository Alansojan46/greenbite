import axios from "axios";

const pickBaseUrl = () => {
  const raw = String(process.env.AI_ENGINE_URL || "").trim();
  return raw ? raw.replace(/\/+$/, "") : "";
};

const pickTimeoutMs = (fallback) => {
  const v = Number(process.env.AI_ENGINE_TIMEOUT_MS || fallback);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(300, Math.min(20000, Math.round(v)));
};

const http = axios.create({
  timeout: pickTimeoutMs(2500),
  maxContentLength: 512 * 1024,
  maxBodyLength: 512 * 1024,
});

export const isAiEngineConfigured = () => !!pickBaseUrl();

export const aiEngineHealth = async () => {
  const baseUrl = pickBaseUrl();
  if (!baseUrl) throw new Error("AI_ENGINE_URL is not set");
  const res = await http.get(`${baseUrl}/health`, { timeout: pickTimeoutMs(1200) });
  return res.data;
};

export const aiEstimateSpoilage = async ({
  preparedAt,
  expiryEstimate,
  foodType,
  temperatureC,
}) => {
  const baseUrl = pickBaseUrl();
  if (!baseUrl) throw new Error("AI_ENGINE_URL is not set");

  const res = await http.post(
    `${baseUrl}/spoilage`,
    {
      prepared_at: preparedAt,
      expiry_estimate: expiryEstimate || null,
      food_type: foodType || null,
      temperature_c: temperatureC ?? null,
    },
    { timeout: pickTimeoutMs(2000) }
  );

  return {
    spoilageRisk: Number(res.data?.spoilage_risk ?? res.data?.spoilageRisk ?? 0),
    freshnessPrediction: String(
      res.data?.freshness_prediction ?? res.data?.freshnessPrediction ?? ""
    ),
  };
};

export const aiComputeImpact = async ({
  peopleServed,
  distanceKm,
  spoilageRisk,
  urgencyWeight,
  distancePenalty,
  decayFactor,
}) => {
  const baseUrl = pickBaseUrl();
  if (!baseUrl) throw new Error("AI_ENGINE_URL is not set");

  const res = await http.post(
    `${baseUrl}/impact`,
    {
      people_served: Number(peopleServed) || 0,
      distance_km: Number(distanceKm) || 0,
      spoilage_risk: Number(spoilageRisk) || 0,
      urgency_weight: urgencyWeight ?? 1.5,
      distance_penalty: distancePenalty ?? 0.5,
      decay_factor: decayFactor ?? 0.8,
    },
    { timeout: pickTimeoutMs(2000) }
  );

  return Number(res.data?.impact_score ?? res.data?.impactScore ?? 0);
};

export const aiRankMatches = async ({
  ngoLocation,
  foodRequiredQuantity,
  urgencyLevel,
  options,
  limit,
}) => {
  const baseUrl = pickBaseUrl();
  if (!baseUrl) throw new Error("AI_ENGINE_URL is not set");

  const res = await http.post(
    `${baseUrl}/match-suggestions`,
    {
      ngo_location: ngoLocation,
      food_required_quantity: Number(foodRequiredQuantity) || 0,
      urgency_level: Number(urgencyLevel) || 1,
      options,
      limit: Math.min(Number(limit) || 10, 20),
    },
    { timeout: pickTimeoutMs(3500) }
  );

  const suggestions = Array.isArray(res.data?.suggestions) ? res.data.suggestions : [];
  return suggestions.map((s) => ({
    recommendedDonorId: s.recommended_donor_id || s.recommendedDonorId || "",
    donationId: s.donation_id || s.donationId || "",
    distance: Number(s.distance || 0),
    confidenceScore: Number(s.confidence_score ?? s.confidenceScore ?? 0),
  }));
};

