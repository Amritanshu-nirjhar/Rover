// Ambient space-organ score, generated live with the Web Audio API (original music, no audio file).
// Browsers block sound until the visitor interacts, so it starts on the first click/tap/key and fades in.
(() => {
  const ctx = new AudioContext();
  const midi = n => 440 * 2 ** ((n - 69) / 12);
  const rand = (a, b) => a + Math.random() * (b - a);

  // Signal chain: voices -> master -> (dry + long reverb) -> gentle low-pass -> speakers.
  const master = ctx.createGain();
  master.gain.value = 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  const verb = ctx.createConvolver(), len = ctx.sampleRate * 5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  verb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = .7;
  master.connect(lp);
  master.connect(verb).connect(wet).connect(lp);
  lp.connect(ctx.destination);

  // Pipe-organ-like voice: a few soft harmonics with a slow swell.
  function organ(note, t, dur, vol) {
    for (const [mult, type, g] of [[.5, 'sine', .35], [1, 'sine', .5], [2, 'sine', .22], [3, 'triangle', .06], [4, 'sine', .05]]) {
      const osc = ctx.createOscillator(), env = ctx.createGain();
      osc.type = type;
      osc.frequency.value = midi(note) * mult;
      osc.detune.value = rand(-5, 5);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vol * g, t + Math.min(dur * .35, 2.5));
      env.gain.setValueAtTime(vol * g, t + dur * .75);
      env.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(env).connect(master);
      osc.start(t);
      osc.stop(t + dur + .05);
    }
  }

  // Am – F – C – G, eight seconds each, with a quiet repeating figure on top.
  const CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]];
  const FIGURE = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0, 1];
  const BAR = 8;
  let next = 0, bar = 0;
  function schedule() {
    if (next < ctx.currentTime) next = ctx.currentTime + .1;   // never schedule a backlog after a pause
    while (next < ctx.currentTime + 2) {
      const c = CHORDS[bar % CHORDS.length];
      organ(c[0] - 24, next, BAR + .5, .16);                       // pedal bass
      for (const n of c) organ(n, next, BAR + .5, .07);            // held chord
      if (bar >= 2) FIGURE.forEach((k, j) => organ(c[k] + 12, next + j * BAR / FIGURE.length, BAR / FIGURE.length * 1.6, .035));
      next += BAR;
      bar++;
    }
  }

  // ---- On/off control ----
  let wanted = true;
  try { wanted = localStorage.getItem('music') !== 'off'; } catch (e) {}
  const btn = document.createElement('button');
  btn.type = 'button';
  Object.assign(btn.style, {
    position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 6, font: '13px system-ui, sans-serif',
    color: '#fff', background: 'rgba(10,12,20,.7)', border: '1px solid rgba(255,255,255,.25)', borderRadius: '999px',
    padding: '6px 14px', cursor: 'pointer', backdropFilter: 'blur(6px)',
  });
  const label = () => {
    btn.textContent = !wanted ? '♪ Music off' : ctx.state === 'running' ? '♪ Music on' : '♪ Click anywhere for music';
    btn.setAttribute('aria-pressed', String(wanted && ctx.state === 'running'));
  };
  function fadeTo(v) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(v, ctx.currentTime + (v ? 4 : .6));
  }
  async function start() {
    if (!wanted) return;
    await ctx.resume().catch(() => {});
    if (ctx.state !== 'running') return label();
    if (!next) next = ctx.currentTime + .1;
    fadeTo(.9);
    label();
  }
  btn.onclick = e => {
    e.stopPropagation();
    wanted = !wanted;
    try { localStorage.setItem('music', wanted ? 'on' : 'off'); } catch (err) {}
    wanted ? start() : fadeTo(0);
    label();
  };
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, start, { passive: true });
  setInterval(() => { if (ctx.state === 'running') schedule(); }, 250);
  document.body.append(btn);
  label();
  start();   // plays immediately if the browser allows autoplay for this site
})();
