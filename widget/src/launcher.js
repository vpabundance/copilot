const ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="#00d4aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <path d="M8 12l2 2 4-4"/>
</svg>`;

export function createLauncher(onToggle) {
  const btn = document.createElement("button");
  btn.className = "oc-launcher";
  btn.innerHTML = ICON_SVG;
  btn.setAttribute("aria-label", "Open Octant Copilot");
  btn.addEventListener("click", onToggle);
  return btn;
}
