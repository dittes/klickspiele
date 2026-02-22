(function(){
  const DEF = window.__GAME__;
  const $ = (id)=>document.getElementById(id);
  const modeSeg = $("modeSeg");
  const btnStart = $("btnStart");
  const btnRestart = $("btnRestart");
  const btnShare = $("btnShare");
  const canvas = $("gameCanvas");
  const hint = $("gameHint");
  const statStatus = $("statStatus");
  const statScore = $("statScore");
  const statBest = $("statBest");
  const statTimer = $("statTimer");
  const scoreRules = $("scoreRules");
  const recentRuns = $("recentRuns");

  let mode = DEF.modes?.[0] || {key:"std", label:"Standard"};
  let inst = null;
  let running=false;
  let lastScore=null;

  function renderModes(){
    if(!modeSeg) return;
    modeSeg.innerHTML="";
    (DEF.modes||[]).forEach(m=>{
      const b=document.createElement("button");
      b.type="button";
      b.textContent=m.label;
      b.setAttribute("aria-pressed", m.key===mode.key ? "true":"false");
      b.addEventListener("click", ()=>{
        mode=m;
        window.KS_TRACK?.track("mode_change",{game:DEF.id, mode:mode.key});
        renderModes();
        reset();
      });
      modeSeg.appendChild(b);
    });
  }

  function bestForMode(){
    const best = KS.storage.getBest(DEF.id);
    return best?.[mode.key] || null;
  }
  function setBest(score){
    const best = KS.storage.getBest(DEF.id);
    const cur = best?.[mode.key];
    if(cur == null || score > cur){
      best[mode.key]=score;
      KS.storage.setBest(DEF.id, best);
    }
  }
  function pushRun(run){
    KS.storage.pushHist(DEF.id, run);
    renderHistory();
  }
  function renderHistory(){
    const hist = KS.storage.getHist(DEF.id);
    const rows = hist.map(h=>{
      const t = new Date(h.ts).toLocaleString("de-DE",{dateStyle:"short", timeStyle:"short"});
      return `${t}: ${h.mode} – ${h.score}`;
    });
    recentRuns.textContent = rows.length ? rows.join(" • ") : "–";
    const b = bestForMode();
    statBest.textContent = b==null ? "–" : String(b);
  }

  function setStatus(s){ statStatus.textContent=s; }
  function setTimer(ms){
    if(ms==null) { statTimer.textContent="–"; return; }
    statTimer.textContent = (ms>=1000) ? (Math.ceil(ms/1000)+"s") : (Math.round(ms)+"ms");
  }
  function setScore(s){ statScore.textContent = s==null ? "–" : String(s); }

  function install(){
    if(inst && inst.destroy) try{inst.destroy()}catch(e){}
    inst = window.KS_GAME.createInstance(canvas, mode);
    wireInstance();
  }

  function reset(){
    running=false;
    lastScore=null;
    setStatus("Bereit");
    setScore(null);
    setTimer(null);
    hint.style.display="";
    scoreRules.textContent = DEF.primaryKeyword ? `Keyword: ${DEF.primaryKeyword}` : "";
    install();
    renderHistory();
  }

  function currentTapTempoScore(){
    // Prefer engine state; fallback to HUD
    try{
      const s = inst?.state?.();
      if(s && typeof s.bpm === "number" && isFinite(s.bpm)) return Math.round(s.bpm*10);
    }catch(e){}
    const v = parseFloat((statScore.textContent||"").replace(",","."));
    if(!isFinite(v)) return null;
    return Math.round(v);
  }

  function share(){
    // For tap-tempo: treat share as "submit" (finalize current BPM)
    if(DEF.type==="tapTempo" && lastScore==null){
      const score = currentTapTempoScore();
      if(score!=null){
        onEnd({bpm: score/10});
      }
    }

    const url = location.href;
    const score = lastScore==null ? (statScore.textContent||"–") : lastScore;
    const text = `${DEF.title} (${mode.label}) – Score: ${score} – ${url}`;
    window.KS_COPY(text).then(ok=>{
      if(ok) window.KS_TRACK?.track("share",{game:DEF.id, mode:mode.key, score:lastScore});
      btnShare.textContent = ok ? "Kopiert ✓" : "Teilen";
      setTimeout(()=>btnShare.textContent="Teilen", 1200);
    });
  }

  function onEnd(payload){
    running=false;
    const score = computeScore(payload);
    lastScore=score;
    setScore(score);
    setStatus("Fertig");
    setTimer(null);

    setBest(score);
    pushRun({ts: Date.now(), game: DEF.id, mode: mode.key, score});
    window.KS_TRACK?.track("score_submit",{game:DEF.id, mode:mode.key, score});
  }

  function computeScore(payload){
    const t = DEF.type;
    try{
      if(t==="timedClicker" || t==="timedClickerMoving"){
        const clicks = payload?.clicks ?? payload?.hits ?? 0;
        if(t==="timedClickerMoving"){
          const hits = payload?.hits ?? 0;
          const misses = payload?.misses ?? 0;
          const acc = hits / Math.max(1, hits+misses);
          return Math.round(hits * 100 + acc*100);
        }
        return Math.round(clicks);
      }
      if(t==="keyPress") return Math.round(payload?.count ?? 0);
      if(t==="reactionColor" || t==="reactionAudio"){
        const med = payload?.medianMs;
        if(med==null) return 0;
        return Math.max(0, Math.round(2000 - med));
      }
      if(t==="aimTargets"){
        const ms = payload?.elapsedMs ?? 0;
        return Math.max(0, Math.round(100000 - ms));
      }
      if(t==="precisionCircle") return Math.max(0, Math.round(payload?.score ?? 0));
      if(t==="tapTempo"){
        const bpm = payload?.bpm;
        return bpm==null ? 0 : Math.round(bpm*10);
      }
      if(t==="stopAtTime"){
        const diff = Math.abs(payload?.diff ?? 0);
        return Math.max(0, Math.round(10000 - diff));
      }
      if(t==="tapMetronome"){
        const avg = payload?.avgAbsMs ?? 0;
        return Math.max(0, Math.round(2000 - avg));
      }
      if(t==="perfectHitBar") return Math.round(payload?.score ?? 0);
      if(t==="goNoGo"){
        const hits=payload?.hits ?? 0;
        const misses=payload?.misses ?? 0;
        const fa=payload?.falseAlarms ?? 0;
        return Math.max(0, hits*100 - misses*50 - fa*80);
      }
      if(t==="dpadChoice" || t==="swipeReaction" || t==="arrowStroop"){
        const med=payload?.medianMs ?? 0;
        const errors=payload?.errors ?? 0;
        return Math.max(0, Math.round(3000 - med - errors*200));
      }
      if(t==="simon") return Math.round((payload?.level ?? 0)*100);
      if(t==="memoryGrid") return Math.round(payload?.score ?? 0);
      if(t==="stroop"){
        const idx=payload?.stroopIndexMs ?? 0;
        const errors=payload?.errors ?? 0;
        return Math.max(0, Math.round(2000 - idx - errors*150));
      }
      if(t==="scrollSpeed"){
        const eps=payload?.eventsPerSec ?? 0;
        return Math.round(eps*100);
      }
    }catch(e){}
    return 0;
  }

  function wireInstance(){
    if(!inst) return;

    inst.on?.("tick",(s)=>{
      if(DEF.type==="timedClicker" || DEF.type==="timedClickerMoving" || DEF.type==="keyPress" || DEF.type==="goNoGo" || DEF.type==="scrollSpeed"){
        setTimer(s.leftMs);
      }
      if(DEF.type==="timedClicker") setScore(s.clicks);
      if(DEF.type==="timedClickerMoving") setScore(s.hits);
      if(DEF.type==="keyPress") setScore(s.count);
      if(DEF.type==="goNoGo") setScore(s.hits*100 - s.misses*50 - s.falseAlarms*80);
      if(DEF.type==="scrollSpeed") setScore(Math.round((s.eventsPerSec||0)*100));
    });

    inst.on?.("start",()=>{
      running=true;
      hint.style.display="none";
      setStatus("Läuft");
      window.KS_TRACK?.track("start",{game:DEF.id, mode:mode.key});
    });

    inst.on?.("end",(s)=>onEnd(s));

    if(DEF.type==="aimTargets"){
      canvas.addEventListener("pointerdown",(e)=>{
        if(!running) return;
        if(e.target && e.target.classList && e.target.classList.contains("aim-target")) return;
        inst.onMiss?.();
      }, {passive:true});
    }

    if(DEF.type==="precisionCircle"){
      canvas.addEventListener("pointerdown",(e)=>inst.tap(e), {passive:true});
    }

    if(DEF.type==="reactionColor" || DEF.type==="reactionAudio"){
      canvas.addEventListener("pointerdown",()=>inst.tap(), {passive:true});
      inst.on?.("trial",(t)=>{
        if(t.phase==="go") canvas.style.outline="3px solid rgba(34,197,94,.55)";
        if(t.phase==="wait") canvas.style.outline="none";
      });
      inst.on?.("end",(s)=>{
        canvas.style.outline="none";
        onEnd(s);
      });
    }

    if(DEF.type==="tapTempo"){
      // Start on first tap; compute score live; submit via "Teilen"
      canvas.addEventListener("pointerdown",()=>{
        if(!running){
          running=true;
          hint.style.display="none";
          setStatus("Tippen");
          window.KS_TRACK?.track("start",{game:DEF.id, mode:mode.key});
        }
        inst.tap();
        const s=inst.state();
        setScore(s.bpm?Math.round(s.bpm*10):null);
      }, {passive:true});
    }

    if(DEF.type==="stopAtTime"){
      canvas.addEventListener("pointerdown",()=>{
        if(!running){ inst.start(); }
        else inst.stop();
      }, {passive:true});
      inst.on?.("result",(r)=>onEnd({diff:r.diff}));
    }

    if(DEF.type==="tapMetronome"){
      canvas.addEventListener("pointerdown",()=>{ if(!running) inst.start(); inst.tap(); }, {passive:true});
    }

    if(DEF.type==="perfectHitBar"){
      const bar=document.createElement("div");
      bar.style.position="absolute"; bar.style.left="12px"; bar.style.right="12px"; bar.style.top="50%";
      bar.style.height="12px"; bar.style.borderRadius="999px"; bar.style.border="1px solid rgba(255,255,255,.12)";
      bar.style.background="rgba(255,255,255,.04)";
      const dot=document.createElement("div");
      dot.style.position="absolute"; dot.style.top="-7px"; dot.style.width="26px"; dot.style.height="26px";
      dot.style.borderRadius="999px"; dot.style.border="2px solid rgba(255,255,255,.25)";
      dot.style.background="rgba(255,255,255,.04)";
      const zone=document.createElement("div");
      zone.style.position="absolute"; zone.style.top="-2px"; zone.style.height="16px"; zone.style.borderRadius="999px";
      zone.style.left="46%"; zone.style.width="8%"; zone.style.background="rgba(34,197,94,.18)"; zone.style.border="1px solid rgba(34,197,94,.45)";
      bar.appendChild(zone); bar.appendChild(dot);
      canvas.appendChild(bar);

      function upd(s){
        const w = bar.getBoundingClientRect().width;
        dot.style.left = (s.pos*w - 13) + "px";
        setScore(s.score);
      }
      inst.on?.("tick", upd);
      canvas.addEventListener("pointerdown",()=>{ if(!running) inst.start(); inst.hit(); }, {passive:true});
    }

    if(DEF.type==="goNoGo"){
      canvas.addEventListener("pointerdown",()=>{ inst.tap(); }, {passive:true});
      inst.on?.("stim",(s)=>{
        canvas.style.outline = s.go ? "3px solid rgba(34,197,94,.55)" : "3px solid rgba(239,68,68,.55)";
        setTimeout(()=>canvas.style.outline="none", 220);
      });
    }

    if(DEF.type==="dpadChoice" || DEF.type==="arrowStroop"){
      canvas.innerHTML="";
      const grid=document.createElement("div");
      grid.className="dpad";
      const lbl=document.createElement("div");
      lbl.className="note";
      lbl.style.gridColumn="1 / span 3";
      lbl.style.padding="10px 4px";
      lbl.style.textAlign="center";
      lbl.style.fontWeight="900";
      lbl.textContent="Bereit";
      grid.appendChild(lbl);

      const mk=(label)=>{ const x=document.createElement("button"); x.className="btn btn--ghost"; x.type="button"; x.textContent=label; x.style.minHeight="72px"; return x; };
      const bUp=mk("↑"), bLeft=mk("←"), bRight=mk("→"), bDown=mk("↓");
      const spacer=document.createElement("div"); spacer.style.minHeight="72px";
      grid.appendChild(spacer); grid.appendChild(bUp); grid.appendChild(spacer.cloneNode());
      grid.appendChild(bLeft); grid.appendChild(spacer.cloneNode()); grid.appendChild(bRight);
      grid.appendChild(spacer.cloneNode()); grid.appendChild(bDown); grid.appendChild(spacer.cloneNode());
      canvas.appendChild(grid);

      const press=(dir)=>{ if(!running) inst.start(); inst.press(dir); };
      bUp.addEventListener("click",()=>press("↑"));
      bDown.addEventListener("click",()=>press("↓"));
      bLeft.addEventListener("click",()=>press("←"));
      bRight.addEventListener("click",()=>press("→"));

      window.addEventListener("keydown",(e)=>{
        if(e.key==="ArrowUp") press("↑");
        if(e.key==="ArrowDown") press("↓");
        if(e.key==="ArrowLeft") press("←");
        if(e.key==="ArrowRight") press("→");
      });

      inst.on?.("stim",(s)=>{ lbl.textContent = (DEF.type==="arrowStroop" && s.reverse) ? `Drücke Gegenteil von ${s.cur}` : `Drücke ${s.cur}`; });
      inst.on?.("end",(s)=>{ lbl.textContent="Fertig"; onEnd(s); });
    }

    if(DEF.type==="swipeReaction"){
      canvas.innerHTML="";
      const lbl=document.createElement("div");
      lbl.className="note";
      lbl.style.position="absolute"; lbl.style.left="12px"; lbl.style.right="12px"; lbl.style.top="12px";
      lbl.style.textAlign="center"; lbl.style.fontWeight="900";
      lbl.textContent="Wische links/rechts";
      canvas.appendChild(lbl);

      let startX=null;
      canvas.addEventListener("pointerdown",(e)=>{ startX=e.clientX; }, {passive:true});
      canvas.addEventListener("pointerup",(e)=>{
        if(startX==null) return;
        const dx=e.clientX-startX;
        if(Math.abs(dx)<40) return;
        const dir = dx<0 ? "L":"R";
        if(!running) inst.start();
        inst.swipe(dir);
      }, {passive:true});

      inst.on?.("stim",(s)=>{ lbl.textContent = s.cur==="L" ? "Wische links" : "Wische rechts"; });
      inst.on?.("end",(s)=>{ lbl.textContent="Fertig"; onEnd(s); });
    }

    if(DEF.type==="simon"){
      canvas.innerHTML="";
      const shell=document.createElement("div");
      shell.className="simon";
      const lbl=document.createElement("div");
      lbl.className="note";
      lbl.style.gridColumn="1 / span 2";
      lbl.style.textAlign="center";
      lbl.style.fontWeight="900";
      lbl.textContent="Tippe Start";
      shell.appendChild(lbl);

      const pads=[];
      for(let i=0;i<4;i++){
        const b=document.createElement("button");
        b.type="button";
        b.setAttribute("aria-label","Feld "+(i+1));
        b.addEventListener("click",()=>{ if(!running) inst.start(); inst.press(i); });
        pads.push(b);
        shell.appendChild(b);
      }
      canvas.appendChild(shell);

      inst.on?.("flash",(x)=>{
        const b=pads[x.tile];
        b.classList.add("is-flash");
        setTimeout(()=>b.classList.remove("is-flash"), 180);
      });
      inst.on?.("show",()=>{ lbl.textContent="Merken…"; });
      inst.on?.("ready",()=>{ lbl.textContent="Deine Eingabe"; });
      inst.on?.("tick",(s)=>{ setScore((s.level||0)*100); });
      inst.on?.("end",(s)=>{ lbl.textContent="Fertig"; onEnd(s); });
    }

    if(DEF.type==="memoryGrid"){
      canvas.innerHTML="";
      const grid=document.createElement("div");
      grid.className="tilegrid";
      canvas.appendChild(grid);

      function render(s, phase){
        grid.style.gridTemplateColumns = `repeat(${s.size}, 1fr)`;
        grid.innerHTML="";
        const total=s.size*s.size;
        for(let i=0;i<total;i++){
          const b=document.createElement("button");
          b.type="button";
          b.className="tile";
          const marked = s.marks.includes(i);
          b.textContent = (phase==="show" && marked) ? "★" : (s.chosen.includes(i) ? "•" : "");
          b.addEventListener("click",()=>{ inst.pick(i); });
          grid.appendChild(b);
        }
      }

      inst.on?.("show",(s)=>{ if(!running){running=true;} render(s,"show"); });
      inst.on?.("hide",(s)=>{ render(s,"hide"); });
      inst.on?.("tick",(s)=>{ setScore(s.score); });
      inst.on?.("end",(s)=>{ onEnd(s); });

      canvas.addEventListener("pointerdown",()=>{ if(!running) inst.start(); }, {once:true, passive:true});
    }

    if(DEF.type==="stroop"){
      canvas.innerHTML="";
      const word=document.createElement("div");
      word.style.position="absolute";
      word.style.left="0"; word.style.right="0"; word.style.top="34%";
      word.style.textAlign="center"; word.style.fontSize="44px"; word.style.fontWeight="900";
      canvas.appendChild(word);

      const row=document.createElement("div");
      row.style.position="absolute"; row.style.left="12px"; row.style.right="12px"; row.style.bottom="12px";
      row.style.display="grid"; row.style.gridTemplateColumns="repeat(2,1fr)"; row.style.gap="10px";
      canvas.appendChild(row);

      function ensureButtons(){
        if(row.childElementCount) return;
        (inst.colors || []).forEach(c=>{
          const b=document.createElement("button");
          b.type="button"; b.className="btn btn--ghost";
          b.style.minHeight="60px";
          b.textContent=c.name;
          b.addEventListener("click",()=>{ if(!running) inst.start(); inst.answer(c.name); });
          row.appendChild(b);
        });
      }

      inst.on?.("stim",(s)=>{
        ensureButtons();
        word.textContent=s.word;
        word.style.color=s.inkVal || "#fff";
      });
      inst.on?.("resp",(s)=>{ setScore(Math.max(0, Math.round(2000-(s.stroopIndexMs||0)-(s.errors||0)*150))); });
      inst.on?.("end",(s)=>{ onEnd(s); });

      canvas.addEventListener("pointerdown",()=>{ if(!running) inst.start(); }, {once:true, passive:true});
    }

    if(DEF.type==="scrollSpeed"){
      canvas.innerHTML="";
      const msg=document.createElement("div");
      msg.className="note";
      msg.style.position="absolute"; msg.style.left="12px"; msg.style.right="12px"; msg.style.top="12px";
      msg.style.textAlign="center"; msg.style.fontWeight="900";
      msg.textContent="Scrolle schnell (Mausrad/Trackpad).";
      canvas.appendChild(msg);

      canvas.addEventListener("pointerdown",()=>{ if(!running){ running=true; inst.start(canvas); window.KS_TRACK?.track("start",{game:DEF.id, mode:mode.key}); } }, {once:true, passive:true});
      inst.on?.("end",(s)=>onEnd(s));
    }
  }

  btnStart.addEventListener("click", ()=>{
    if(!inst) install();
    if(DEF.type==="tapTempo"){
      setStatus("Tippe im Spielfeld");
      return;
    }
    if(DEF.type==="stopAtTime"){
      setStatus("Tippe im Spielfeld zum Start/Stop");
      window.KS_TRACK?.track("start",{game:DEF.id, mode:mode.key});
      return;
    }
    if(inst.start){
      inst.start(canvas);
    }
  });

  btnRestart.addEventListener("click", ()=>{
    window.KS_TRACK?.track("restart",{game:DEF.id, mode:mode.key});
    reset();
  });

  btnShare.addEventListener("click", share);

  document.querySelectorAll('details[data-faq="1"]').forEach(d=>{
    d.addEventListener("toggle", ()=>{
      if(d.open) window.KS_TRACK?.track("faq_open",{game:DEF.id, q: d.querySelector("summary")?.textContent?.slice(0,80)});
    });
  });

  // Similar section impression (ad placeholder)
  const sim = document.getElementById("similarSection");
  if(sim && "IntersectionObserver" in window){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          window.KS_TRACK?.track("ad_impression",{game:DEF.id, slot:"similar_section"});
          io.disconnect();
        }
      });
    }, {threshold:0.5});
    io.observe(sim);
  }

  renderModes();
  reset();
})();