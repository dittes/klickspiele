const CONSENT_KEY = "klickspiele-consent-v1";

export function readConsent() {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveConsent(mode) {
  const payload = { mode, updatedAt: new Date().toISOString() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
  return payload;
}

export function initConsent(onAnalyticsAccepted) {
  const banner = document.getElementById("cookie-banner");
  if (!banner) return;
  const current = readConsent();
  if (current?.mode) {
    banner.hidden = true;
    if (current.mode === "statistik") onAnalyticsAccepted();
    return;
  }
  banner.hidden = false;
  banner.querySelector("[data-consent='necessary']")?.addEventListener("click", () => {
    saveConsent("necessary");
    banner.hidden = true;
  });
  banner.querySelector("[data-consent='statistik']")?.addEventListener("click", () => {
    saveConsent("statistik");
    banner.hidden = true;
    onAnalyticsAccepted();
  });
}
