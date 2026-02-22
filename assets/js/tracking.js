(function(){
  const KEY = "ks_consent_analytics_v1";
  function getConsent(){ return localStorage.getItem(KEY) === "1"; }
  function setConsent(v){ localStorage.setItem(KEY, v ? "1" : "0"); }
  function track(name, payload){
    if(!getConsent()) return;
    try{ console.log("[ks-track]", name, payload || {}); }catch(e){}
  }
  window.KS_TRACK = { getConsent, setConsent, track };
})();