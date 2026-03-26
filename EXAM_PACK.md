# Greenbite Exam Pack (100 Questions + Answers)

This is a comprehensive “exam pack” for the Greenbite project. Each question includes:
- The correct answer
- A short reasoning/explanation
- A code reference (file path + approximate line)

---

## A) Architecture & Data Flow (1–12)

1) **Q:** What are the 3 main runtime components of this project?  
**A:** React client, Node/Express server, optional FastAPI `ai-engine`.  
**Why:** Repo structure + server routes show MERN + Python microservice option.  
**Ref:** `README.md:1`, `server/server.js:34`, `ai-engine/main.py:1`

2) **Q:** What’s the single entrypoint for the backend HTTP server?  
**A:** `server/server.js`.  
**Why:** Express app + `app.listen`.  
**Ref:** `server/server.js:1`

3) **Q:** Where are API routes mounted, and under what base prefixes?  
**A:** Mounted under `/api/*` prefixes.  
**Why:** `app.use("/api/...")`.  
**Ref:** `server/server.js:34`

4) **Q:** Which route is publicly accessible without authentication by default?  
**A:** `/health` is public; many other routes require auth.  
**Why:** `/health` is defined without middleware.  
**Ref:** `server/server.js:30`

5) **Q:** How does the project load environment variables, and what’s a subtle risk?  
**A:** `dotenv.config({ path: "../.env" })` from inside `server/`.  
**Why:** If run with a different working directory/structure, the relative path may break.  
**Ref:** `server/server.js:3`

6) **Q:** What is the project’s DB layer and connection mechanism?  
**A:** Mongoose connects using `MONGO_URI`.  
**Why:** `mongoose.connect` called in `connectDB()`.  
**Ref:** `server/utils/db.js:3`

7) **Q:** Does the server start before or after connecting to MongoDB?  
**A:** After MongoDB connection succeeds.  
**Why:** `connectDB().then(() => app.listen(...))`.  
**Ref:** `server/server.js:54`

8) **Q:** What client-side mechanism attaches auth credentials to API calls?  
**A:** Axios interceptor reads `gb_token` from localStorage and sets `Authorization: Bearer ...`.  
**Why:** `instance.interceptors.request.use`.  
**Ref:** `client/src/services/api.js:7`

9) **Q:** Why can the app work without Cloudinary configured?  
**A:** It falls back to storing images as base64 data URLs.  
**Why:** Both donation upload and AI analysis do inline data URL fallback.  
**Ref:** `server/controllers/donationController.js:84`, `server/controllers/foodAnalysisController.js:245`

10) **Q:** What’s the difference between `ai-engine` usage and local fallback in Node services?  
**A:** If `AI_ENGINE_URL` exists, Node calls FastAPI; otherwise uses local heuristics.  
**Why:** `isAiEngineConfigured()` gating logic.  
**Ref:** `server/services/aiEngineClient.js:18`, `server/services/spoilageService.js:33`

11) **Q:** Where is request logging enabled and at what scope?  
**A:** `morgan("dev")` globally for all routes.  
**Why:** Middleware applied before routes.  
**Ref:** `server/server.js:26`

12) **Q:** What is the project-wide error handling pattern?  
**A:** Controllers often `try/catch`; plus a global Express error handler.  
**Why:** `app.use((err, _req, res, _next) => ...)`.  
**Ref:** `server/server.js:43`

---

## B) Auth, Roles, and Security (13–26)

13) **Q:** How is JWT extracted and validated?  
**A:** From `Authorization: Bearer <token>`, verified with `JWT_SECRET`.  
**Why:** `authenticate` parses header and calls `jwt.verify`.  
**Ref:** `server/middleware/authMiddleware.js:4`

14) **Q:** What user fields are encoded into the JWT?  
**A:** `id` and `role`, expires in 7 days.  
**Why:** `jwt.sign({ id, role }, ..., { expiresIn: "7d" })`.  
**Ref:** `server/controllers/authController.js:5`

15) **Q:** What does `tryAuthenticate` do differently from `authenticate`?  
**A:** Optional auth: attaches `req.user` if token valid, never blocks.  
**Why:** It calls `next()` even if missing/invalid token.  
**Ref:** `server/middleware/authMiddleware.js:27`

16) **Q:** Where is role-based authorization enforced for AI endpoints?  
**A:** AI routes use `authorizeRoles("donor")` for analyzer endpoints.  
**Why:** Middleware added at route definition.  
**Ref:** `server/routes/aiRoutes.js:12`

17) **Q:** What’s the consequence of missing `JWT_SECRET` at runtime?  
**A:** All authenticated endpoints will fail with token verification error.  
**Why:** `jwt.verify(token, process.env.JWT_SECRET)` throws.  
**Ref:** `server/middleware/authMiddleware.js:14`

18) **Q:** What password security mechanism is used?  
**A:** Bcrypt hashing in a Mongoose pre-save hook.  
**Why:** `bcrypt.genSalt(10)` + `bcrypt.hash`.  
**Ref:** `server/models/User.js:29`

19) **Q:** What’s the minimum password length enforced at API validation time?  
**A:** 6 characters.  
**Why:** `isLength({ min: 6 })`.  
**Ref:** `server/routes/authRoutes.js:12`

20) **Q (trick):** Does `Notification` have an `updatedAt` timestamp?  
**A:** No, only `createdAt` is configured in timestamps.  
**Why:** Schema uses `{ timestamps: { createdAt: "createdAt" } }`.  
**Ref:** `server/models/Notification.js:19`

21) **Q:** What prevents non-image uploads to analyzer endpoints?  
**A:** Multer fileFilter restricts to `mimetype` starting with `image/`.  
**Why:** `fileFilter` checks `file.mimetype.startsWith("image/")`.  
**Ref:** `server/middleware/uploadMiddleware.js:11`

22) **Q:** What’s the maximum upload size for images via multer?  
**A:** 5MB.  
**Why:** `limits.fileSize = 5 * 1024 * 1024`.  
**Ref:** `server/middleware/uploadMiddleware.js:8`

23) **Q:** Is there any server-side rate limiting?  
**A:** No.  
**Why:** No rate-limit middleware or dependency present.  
**Ref:** `server/package.json:8`, `server/server.js:20`

24) **Q (trick):** Are donor-only actions fully enforced on the backend?  
**A:** Yes for analyzer routes; donation creation is auth-only (not role-restricted).  
**Why:** Donations require `authenticate` but not `authorizeRoles`.  
**Ref:** `server/routes/donationRoutes.js:14`

25) **Q:** What’s the primary auth storage on client?  
**A:** `gb_token` and `gb_user` in localStorage.  
**Why:** `AuthContext` reads/writes these keys.  
**Ref:** `client/src/context/AuthContext.jsx:13`

26) **Q (trick):** Can unauthenticated users access chat?  
**A:** Yes, chat POST uses `tryAuthenticate`, not `authenticate`.  
**Why:** Chat is optional-auth.  
**Ref:** `server/routes/chatRoutes.js:8`

---

## C) Donation Creation & Claiming (27–44)

27) **Q:** What validation happens before creating a donation?  
**A:** Validates `foodName`, `preparedAt`, `location.lat`, `location.lng`.  
**Why:** express-validator rules in the router.  
**Ref:** `server/routes/donationRoutes.js:14`

28) **Q:** Where is donation image uploaded/processed?  
**A:** In `createDonation` controller via Cloudinary or data URL fallback.  
**Why:** Cloudinary upload_stream or base64 fallback.  
**Ref:** `server/controllers/donationController.js:52`

29) **Q:** How is `location` parsed in `createDonation` and what edge case does it handle?  
**A:** Supports `location` object or flattened `location.lat`/`location.lng`.  
**Why:** Controller checks both styles.  
**Ref:** `server/controllers/donationController.js:30`

30) **Q:** What spoilage score source is used for donations?  
**A:** `estimateSpoilageRisk` (AI engine first, local fallback).  
**Why:** Called during donation creation.  
**Ref:** `server/controllers/donationController.js:94`, `server/services/spoilageService.js:33`

31) **Q:** What impact score source is used?  
**A:** `calculateImpactScore` (AI engine first, local fallback).  
**Why:** Called during donation creation.  
**Ref:** `server/controllers/donationController.js:102`, `server/services/impactService.js:17`

32) **Q:** How does donation claim support partial claiming?  
**A:** Tracks remaining amounts and appends to `claims[]`.  
**Why:** Atomic decrement + claims history.  
**Ref:** `server/models/Donation.js:17`, `server/controllers/donationController.js:151`

33) **Q (trick):** What request body field is used to indicate claim amount?  
**A:** `amount`.  
**Why:** Controller reads `req.body.amount`.  
**Ref:** `server/controllers/donationController.js:159`

34) **Q (trick):** Why is the variable name `requestedServings` potentially misleading?  
**A:** It’s reused for units and kg modes too.  
**Why:** Same variable flows through all branches.  
**Ref:** `server/controllers/donationController.js:156`

35) **Q:** How does the system reduce race conditions in claims?  
**A:** Uses conditional `findOneAndUpdate` on remaining fields.  
**Why:** Filter checks `>= amount`.  
**Ref:** `server/controllers/donationController.js:151`

36) **Q:** When does a donation status become `claimed` vs remain `available`?  
**A:** If the claim consumes full remaining amount → `claimed`, else `available`.  
**Why:** `setStatusToClaimed` uses `amount === remaining`.  
**Ref:** `server/controllers/donationController.js:207`

37) **Q:** Who gets notified when a donation is posted?  
**A:** All `regular` + `ngo` users excluding the donor.  
**Why:** Recipient query excludes donorId.  
**Ref:** `server/services/notificationService.js:46`

38) **Q:** Who gets notified when a donation is claimed?  
**A:** The donor.  
**Why:** Notification created for donor userId.  
**Ref:** `server/services/notificationService.js:20`

39) **Q:** What’s the maximum number of notifications returned?  
**A:** 50.  
**Why:** `.limit(50)`.  
**Ref:** `server/controllers/notificationController.js:7`

40) **Q:** What’s the client-side condition for showing “claim” capability?  
**A:** Only NGO or regular can claim.  
**Why:** Role gating logic.  
**Ref:** `client/src/pages/DonationFeed.jsx:49`

41) **Q (trick):** Does the donation feed filter out claimed donations by default?  
**A:** No, it calls `/donations` without filters.  
**Why:** `api.get("/donations")`.  
**Ref:** `client/src/pages/DonationFeed.jsx:18`

42) **Q:** How is donation details deep-linked on the feed?  
**A:** URL query param `donationId`.  
**Why:** Search params logic.  
**Ref:** `client/src/pages/DonationFeed.jsx:72`

43) **Q:** How does AI insights obtain its two lists?  
**A:** Server returns `topImpactDonations` and `latestDonations`.  
**Why:** `/donations/ai-suggestions` response shape.  
**Ref:** `server/controllers/donationController.js:301`, `client/src/pages/AIInsightsPage.jsx:20`

44) **Q (trick):** Does AI insights ranking come from the AI engine?  
**A:** No, it’s DB sorting by `impactScore` then `createdAt`.  
**Why:** Server sorts directly on Mongo results.  
**Ref:** `server/controllers/donationController.js:312`

---

## D) AI Analyzer & Food Recognition (45–70)

45) **Q:** Which endpoint runs full analyzer report?  
**A:** `POST /api/ai/analyze-food`.  
**Why:** Route maps to analyzer controller.  
**Ref:** `server/routes/aiRoutes.js:13`, `server/controllers/foodAnalysisController.js:196`

46) **Q:** Which endpoint runs recognition-only output?  
**A:** `POST /api/ai/recognize-food`.  
**Why:** Route exists for recognition.  
**Ref:** `server/routes/aiRoutes.js:12`, `server/controllers/foodAnalysisController.js:316`

47) **Q:** What are the possible providers for vision analysis?  
**A:** `ollama`, `openai`, `huggingface`, or `auto`.  
**Why:** Provider selection uses env.  
**Ref:** `server/services/aiService.js:5`, `server/services/aiService.js:943`

48) **Q:** How does the analyzer compute calibrated confidence?  
**A:** Uses top-1/top-2 gap + provider dampening.  
**Why:** `computeCalibratedConfidence` logic.  
**Ref:** `server/services/aiService.js:140`

49) **Q:** How does the analyzer canonicalize dish labels?  
**A:** Keyword buckets + Indian dish exceptions.  
**Why:** `canonicalizeFoodType`.  
**Ref:** `server/services/aiService.js:169`

50) **Q:** What freshness thresholds are used?  
**A:** Rice 6h, Curry 5h, Bread 24h, Cooked meal 8h.  
**Why:** `thresholdsHours`.  
**Ref:** `server/services/aiService.js:279`

51) **Q:** How is urgency derived from freshness?  
**A:** High→5, Medium→3, Low→1.  
**Why:** `urgencyFromRisk`.  
**Ref:** `server/services/aiService.js:299`

52) **Q:** Why can estimated servings change with image size?  
**A:** Heuristic scales by file size buckets.  
**Why:** `estimateServingsHeuristic`.  
**Ref:** `server/services/aiService.js:251`

53) **Q (trick):** What does `retry=true` do for `analyze-food`?  
**A:** Avoids repeating prior labels for the same image hash (retry mode).  
**Why:** `avoidLabels` logic is gated by retry.  
**Ref:** `server/controllers/foodAnalysisController.js:203`

54) **Q:** Where is the image hash computed for AI analysis?  
**A:** SHA-256 over file buffer.  
**Why:** `computeImageHash`.  
**Ref:** `server/controllers/foodAnalysisController.js:44`

55) **Q:** What gets persisted for each analysis?  
**A:** `foodType`, confidence, candidates, rawLabel/rawScore, imageHash, modelId, etc.  
**Why:** `FoodAnalysis.create`.  
**Ref:** `server/controllers/foodAnalysisController.js:279`, `server/models/FoodAnalysis.js:3`

56) **Q:** Which HF vision model is the default?  
**A:** `VinnyVortex004/Food101-Classifier`.  
**Why:** `pickHfModel()` default.  
**Ref:** `server/services/aiService.js:55`

57) **Q:** What enables CLIP zero-shot mode?  
**A:** `HF_ENABLE_ZERO_SHOT=true`.  
**Why:** `isZeroShotEnabled()`.  
**Ref:** `server/services/aiService.js:67`

58) **Q:** What are the default zero-shot labels?  
**A:** A hardcoded Indian + generic food list.  
**Why:** `pickIndianLabelSet()`.  
**Ref:** `server/services/aiService.js:338`

59) **Q:** How are HF inference failures handled?  
**A:** Timeouts + retries + mapped errors (401/403/404/429/loading).  
**Why:** Retry loop and status checks.  
**Ref:** `server/services/aiService.js:591`

60) **Q (trick):** Why can confidence be low even when label becomes correct after feedback?  
**A:** Label may be feedback-backed; model confidence is independent.  
**Why:** Feedback override paths.  
**Ref:** `server/controllers/foodAnalysisController.js:255`, `server/services/aiService.js:936`

61) **Q:** What does the analyzer UI send to the backend?  
**A:** `multipart/form-data` with `image` and optional `preparedAt`.  
**Why:** `FormData` usage.  
**Ref:** `client/src/components/FoodAIAnalyzer.jsx:66`

62) **Q:** How does UI select a corrected label?  
**A:** Dropdown sets `selectedLabel`; button applies and posts feedback.  
**Why:** Button handler.  
**Ref:** `client/src/components/FoodAIAnalyzer.jsx:268`

63) **Q:** What does “Yes” feedback do?  
**A:** Posts `{ isCorrect: true }` for `analysisId`.  
**Why:** Calls feedback endpoint with `isCorrect=true`.  
**Ref:** `client/src/components/FoodAIAnalyzer.jsx:300`

64) **Q:** What does “Save this correction” do?  
**A:** Posts `{ isCorrect: false, correctedFoodType }`.  
**Why:** Correction handler sends fields.  
**Ref:** `client/src/components/FoodAIAnalyzer.jsx:333`

65) **Q:** Why does “Use this label” now update donation form correctly?  
**A:** Parent pages now overwrite foodName from analyzer result when applying.  
**Why:** `foodName: r?.foodType ? r.foodType : p.foodName`.  
**Ref:** `client/src/pages/AddDonationPage.jsx:192`, `client/src/pages/DonorDashboard.jsx:295`

66) **Q:** Where are confidence source and boosts set for feedback runs?  
**A:** Image-hash: controller sets; mapping: aiService sets.  
**Why:** Two distinct feedback application mechanisms.  
**Ref:** `server/controllers/foodAnalysisController.js:255`, `server/services/aiService.js:1145`

67) **Q:** What prevents `recognize-food` from accepting non-http imageUrl?  
**A:** `imageUrl` must start with `http(s)`.  
**Why:** Validation in fetch helper.  
**Ref:** `server/controllers/foodAnalysisController.js:85`

68) **Q:** What controls server-side `imageUrl` fetch limits?  
**A:** `FOOD_IMAGE_FETCH_TIMEOUT_MS`, `FOOD_IMAGE_MAX_BYTES`.  
**Why:** Helper pickers.  
**Ref:** `server/controllers/foodAnalysisController.js:44`

69) **Q (trick):** Why is `recognize-food` restricted to donors?  
**A:** Route uses `authorizeRoles("donor")`.  
**Why:** Middleware on route.  
**Ref:** `server/routes/aiRoutes.js:12`

70) **Q:** Where is “double-pass” controlled?  
**A:** `FOOD_ANALYSIS_DOUBLE_PASS`.  
**Why:** `isDoublePassEnabled()`.  
**Ref:** `server/services/aiService.js:8`

---

## E) Feedback Loop & “Learning” (71–84)

71) **Q:** What is the feedback endpoint and required fields?  
**A:** `POST /api/ai/food-feedback` requires `analysisId` and `isCorrect` (or legacy correction).  
**Why:** Controller validations.  
**Ref:** `server/routes/aiRoutes.js:14`, `server/controllers/foodAnalysisController.js:375`

72) **Q:** How does backend ensure users can only update their own analysis?  
**A:** Filters by `{ _id, donorId: req.user._id }`.  
**Why:** Query includes donorId.  
**Ref:** `server/controllers/foodAnalysisController.js:403`

73) **Q:** What’s stored when user says “No” and types a label?  
**A:** `userCorrectedFoodType`, raw input, source, `isPredictionCorrect=false`.  
**Why:** Update patch.  
**Ref:** `server/controllers/foodAnalysisController.js:448`, `server/models/FoodAnalysis.js:36`

74) **Q:** How does system decide source is “topk” vs “custom”?  
**A:** Checks if corrected label matches one of stored candidates.  
**Why:** Case-insensitive `inTopK` logic.  
**Ref:** `server/controllers/foodAnalysisController.js:427`

75) **Q:** How does the system “learn” without retraining?  
**A:** Builds per-user `rawLabel -> most common corrected label` mapping from last 200 feedback docs.  
**Why:** Override builder.  
**Ref:** `server/controllers/foodAnalysisController.js:129`

76) **Q (trick):** What wins: mapping or exact imageHash correction?  
**A:** Image-hash correction wins and forces `feedback_imagehash`.  
**Why:** Applied after report generation.  
**Ref:** `server/controllers/foodAnalysisController.js:255`

77) **Q:** How is feedback-mapping confidence set to 80–95%?  
**A:** Starts at 80 and increases by +5 per extra evidence up to 95.  
**Why:** Policy in `pickFeedbackConfidence`.  
**Ref:** `server/services/aiService.js:1184`

78) **Q:** What confidence is used for same-image corrected runs?  
**A:** Fixed 92%.  
**Why:** Controller confidence policy.  
**Ref:** `server/controllers/foodAnalysisController.js:182`

79) **Q:** Where is user correction input sanitized?  
**A:** `sanitizeFoodLabel()` trims, collapses whitespace, limits length.  
**Why:** Helper enforces constraints.  
**Ref:** `server/controllers/foodAnalysisController.js:116`

80) **Q (trick):** Why might boosting still not apply?  
**A:** No analysisId, no saved correction for that imageHash, or no mapping evidence for rawLabel.  
**Why:** Boost triggers only with feedback evidence.  
**Ref:** `server/controllers/foodAnalysisController.js:255`

81) **Q:** What backward compatibility exists for `{ correctFoodType }`?  
**A:** Treated as correction for incorrect prediction.  
**Why:** Legacy field mapping.  
**Ref:** `server/controllers/foodAnalysisController.js:382`

82) **Q:** Does “Yes” store corrected label?  
**A:** No; it clears correction fields and sets `isPredictionCorrect=true`.  
**Why:** Patch clears corrected fields.  
**Ref:** `server/controllers/foodAnalysisController.js:440`

83) **Q:** Where are feedback fields defined?  
**A:** `FoodAnalysis` schema includes correctness + corrected label metadata.  
**Why:** Schema fields.  
**Ref:** `server/models/FoodAnalysis.js:36`

84) **Q (trick):** Is learning global across all users?  
**A:** No, it’s per-user (filtered by donorId).  
**Why:** Override builder query uses donorId.  
**Ref:** `server/controllers/foodAnalysisController.js:129`

---

## F) Matching & Heatmap (85–92)

85) **Q:** What endpoint returns heatmap points to the frontend?  
**A:** `GET /api/ai/heatmap`.  
**Why:** Client calls it; route exists.  
**Ref:** `client/src/pages/HeatmapPage.jsx:9`, `server/routes/aiRoutes.js:10`

86) **Q:** How are heatmap weights computed?  
**A:** Based on `impactScore`, scaled if donation is completed.  
**Why:** Weight uses `(impactScore||10)/(completed?2:1)`.  
**Ref:** `server/controllers/aiController.js:33`

87) **Q:** What is the primary matching API for claim flow?  
**A:** `GET /api/ai/match-suggestions`.  
**Why:** Claim flow calls it with query params.  
**Ref:** `server/routes/aiRoutes.js:11`, `client/src/pages/ClaimFlowPage.jsx:60`

88) **Q:** What local scoring formula is used when AI engine is down?  
**A:** `impact + response + partialClaimBoost + urgency*10 - distance*2 - spoilage`.  
**Why:** Local match scoring.  
**Ref:** `server/services/matchingService.js:66`

89) **Q:** How does the matcher avoid too-small donations?  
**A:** Filters by available quantity relative to requirement (0.5 best-match, 0.2 multi-match).  
**Why:** Different thresholds.  
**Ref:** `server/services/matchingService.js:56`, `server/services/matchingService.js:146`

90) **Q (trick):** Does Python AI engine mirror Node scoring exactly?  
**A:** Not exactly; Node has `partialClaimBoost` concept.  
**Why:** Python scoring doesn’t model partial claims.  
**Ref:** `ai-engine/matching_algorithm.py:37`, `server/services/matchingService.js:155`

91) **Q:** How is `AI_ENGINE_URL` normalized?  
**A:** Trailing slashes removed.  
**Why:** `.replace(/\/+$/, "")`.  
**Ref:** `server/services/aiEngineClient.js:5`

92) **Q:** What’s the max AI engine payload size via axios?  
**A:** 512KB.  
**Why:** `maxContentLength/maxBodyLength`.  
**Ref:** `server/services/aiEngineClient.js:19`

---

## G) Analytics (93–97)

93) **Q:** Which operator groups donation trends by day/week/month?  
**A:** `$dateTrunc`.  
**Why:** Aggregation uses it.  
**Ref:** `server/analytics/analytics.service.js:18`

94) **Q:** How is “expiry risk” computed?  
**A:** Buckets `spoilageRisk` as a proxy.  
**Why:** `$bucket` on spoilageRisk.  
**Ref:** `server/analytics/analytics.service.js:49`

95) **Q:** How is NGO performance computed?  
**A:** Aggregates `Donation.claims[]` and joins users.  
**Why:** `$unwind` + `$lookup` + group.  
**Ref:** `server/analytics/analytics.service.js:92`

96) **Q:** What forecasting approach is used?  
**A:** Simple moving average.  
**Why:** `predictDonationVolume` averages history.  
**Ref:** `server/services/aiAnalytics.service.js:32`

97) **Q (trick):** Why might forecast be misleading?  
**A:** No trend/seasonality; sparse history averages to low values.  
**Why:** Straight average of last N.  
**Ref:** `server/services/aiAnalytics.service.js:32`

---

## H) Chatbot / LLM Integration (98–100)

98) **Q:** Which two LLM providers can backend use and in what order?  
**A:** Ollama first, then OpenAI-compatible, then static fallback.  
**Why:** Implementation order in `chatWithAssistant`.  
**Ref:** `server/services/llmService.js:122`

99) **Q (trick):** How are unsafe navigation actions prevented?  
**A:** Sanitizes actions to an allowlist of paths.  
**Why:** `allowedPaths` + `sanitizeAssistantOutput`.  
**Ref:** `server/services/llmService.js:78`

100) **Q:** Why does chat accept unauthenticated requests but sometimes includes user context?  
**A:** Uses `tryAuthenticate` to attach user if token exists.  
**Why:** Optional-auth route and context mapping.  
**Ref:** `server/routes/chatRoutes.js:8`, `server/controllers/chatController.js:24`

---

## Top 20 Critical Issues / Improvement Opportunities (with short fixes)

1) Dotenv path fragility → Use `path.resolve` to repo root or load `.env` from process CWD. (`server/server.js:3`)  
2) No rate limiting → Add `express-rate-limit` (auth/analyzer/chat). (`server/server.js:20`)  
3) In-memory uploads → Consider streaming/disk storage. (`server/middleware/uploadMiddleware.js:3`)  
4) Misleading `requestedServings` naming → rename to `requestedAmount`. (`server/controllers/donationController.js:156`)  
5) Donation feed loads all statuses → server-side default filter. (`client/src/pages/DonationFeed.jsx:18`)  
6) Notification schema has no `updatedAt` → enable full timestamps. (`server/models/Notification.js:19`)  
7) Feedback learning is per-user only → optional global mapping with review. (`server/controllers/foodAnalysisController.js:129`)  
8) Confidence boosting is policy-based → document and make explicit. (`server/services/aiService.js:1184`)  
9) Base64 image fallback can bloat → require Cloudinary in prod. (`server/controllers/donationController.js:84`)  
10) Anonymous chat abuse risk → require auth or throttle. (`server/routes/chatRoutes.js:8`)  
11) Open CORS policy → restrict origins. (`server/server.js:24`)  
12) JSON body size limit not set → configure `express.json({ limit })`. (`server/server.js:25`)  
13) AI engine timeouts low → make tunable per endpoint. (`server/services/aiEngineClient.js:9`)  
14) Canonicalization may lose detail → store raw + canonical separately. (`server/services/aiService.js:169`)  
15) `$dateTrunc` version requirement → document MongoDB minimum. (`server/analytics/analytics.service.js:18`)  
16) No tests → add integration tests. (repo-wide)  
17) Hardcoded response speed score → compute or remove. (`server/services/matchingService.js:43`)  
18) “AI insights” is just sorting → rename or implement ranking. (`server/controllers/donationController.js:301`)  
19) Legacy `correctFoodType` supported → deprecate gradually. (`server/controllers/foodAnalysisController.js:382`)  
20) Client user state can be stale → add `/me` endpoint rehydrate. (`client/src/context/AuthContext.jsx:13`)

