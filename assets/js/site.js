(function(){
  const banner = document.getElementById("cookieBanner");
  const accept = document.getElementById("cookieAccept");
  const decline = document.getElementById("cookieDecline");

  function openBanner(){ if(banner) banner.classList.add("is-open"); }
  function closeBanner(){ if(banner) banner.classList.remove("is-open"); }

  try{
    const known = localStorage.getItem("ks_consent_analytics_v1");
    if(known === null) openBanner();
  }catch(e){}

  accept?.addEventListener("click", ()=>{ window.KS_TRACK?.setConsent(true); closeBanner(); });
  decline?.addEventListener("click", ()=>{ window.KS_TRACK?.setConsent(false); closeBanner(); });

  // Scroll depth 50%
  let fired=false;
  window.addEventListener("scroll", ()=>{
    if(fired) return;
    const doc=document.documentElement;
    const sc=(doc.scrollTop||document.body.scrollTop);
    const h=(doc.scrollHeight-doc.clientHeight);
    if(h>0 && sc/h>=0.5){
      fired=true;
      window.KS_TRACK?.track("scroll_depth_50",{path:location.pathname});
    }
  }, {passive:true});

  // Clipboard helper
  window.KS_COPY = async function(text){
    try{ await navigator.clipboard.writeText(text); return true; }
    catch(e){
      const ta=document.createElement("textarea");
      ta.value=text; ta.style.position="fixed"; ta.style.left="-9999px";
      document.body.appendChild(ta); ta.select();
      const ok=document.execCommand("copy"); document.body.removeChild(ta);
      return ok;
    }
  };
})();