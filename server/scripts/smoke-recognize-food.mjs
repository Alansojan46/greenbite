import axios from "axios";

const serverUrl = String(process.env.SERVER_URL || "http://localhost:5000").replace(/\/+$/, "");
const token = String(process.env.TOKEN || process.env.AUTH_TOKEN || "").trim();
const imageUrl = String(process.env.IMAGE_URL || "").trim();
const preparedAt = process.env.PREPARED_AT ? String(process.env.PREPARED_AT) : undefined;

if (!token) {
  console.error("Missing TOKEN (JWT). Example: set TOKEN=eyJ... and rerun.");
  process.exit(2);
}

if (!imageUrl) {
  console.error("Missing IMAGE_URL. Example: set IMAGE_URL=https://... and rerun.");
  process.exit(2);
}

const url = `${serverUrl}/api/ai/recognize-food`;

try {
  const res = await axios.post(
    url,
    { imageUrl, preparedAt },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
  );
  console.log(JSON.stringify(res.data, null, 2));
} catch (err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  console.error("Request failed:", status || err?.code || err?.message);
  if (data) console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

