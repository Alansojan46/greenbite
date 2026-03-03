import { aiComputeImpact, isAiEngineConfigured } from "./aiEngineClient.js";

export const calculateImpactScoreLocal = ({
  peopleServed = 0,
  distanceKm = 0,
  spoilageRisk = 0,
  urgencyWeight = 1.5,
  distancePenalty = 0.5,
  decayFactor = 0.8,
}) => {
  const base = peopleServed * urgencyWeight;
  const distancePenaltyScore = distanceKm * distancePenalty;
  const spoilagePenalty = spoilageRisk * decayFactor;
  const score = base - distancePenaltyScore - spoilagePenalty;
  return Math.max(0, Math.round(score));
};

// AI-first (FastAPI) with safe local fallback.
export const calculateImpactScore = async ({
  peopleServed = 0,
  distanceKm = 0,
  spoilageRisk = 0,
  urgencyWeight = 1.5,
  distancePenalty = 0.5,
  decayFactor = 0.8,
}) => {
  if (!isAiEngineConfigured()) {
    return calculateImpactScoreLocal({
      peopleServed,
      distanceKm,
      spoilageRisk,
      urgencyWeight,
      distancePenalty,
      decayFactor,
    });
  }

  try {
    return await aiComputeImpact({
      peopleServed,
      distanceKm,
      spoilageRisk,
      urgencyWeight,
      distancePenalty,
      decayFactor,
    });
  } catch {
    return calculateImpactScoreLocal({
      peopleServed,
      distanceKm,
      spoilageRisk,
      urgencyWeight,
      distancePenalty,
      decayFactor,
    });
  }
};
