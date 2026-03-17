import { escHtml, getFundingBadge, autoResize } from "./utils.js";
import { sendChat } from "./api.js";

const WELCOME = "Hi! I'm the Octant Copilot. Tell me what causes or technologies you care about, and I'll find projects you can support.";

const CHIPS = [
  "Open source & dev tools",
  "Climate & environment",
  "Ethereum ecosystem",
  "Education & public goods",
];

const HEADER_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="#00d4aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/>
</svg>`;

const SEND_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
</svg>`;

const CLOSE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
</svg>`;

const MINIMIZE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>
</svg>`;

const EXPAND_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
</svg>`;

export function createPanel(onClose, { onToggleMode } = {}) {
  const history = [];
  let isLoading = false;

  const panel = document.createElement("div");
  panel.className = "oc-panel";

  const toggleBtn = onToggleMode
    ? `<button class="oc-expand-btn" aria-label="Expand">${EXPAND_ICON}</button>`
    : "";

  panel.innerHTML = `
    <div class="oc-header">
      <div class="oc-header-icon">${HEADER_ICON}</div>
      <div class="oc-header-text">
        <p class="oc-header-title">Octant Copilot</p>
        <p class="oc-header-sub">Find projects to support</p>
      </div>
      ${toggleBtn}
      <button class="oc-close-btn" aria-label="Close">${CLOSE_ICON}</button>
    </div>
    <div class="oc-messages"></div>
    <div class="oc-input-row">
      <textarea class="oc-textarea" rows="1" placeholder="What causes do you care about?"></textarea>
      <button class="oc-send-btn" aria-label="Send">${SEND_ICON}</button>
    </div>
    <div class="oc-footer">Powered by ChatGPT + live Octant data</div>
  `;

  const messagesEl = panel.querySelector(".oc-messages");
  const textarea = panel.querySelector(".oc-textarea");
  const sendBtn = panel.querySelector(".oc-send-btn");
  const closeBtn = panel.querySelector(".oc-close-btn");

  closeBtn.addEventListener("click", onClose);

  const expandBtn = panel.querySelector(".oc-expand-btn");
  if (expandBtn && onToggleMode) {
    expandBtn.addEventListener("click", () => onToggleMode());
  }

  function addBotMessage(text) {
    const msg = document.createElement("div");
    msg.className = "oc-msg oc-msg-bot";
    msg.textContent = text;
    messagesEl.appendChild(msg);
    scrollDown();
  }

  function addUserMessage(text) {
    const msg = document.createElement("div");
    msg.className = "oc-msg oc-msg-user";
    msg.textContent = text;
    messagesEl.appendChild(msg);
    scrollDown();
  }

  function addChips() {
    const wrap = document.createElement("div");
    wrap.className = "oc-chips";
    CHIPS.forEach((label) => {
      const chip = document.createElement("button");
      chip.className = "oc-chip";
      chip.textContent = label;
      chip.addEventListener("click", () => {
        wrap.remove();
        handleSend(label);
      });
      wrap.appendChild(chip);
    });
    messagesEl.appendChild(wrap);
    scrollDown();
  }

  function showTyping() {
    const el = document.createElement("div");
    el.className = "oc-typing";
    el.id = "oc-typing";
    el.innerHTML = '<div class="oc-dot"></div><div class="oc-dot"></div><div class="oc-dot"></div>';
    messagesEl.appendChild(el);
    scrollDown();
  }

  function hideTyping() {
    const el = document.getElementById("oc-typing");
    if (el) el.remove();
  }

  function addProjectCard(project) {
    const badge = getFundingBadge(project.fundingType);
    const fundingInfo = project.matched
      ? `<div class="oc-card-funding"><strong>Matched:</strong> ${Number(project.matched).toFixed(2)} ETH · <strong>Allocated:</strong> ${Number(project.allocated).toFixed(2)} ETH</div>`
      : "";
    const card = document.createElement("div");
    card.className = "oc-card";
    card.innerHTML = `
      <div class="oc-card-name">${escHtml(project.name)}</div>
      <div class="oc-card-desc">${escHtml(project.description)}</div>
      ${fundingInfo}
      <div class="oc-card-match"><strong>Why it matches:</strong> ${escHtml(project.matchReason)}</div>
      <div class="oc-card-footer">
        <span class="oc-badge" style="background:${badge.bg};color:${badge.text};border-color:${badge.border}">
          ${escHtml(project.fundingType)}${project.round ? " · " + escHtml(project.round) : ""}
        </span>
        <a class="oc-card-link" href="${escHtml(project.url)}" target="_blank" rel="noopener">View on Octant →</a>
      </div>
    `;
    messagesEl.appendChild(card);
    scrollDown();
  }

  function scrollDown() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  async function handleSend(text) {
    const msg = text || textarea.value.trim();
    if (!msg || isLoading) return;

    textarea.value = "";
    autoResize(textarea);
    addUserMessage(msg);

    history.push({ role: "user", content: msg });
    isLoading = true;
    showTyping();

    try {
      const data = await sendChat(history);
      hideTyping();

      const parsed = parseResponse(data);
      if (parsed.reply) {
        addBotMessage(parsed.reply);
        history.push({ role: "assistant", content: parsed.reply });
      }
      if (parsed.projects && parsed.projects.length) {
        parsed.projects.forEach(addProjectCard);
      }
    } catch (err) {
      hideTyping();
      addBotMessage("Sorry, something went wrong. Please try again.");
      console.error("[OctantCopilot]", err);
    }

    isLoading = false;
  }

  function parseResponse(data) {
    // OpenAI Responses API: extract text from output_text or output array
    let raw = "";

    if (data.output_text) {
      raw = data.output_text;
    } else if (data.output) {
      const msgItems = data.output.filter((o) => o.type === "message");
      for (const msg of msgItems) {
        if (msg.content) {
          for (const block of msg.content) {
            if (block.type === "output_text") raw += block.text;
          }
        }
      }
    }

    if (raw) {
      // Strip markdown code fences if present
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      try {
        return JSON.parse(raw);
      } catch {
        return { reply: raw, projects: [] };
      }
    }

    if (data.reply) return data;
    return { reply: "I couldn't parse the response. Please try again.", projects: [] };
  }

  textarea.addEventListener("input", () => autoResize(textarea));
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  sendBtn.addEventListener("click", () => handleSend());

  // Init welcome
  addBotMessage(WELCOME);
  addChips();

  return {
    el: panel,
    open() { panel.classList.add("oc-open"); textarea.focus(); },
    close() { panel.classList.remove("oc-open"); },
    isOpen() { return panel.classList.contains("oc-open"); },
    setExpandIcon(isInline) {
      const btn = panel.querySelector(".oc-expand-btn");
      if (btn) btn.innerHTML = isInline ? MINIMIZE_ICON : EXPAND_ICON;
    },
  };
}
