export function loadAnalyticsIfConsented() {
  window.klickspieleAnalytics = {
    track(event, payload = {}) {
      if (window.localStorage.getItem("klickspiele-consent-v1")?.includes("statistik")) {
        console.debug("Analytics Event", event, payload);
      }
    },
  };
}
