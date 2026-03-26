import Donation from "../models/Donation.js";
import User from "../models/User.js";
import { predictDonationVolume } from "../services/aiAnalytics.service.js";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const pickDateUnit = (interval) => {
  const v = String(interval || "").toLowerCase();
  if (v === "week") return "week";
  if (v === "month") return "month";
  return "day";
};

export const donationTrends = async ({ interval = "day" } = {}) => {
  const unit = pickDateUnit(interval);

  const rows = await Donation.aggregate([
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: "$createdAt",
            unit,
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    interval: unit,
    total: rows.reduce((a, r) => a + (r.count || 0), 0),
    points: rows.map((r) => ({
      period: r._id,
      count: r.count,
    })),
  };
};

export const expiryRisk = async () => {
  // Donation schema does not have an "urgencyScore" field; use spoilageRisk distribution as expiry proxy.
  const total = await Donation.countDocuments();
  if (!total) {
    return {
      total: 0,
      buckets: [],
      highRiskPercentage: 0,
    };
  }

  const buckets = await Donation.aggregate([
    {
      $bucket: {
        groupBy: "$spoilageRisk",
        boundaries: [0, 30, 70, 101],
        default: "unknown",
        output: { count: { $sum: 1 } },
      },
    },
  ]);

  const normalized = buckets
    .filter((b) => b && b._id !== "unknown")
    .map((b) => {
      const label = b._id === 0 ? "low" : b._id === 30 ? "medium" : "high";
      const count = Number(b.count) || 0;
      return {
        bucket: label,
        count,
        percentage: Number(((count / total) * 100).toFixed(2)),
      };
    });

  const high = normalized.find((b) => b.bucket === "high")?.percentage || 0;
  return {
    total,
    buckets: normalized,
    highRiskPercentage: high,
  };
};

export const ngoPerformance = async () => {
  // Performance is derived from donation.claims[] (additive; no schema changes).
  const rows = await Donation.aggregate([
    { $match: { "claims.0": { $exists: true } } },
    { $unwind: "$claims" },
    {
      $lookup: {
        from: "users",
        localField: "claims.claimerId",
        foreignField: "_id",
        as: "claimer",
      },
    },
    { $unwind: "$claimer" },
    { $match: { "claimer.role": "ngo" } },
    {
      $group: {
        _id: { ngoId: "$claims.claimerId", donationId: "$_id" },
        claimCount: { $sum: 1 },
        firstClaimAt: { $min: "$claims.claimedAt" },
        createdAt: { $first: "$createdAt" },
        status: { $first: "$status" },
      },
    },
    {
      $project: {
        ngoId: "$_id.ngoId",
        donationId: "$_id.donationId",
        claimCount: 1,
        responseMs: { $subtract: ["$firstClaimAt", "$createdAt"] },
        completed: { $eq: ["$status", "completed"] },
      },
    },
    {
      $group: {
        _id: "$ngoId",
        uniqueDonationsClaimed: { $sum: 1 },
        totalClaims: { $sum: "$claimCount" },
        avgResponseMs: { $avg: "$responseMs" },
        completedDonations: { $sum: { $cond: ["$completed", 1, 0] } },
      },
    },
    { $sort: { totalClaims: -1 } },
  ]);

  const ngoIds = rows.map((r) => r._id).filter(Boolean);
  const ngos = await User.find({ _id: { $in: ngoIds } })
    .select("name email organizationName")
    .lean();
  const byId = new Map(ngos.map((u) => [String(u._id), u]));

  return {
    ngos: rows.map((r) => {
      const ngo = byId.get(String(r._id)) || {};
      const unique = Number(r.uniqueDonationsClaimed) || 0;
      const completed = Number(r.completedDonations) || 0;
      const completionRate = unique ? (completed / unique) * 100 : 0;
      return {
        ngoId: r._id,
        ngoName: ngo.organizationName || ngo.name || ngo.email || "NGO",
        totalClaims: Number(r.totalClaims) || 0,
        uniqueDonationsClaimed: unique,
        avgClaimResponseMinutes: Number(((Number(r.avgResponseMs) || 0) / 60000).toFixed(2)),
        completionRate: Number(completionRate.toFixed(2)),
      };
    }),
  };
};

export const donationForecast = async ({ windowDays = 7 } = {}) => {
  const w = clamp(Number(windowDays) || 7, 3, 30);

  const points = await Donation.aggregate([
    {
      $group: {
        _id: { $dateTrunc: { date: "$createdAt", unit: "day" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: w },
    { $sort: { _id: 1 } },
  ]);

  const history = points.map((p) => ({ day: p._id, count: p.count }));
  const predicted = predictDonationVolume(history.map((h) => h.count), { window: w });

  return {
    windowDays: w,
    history,
    predictedNextDayCount: predicted,
  };
};

