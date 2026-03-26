// Simple matching algorithm stub; can be backed by AI engine
import Donation from "../models/Donation.js";
import { aiRankMatches, isAiEngineConfigured } from "./aiEngineClient.js";

const toRad = (value) => (value * Math.PI) / 180;

const haversineDistanceKm = (loc1, loc2) => {
  const R = 6371;
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLng = toRad(loc2.lng - loc1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(loc1.lat)) *
      Math.cos(toRad(loc2.lat)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const findBestDonationMatch = async ({
  ngoLocation,
  foodRequiredQuantity,
  urgencyLevel,
}) => {
  const now = new Date();
  const donations = await Donation.find({
    status: "available",
    $or: [
      { expiryEstimate: { $exists: false } },
      { expiryEstimate: null },
      { expiryEstimate: { $gt: now } },
    ],
  });

  if (!donations.length) return null;

  const pickAvailableQuantity = (donation) =>
    donation.remainingPeopleServed ||
    donation.estimatedPeopleServed ||
    donation.remainingKg ||
    donation.quantityKg ||
    donation.remainingUnits ||
    donation.quantityUnits ||
    0;

  if (isAiEngineConfigured()) {
    try {
      const options = donations
        .filter((d) => d.location)
        .map((d) => ({
          donor_id: String(d.donorId),
          donation_id: String(d._id),
          location: { lat: d.location.lat, lng: d.location.lng },
          available_quantity: Number(pickAvailableQuantity(d)) || 0,
          spoilage_risk: Number(d.spoilageRisk || 50),
          impact_score: Number(d.impactScore || 0),
          response_speed_score: 80,
        }));

      const ranked = await aiRankMatches({
        ngoLocation,
        foodRequiredQuantity,
        urgencyLevel,
        options,
        limit: 1,
      });

      const top = ranked?.[0];
      if (top?.donationId) {
        return {
          recommendedDonorId: top.recommendedDonorId,
          donationId: top.donationId,
          distance: Number(Number(top.distance || 0).toFixed(2)),
          confidenceScore: Math.max(0, Math.min(100, Math.round(Number(top.confidenceScore || 0)))),
        };
      }
    } catch {
      // fall back to local scoring
    }
  }

  let best = null;

  donations.forEach((donation) => {
    if (!donation.location) return;

    const distance = haversineDistanceKm(ngoLocation, donation.location);
    const quantity = pickAvailableQuantity(donation);

    if (quantity < foodRequiredQuantity * 0.5) return;

    const spoilageRisk = donation.spoilageRisk || 50;
    const impactScore = donation.impactScore || 0;
    const responseSpeedScore = 80;
    const partialClaimBoost = donation.claims && donation.claims.length > 0 ? 25 : 0;

    const score =
      impactScore +
      responseSpeedScore +
      partialClaimBoost +
      urgencyLevel * 10 -
      distance * 2 -
      spoilageRisk;

    if (!best || score > best.score) {
      best = {
        donation,
        distance,
        score,
      };
    }
  });

  if (!best) return null;

  return {
    recommendedDonorId: best.donation.donorId,
    donationId: best.donation._id,
    distance: Number(best.distance.toFixed(2)),
    confidenceScore: Math.max(0, Math.min(100, Math.round(best.score))),
  };
};

/** Return top N donation matches for NGO/claimer requirements */
export const findMultipleMatches = async ({
  userLocation,
  foodRequiredQuantity = 0,
  urgencyLevel = 1,
  foodType = "",
  limit = 10,
}) => {
  const now = new Date();
  const donations = await Donation.find({
    status: "available",
    $or: [
      { expiryEstimate: { $exists: false } },
      { expiryEstimate: null },
      { expiryEstimate: { $gt: now } },
    ],
  });

  const pickAvailableQuantity = (donation) =>
    donation.remainingPeopleServed ||
    donation.estimatedPeopleServed ||
    donation.remainingKg ||
    donation.quantityKg ||
    donation.remainingUnits ||
    donation.quantityUnits ||
    0;

  const eligible = donations
    .map((donation) => {
      const quantity = pickAvailableQuantity(donation);

      // Quantity: if NGO didn't specify (0), show all. Else show if donation has enough OR has no quantity set (show anyway).
      const meetsQuantity =
        !foodRequiredQuantity ||
        foodRequiredQuantity <= 0 ||
        quantity >= foodRequiredQuantity * 0.2 ||
        quantity === 0;

      const foodMatch =
        !foodType ||
        (donation.foodName && donation.foodName.toLowerCase().includes(foodType.toLowerCase().trim()));

      if (!meetsQuantity || !foodMatch) return null;
      if (!donation.location || donation.location.lat == null || donation.location.lng == null) return null;

      const partialClaimBoost = donation.claims && donation.claims.length > 0 ? 25 : 0;
      return { donation, partialClaimBoost };
    })
    .filter(Boolean);

  if (isAiEngineConfigured() && userLocation) {
    try {
      const options = eligible.map(({ donation, partialClaimBoost }) => ({
        donor_id: String(donation.donorId),
        donation_id: String(donation._id),
        location: { lat: donation.location.lat, lng: donation.location.lng },
        available_quantity: Number(pickAvailableQuantity(donation)) || 0,
        spoilage_risk: Number(donation.spoilageRisk || 50),
        impact_score: Number(donation.impactScore || 0) + Number(partialClaimBoost || 0),
        response_speed_score: 80,
      }));

      const ranked = await aiRankMatches({
        ngoLocation: userLocation,
        foodRequiredQuantity,
        urgencyLevel,
        options,
        limit,
      });

      const byId = new Map(eligible.map(({ donation }) => [String(donation._id), donation]));
      return ranked
        .map((r) => ({
          donation: byId.get(String(r.donationId)),
          distance: r.distance,
          confidenceScore: r.confidenceScore,
        }))
        .filter((x) => x.donation);
    } catch {
      // fall back to local scoring
    }
  }

  const scored = eligible
    .map(({ donation, partialClaimBoost }) => {
      const distance = userLocation ? haversineDistanceKm(userLocation, donation.location) : 0;
      const spoilageRisk = donation.spoilageRisk || 50;
      const impactScore = donation.impactScore || 0;
      const score = impactScore + 80 + partialClaimBoost + urgencyLevel * 10 - distance * 2 - spoilageRisk;
      return { donation, distance, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ donation, distance, score }) => ({
    donation,
    distance: Number(distance.toFixed(2)),
    confidenceScore: Math.max(0, Math.min(100, Math.round(score))),
  }));
};
