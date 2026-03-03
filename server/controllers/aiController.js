import { findBestDonationMatch, findMultipleMatches } from "../services/matchingService.js";
import Donation from "../models/Donation.js";

export const getBestMatch = async (req, res) => {
  const { ngoLocation, foodRequiredQuantity, urgencyLevel } = req.body;

  if (!ngoLocation || typeof ngoLocation.lat !== "number" || typeof ngoLocation.lng !== "number") {
    return res.status(400).json({ message: "Valid ngoLocation is required" });
  }

  try {
    const match = await findBestDonationMatch({
      ngoLocation,
      foodRequiredQuantity: Number(foodRequiredQuantity) || 0,
      urgencyLevel: Number(urgencyLevel) || 1,
    });

    if (!match) {
      return res.status(404).json({ message: "No suitable donor found" });
    }

    res.json(match);
  } catch (err) {
    console.error("Best match error", err);
    res.status(500).json({ message: "Failed to compute best match" });
  }
};

export const getHungerHeatmap = async (_req, res) => {
  try {
    const donations = await Donation.find().select("location status impactScore");

    const points = donations
      .filter((d) => d.location)
      .map((d) => ({
        lat: d.location.lat,
        lng: d.location.lng,
        weight: (d.impactScore || 10) / (d.status === "completed" ? 2 : 1),
      }));

    res.json({ points });
  } catch (err) {
    console.error("Heatmap error", err);
    res.status(500).json({ message: "Failed to compute hunger heatmap" });
  }
};

/** GET: multiple match suggestions for NGO/regular (query: lat, lng, quantity, urgency, foodType, limit) */
export const getMatchSuggestions = async (req, res) => {
  const { lat, lng, quantity, urgency, foodType, limit } = req.query;

  const userLocation =
    lat != null && lng != null
      ? { lat: Number(lat), lng: Number(lng) }
      : null;

  try {
    const matches = await findMultipleMatches({
      userLocation,
      foodRequiredQuantity: Number(quantity) || 0,
      urgencyLevel: Number(urgency) || 1,
      foodType: foodType || "",
      limit: Math.min(Number(limit) || 10, 20),
    });

    const donations = matches.map((m) => m.donation);
    const populated = await Donation.populate(donations, {
      path: "donorId",
      select: "name email organizationName location address phone",
    });

    const results = matches.map((m, i) => ({
      donation: populated[i] || m.donation,
      distance: m.distance,
      confidenceScore: m.confidenceScore,
    }));

    res.json({ suggestions: results });
  } catch (err) {
    console.error("Match suggestions error", err);
    res.status(500).json({ message: "Failed to get suggestions" });
  }
};
