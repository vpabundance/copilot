import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

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

// Import the API handler logic inline (since it's an ESM default export for Vercel)
const SYSTEM_PROMPT = `You are an Octant donation copilot. Octant (octant.app) is a platform for funding public goods with multiple funding mechanisms:
- Epoch rounds: periodic quadratic funding rounds
- Continuous/streaming funding: ongoing funding streams
- One-off rounds: single special funding events

When a user describes their interests, use web search to find current and recent projects on octant.app across all active rounds and funding types. Be conversational and warm. For follow-up messages, use the conversation history to refine your recommendations.

Always respond with a raw JSON object (no markdown, no backticks) with:
- "reply": short friendly message (1-2 sentences)
- "projects": array of 3-5 project objects, each with:
    - "name": project name
    - "description": 1-2 sentence description
    - "fundingType": e.g. "Epoch round", "Continuous streaming", "One-off round"
    - "round": round name/number if applicable
    - "matchReason": one sentence on why it matches the user's interests
    - "url": direct link on octant.app, or "https://octant.app/explore"

Return ONLY raw JSON. No markdown, no backticks, no preamble.`;

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

    const input = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          tools: [{ type: "web_search_preview" }],
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

  // Static files: serve demo/index.html at root, and dist/widget.js
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
