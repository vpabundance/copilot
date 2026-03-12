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

  // Build input array with system instruction + conversation history
  const input = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

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
      return res.status(502).json({ error: "Upstream API error" });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("API proxy error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
