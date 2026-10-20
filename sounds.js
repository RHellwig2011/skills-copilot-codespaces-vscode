// Sound effects synthesized with Web Audio, so there are no audio files to load.
// Muted until the viewer turns sound on; the choice is remembered per browser.
const sfx = (() => {
  let ctx = null;
  let on = false;
  try { on = localStorage.getItem("erikderSound") === "on"; } catch {}

  function audio() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type = "sine", gain = 0.15, endFreq = freq) {
    const a = audio();
    const t = a.currentTime + start;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  function noise(start, dur, gain, freq, endFreq = freq) {
    const a = audio();
    const t = a.currentTime + start;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const filter = a.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(a.destination);
    src.start(t);
  }

  const sounds = {
    whoosh: () => noise(0, 0.3, 0.4, 400, 2500),
    match: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, "triangle", 0.15)),
    shout: () => { tone(140, 0, 0.9, "sawtooth", 0.25, 50); noise(0, 0.7, 0.5, 300, 120); },
    snap: () => { noise(0, 0.06, 0.6, 3500); tone(1600, 0, 0.05, "square", 0.08); },
    turn: () => noise(0, 0.18, 0.25, 600, 300),
    unlock: () => { tone(300, 0, 0.08, "square", 0.1); tone(600, 0.1, 0.3, "triangle", 0.15); },
    pop: () => tone(700, 0, 0.1, "sine", 0.15, 1100),
    right: () => { tone(660, 0, 0.12, "triangle"); tone(990, 0.1, 0.2, "triangle"); },
    wrong: () => tone(220, 0, 0.35, "sawtooth", 0.1, 110),
  };

  return {
    get on() { return on; },
    toggle() {
      on = !on;
      try { localStorage.setItem("erikderSound", on ? "on" : "off"); } catch {}
      return on;
    },
    play(name) {
      if (!on || !sounds[name]) return;
      try { sounds[name](); } catch {}
    },
  };
})();
