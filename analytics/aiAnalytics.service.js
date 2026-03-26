// Re-export the pure AI helpers from the isolated server module.
// Keeping this file satisfies the /analytics module layout while keeping logic in one place.
export { calculateWasteRisk, predictDonationVolume } from "../server/services/aiAnalytics.service.js";

