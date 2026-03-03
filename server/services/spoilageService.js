import { aiEstimateSpoilage, isAiEngineConfigured } from "./aiEngineClient.js";

export const estimateSpoilageRiskLocal = ({ preparedAt, expiryEstimate, foodType }) => {
  const now = new Date();
  const prepared = new Date(preparedAt);
  const hoursSincePrepared = (now.getTime() - prepared.getTime()) / (1000 * 60 * 60);

  let baseRisk = Math.min(100, Math.max(0, (hoursSincePrepared / 24) * 100));

  if (expiryEstimate) {
    const expiry = new Date(expiryEstimate);
    if (now > expiry) {
      baseRisk = 100;
    }
  }

  if (foodType) {
    const lowerRiskTypes = ["dry", "packaged", "bread"];
    if (lowerRiskTypes.includes(foodType.toLowerCase())) {
      baseRisk *= 0.7;
    }
  }

  const freshnessPrediction =
    baseRisk < 30 ? "High" : baseRisk < 70 ? "Medium" : "Low";

  return {
    spoilageRisk: Math.round(baseRisk),
    freshnessPrediction,
  };
};

// AI-first (FastAPI) with safe local fallback.
export const estimateSpoilageRisk = async ({ preparedAt, expiryEstimate, foodType, temperatureC }) => {
  if (!isAiEngineConfigured()) {
    return estimateSpoilageRiskLocal({ preparedAt, expiryEstimate, foodType });
  }
  try {
    return await aiEstimateSpoilage({ preparedAt, expiryEstimate, foodType, temperatureC });
  } catch {
    return estimateSpoilageRiskLocal({ preparedAt, expiryEstimate, foodType });
  }
};
