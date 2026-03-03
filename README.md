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

The frontend reads `VITE_GOOGLE_MAPS_API_KEY`. The server uses `MONGO_URI`, `JWT_SECRET`, Cloudinary keys, and `AI_ENGINE_URL` if you later wire the Node server to call the AI microservice.

