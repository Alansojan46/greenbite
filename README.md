## Greenbite

AI-powered food donation and redistribution platform built on the MERN stack with a Python-based AI microservice.

### Structure

- `server`: Node.js + Express API (auth, donations, AI utilities)
- `client`: React (Vite) frontend with Tailwind, role-based dashboards, Google Maps, and heatmap
- `ai-engine`: Optional FastAPI microservice for impact scoring, spoilage estimation, and matching (enabled via `AI_ENGINE_URL`)

### Setup

1. **Backend**

```bash
cd server
npm install
cp ../.env.example ../.env   # or create .env manually
npm run dev                  # http://localhost:5000
```

2. **Frontend**

```bash
cd client
npm install
npm run dev                  # http://localhost:5173
```

3. **AI Engine**

```bash
cd ai-engine
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### Environment

Create a `.env` in the repo root and fill in:

- `MONGO_URI`
- `JWT_SECRET`
- `CLOUDINARY_*`
- `GOOGLE_MAPS_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY`
- `AI_ENGINE_URL` (optional; when set, the Node server will call the FastAPI AI engine for spoilage/impact/matching with local fallbacks if it’s down)
- Food image analysis (choose one):
  - OpenAI Vision: `FOOD_ANALYSIS_PROVIDER=openai`, `OPENAI_API_KEY`, optional `OPENAI_BASE_URL`, `OPENAI_VISION_MODEL`
  - Ollama Vision (local): `FOOD_ANALYSIS_PROVIDER=ollama`, optional `OLLAMA_URL`, `OLLAMA_VISION_MODEL`
  - Hugging Face: `FOOD_ANALYSIS_PROVIDER=huggingface`, `HF_API_TOKEN`, optional `HF_VISION_MODEL_ID`, `HF_FALLBACK_VISION_MODEL_ID`

Optional (Hugging Face):
- `HF_ENABLE_ZERO_SHOT=true` to enable CLIP zero-shot on the Indian label set (slower, but can help for Indian dishes).
- `FOOD_IMAGE_FETCH_TIMEOUT_MS` / `FOOD_IMAGE_MAX_BYTES` to control server-side imageUrl fetch limits for recognition.

### Food Recognition API

- `POST /api/ai/recognize-food` (auth required; donor role)
  - Accepts either `multipart/form-data` with `image` file **or** JSON body with `imageUrl`
  - Response shape: `{ label, confidence, topK, analyzedAt, model }`

Note: `POST /api/ai/analyze-food` supports an optional `retry=true` (form field) to request an alternate label on the *same image*. Without `retry=true`, re-analyzing the same image will not intentionally avoid the previous correct label.

Smoke check (requires a valid donor JWT):

```bash
cd server
node scripts/smoke-recognize-food.mjs
```

### Food Feedback API

- `POST /api/ai/food-feedback` (auth required; donor role)
  - Body: `{ analysisId, isCorrect, correctedFoodType? }`
  - If `isCorrect=false`, provide `correctedFoodType` (either pick one from `topK` or type a custom label).

Smoke check:

```bash
cd server
node scripts/smoke-food-feedback.mjs
```

The frontend reads `VITE_GOOGLE_MAPS_API_KEY`. The server uses `MONGO_URI`, `JWT_SECRET`, Cloudinary keys, and `AI_ENGINE_URL` if you later wire the Node server to call the AI microservice.

### Location Requirements

- Publishing a donation requires a valid donor `location.lat`/`location.lng` (captured in the browser).
- Donors can either use their current location or pick a location on the map while publishing.
- Claiming a donation requires the claimer’s current `location` in the request body (NGO/regular users). This enables nearest-distance sorting and prevents claims without location.

