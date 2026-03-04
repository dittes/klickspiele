/**
 * game.js – Mahjong Solitaire Spiellogik
 * klickspiele.de · Vanilla JS · Kein Framework
 */
'use strict';

const Mahjong = (() => {

  /* ── Layout-Konstanten ─────────────────────── */
  const TW=62, TH=78, XH=TW/2, YH=TH/2, LX=9, LY=9, MAX_Z=4, PAD=MAX_Z*LY+10;

  /* ── Turtle-Layout 144 Steine [hx,hy,z] ──── */
  const LAYOUT=[
    // Ebene 0 – 80
    [12,0,0],[14,0,0],[16,0,0],[18,0,0],
    [8,2,0],[10,2,0],[12,2,0],[14,2,0],[16,2,0],[18,2,0],[20,2,0],[22,2,0],
    [0,4,0],[2,4,0],[4,4,0],[6,4,0],[8,4,0],[10,4,0],[12,4,0],[14,4,0],[16,4,0],[18,4,0],[20,4,0],[22,4,0],[24,4,0],[26,4,0],[28,4,0],[30,4,0],
    [4,6,0],[6,6,0],[8,6,0],[10,6,0],[12,6,0],[14,6,0],[16,6,0],[18,6,0],[20,6,0],[22,6,0],[24,6,0],[26,6,0],
    [4,8,0],[6,8,0],[8,8,0],[10,8,0],[12,8,0],[14,8,0],[16,8,0],[18,8,0],[20,8,0],[22,8,0],[24,8,0],[26,8,0],
    [0,10,0],[2,10,0],[4,10,0],[6,10,0],[8,10,0],[10,10,0],[12,10,0],[14,10,0],[16,10,0],[18,10,0],[20,10,0],[22,10,0],[24,10,0],[26,10,0],[28,10,0],[30,10,0],
    [8,12,0],[10,12,0],[12,12,0],[14,12,0],[16,12,0],[18,12,0],[20,12,0],[22,12,0],
    [12,14,0],[14,14,0],[16,14,0],[18,14,0],
    // Ebene 1 – 36
    [6,4,1],[8,4,1],[10,4,1],[12,4,1],[14,4,1],[16,4,1],[18,4,1],[20,4,1],[22,4,1],
    [6,6,1],[8,6,1],[10,6,1],[12,6,1],[14,6,1],[16,6,1],[18,6,1],[20,6,1],[22,6,1],
    [6,8,1],[8,8,1],[10,8,1],[12,8,1],[14,8,1],[16,8,1],[18,8,1],[20,8,1],[22,8,1],
    [6,10,1],[8,10,1],[10,10,1],[12,10,1],[14,10,1],[16,10,1],[18,10,1],[20,10,1],[22,10,1],
    // Ebene 2 – 16
    [8,6,2],[10,6,2],[12,6,2],[14,6,2],[16,6,2],[18,6,2],[20,6,2],[22,6,2],
    [8,8,2],[10,8,2],[12,8,2],[14,8,2],[16,8,2],[18,8,2],[20,8,2],[22,8,2],
    // Ebene 3 – 8
    [10,6,3],[12,6,3],[14,6,3],[16,6,3],[10,8,3],[12,8,3],[14,8,3],[16,8,3],
    // Ebene 4 – 4
    [12,6,4],[14,6,4],[12,8,4],[14,8,4],
  ];

  /* ── Steingesichter (144) ───────────────────── */
  const CJK=['一','二','三','四','五','六','七','八','九'];
  const WINDS=['東','南','西','北'];
  const DRAG=[{s:'中',c:'#c62828'},{s:'發',c:'#2e7d32'},{s:'白',c:'#546e7a'}];
  const SEA=['春','夏','秋','冬'], FLO=['梅','蘭','菊','竹'];

  function buildFaces(){
    const f=[];
    for(let v=0;v<9;v++) for(let i=0;i<4;i++) f.push({id:v,    s:CJK[v],     sub:'万',c:'#c62828'});
    for(let v=0;v<9;v++) for(let i=0;i<4;i++) f.push({id:9+v,  s:String(v+1),sub:'索',c:'#2e7d32'});
    for(let v=0;v<9;v++) for(let i=0;i<4;i++) f.push({id:18+v, s:String(v+1),sub:'筒',c:'#1565c0'});
    for(let w=0;w<4;w++) for(let i=0;i<4;i++) f.push({id:27+w, s:WINDS[w],   sub:'風',c:'#37474f'});
    for(let d=0;d<3;d++) for(let i=0;i<4;i++) f.push({id:31+d, s:DRAG[d].s,  sub:'',  c:DRAG[d].c});
    for(let s=0;s<4;s++)                       f.push({id:34,   s:SEA[s],     sub:'季',c:'#6a1b9a'});
    for(let fl=0;fl<4;fl++)                    f.push({id:35,   s:FLO[fl],    sub:'花',c:'#ad1457'});
    return f; // 144
  }

  /* ── State ──────────────────────────────────── */
  let tiles=[],selected=null,hintPair=[],history=[];
  let secs=0,tRef=null,tOn=false,score=0,pairs=72,boardEl=null;

  /* ── Utils ──────────────────────────────────── */
  const q=s=>document.querySelector(s);
  const fmt=s=>`${0|s/60}:${String(s%60).padStart(2,'0')}`;
  const shuffle=a=>{ for(let i=a.length-1;i>0;i--){const j=0|Math.random()*(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; };
  const tileX=t=>t.hx*XH+t.z*LX;
  const tileY=t=>t.hy*YH-t.z*LY+PAD;

  /* ── Free-Check ─────────────────────────────── */
  const abv=t=>tiles.some(o=>!o.removed&&o!==t&&o.z>t.z&&Math.abs(o.hx-t.hx)<2&&Math.abs(o.hy-t.hy)<2);
  const blL=t=>tiles.some(o=>!o.removed&&o!==t&&o.z===t.z&&o.hx+2===t.hx&&Math.abs(o.hy-t.hy)<2);
  const blR=t=>tiles.some(o=>!o.removed&&o!==t&&o.z===t.z&&o.hx===t.hx+2&&Math.abs(o.hy-t.hy)<2);
  const free=t=>!t.removed&&!abv(t)&&(!blL(t)||!blR(t));
  const match=(a,b)=>a!==b&&!a.removed&&!b.removed&&a.face.id===b.face.id;

  /* ── Move search ────────────────────────────── */
  function findMoves(){
    const fr=tiles.filter(t=>!t.removed&&free(t)),m=[];
    for(let i=0;i<fr.length-1;i++) for(let j=i+1;j<fr.length;j++) if(match(fr[i],fr[j])) m.push([fr[i],fr[j]]);
    return m;
  }

  /* ── DOM ────────────────────────────────────── */
  function renderAll(){ boardEl.innerHTML=''; tiles.forEach(t=>{if(!t.removed){t.el=mkEl(t);boardEl.appendChild(t.el);}}); }

  function mkEl(t){
    const f=free(t), zi=t.z*300+t.hy*10+(t.hx/2);
    const el=document.createElement('div');
    el.className='mj-tile '+(f?'mj-free':'mj-blocked');
    el.style.cssText=`left:${tileX(t)}px;top:${tileY(t)}px;z-index:${Math.round(zi)}`;
    el.setAttribute('role','button'); el.setAttribute('tabindex',f?'0':'-1');
    el.setAttribute('aria-label',`${t.face.s}${t.face.sub} ${f?'frei':'blockiert'}`);
    el.dataset.id=t.id;
    el.innerHTML=`<span class="mj-sub" style="color:${t.face.c}">${t.face.sub||'&nbsp;'}</span>`
                +`<span class="mj-sym" style="color:${t.face.c}">${t.face.s}</span>`
                +`<span class="mj-sub mj-sub-b" style="color:${t.face.c}">${t.face.sub||'&nbsp;'}</span>`;
    el.addEventListener('click',()=>onClick(t));
    el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();onClick(t);} });
    return el;
  }

  function updEl(t){
    if(!t.el) return;
    const f=free(t),sel=t===selected,hint=hintPair.includes(t);
    t.el.className=['mj-tile',f?'mj-free':'mj-blocked',sel?'mj-selected':'',hint?'mj-hint':''].filter(Boolean).join(' ');
    t.el.tabIndex=f?0:-1;
  }
  const updAll=()=>tiles.forEach(t=>{if(!t.removed)updEl(t);});

  /* ── Click ──────────────────────────────────── */
  function onClick(t){
    if(t.removed||!free(t)) return;
    clearHint(); startTimer();
    if(!selected)         { selected=t; updEl(t); }
    else if(selected===t) { selected=null; updEl(t); }
    else if(match(selected,t)) removePair(selected,t);
    else { const p=selected; selected=t; updEl(p); updEl(t); }
  }

  function removePair(a,b){
    history.push([a.id,b.id]); selected=null; pairs--; score+=10; updStatus();
    [a,b].forEach(t=>{
      t.el.classList.add('mj-removing');
      t.el.addEventListener('animationend',()=>{t.removed=true;t.el?.remove();t.el=null;},{once:true});
    });
    setTimeout(()=>{ updAll(); if(checkWin()) return; if(!findMoves().length) showOv('nomoves'); },350);
  }

  /* ── Win ────────────────────────────────────── */
  function checkWin(){
    if(!tiles.every(t=>t.removed)) return false;
    stopTimer(); saveBest();
    q('#mj-win-time').textContent=fmt(secs);
    q('#mj-win-score').textContent=score;
    showOv('win'); return true;
  }

  /* ── Hint ───────────────────────────────────── */
  function clearHint(){ hintPair.forEach(t=>updEl(t)); hintPair=[]; }
  function showHint(){
    clearHint();
    const m=findMoves(); if(!m.length){showOv('nomoves');return;}
    hintPair=m[0|Math.random()*m.length];
    hintPair.forEach(t=>updEl(t));
    setTimeout(clearHint,4000);
  }

  /* ── Shuffle ────────────────────────────────── */
  function shuffleBoard(tries=10){
    const rem=tiles.filter(t=>!t.removed);
    const faces=shuffle(rem.map(t=>t.face));
    rem.forEach((t,i)=>{
      t.face=faces[i];
      if(t.el){
        t.el.querySelector('.mj-sym').textContent=t.face.s;
        t.el.querySelector('.mj-sym').style.color=t.face.c;
        t.el.querySelectorAll('.mj-sub').forEach(s=>{s.textContent=t.face.sub||'\u00a0';s.style.color=t.face.c;});
      }
    });
    selected=null; clearHint(); updAll();
    if(tries>0&&!findMoves().length) shuffleBoard(tries-1);
    updStatus();
  }

  /* ── Undo ───────────────────────────────────── */
  function undo(){
    if(!history.length) return;
    const [id1,id2]=history.pop();
    [id1,id2].forEach(id=>{
      const t=tiles.find(x=>x.id===id); if(!t) return;
      t.removed=false; t.el=mkEl(t); boardEl.appendChild(t.el);
    });
    pairs++; score=Math.max(0,score-10); selected=null; clearHint(); updAll(); updStatus(); hideOv();
  }

  /* ── Timer ──────────────────────────────────── */
  function startTimer(){ if(tOn) return; tOn=true; tRef=setInterval(()=>{secs++;q('#mj-timer').textContent=fmt(secs);},1000); }
  function stopTimer(){ tOn=false; clearInterval(tRef); tRef=null; }

  /* ── Highscore ──────────────────────────────── */
  function saveBest(){
    try{
      const prev=parseInt(localStorage.getItem('mj_best'))||Infinity;
      if(secs<prev){localStorage.setItem('mj_best',secs);q('#mj-new-best').hidden=false;}
      const best=Math.min(secs,isFinite(prev)?prev:secs);
      q('#mj-best-time').textContent=fmt(best);
      q('#mj-win-best').textContent=fmt(best);
    }catch(e){}
  }
  function loadBest(){ try{const s=parseInt(localStorage.getItem('mj_best'));if(!isNaN(s))q('#mj-best-time').textContent=fmt(s);}catch(e){} }

  /* ── Status ─────────────────────────────────── */
  function updStatus(){ q('#mj-pairs').textContent=pairs; q('#mj-score').textContent=score; }

  /* ── Overlay ────────────────────────────────── */
  function showOv(type){
    stopTimer();
    const ov=q('#mj-overlay'); ov.hidden=false; ov.setAttribute('aria-hidden','false');
    q('#mj-win').hidden=(type!=='win'); q('#mj-nomoves').hidden=(type!=='nomoves');
    setTimeout(()=>ov.querySelector('button')?.focus(),50);
  }
  function hideOv(){ const ov=q('#mj-overlay'); ov.hidden=true; ov.setAttribute('aria-hidden','true'); }

  /* ── New Game ───────────────────────────────── */
  function newGame(){
    stopTimer(); secs=0; score=0; pairs=72; selected=null; hintPair=[]; history=[]; tOn=false;
    q('#mj-timer').textContent='0:00'; q('#mj-new-best').hidden=true;
    hideOv();
    const faces=shuffle(buildFaces());
    tiles=LAYOUT.map((p,i)=>({id:i,hx:p[0],hy:p[1],z:p[2],face:faces[i],removed:false,el:null}));
    for(let t=0;t<20&&!findMoves().length;t++){shuffle(faces);tiles.forEach((tile,i)=>{tile.face=faces[i];});}
    renderAll(); updStatus(); loadBest();
  }

  /* ── Dark Mode ──────────────────────────────── */
  function toggleDark(){
    document.body.classList.toggle('dark-mode');
    const d=document.body.classList.contains('dark-mode');
    try{localStorage.setItem('mj_dark',d?'1':'0');}catch(e){}
    q('#dark-icon').textContent=d?'☀':'🌙';
  }

  /* ── Init ───────────────────────────────────── */
  function init(){
    boardEl=q('#mj-board'); if(!boardEl) return;
    try{if(localStorage.getItem('mj_dark')==='1')document.body.classList.add('dark-mode');}catch(e){}
    q('#dark-icon').textContent=document.body.classList.contains('dark-mode')?'☀':'🌙';

    const bw=30*XH+MAX_Z*LX+TW+6, bh=14*YH+TH+PAD+6;
    boardEl.style.width=bw+'px'; boardEl.style.height=bh+'px';

    q('#btn-new')?.addEventListener('click',newGame);
    q('#btn-hint')?.addEventListener('click',showHint);
    q('#btn-shuffle')?.addEventListener('click',()=>{hideOv();shuffleBoard();});
    q('#btn-undo')?.addEventListener('click',undo);
    q('#btn-dark')?.addEventListener('click',toggleDark);
    q('#btn-new-win')?.addEventListener('click',newGame);
    q('#btn-new-nm')?.addEventListener('click',newGame);
    q('#btn-shuffle-nm')?.addEventListener('click',()=>{hideOv();shuffleBoard();});
    q('#btn-undo-nm')?.addEventListener('click',()=>{hideOv();undo();});
    q('#mj-overlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)hideOv();});

    // Ripple
    document.addEventListener('pointerdown',e=>{
      const h=e.target.closest('.rpl');if(!h)return;
      const r=h.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,
            sz=Math.max(r.width,r.height)*2.4,w=document.createElement('span');
      w.className='rpl-wave';w.style.cssText=`width:${sz}px;height:${sz}px;left:${x-sz/2}px;top:${y-sz/2}px`;
      h.appendChild(w);w.addEventListener('animationend',()=>w.remove(),{once:true});
    },{passive:true});

    newGame();
  }

  return {init};
})();

document.addEventListener('DOMContentLoaded',()=>Mahjong.init());
