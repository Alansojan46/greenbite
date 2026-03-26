import dotenv from "dotenv";

dotenv.config({
  path: "../.env"
});
import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import analyticsRoutes from "./analytics/analytics.routes.js";

import { connectDB } from "./utils/db.js";

// Load env from project root (one level above /server)

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const shouldLogHttp = () => {
  const v = String(process.env.HTTP_LOGS ?? "true").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
};

// Keep dev logs useful: skip frequent polling + cache hits.
const skipHttpLog = (req, res) => {
  const path = String(req?.originalUrl || req?.url || "");
  if (res?.statusCode === 304) return true;
  if (path.startsWith("/api/notifications")) return true;
  if (path.startsWith("/api/donations?donor=me")) return true;
  return false;
};

if (shouldLogHttp()) {
  app.use(morgan("dev", { skip: skipHttpLog }));
}

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "greenbite-server" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/analytics", analyticsRoutes);

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Error:", err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Server error",
  });
});

const PORT = process.env.PORT || 5000;

// Start server after DB connection
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Greenbite server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
console.log("PROVIDER:", process.env.FOOD_ANALYSIS_PROVIDER);
console.log("HF TOKEN:", process.env.HF_API_TOKEN);
