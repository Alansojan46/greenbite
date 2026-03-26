import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Donation from "../models/Donation.js";
import cloudinary from "../utils/cloudinary.js";
import { estimateSpoilageRisk } from "../services/spoilageService.js";
import { calculateImpactScore } from "../services/impactService.js";
import { notifyDonationClaimed, notifyDonationPosted } from "../services/notificationService.js";

const parseLatLng = ({ location, lat, lng, flatLat, flatLng }) => {
  const rawLat = location?.lat ?? lat ?? flatLat;
  const rawLng = location?.lng ?? lng ?? flatLng;
  if (rawLat == null || rawLng == null) return null;
  const parsed = { lat: Number(rawLat), lng: Number(rawLng) };
  if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
  return parsed;
};

const haversineDistanceKm = (a, b) => {
  const toRad = (v) => (Number(v) * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
};

export const createDonation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    foodName,
    quantityUnits,
    quantityKg,
    estimatedPeopleServed,
    preparedAt,
    expiryEstimate,
    location: locationBody,
    foodAnalysisId,
  } = req.body;

  const location = parseLatLng({
    location: locationBody,
    flatLat: req.body["location.lat"],
    flatLng: req.body["location.lng"],
  });

  if (!location || location.lat == null || location.lng == null) {
    return res.status(400).json({ message: "Donor location is required. Please allow location access or enter address." });
  }

  try {
    let foodImage;
    if (!req.file) {
      return res.status(400).json({ message: "Food photo is required" });
    }

    let analysisRef = undefined;
    if (foodAnalysisId) {
      if (!mongoose.Types.ObjectId.isValid(foodAnalysisId)) {
        return res.status(400).json({ message: "Invalid foodAnalysisId" });
      }
      analysisRef = foodAnalysisId;
    }

    const hasCloudinary =
      !!process.env.CLOUDINARY_KEY &&
      !!process.env.CLOUDINARY_SECRET &&
      !!process.env.CLOUDINARY_CLOUD_NAME;

    if (hasCloudinary) {
      try {
        const uploadRes = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "greenbite/donations" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });
        foodImage = uploadRes?.secure_url;
      } catch (err) {
        console.error("Cloudinary upload failed", err);
        return res.status(502).json({
          message:
            "Image upload failed. Check CLOUDINARY_CLOUD_NAME/CLOUDINARY_KEY/CLOUDINARY_SECRET in your server environment.",
        });
      }
    } else {
      // Dev-friendly fallback: inline the uploaded image so the app works without Cloudinary.
      foodImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const spoilage = await estimateSpoilageRisk({
      preparedAt,
      expiryEstimate,
      foodType: foodName,
    });

    const impactScore = await calculateImpactScore({
      peopleServed: estimatedPeopleServed,
      distanceKm: 0,
      spoilageRisk: spoilage.spoilageRisk,
    });

    const donation = await Donation.create({
      donorId: req.user._id,
      foodName,
      quantityUnits,
      quantityKg,
      estimatedPeopleServed,
      remainingPeopleServed: estimatedPeopleServed != null && estimatedPeopleServed !== "" ? Number(estimatedPeopleServed) : null,
      remainingUnits: quantityUnits != null && quantityUnits !== "" ? Number(quantityUnits) : null,
      remainingKg: quantityKg != null && quantityKg !== "" ? Number(quantityKg) : null,
      preparedAt,
      expiryEstimate,
      foodImage,
      foodAnalysisId: analysisRef,
      spoilageRisk: spoilage.spoilageRisk,
      impactScore,
      location,
    });

    // Fan-out notifications to regular + NGO users without slowing the request.
    void notifyDonationPosted({ donor: req.user, donation }).catch((err) => {
      console.error("Donation posted notification error", err);
    });

    res.status(201).json(donation);
  } catch (err) {
    console.error("Create donation error", err);
    res.status(500).json({
      message: "Failed to create donation",
      error: err?.message || String(err),
    });
  }
};

export const getDonations = async (req, res) => {
  try {
    const { status, donor, sort, lat, lng } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (donor === "me") filter.donorId = req.user._id;

    let query = Donation.find(filter)
      .sort({ createdAt: -1 })
      .populate("donorId", "name email organizationName location address phone")
      .populate("claimedBy", "name email phone");

    // Donors viewing their own list benefit from seeing who claimed partial quantities.
    if (donor === "me") {
      query = query.populate("claims.claimerId", "name email role organizationName phone");
    }

    const requesterLoc = parseLatLng({ lat, lng });
    const donations = await query.lean();

    const withDistance = requesterLoc
      ? donations.map((d) => {
          const loc = d?.location;
          const dist =
            loc && loc.lat != null && loc.lng != null
              ? haversineDistanceKm(requesterLoc, loc)
              : null;
          return { ...d, distanceKm: dist != null ? Number(dist.toFixed(2)) : null };
        })
      : donations;

    if (requesterLoc && String(sort || "").toLowerCase() === "nearest") {
      withDistance.sort((a, b) => {
        const da = a?.distanceKm;
        const db = b?.distanceKm;
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    }

    res.json(withDistance);
  } catch (err) {
    console.error("Get donations error", err);
    res.status(500).json({ message: "Failed to fetch donations" });
  }
};

export const claimDonation = async (req, res) => {
  const donationId = req.params.id;
  const userId = req.user._id;

  try {
    const role = String(req.user?.role || "").toLowerCase();
    if (role !== "ngo" && role !== "regular") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const claimantLocation = parseLatLng({
      location: req.body?.location,
      flatLat: req.body?.["location.lat"],
      flatLng: req.body?.["location.lng"],
      lat: req.body?.lat,
      lng: req.body?.lng,
    });
    if (!claimantLocation) {
      return res.status(400).json({ message: "Location is required to claim a donation." });
    }

    const requestedServings =
      req.body?.servings != null ? Number(req.body.servings) :
      req.body?.quantity != null ? Number(req.body.quantity) :
      req.body?.amount != null ? Number(req.body.amount) :
      null;

    const donation = await Donation.findById(donationId).select(
      "status estimatedPeopleServed remainingPeopleServed quantityUnits remainingUnits quantityKg remainingKg donorId foodName"
    );

    if (!donation) return res.status(404).json({ message: "Donation not found" });
    if (donation.status !== "available") {
      return res.status(409).json({ message: "Donation is not available" });
    }

    const chooseMode = () => {
      const remServings = donation.remainingPeopleServed ?? donation.estimatedPeopleServed;
      if (remServings != null && Number(remServings) > 0) return "servings";
      const remUnits = donation.remainingUnits ?? donation.quantityUnits;
      if (remUnits != null && Number(remUnits) > 0) return "units";
      const remKg = donation.remainingKg ?? donation.quantityKg;
      if (remKg != null && Number(remKg) > 0) return "kg";
      return null;
    };

    const mode = chooseMode();
    if (!mode) {
      return res.status(400).json({
        message:
          "This donation has no quantity to claim. Donor must set estimated people served, units, or kg.",
      });
    }

    const now = new Date();

    const buildUpdate = (fieldName, amount, claimDoc, setStatusToClaimed) => [
      {
        $set: {
          [fieldName]: { $subtract: [`$${fieldName}`, amount] },
          claimedBy: userId,
          lastClaimedAt: now,
          status: setStatusToClaimed ? "claimed" : "available",
          claims: {
            $concatArrays: [
              { $ifNull: ["$claims", []] },
              [claimDoc],
            ],
          },
        },
      },
    ];

    let filter = { _id: donationId, status: "available" };
    let update = null;
    let claim = null;

    if (mode === "servings") {
      const remaining = Number(donation.remainingPeopleServed ?? donation.estimatedPeopleServed ?? 0);
      const amount = requestedServings == null ? remaining : requestedServings;
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Invalid servings amount" });
      if (amount > remaining) return res.status(400).json({ message: `Only ${remaining} servings remaining` });

      // Ensure remainingPeopleServed exists for atomic decrement.
      if (donation.remainingPeopleServed == null) {
        await Donation.updateOne(
          { _id: donationId, remainingPeopleServed: { $exists: false } },
          { $set: { remainingPeopleServed: remaining } }
        );
      }

      filter = { ...filter, remainingPeopleServed: { $gte: amount } };
      update = buildUpdate(
        "remainingPeopleServed",
        amount,
        { claimerId: userId, servings: amount, location: claimantLocation, claimedAt: now },
        amount === remaining
      );
      claim = { servings: amount, remainingServings: remaining - amount };
    } else if (mode === "units") {
      const remaining = Number(donation.remainingUnits ?? donation.quantityUnits ?? 0);
      const amount = requestedServings == null ? remaining : requestedServings;
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Invalid units amount" });
      if (amount > remaining) return res.status(400).json({ message: `Only ${remaining} units remaining` });
      if (donation.remainingUnits == null) {
        await Donation.updateOne(
          { _id: donationId, remainingUnits: { $exists: false } },
          { $set: { remainingUnits: remaining } }
        );
      }
      filter = { ...filter, remainingUnits: { $gte: amount } };
      update = buildUpdate(
        "remainingUnits",
        amount,
        { claimerId: userId, units: amount, location: claimantLocation, claimedAt: now },
        amount === remaining
      );
      claim = { units: amount, remainingUnits: remaining - amount };
    } else {
      const remaining = Number(donation.remainingKg ?? donation.quantityKg ?? 0);
      const amount = requestedServings == null ? remaining : requestedServings;
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Invalid kg amount" });
      if (amount > remaining) return res.status(400).json({ message: `Only ${remaining} kg remaining` });
      if (donation.remainingKg == null) {
        await Donation.updateOne(
          { _id: donationId, remainingKg: { $exists: false } },
          { $set: { remainingKg: remaining } }
        );
      }
      filter = { ...filter, remainingKg: { $gte: amount } };
      update = buildUpdate(
        "remainingKg",
        amount,
        { claimerId: userId, kg: amount, location: claimantLocation, claimedAt: now },
        amount === remaining
      );
      claim = { kg: amount, remainingKg: Number((remaining - amount).toFixed(2)) };
    }

    const updated = await Donation.findOneAndUpdate(filter, update, { new: true })
      .populate("donorId", "name email location address phone")
      .populate("claimedBy", "name email phone");

    if (!updated) {
      return res.status(409).json({ message: "Unable to claim requested amount (already claimed or insufficient remaining)" });
    }

    await notifyDonationClaimed({
      donor: updated.donorId,
      claimer: updated.claimedBy,
      donation: updated,
      claim: {
        ...claim,
        remainingServings: updated.remainingPeopleServed,
        remainingUnits: updated.remainingUnits,
        remainingKg: updated.remainingKg,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Claim donation error", err);
    res.status(500).json({ message: "Failed to claim donation" });
  }
};

export const getAiSuggestions = async (req, res) => {
  try {
    const requesterLoc = parseLatLng({ lat: req.query?.lat, lng: req.query?.lng });
    // Show "insights" even if donations got claimed quickly.
    // Keep completed out since they are no longer actionable.
    const baseFilter = {
      status: { $in: ["available", "claimed"] },
    };

    const topByImpact = await Donation.find(baseFilter).lean()
      .sort({ impactScore: -1, createdAt: -1 })
      .limit(10);

    const latest = await Donation.find(baseFilter).lean()
      .sort({ createdAt: -1 })
      .limit(10);

    const addDistance = (list) => {
      if (!requesterLoc) return list;
      return list.map((d) => {
        const loc = d?.location;
        const dist =
          loc && loc.lat != null && loc.lng != null
            ? haversineDistanceKm(requesterLoc, loc)
            : null;
        return { ...d, distanceKm: dist != null ? Number(dist.toFixed(2)) : null };
      });
    };

    res.json({
      topImpactDonations: addDistance(topByImpact),
      latestDonations: addDistance(latest),
    });
  } catch (err) {
    console.error("AI suggestions error", err);
    res.status(500).json({ message: "Failed to fetch AI suggestions" });
  }
};
