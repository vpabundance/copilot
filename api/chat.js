import { fetchOctantData, buildSystemPrompt } from "./octant.js";

// Cache Octant data for 5 minutes to avoid hitting their API on every chat message
let cachedData = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getOctantContext() {
  const now = Date.now();
  if (cachedData && now - cacheTime < CACHE_TTL) {
    return cachedData;
  }
  cachedData = await fetchOctantData();
  cacheTime = now;
  return cachedData;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  try {
    // Fetch real Octant project data
    const octantData = await getOctantContext();
    const systemPrompt = buildSystemPrompt(octantData);

    const input = [{ role: "system", content: systemPrompt }, ...messages];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        input,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", response.status, errText);
      return res.status(502).json({ error: "Upstream API error" });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("API proxy error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
