const clampInt = (n, min, max) => Math.max(min, Math.min(max, Math.round(Number(n) || 0)));

/**
 * Pure helper: estimate "waste risk" for a donation.
 * Returns a 0-100 score and a label. Does not mutate input.
 */
export const calculateWasteRisk = (donation) => {
  const spoilageRisk = Number(donation?.spoilageRisk) || 0;
  const now = Date.now();
  const expiry = donation?.expiryEstimate ? new Date(donation.expiryEstimate).getTime() : null;

  let timeRisk = 0;
  if (expiry && Number.isFinite(expiry)) {
    const hoursToExpiry = (expiry - now) / (1000 * 60 * 60);
    if (hoursToExpiry <= 0) timeRisk = 100;
    else if (hoursToExpiry <= 2) timeRisk = 95;
    else if (hoursToExpiry <= 6) timeRisk = 80;
    else if (hoursToExpiry <= 12) timeRisk = 65;
    else if (hoursToExpiry <= 24) timeRisk = 40;
    else timeRisk = 15;
  }

  const score = clampInt(spoilageRisk * 0.7 + timeRisk * 0.3, 0, 100);
  const label = score >= 70 ? "High" : score >= 35 ? "Medium" : "Low";
  return { score, label };
};

/**
 * Pure helper: predict next day's donation volume from historical daily counts.
 * Uses simple moving average over the last N days (default 7).
 */
export const predictDonationVolume = (donationHistory, { window = 7 } = {}) => {
  const w = Math.max(1, Math.min(30, Number(window) || 7));
  const series = Array.isArray(donationHistory) ? donationHistory : [];
  const last = series.slice(-w).map((x) => Number(x) || 0);
  if (!last.length) return 0;
  const avg = last.reduce((a, b) => a + b, 0) / last.length;
  return clampInt(avg, 0, 1_000_000);
};

