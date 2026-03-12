const DEFAULT_API_URL = "/api/chat";

function getApiUrl() {
  const cfg = window.OctantCopilotConfig || {};
  return cfg.apiUrl || DEFAULT_API_URL;
}

export async function sendChat(messages) {
  const res = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}
