import express from "express";
import { chat, chatStatus } from "../controllers/chatController.js";
import { tryAuthenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/status", chatStatus);
router.post("/", tryAuthenticate, chat);

export default router;
