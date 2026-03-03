import express from "express";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { getBestMatch, getHungerHeatmap, getMatchSuggestions } from "../controllers/aiController.js";
import { analyzeFood, submitFoodAnalysisFeedback } from "../controllers/foodAnalysisController.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/best-match", authenticate, getBestMatch);
router.get("/heatmap", authenticate, getHungerHeatmap);
router.get("/match-suggestions", authenticate, getMatchSuggestions);
router.post("/analyze-food", authenticate, authorizeRoles("donor"), upload.single("image"), analyzeFood);
router.post("/food-feedback", authenticate, authorizeRoles("donor"), submitFoodAnalysisFeedback);

export default router;
