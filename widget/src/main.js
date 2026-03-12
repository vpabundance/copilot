import { injectStyles } from "./styles.js";
import { createLauncher } from "./launcher.js";
import { createPanel } from "./panel.js";

(function init() {
  if (document.getElementById("octant-copilot-root")) return;

  injectStyles();

  const root = document.createElement("div");
  root.id = "octant-copilot-root";

  const panel = createPanel(() => panel.close());
  const launcher = createLauncher(() => {
    if (panel.isOpen()) {
      panel.close();
    } else {
      panel.open();
    }
  });

  root.appendChild(panel.el);
  root.appendChild(launcher);
  document.body.appendChild(root);
})();
