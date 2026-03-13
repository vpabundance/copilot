import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { fetchOctantData, buildSystemPrompt } from "./api/octant.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Load .env file
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        process.env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
      }
    }
  }
}

// Cache Octant data for 5 minutes
let cachedData = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getOctantContext() {
  const now = Date.now();
  if (cachedData && now - cacheTime < CACHE_TTL) {
    return cachedData;
  }
  console.log("Fetching fresh Octant project data...");
  cachedData = await fetchOctantData();
  cacheTime = now;
  console.log(`Loaded ${cachedData.projects.length} projects from epochs up to ${cachedData.currentEpoch}`);
  return cachedData;
}

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

const PORT = 3000;

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  // API route
  if (req.url === "/api/chat" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "OPENAI_API_KEY not configured" }));
    }

    let messages;
    try {
      messages = JSON.parse(body).messages;
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid JSON" }));
    }

    try {
      // Fetch real Octant project data and build dynamic prompt
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
        res.writeHead(502, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Upstream API error" }));
      }

      const data = await response.json();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(data));
    } catch (err) {
      console.error("API proxy error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  // Static files
  let filePath;
  if (req.url === "/" || req.url === "/index.html") {
    filePath = join(__dirname, "demo", "index.html");
  } else if (req.url === "/widget.js") {
    filePath = join(__dirname, "dist", "widget.js");
  } else {
    filePath = join(__dirname, "dist", req.url);
  }

  if (existsSync(filePath)) {
    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    return res.end(readFileSync(filePath));
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
