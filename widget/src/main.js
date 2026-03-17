import { injectStyles } from "./styles.js";
import { createLauncher } from "./launcher.js";
import { createPanel } from "./panel.js";

(function init() {
  if (document.getElementById("octant-copilot-root")) return;

  injectStyles();

  const cfg = window.OctantCopilotConfig || {};
  const inlineTarget = cfg.inlineTarget
    ? document.querySelector(cfg.inlineTarget)
    : null;

  let isInline = !!inlineTarget;

  // Widget root (always created for the floating widget mode)
  const root = document.createElement("div");
  root.id = "octant-copilot-root";

  const panel = createPanel(
    () => panel.close(),
    {
      onToggleMode: inlineTarget ? toggleMode : undefined,
    }
  );

  const launcher = createLauncher(() => {
    if (panel.isOpen()) {
      panel.close();
    } else {
      panel.open();
    }
  });

  // Inline wrapper
  let inlineWrap = null;
  if (inlineTarget) {
    inlineWrap = document.createElement("div");
    inlineWrap.className = "oc-inline-wrap";
  }

  function toggleMode() {
    if (isInline) {
      // Switch to widget mode: move panel into floating root
      if (inlineWrap) inlineWrap.remove();
      root.appendChild(panel.el);
      root.appendChild(launcher);
      document.body.appendChild(root);
      panel.close(); // start closed in widget mode
      panel.setExpandIcon(false);
    } else {
      // Switch to inline mode: move panel into the inline container
      root.remove();
      inlineWrap.appendChild(panel.el);
      inlineTarget.innerHTML = "";
      inlineTarget.appendChild(inlineWrap);
      panel.open(); // always open in inline mode
      panel.setExpandIcon(true);
    }
    isInline = !isInline;
  }

  // Initial mount
  if (isInline) {
    inlineWrap.appendChild(panel.el);
    inlineTarget.appendChild(inlineWrap);
    panel.open();
    panel.setExpandIcon(true);
  } else {
    root.appendChild(panel.el);
    root.appendChild(launcher);
    document.body.appendChild(root);
  }
})();
