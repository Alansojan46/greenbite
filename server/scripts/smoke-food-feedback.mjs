import axios from "axios";

const serverUrl = String(process.env.SERVER_URL || "http://localhost:5000").replace(/\/+$/, "");
const token = String(process.env.TOKEN || process.env.AUTH_TOKEN || "").trim();
const analysisId = String(process.env.ANALYSIS_ID || "").trim();
const isCorrect = process.env.IS_CORRECT;
const correctedFoodType = process.env.CORRECTED_FOOD_TYPE;

if (!token) {
  console.error("Missing TOKEN (JWT). Example: set TOKEN=eyJ... and rerun.");
  process.exit(2);
}

if (!analysisId) {
  console.error("Missing ANALYSIS_ID. Example: set ANALYSIS_ID=... and rerun.");
  process.exit(2);
}

if (isCorrect == null) {
  console.error("Missing IS_CORRECT. Example: set IS_CORRECT=true (or false) and rerun.");
  process.exit(2);
}

const url = `${serverUrl}/api/ai/food-feedback`;

try {
  const res = await axios.post(
    url,
    { analysisId, isCorrect, correctedFoodType },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
  );
  console.log(JSON.stringify(res.data, null, 2));
} catch (err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  console.error("Request failed:", status || err?.code || err?.message);
  if (data) console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

