import express from "express";
import { authenticate } from "../server/middleware/authMiddleware.js";
import {
  getDonationTrends,
  getDonationForecast,
  getExpiryRisk,
  getNgoPerformance,
} from "./analytics.controller.js";

const router = express.Router();

// All analytics endpoints require auth (additive; does not affect existing routes)
router.get("/donation-trends", authenticate, getDonationTrends);
router.get("/donation-forecast", authenticate, getDonationForecast);
router.get("/expiry-risk", authenticate, getExpiryRisk);
router.get("/ngo-performance", authenticate, getNgoPerformance);

export default router;

