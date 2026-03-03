import express from "express";
import { body } from "express-validator";
import {
  createDonation,
  getDonations,
  claimDonation,
  getAiSuggestions,
} from "../controllers/donationController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  upload.single("foodImage"),
  [
    body("foodName").notEmpty().withMessage("Food name is required"),
    body("preparedAt").notEmpty().withMessage("Prepared date/time is required"),
    body("location.lat").isNumeric().withMessage("Latitude required"),
    body("location.lng").isNumeric().withMessage("Longitude required"),
  ],
  createDonation
);

router.get("/", authenticate, getDonations);

router.put("/:id/claim", authenticate, claimDonation);

router.get("/ai-suggestions", authenticate, getAiSuggestions);

export default router;

