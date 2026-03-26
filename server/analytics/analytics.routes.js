import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  getDonationTrends,
  getDonationForecast,
  getExpiryRisk,
  getNgoPerformance,
} from "./analytics.controller.js";

const router = express.Router();

// Additive analytics endpoints (does not change existing API behavior)
router.get("/donation-trends", authenticate, getDonationTrends);
router.get("/donation-forecast", authenticate, getDonationForecast);
router.get("/expiry-risk", authenticate, getExpiryRisk);
router.get("/ngo-performance", authenticate, getNgoPerformance);

export default router;

