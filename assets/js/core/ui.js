export function setupActionBar(actions) {
  const container = document.getElementById("action-bar");
  if (!container) return;
  container.innerHTML = "";
  actions.forEach((action) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-primary action-btn";
    btn.textContent = action.label;
    btn.setAttribute("aria-label", action.ariaLabel || action.label);
    btn.addEventListener("click", action.onClick);
    container.appendChild(btn);
  });
}

export function vibrate(ms = 12) {
  if ("vibrate" in navigator && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    navigator.vibrate(ms);
  }
}

export function announce(message) {
  const node = document.getElementById("sr-status");
  if (!node) return;
  node.textContent = message;
}
