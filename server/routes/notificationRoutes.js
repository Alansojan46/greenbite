import express from "express";
import { getMyNotifications, markRead } from "../controllers/notificationController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticate, getMyNotifications);
router.patch("/read", authenticate, markRead);

export default router;
