import {
  donationTrends,
  expiryRisk,
  ngoPerformance,
  donationForecast,
} from "./analytics.service.js";

export const getDonationTrends = async (req, res, next) => {
  try {
    const interval = String(req.query.interval || "day").toLowerCase();
    const result = await donationTrends({ interval });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getExpiryRisk = async (_req, res, next) => {
  try {
    const result = await expiryRisk();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getNgoPerformance = async (_req, res, next) => {
  try {
    const result = await ngoPerformance();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getDonationForecast = async (req, res, next) => {
  try {
    const windowDays = Math.min(Math.max(Number(req.query.windowDays) || 7, 3), 30);
    const result = await donationForecast({ windowDays });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

