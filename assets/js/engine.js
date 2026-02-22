(function(){
  const KS = {};
  const now = ()=>performance.now();
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const rand=(a,b)=>Math.random()*(b-a)+a;
  const randInt=(a,b)=>Math.floor(rand(a,b+1));
  const fmt=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):"–";
  const fmtMs=(ms)=>`${Math.round(ms)} ms`;

  function emitter(){
    const m=new Map();
    return {
      on(ev,fn){ if(!m.has(ev)) m.set(ev,[]); m.get(ev).push(fn); },
      emit(ev,data){ (m.get(ev)||[]).forEach(fn=>{ try{fn(data)}catch(e){} }); }
    };
  }

  function bestKey(id){ return `ks_best_${id}`; }
  function histKey(id){ return `ks_hist_${id}`; }
  function getBest(id){ try{return JSON.parse(localStorage.getItem(bestKey(id))||"{}")}catch(e){return{}} }
  function setBest(id,obj){ try{localStorage.setItem(bestKey(id),JSON.stringify(obj))}catch(e){} }
  function getHist(id){ try{return JSON.parse(localStorage.getItem(histKey(id))||"[]")}catch(e){return[]} }
  function pushHist(id,run){ try{ const a=getHist(id); a.unshift(run); localStorage.setItem(histKey(id),JSON.stringify(a.slice(0,10))); }catch(e){} }

  // Timed clicker (optional moving zone)
  function timedClicker({container,durationMs,movingZone=false,zoneSize=0.22,capCps=28}){
    const bus=emitter();
    let running=false,startT=0,clicks=0,hits=0,misses=0,lastTs=[];
    const zoneEl=document.createElement("div");
    zoneEl.style.position="absolute";
    zoneEl.style.border="2px solid rgba(34,197,94,.6)";
    zoneEl.style.borderRadius="999px";
    zoneEl.style.pointerEvents="none";
    zoneEl.style.display=movingZone?"block":"none";
    container.appendChild(zoneEl);
    let zone={x:.5,y:.5,r:40};

    function placeZone(){
      const r=container.getBoundingClientRect();
      zone.r=Math.max(18,Math.min(r.width,r.height)*zoneSize);
      zone.x=rand(.18,.82); zone.y=rand(.18,.82);
      zoneEl.style.width=`${zone.r*2}px`;
      zoneEl.style.height=`${zone.r*2}px`;
      zoneEl.style.left=`${zone.x*100}%`;
      zoneEl.style.top=`${zone.y*100}%`;
      zoneEl.style.transform="translate(-50%,-50%)";
    }
    function inZone(cx,cy){
      const r=container.getBoundingClientRect();
      const x=cx-r.left, y=cy-r.top;
      const zx=r.width*zone.x, zy=r.height*zone.y;
      const dx=x-zx, dy=y-zy;
      return (dx*dx+dy*dy) <= zone.r*zone.r;
    }
    function onDown(e){
      if(!running) return;
      const t=now();
      lastTs.push(t); while(lastTs.length && t-lastTs[0]>1000) lastTs.shift();
      if(lastTs.length>capCps) return;
      clicks++;
      if(movingZone){
        if(inZone(e.clientX,e.clientY)){ hits++; if(clicks%7===0) placeZone(); }
        else misses++;
      }
      bus.emit("tick", state());
    }
    function loop(){
      if(!running) return;
      const t=now();
      const left=Math.max(0,durationMs-(t-startT));
      if(left<=0){ stop(); return; }
      bus.emit("tick", state());
      requestAnimationFrame(loop);
    }
    function start(){
      clicks=0;hits=0;misses=0;lastTs=[];
      placeZone(); running=true; startT=now();
      bus.emit("start", state());
      requestAnimationFrame(loop);
    }
    function stop(){
      if(!running) return;
      running=false; bus.emit("end", state());
    }
    function state(){
      const t=now();
      const elapsed=running?(t-startT):durationMs;
      const s=Math.max(.001,elapsed/1000);
      const cps=clicks/s;
      const acc=movingZone? (hits/Math.max(1,hits+misses)) : 1;
      return {running, clicks, hits, misses, cps, acc, leftMs:Math.max(0,durationMs-(t-startT))};
    }
    container.addEventListener("pointerdown", onDown, {passive:true});
    return { on:bus.on, start, stop, state, destroy(){ container.removeEventListener("pointerdown",onDown); zoneEl.remove(); } };
  }

  // Key press timer (spacebar/any)
  function keyPress({targetKey=" ",durationMs,noRepeat=false}){
    const bus=emitter();
    let running=false,startT=0,count=0,others=0;
    function onKey(e){
      if(!running) return;
      if(noRepeat && e.repeat) return;
      if(targetKey==="ANY" || e.key===targetKey) count++;
      else others++;
      bus.emit("tick", state());
    }
    function loop(){
      if(!running) return;
      const t=now(); const left=Math.max(0,durationMs-(t-startT));
      if(left<=0){ stop(); return; }
      bus.emit("tick", state()); requestAnimationFrame(loop);
    }
    function start(){ running=true; startT=now(); count=0; others=0; bus.emit("start",state()); requestAnimationFrame(loop); }
    function stop(){ if(!running) return; running=false; bus.emit("end",state()); }
    function state(){
      const t=now(); const elapsed=running?(t-startT):durationMs;
      const s=Math.max(.001,elapsed/1000);
      return {running, count, others, kps:count/s, leftMs:Math.max(0,durationMs-(t-startT))};
    }
    window.addEventListener("keydown", onKey);
    return { on:bus.on, start, stop, state, destroy(){ window.removeEventListener("keydown", onKey);} };
  }

  // Reaction (color) + (audio)
  function reactionCore({trials=10,minWait=900,maxWait=3500,beep=false}){
    const bus=emitter();
    let i=0,running=false,waiting=false,greenAt=0,results=[],misstarts=0,ctx=null;
    function doBeep(){
      if(!beep) return;
      try{
        ctx = ctx || new (window.AudioContext||window.webkitAudioContext)();
        const o=ctx.createOscillator(), g=ctx.createGain();
        o.frequency.value=880; o.type="sine";
        g.gain.value=0.0001;
        o.connect(g); g.connect(ctx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(.2, ctx.currentTime+.01);
        g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime+.12);
        o.stop(ctx.currentTime+.14);
      }catch(e){}
    }
    function next(){
      if(!running) return;
      if(i>=trials){ end(); return; }
      waiting=true;
      const w=randInt(minWait,maxWait);
      greenAt=now()+w;
      bus.emit("trial",{i,phase:"wait",waitMs:w});
      requestAnimationFrame(loop);
    }
    function loop(){
      if(!running || !waiting) return;
      const t=now();
      if(t>=greenAt){
        waiting=false;
        doBeep();
        bus.emit("trial",{i,phase:"go"});
      }else requestAnimationFrame(loop);
    }
    function tap(){
      if(!running) return;
      const t=now();
      if(waiting){
        misstarts++;
        results.push(1000);
        i++; next();
        bus.emit("misstart",{i});
        return;
      }
      const rt=t-greenAt;
      results.push(rt);
      bus.emit("result",{i,rt});
      i++; next();
    }
    function start(){ running=true; i=0; results=[]; misstarts=0; bus.emit("start",state()); next(); }
    function end(){ running=false; bus.emit("end",state()); }
    function state(){
      const sorted=[...results].sort((a,b)=>a-b);
      const med=sorted.length? sorted[Math.floor(sorted.length/2)] : null;
      const best=sorted.length? sorted[0] : null;
      return {running,trials,results,misstarts,medianMs:med,bestMs:best};
    }
    return { on:bus.on, start, tap, state };
  }
  const reactionColor=(cfg)=>reactionCore({...cfg,beep:false});
  const reactionAudio=(cfg)=>reactionCore({...cfg,beep:true});

  // Aim targets
  function aimTargets({targets=30,shrink=false}){
    const bus=emitter();
    let running=false,hits=0,misses=0,startT=0,size=56;
    const btn=document.createElement("button");
    btn.className="aim-target";
    btn.type="button";
    btn.setAttribute("aria-label","Ziel");
    let container=null;

    function place(){
      if(!container) return;
      const r=container.getBoundingClientRect();
      const s=size;
      const x=randInt(10, Math.max(10, r.width-s-10));
      const y=randInt(10, Math.max(10, r.height-s-10));
      btn.style.left=x+"px"; btn.style.top=y+"px";
      btn.style.width=s+"px"; btn.style.height=s+"px";
    }
    function onHit(e){
      if(!running) return;
      hits++;
      if(shrink) size=clamp(size-1.2, 28, 56);
      bus.emit("hit", state());
      if(hits>=targets){ end(); return; }
      place();
    }
    function onMiss(){
      if(!running) return;
      misses++; bus.emit("miss", state());
    }
    function start(cont){
      container=cont;
      container.innerHTML="";
      container.appendChild(btn);
      btn.addEventListener("pointerdown", onHit, {passive:true});
      running=true; hits=0; misses=0; startT=now(); size=56;
      place(); bus.emit("start", state());
    }
    function end(){ running=false; bus.emit("end", state()); }
    function state(){ return {running,hits,misses,targets,elapsedMs:now()-startT,size}; }
    return { on:bus.on, start, end, onMiss, state };
  }

  // Precision circle (distance to center)
  function precisionCircle({rounds=10,timeLimitMs=3000}){
    const bus=emitter();
    let running=false,round=0,score=0,distAvg=0,roundStart=0,container=null;
    let circle={x:.5,y:.5,rad:40};
    const el=document.createElement("div");
    el.className="prec-circle";

    function place(){
      const r=container.getBoundingClientRect();
      circle.rad=clamp(Math.min(r.width,r.height)*0.08, 28, 60);
      circle.x=rand(.18,.82); circle.y=rand(.22,.82);
      el.style.width=(circle.rad*2)+"px";
      el.style.height=(circle.rad*2)+"px";
      el.style.left=(circle.x*100)+"%";
      el.style.top=(circle.y*100)+"%";
      el.style.transform="translate(-50%,-50%)";
    }
    function loop(){
      if(!running) return;
      const t=now();
      if(t-roundStart>timeLimitMs){
        round++; roundStart=now();
        bus.emit("timeout", state());
        if(round>=rounds){ end(); return; }
        place();
      }
      bus.emit("tick", state());
      requestAnimationFrame(loop);
    }
    function tap(e){
      if(!running) return;
      const r=container.getBoundingClientRect();
      const x=e.clientX-r.left, y=e.clientY-r.top;
      const cx=r.width*circle.x, cy=r.height*circle.y;
      const dx=x-cx, dy=y-cy;
      const dist=Math.sqrt(dx*dx+dy*dy);
      const pts=Math.max(0, 100 - dist*0.9);
      score += pts;
      distAvg = (distAvg*round + dist)/(round+1);
      round++; roundStart=now();
      bus.emit("hit",{dist,pts});
      if(round>=rounds){ end(); return; }
      place();
    }
    function start(cont){
      container=cont;
      container.innerHTML="";
      container.appendChild(el);
      running=true; round=0; score=0; distAvg=0; roundStart=now();
      place(); bus.emit("start", state()); requestAnimationFrame(loop);
    }
    function end(){ running=false; bus.emit("end", state()); }
    function state(){
      return {running,round,rounds,score,distAvgPx:distAvg,timeLeftMs:Math.max(0,timeLimitMs-(now()-roundStart))};
    }
    return { on:bus.on, start, tap, state };
  }

  // Tap tempo
  function tapTempo(){
    const bus=emitter();
    let taps=[];
    function bpm(){
      if(taps.length<2) return null;
      const ints=[];
      for(let i=1;i<taps.length;i++) ints.push(taps[i]-taps[i-1]);
      const avg=ints.reduce((a,b)=>a+b,0)/ints.length;
      return 60000/avg;
    }
    function tap(){ taps.push(now()); if(taps.length>16) taps.shift(); bus.emit("tick", state()); }
    function reset(){ taps=[]; bus.emit("tick", state()); }
    function state(){ return {taps:taps.length,bpm:bpm()}; }
    return { on:bus.on, tap, reset, state };
  }

  // Stop at time
  function stopAtTime({targetMs=10000}){
    const bus=emitter();
    let running=false,startT=0;
    function start(){ running=true; startT=now(); bus.emit("start",state()); }
    function stop(){
      if(!running) return;
      running=false;
      const elapsed=now()-startT;
      bus.emit("result",{elapsed,diff:elapsed-targetMs});
      bus.emit("end",state());
    }
    function state(){ return {running,elapsed: running?(now()-startT):0,targetMs}; }
    return { on:bus.on, start, stop, state };
  }

  // Metronome taps (drift)
  function tapMetronome({bpm=120,taps=40}){
    const bus=emitter();
    const interval=60000/bpm;
    let running=false,i=0,startT=0,diffs=[];
    function start(){ running=true; i=0; diffs=[]; startT=now(); bus.emit("start",state()); }
    function tap(){
      if(!running) return;
      const expected=startT + i*interval;
      const diff=now()-expected;
      diffs.push(diff);
      i++; bus.emit("tap",state());
      if(i>=taps){ running=false; bus.emit("end",state()); }
    }
    function state(){
      const abs=diffs.map(d=>Math.abs(d));
      const avg=abs.length? abs.reduce((a,b)=>a+b,0)/abs.length : null;
      return {running,bpm,i,taps,avgAbsMs:avg,lastDiffMs:diffs.length?diffs[diffs.length-1]:null};
    }
    return { on:bus.on, start, tap, state };
  }

  // Perfect hit bar
  function perfectHitBar({rounds=20,speed=1.0}){
    const bus=emitter();
    let running=false,pos=.1,dir=1,score=0,round=0;
    const zone={a:.46,b:.54};
    function loop(){
      if(!running) return;
      pos += dir * 0.006 * speed;
      if(pos>.98){ pos=.98; dir=-1; }
      if(pos<.02){ pos=.02; dir=1; }
      bus.emit("tick", state());
      requestAnimationFrame(loop);
    }
    function start(){ running=true; pos=.1; dir=1; score=0; round=0; bus.emit("start",state()); requestAnimationFrame(loop); }
    function hit(){
      if(!running) return;
      const c=(zone.a+zone.b)/2;
      const d=Math.abs(pos-c);
      let pts=20;
      if(d<.01) pts=100;
      else if(d<.03) pts=50;
      else if(d<.06) pts=20;
      else pts=-10;
      score += pts;
      round++;
      bus.emit("round",{round,pts});
      if(round>=rounds){ running=false; bus.emit("end",state()); }
    }
    function state(){ return {running,pos,score,round,rounds,zone}; }
    return { on:bus.on, start, hit, state };
  }

  // Go/No-Go
  function goNoGo({durationMs=60000,goRatio=.75,stimMs=900}){
    const bus=emitter();
    let running=false,startT=0,go=false,nextAt=0;
    let hits=0,misses=0,falseAlarms=0,rt=[];
    let handler=null;
    function schedule(){ go=Math.random()<goRatio; nextAt=now()+randInt(350,950); }
    function loop(){
      if(!running) return;
      const t=now();
      if(t-startT>=durationMs){ end(); return; }
      if(t>=nextAt){
        bus.emit("stim",{go});
        const stimStart=now();
        handler=()=>{
          const rtime=now()-stimStart;
          if(go){ hits++; rt.push(rtime); }
          else falseAlarms++;
          bus.emit("resp",state());
          handler=null;
        };
        setTimeout(()=>{
          if(handler){
            if(go) misses++;
            handler=null;
            bus.emit("resp",state());
          }
          schedule();
        }, stimMs);
      }
      requestAnimationFrame(loop);
    }
    function tap(){ if(!running) return; if(handler) handler(); }
    function start(){ running=true; startT=now(); hits=0; misses=0; falseAlarms=0; rt=[]; schedule(); bus.emit("start",state()); requestAnimationFrame(loop); }
    function end(){ running=false; bus.emit("end",state()); }
    function state(){
      const sorted=[...rt].sort((a,b)=>a-b);
      const med=sorted.length?sorted[Math.floor(sorted.length/2)]:null;
      return {running,hits,misses,falseAlarms,medianMs:med,leftMs:Math.max(0,durationMs-(now()-startT))};
    }
    return { on:bus.on, start, tap, state };
  }

  // D-pad choice (4-way) or Arrow Stroop
  function dpadChoice({trials=50}){
    const bus=emitter();
    const dirs=["↑","↓","←","→"];
    let running=false,i=0,cur="↑",shownAt=0,errors=0,rts=[];
    function next(){ cur=dirs[randInt(0,3)]; shownAt=now(); bus.emit("stim",{cur}); }
    function start(){ running=true; i=0; errors=0; rts=[]; next(); bus.emit("start",state()); }
    function press(dir){
      if(!running) return;
      let rt=now()-shownAt;
      if(dir!==cur){ errors++; rt += 500; }
      rts.push(rt); i++; bus.emit("resp",state());
      if(i>=trials){ running=false; bus.emit("end",state()); return; }
      next();
    }
    function state(){
      const sorted=[...rts].sort((a,b)=>a-b);
      const med=sorted.length?sorted[Math.floor(sorted.length/2)]:null;
      return {running,i,trials,cur,errors,medianMs:med};
    }
    return { on:bus.on, start, press, state };
  }

  function swipeReaction({trials=50}){
    const bus=emitter();
    const dirs=["L","R"];
    let running=false,i=0,cur="L",shownAt=0,errors=0,rts=[];
    function next(){ cur=dirs[randInt(0,1)]; shownAt=now(); bus.emit("stim",{cur}); }
    function start(){ running=true; i=0; errors=0; rts=[]; next(); bus.emit("start",state()); }
    function swipe(dir){
      if(!running) return;
      let rt=now()-shownAt;
      if(dir!==cur){ errors++; rt += 700; }
      rts.push(rt); i++; bus.emit("resp",state());
      if(i>=trials){ running=false; bus.emit("end",state()); return; }
      next();
    }
    function state(){
      const sorted=[...rts].sort((a,b)=>a-b);
      const med=sorted.length?sorted[Math.floor(sorted.length/2)]:null;
      return {running,i,trials,cur,errors,medianMs:med};
    }
    return { on:bus.on, start, swipe, state };
  }

  // Simon 2x2
  function simon({startLen=1}){
    const bus=emitter();
    let seq=[],input=[],running=false,level=0,showing=false;
    function newSeq(){
      seq=[]; for(let i=0;i<startLen+level;i++) seq.push(randInt(0,3));
    }
    function show(){
      showing=true; input=[];
      bus.emit("show",{seq});
      let i=0;
      const iv=setInterval(()=>{
        if(i>=seq.length){ clearInterval(iv); showing=false; bus.emit("ready",state()); return; }
        bus.emit("flash",{tile:seq[i],index:i});
        i++;
      }, 520);
    }
    function start(){ running=true; level=0; newSeq(); show(); bus.emit("start",state()); }
    function press(tile){
      if(!running || showing) return;
      input.push(tile);
      const idx=input.length-1;
      if(input[idx]!==seq[idx]){ running=false; bus.emit("end",state()); return; }
      if(input.length===seq.length){ level++; newSeq(); setTimeout(show, 650); }
      bus.emit("tick",state());
    }
    function state(){ return {running,level,seqLen:seq.length}; }
    return { on:bus.on, start, press, state };
  }

  // Memory grid
  function memoryGrid({startSize=3,maxSize=6,showMs=900}){
    const bus=emitter();
    let size=startSize,running=false,marks=new Set(),chosen=new Set(),score=0,level=0;
    function gen(){
      marks=new Set();
      const total=size*size;
      const count=Math.min(total-1, 2+level);
      while(marks.size<count) marks.add(randInt(0,total-1));
    }
    function next(){
      chosen=new Set(); gen();
      bus.emit("show", state());
      setTimeout(()=>bus.emit("hide", state()), showMs);
    }
    function start(){ running=true; size=startSize; score=0; level=0; next(); bus.emit("start",state()); }
    function pick(idx){
      if(!running) return;
      chosen.add(idx); bus.emit("tick", state());
      if(chosen.size>=marks.size){
        let ok=true; marks.forEach(m=>{ if(!chosen.has(m)) ok=false; });
        if(ok){
          score += marks.size; level++;
          if(level%2===0 && size<maxSize) size++;
          next();
        }else{ running=false; bus.emit("end", state()); }
      }
    }
    function state(){ return {running,size,marks:[...marks],chosen:[...chosen],score,level,showMs}; }
    return { on:bus.on, start, pick, state };
  }

  // Stroop
  function stroop({trials=60}){
    const bus=emitter();
    const colors=[
      {name:"Rot", val:"#ef4444"},
      {name:"Grün",val:"#22c55e"},
      {name:"Blau",val:"#3b82f6"},
      {name:"Gelb",val:"#f59e0b"},
    ];
    let running=false,i=0,cur=null,shownAt=0,errors=0,results=[];
    function next(){
      const word=colors[randInt(0,3)];
      const ink=colors[randInt(0,3)];
      cur={word:word.name, ink:ink.name, inkVal:ink.val, compatible: word.name===ink.name};
      shownAt=now(); bus.emit("stim",cur);
    }
    function start(){ running=true; i=0; errors=0; results=[]; next(); bus.emit("start",state()); }
    function answer(colorName){
      if(!running) return;
      let rt=now()-shownAt;
      if(colorName!==cur.ink){ errors++; rt+=700; }
      results.push({rt,compatible:cur.compatible});
      i++; bus.emit("resp",state());
      if(i>=trials){ running=false; bus.emit("end",state()); return; }
      next();
    }
    function state(){
      const comp=results.filter(x=>x.compatible).map(x=>x.rt);
      const inc=results.filter(x=>!x.compatible).map(x=>x.rt);
      const avg=a=>a.length?a.reduce((p,c)=>p+c,0)/a.length:null;
      const idx=(avg(inc)??0)-(avg(comp)??0);
      return {running,i,trials,cur,errors,stroopIndexMs:idx||0,colors};
    }
    return { on:bus.on, start, answer, state, colors };
  }

  // Arrow stroop (reverse optional)
  function arrowStroop({trials=50,reverse=true}){
    const bus=emitter();
    const dirs=["←","→","↑","↓"];
    let running=false,i=0,cur="←",shownAt=0,errors=0,rts=[];
    function opp(d){ return d==="←"?"→":d==="→"?"←":d==="↑"?"↓":"↑"; }
    function next(){ cur=dirs[randInt(0,3)]; shownAt=now(); bus.emit("stim",{cur,reverse}); }
    function start(){ running=true; i=0; errors=0; rts=[]; next(); bus.emit("start",state()); }
    function press(dir){
      if(!running) return;
      let rt=now()-shownAt;
      const exp=reverse?opp(cur):cur;
      if(dir!==exp){ errors++; rt+=600; }
      rts.push(rt); i++; bus.emit("resp",state());
      if(i>=trials){ running=false; bus.emit("end",state()); return; }
      next();
    }
    function state(){
      const sorted=[...rts].sort((a,b)=>a-b);
      const med=sorted.length?sorted[Math.floor(sorted.length/2)]:null;
      return {running,i,trials,cur,errors,medianMs:med,reverse};
    }
    return { on:bus.on, start, press, state };
  }

  // Scroll speed
  function scrollSpeed({durationMs=10000}){
    const bus=emitter();
    let running=false,startT=0,events=0,deltaSum=0,container=null;
    function onWheel(e){
      if(!running) return;
      events++; deltaSum += Math.abs(e.deltaY);
      bus.emit("tick", state());
    }
    function loop(){
      if(!running) return;
      const t=now();
      const left=Math.max(0,durationMs-(t-startT));
      if(left<=0){ stop(); return; }
      requestAnimationFrame(loop);
    }
    function start(cont){
      container=cont; events=0; deltaSum=0;
      running=true; startT=now();
      container.addEventListener("wheel", onWheel, {passive:true});
      bus.emit("start", state());
      requestAnimationFrame(loop);
    }
    function stop(){
      if(!running) return;
      running=false;
      if(container) container.removeEventListener("wheel", onWheel);
      bus.emit("end", state());
    }
    function state(){
      const t=now();
      const elapsed=running?(t-startT):durationMs;
      const s=Math.max(.001, elapsed/1000);
      return {running,events,eventsPerSec:events/s,deltaPerSec:deltaSum/s,leftMs:Math.max(0,durationMs-(t-startT))};
    }
    return { on:bus.on, start, stop, state };
  }

  KS.util={now,clamp,rand,randInt,fmt,fmtMs};
  KS.storage={getBest,setBest,getHist,pushHist};
  KS.types={timedClicker,keyPress,reactionColor,reactionAudio,aimTargets,precisionCircle,tapTempo,stopAtTime,tapMetronome,perfectHitBar,goNoGo,dpadChoice,swipeReaction,simon,memoryGrid,stroop,arrowStroop,scrollSpeed};
  window.KS = KS;
})();