(function(){
  const DEF = window.__GAME__;
  function createInstance(container, mode){
    const t = DEF.type;
    const cfg = Object.assign({}, mode||{});
    container.style.webkitTapHighlightColor = "transparent";

    if(t === "timedClicker"){
      return KS.types.timedClicker({container, durationMs: cfg.durationMs || 10000, movingZone:false});
    }
    if(t === "timedClickerMoving"){
      return KS.types.timedClicker({container, durationMs: cfg.durationMs || 10000, movingZone:true});
    }
    if(t === "keyPress"){
      return KS.types.keyPress({targetKey:" ", durationMs: cfg.durationMs || 10000, noRepeat:true});
    }
    if(t === "reactionColor"){
      return KS.types.reactionColor({trials: cfg.trials || 10});
    }
    if(t === "reactionAudio"){
      return KS.types.reactionAudio({trials: cfg.trials || 10});
    }
    if(t === "aimTargets"){
      return KS.types.aimTargets({targets: cfg.targets || 30, shrink: (cfg.targets||0) >= 60});
    }
    if(t === "precisionCircle"){
      return KS.types.precisionCircle({rounds: cfg.rounds || 10, timeLimitMs: 3000});
    }
    if(t === "tapTempo"){
      return KS.types.tapTempo();
    }
    if(t === "stopAtTime"){
      return KS.types.stopAtTime({targetMs: cfg.targetMs || 10000});
    }
    if(t === "tapMetronome"){
      return KS.types.tapMetronome({bpm: cfg.bpm || 120, taps: cfg.taps || 40});
    }
    if(t === "perfectHitBar"){
      return KS.types.perfectHitBar({rounds: cfg.rounds || 20, speed: cfg.speed || 1.0});
    }
    if(t === "goNoGo"){
      return KS.types.goNoGo({durationMs: cfg.durationMs || 60000});
    }
    if(t === "dpadChoice"){
      return KS.types.dpadChoice({trials: cfg.trials || 50});
    }
    if(t === "swipeReaction"){
      return KS.types.swipeReaction({trials: cfg.trials || 50});
    }
    if(t === "simon"){
      return KS.types.simon({startLen: cfg.startLen || 1});
    }
    if(t === "memoryGrid"){
      return KS.types.memoryGrid({startSize: cfg.startSize || 3, maxSize:6, showMs: 900});
    }
    if(t === "stroop"){
      return KS.types.stroop({trials: cfg.trials || 60});
    }
    if(t === "arrowStroop"){
      return KS.types.arrowStroop({trials: cfg.trials || 50, reverse: cfg.reverse !== false});
    }
    if(t === "scrollSpeed"){
      return KS.types.scrollSpeed({durationMs: cfg.durationMs || 10000});
    }
    return KS.types.timedClicker({container, durationMs: cfg.durationMs || 10000, movingZone:false});
  }

  window.KS_GAME = { createInstance };
})();
