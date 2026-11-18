/* ============================================================
   core.js — utilitaires, réglages, particules, sons, modales
   ============================================================ */
(function () {
  'use strict';
  const NU = (window.NU = window.NU || {});
  const cfg = (NU.cfg = window.CONFIG || {});

  /* ---------- Helpers ---------- */
  NU.$ = (s, r = document) => r.querySelector(s);
  NU.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  NU.rand = (a, b) => a + Math.random() * (b - a);
  NU.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  NU.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  NU.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  NU.cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  NU.mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  NU.shuffle = (arr, rng = Math.random) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  NU.get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  NU.fmt = (str, vars = {}) => {
    const v = Object.assign({ her: cfg.herName, Her: NU.cap(cfg.herName || ''), me: cfg.myName, Me: NU.cap(cfg.myName || '') }, vars);
    return String(str).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  };
  NU.t = (path, vars) => {
    const v = NU.get(cfg.texts || {}, path);
    if (v == null) return '';
    if (typeof v === 'string') return NU.fmt(v, vars);
    if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? NU.fmt(x, vars) : x));
    return v;
  };
  NU.applyTexts = (root = document) => {
    NU.$$('[data-t]', root).forEach((el) => { const s = NU.t(el.dataset.t); if (s) el.textContent = s; });
    NU.$$('[data-tt]', root).forEach((el) => { const s = NU.t(el.dataset.tt); if (s) { el.title = s; el.setAttribute('aria-label', s); } });
  };
  NU.icon = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

  NU.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    remove(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /* ---------- Réglages ---------- */
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  NU.settings = Object.assign({ sound: true, anim: !reduced }, NU.store.get('notre-univers:settings', {}) || {});
  NU.applySettings = () => {
    document.documentElement.classList.toggle('no-anim', !NU.settings.anim);
    NU.store.set('notre-univers:settings', NU.settings);
    if (NU.bg) NU.bg.setAmbient(NU.settings.anim);
    document.dispatchEvent(new CustomEvent('nu:settings'));
  };
  NU.isTouch = () => window.matchMedia && matchMedia('(pointer:coarse)').matches;

  /* ---------- Particules ---------- */
  const PATHS = {
    heart: new Path2D('M12 21s-7.5-4.6-9.6-9.3C.9 8.2 2.7 4.5 6.3 4.5c2 0 3.6 1 4.7 2.6l1 1.4 1-1.4c1.1-1.6 2.7-2.6 4.7-2.6 3.6 0 5.4 3.7 3.9 7.2C19.5 16.4 12 21 12 21z'),
    petal: new Path2D('M0 -1C.95 -.55 .8 .55 0 1C-.8 .55 -.95 -.55 0 -1Z'),
    star: new Path2D('M0 -1Q.1 -.1 1 0Q.1 .1 0 1Q-.1 .1 -1 0Q-.1 -.1 0 -1Z')
  };
  NU.PATHS = PATHS;
  const COLORS = ['#f4b6c2', '#e48fa3', '#f7a1a8', '#e0626f', '#ffd9de', '#f7c9a8', '#fff1c9', '#ffffff'];

  class Particles {
    constructor(canvas, dprCap, max) {
      this.c = canvas; this.ctx = canvas.getContext('2d'); this.dprCap = dprCap; this.max = max;
      this.list = []; this.emitters = []; this.running = false; this.ambient = false; this.mood = 'calm';
      this.resize(); window.addEventListener('resize', () => this.resize());
    }
    resize() {
      this.d = Math.min(window.devicePixelRatio || 1, this.dprCap);
      this.w = window.innerWidth; this.h = window.innerHeight;
      this.c.width = Math.round(this.w * this.d); this.c.height = Math.round(this.h * this.d);
    }
    add(p) { if (this.list.length < this.max) { this.list.push(p); this.start(); } }
    start() { if (this.running) return; this.running = true; this.last = performance.now(); requestAnimationFrame((t) => this.loop(t)); }
    setAmbient(on) { this.ambient = !!on; if (on) this.start(); else { this.list = this.list.filter((p) => !p.amb); } }
    emit(e) { this.emitters.push(Object.assign({ acc: 0, t: 0 }, e)); this.start(); }
    spawnAmbient() {
      const target = (this.mood === 'intro' ? 30 : 16) * (this.w < 600 ? 0.6 : 1);
      let count = 0; for (const p of this.list) if (p.amb) count++;
      if (count >= target) return;
      const r = Math.random(); const type = r < 0.5 ? 'heart' : r < 0.75 ? 'star' : 'petal';
      const p = {
        amb: true, type, x: Math.random() * this.w, y: type === 'petal' ? -20 : this.h + 20,
        vx: NU.rand(-8, 8), vy: type === 'petal' ? NU.rand(18, 36) : NU.rand(-42, -18), g: 0,
        rot: NU.rand(0, 6.28), vr: NU.rand(-0.8, 0.8), size: type === 'star' ? NU.rand(4, 9) : NU.rand(5, 12),
        life: 1e9, base: NU.rand(0.18, 0.42), color: NU.pick(COLORS), sway: NU.rand(6, 22), sf: NU.rand(0.4, 1.2), sp: NU.rand(0, 6.28),
        twinkle: type === 'star' ? NU.rand(1.5, 3.5) : 0, t: 0
      };
      if (type === 'star') { p.y = NU.rand(0, this.h); p.x = NU.rand(0, this.w); p.vy = NU.rand(-4, 4); p.vx = 0; p.life = NU.rand(4, 9); p.amb = true; p.fadeAll = true; }
      this.list.push(p);
    }
    loop(now) {
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      const ctx = this.ctx; ctx.setTransform(this.d, 0, 0, this.d, 0, 0); ctx.clearRect(0, 0, this.w, this.h);
      // émetteurs
      for (const e of this.emitters) {
        e.t += dt; e.acc += dt * e.rate;
        while (e.acc >= 1) { e.acc -= 1; this.add(e.make()); }
      }
      this.emitters = this.emitters.filter((e) => e.t < e.dur);
      if (this.ambient) { if (Math.random() < 0.25) this.spawnAmbient(); }
      const out = [];
      for (const p of this.list) {
        p.t += dt;
        p.vy += (p.g || 0) * dt;
        p.x += p.vx * dt + (p.sway ? Math.cos(p.t * p.sf + p.sp) * p.sway * dt : 0);
        p.y += p.vy * dt; p.rot += p.vr * dt;
        p.life -= dt;
        if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
        const off = p.y < -40 || p.y > this.h + 40 || p.x < -60 || p.x > this.w + 60;
        if (p.life <= 0 || (off && p.t > 0.3)) continue;
        let a = p.base != null ? p.base : 1;
        if (p.twinkle) a *= 0.5 + 0.5 * Math.sin(p.t * p.twinkle);
        if (p.fadeAll && p.life < 1.5) a *= Math.max(0, p.life / 1.5);
        else if (p.fade && p.life < p.fade) a *= Math.max(0, p.life / p.fade);
        if (p.fadeIn && p.t < p.fadeIn) a *= p.t / p.fadeIn;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.fillStyle = p.color;
        if (p.type === 'heart') { const k = p.size / 12; ctx.scale(k, k); ctx.translate(-12, -12.5); ctx.fill(PATHS.heart); }
        else if (p.type === 'petal') { ctx.scale(p.size * 0.6, p.size); ctx.fill(PATHS.petal); }
        else if (p.type === 'star') { ctx.scale(p.size, p.size); ctx.fill(PATHS.star); }
        else { ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
        ctx.restore();
        out.push(p);
      }
      this.list = out;
      if (this.list.length || this.emitters.length || this.ambient) requestAnimationFrame((t) => this.loop(t));
      else { this.running = false; ctx.clearRect(0, 0, this.w, this.h); }
    }
  }

  NU.initFx = () => {
    NU.bg = new Particles(NU.$('#bg-canvas'), 1, 80);
    NU.fx = new Particles(NU.$('#fx-canvas'), 2, 420);
  };

  const anim = () => NU.settings.anim;
  NU.burst = (x, y, o = {}) => {
    if (!anim() || !NU.fx) return;
    const n = o.n || 14, types = o.types || ['heart', 'star'], sp = o.speed || 260, size = o.size || [6, 14];
    for (let i = 0; i < n; i++) {
      const ang = o.up ? NU.rand(-Math.PI * 0.95, -Math.PI * 0.05) : NU.rand(0, Math.PI * 2); const s = NU.rand(sp * 0.35, sp);
      NU.fx.add({ type: NU.pick(types), x, y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, g: o.gravity != null ? o.gravity : 380, drag: 1.1,
        rot: NU.rand(0, 6.28), vr: NU.rand(-4, 4), size: NU.rand(size[0], size[1]), life: NU.rand(o.life ? o.life[0] : 0.9, o.life ? o.life[1] : 1.7), fade: 0.6, color: NU.pick(COLORS) });
    }
  };
  NU.sparkle = (x, y) => NU.burst(x, y, { n: 6, types: ['star'], speed: 120, gravity: 40, size: [3, 7], life: [0.5, 1] });
  NU.rain = (o = {}) => {
    if (!anim() || !NU.fx) return;
    const types = o.types || ['petal'];
    NU.fx.emit({ rate: o.rate || 18, dur: o.duration || 6, make: () => {
      const t = NU.pick(types);
      return { type: t, x: NU.rand(-20, NU.fx.w + 20), y: -20, vx: NU.rand(-20, 30), vy: NU.rand(60, 140), g: 0, rot: NU.rand(0, 6.28), vr: NU.rand(-2, 2),
        size: t === 'petal' ? NU.rand(6, 11) : NU.rand(6, 13), life: 20, sway: NU.rand(20, 50), sf: NU.rand(0.8, 2), sp: NU.rand(0, 6.28),
        color: t === 'petal' ? NU.pick(['#f9c6cf', '#f4b6c2', '#ffd9de', '#fbe0e6']) : NU.pick(COLORS) };
    } });
  };
  NU.sparkleField = (dur = 5) => {
    if (!anim() || !NU.fx) return;
    NU.fx.emit({ rate: 40, dur, make: () => ({ type: 'star', x: NU.rand(0, NU.fx.w), y: NU.rand(0, NU.fx.h), vx: 0, vy: NU.rand(-6, 6), g: 0, rot: NU.rand(0, 3), vr: NU.rand(-1, 1),
      size: NU.rand(4, 11), life: NU.rand(0.7, 1.5), fade: 0.6, fadeIn: 0.25, color: NU.pick(['#ffffff', '#fff1c9', '#ffd9de']) }) });
  };
  NU.floatHearts = (dur = 6, rate = 9) => {
    if (!anim() || !NU.fx) return;
    NU.fx.emit({ rate, dur, make: () => ({ type: 'heart', x: NU.rand(0, NU.fx.w), y: NU.fx.h + 20, vx: 0, vy: NU.rand(-130, -60), g: 0, rot: NU.rand(-0.5, 0.5), vr: NU.rand(-0.5, 0.5),
      size: NU.rand(8, 22), life: 20, sway: NU.rand(14, 40), sf: NU.rand(0.8, 2), sp: NU.rand(0, 6.28), base: 0.85, color: NU.pick(['#f4a0b0', '#e0626f', '#ffd9de', '#f7a1a8']) }) });
  };

  /* ---------- Sons (synthèse WebAudio, sans fichier) ---------- */
  let ac = null, master = null;
  function ensure() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!ac && AC) { try { ac = new AC(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  function tone(f, at, dur, o = {}) {
    const t = ac.currentTime + at; const osc = ac.createOscillator(); const g = ac.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain || 0.15, t + (o.a || 0.006)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(at, dur, o = {}) {
    const t = ac.currentTime + at; const len = Math.floor(ac.sampleRate * dur); const buf = ac.createBuffer(1, len, ac.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(o.from || 1000, t); bp.frequency.exponentialRampToValueAtTime(o.to || 3000, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain || 0.06, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(master); src.start(t);
  }
  const SYN = {
    place() { tone(880, 0, 0.22, { gain: 0.12 }); tone(1318.5, 0.06, 0.3, { gain: 0.1 }); tone(1760, 0.12, 0.36, { gain: 0.05 }); },
    join() { tone(660, 0, 0.16, { type: 'triangle', gain: 0.1 }); tone(990, 0.05, 0.22, { gain: 0.08 }); },
    rotate() { tone(520, 0, 0.07, { type: 'triangle', gain: 0.07, to: 720 }); },
    nope() { tone(240, 0, 0.18, { type: 'triangle', gain: 0.07, to: 170 }); },
    click() { tone(760, 0, 0.05, { type: 'triangle', gain: 0.045 }); },
    unlock() { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.12, 0.7, { gain: 0.11 })); },
    win() { [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => tone(f, i * 0.14, 0.8, { gain: 0.1 })); },
    envelope() { noise(0, 0.4, { from: 1200, to: 3600, gain: 0.07 }); tone(1046.5, 0.35, 0.6, { gain: 0.08 }); tone(1568, 0.48, 0.7, { gain: 0.06 }); },
    heart() { tone(520, 0, 0.2, { gain: 0.1, to: 900 }); tone(1040, 0.06, 0.22, { gain: 0.05 }); }
  };
  NU.sfx = {
    unlockAudio: ensure,
    play(name) {
      if (!NU.settings.sound) return;
      const f = cfg.sfx && cfg.sfx.files && cfg.sfx.files[name];
      const synth = () => { if (ensure() && SYN[name]) SYN[name](); };
      if (f) { try { const a = new Audio(f); a.volume = 0.6; a.onerror = synth; const p = a.play(); if (p && p.catch) p.catch(synth); return; } catch (e) { /* fallthrough */ } }
      synth();
    }
  };

  /* ---------- Phrases douces & modales ---------- */
  let wTimer = 0;
  NU.whisper = (text, ms = 4600) => {
    const el = NU.$('#whisper'); if (!el || !text) return;
    el.textContent = text; el.classList.add('show');
    clearTimeout(wTimer); wTimer = setTimeout(() => el.classList.remove('show'), ms);
  };

  NU.confirm = ({ title, text, yes, no }) => new Promise((resolve) => {
    const m = NU.$('#modal'); NU.$('#modal-title').textContent = title; NU.$('#modal-text').textContent = text;
    const box = NU.$('#modal-actions'); box.innerHTML = '';
    const mk = (label, cls, val) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = () => { m.hidden = true; resolve(val); }; box.appendChild(b); return b; };
    const nob = mk(no, 'ghost', false); mk(yes, 'primary', true);
    m.hidden = false; nob.focus();
  });

  /* Transition en voile : appelle midFn quand l'écran est couvert */
  NU.veil = async (midFn) => {
    const v = NU.$('#veil');
    if (!NU.settings.anim) { await midFn(); return; }
    v.classList.add('on'); await NU.sleep(620);
    await midFn(); await NU.sleep(120);
    v.classList.remove('on'); await NU.sleep(520);
  };

  NU.formatTime = (ms) => {
    const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60;
    const p = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(ss)}` : `${p(m)}:${p(ss)}`;
  };
})();
