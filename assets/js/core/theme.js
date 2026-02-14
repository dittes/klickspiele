const THEME_KEY = "klickspiele-theme";

export function initTheme() {
  const root = document.documentElement;
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  root.setAttribute("data-theme", theme);
  const toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
    toggle.textContent = theme === "dark" ? "Hell" : "Dunkel";
    toggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
      toggle.setAttribute("aria-pressed", String(next === "dark"));
      toggle.textContent = next === "dark" ? "Hell" : "Dunkel";
    });
  }
}
