const CSS = `
.oc-launcher {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #1a1a2e;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  transition: transform 0.2s ease;
  z-index: 2147483646;
  padding: 0;
}
.oc-launcher:hover {
  transform: scale(1.08);
}
.oc-launcher svg {
  width: 28px;
  height: 28px;
}

.oc-panel {
  position: fixed;
  bottom: 92px;
  right: 24px;
  width: 370px;
  max-height: 580px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2147483646;
  opacity: 0;
  transform: translateY(16px) scale(0.96);
  pointer-events: none;
  transition: opacity 0.3s cubic-bezier(.34,1.56,.64,1),
              transform 0.3s cubic-bezier(.34,1.56,.64,1);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.oc-panel.oc-open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.oc-header {
  background: #1a1a2e;
  color: #fff;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.oc-header-icon {
  width: 32px;
  height: 32px;
  background: rgba(0,212,170,0.15);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.oc-header-icon svg {
  width: 18px;
  height: 18px;
}
.oc-header-text {
  flex: 1;
}
.oc-header-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
}
.oc-header-sub {
  font-size: 11px;
  opacity: 0.7;
  margin: 0;
  line-height: 1.3;
}
.oc-close-btn {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.oc-close-btn:hover {
  background: rgba(255,255,255,0.1);
}

.oc-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.oc-msg {
  max-width: 88%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.5;
  word-wrap: break-word;
}
.oc-msg-bot {
  align-self: flex-start;
  background: #f4f4f5;
  color: #1a1a2e;
  border-bottom-left-radius: 4px;
}
.oc-msg-user {
  align-self: flex-end;
  background: #1a1a2e;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.oc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.oc-chip {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 12.5px;
  cursor: pointer;
  color: #1a1a2e;
  transition: background 0.15s, border-color 0.15s;
  font-family: inherit;
}
.oc-chip:hover {
  background: #f0faf7;
  border-color: #00d4aa;
}

.oc-typing {
  display: flex;
  gap: 4px;
  padding: 10px 14px;
  align-self: flex-start;
}
.oc-dot {
  width: 8px;
  height: 8px;
  background: #ccc;
  border-radius: 50%;
  animation: oc-bounce 1.2s infinite;
}
.oc-dot:nth-child(2) { animation-delay: 0.15s; }
.oc-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes oc-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

.oc-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 14px;
  margin-top: 6px;
  align-self: flex-start;
  max-width: 92%;
}
.oc-card-name {
  font-weight: 600;
  font-size: 14px;
  color: #1a1a2e;
  margin-bottom: 4px;
}
.oc-card-desc {
  font-size: 12.5px;
  color: #555;
  margin-bottom: 8px;
  line-height: 1.45;
}
.oc-card-match {
  background: #f8f8f9;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  color: #444;
  margin-bottom: 10px;
  line-height: 1.45;
}
.oc-card-match strong {
  color: #1a1a2e;
}
.oc-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.oc-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid;
  white-space: nowrap;
}
.oc-card-link {
  font-size: 12px;
  color: #00d4aa;
  text-decoration: none;
  font-weight: 500;
  white-space: nowrap;
}
.oc-card-link:hover {
  text-decoration: underline;
}

.oc-input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #eee;
  flex-shrink: 0;
}
.oc-textarea {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13.5px;
  font-family: inherit;
  resize: none;
  outline: none;
  min-height: 36px;
  max-height: 120px;
  line-height: 1.4;
}
.oc-textarea:focus {
  border-color: #00d4aa;
}
.oc-send-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #00d4aa;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
  padding: 0;
}
.oc-send-btn:hover {
  background: #00c49d;
}
.oc-send-btn svg {
  width: 18px;
  height: 18px;
}

.oc-footer {
  text-align: center;
  font-size: 10.5px;
  color: #aaa;
  padding: 6px 16px 10px;
  flex-shrink: 0;
}
`;

export function injectStyles() {
  if (document.getElementById("oc-styles")) return;
  const style = document.createElement("style");
  style.id = "oc-styles";
  style.textContent = CSS;
  document.head.appendChild(style);
}
