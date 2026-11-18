/* ============================================================
   puzzle.js — moteur de puzzle (pièces réalistes, drag, rotation,
   zoom, sauvegarde automatique, validation stricte)
   ============================================================ */
(function () {
  'use strict';
  const NU = window.NU, cfg = NU.cfg, $ = NU.$;
  const KEY = 'notre-univers:puzzle:v1';
  const DIFF_KEY = 'notre-univers:difficulty';
  const WORLD_W = 1000;
  const P = (NU.puzzle = {});

  let els = {};
  let source = null;          // { img, w, h, url, sig }
  let G = null;               // géométrie
  let S = null;               // état sauvegardable
  let pieces = [];
  let edges = null;
  let view = { s: 1, tx: 0, ty: 0, fit: 1, min: 1, max: 3 };
  let sel = null, hoverPt = { x: 0, y: 0 };
  let mode = null, drag = null, pan = null, pinch = null;
  let lastTap = null, edgeRaf = 0;
  const ptrs = new Map();
  let timer = { on: false, last: 0, iv: 0 };
  let lastSave = 0, inputLocked = false, paused = false, active = false, msgTimer = 0, lastMsg = -1;
  let stageRect = { left: 0, top: 0, width: 1, height: 1 };
  const hitCtx = document.createElement('canvas').getContext('2d');
  let selectedDiff = null;

  const diffs = () => cfg.puzzle.difficulties;
  const diffById = (id) => diffs().find((d) => d.id === id) || diffs()[0];
  const norm = (p) => ((Math.round(p.rot) % 360) + 360) % 360;

  /* ---------- Image source ---------- */
  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  function fallbackSource() {
    const w = 1400, h = 1120, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const rng = NU.mulberry32(7);
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#ffe3e9'); g.addColorStop(0.5, '#fff3e6'); g.addColorStop(1, '#f6cdd6');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const cols = ['#f4b6c2', '#e48fa3', '#e0626f', '#f7c9a8', '#d9b99b', '#fff', '#c9a08a', '#f9d6a5'];
    for (let i = 0; i < 380; i++) {
      const t = rng(), px = rng() * w, py = rng() * h, s = 10 + rng() * 60;
      x.save(); x.translate(px, py); x.rotate(rng() * 6.28); x.globalAlpha = 0.25 + rng() * 0.6; x.fillStyle = cols[Math.floor(rng() * cols.length)];
      if (t < 0.4) { x.scale(s / 12, s / 12); x.translate(-12, -12.5); x.fill(NU.PATHS.heart); }
      else if (t < 0.65) { x.scale(s * 0.6, s * 0.6); x.fill(NU.PATHS.star); }
      else if (t < 0.85) { x.scale(s * 0.5, s); x.fill(NU.PATHS.petal); }
      else { x.beginPath(); x.arc(0, 0, s * 0.4, 0, 6.28); x.fill(); }
      x.restore();
    }
    x.save(); x.translate(w / 2, h / 2 - 40); x.scale(18, 18); x.translate(-12, -12.5);
    const rg = x.createLinearGradient(0, 4, 0, 21); rg.addColorStop(0, '#f4a0b0'); rg.addColorStop(1, '#c94d5c'); x.fillStyle = rg; x.fill(NU.PATHS.heart); x.restore();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'italic 600 70px Georgia, serif'; x.fillText('Notre petit univers', w / 2, h / 2 + 330);
    x.font = '28px sans-serif'; x.fillStyle = 'rgba(90,54,44,.7)'; x.fillText('Ajoute assets/images/puzzle.jpg pour remplacer cette image', w / 2, h / 2 + 380);
    return { img: c, w, h, url: c.toDataURL('image/jpeg', 0.85), sig: 'fallback-' + w + 'x' + h };
  }
  async function loadSource() {
    const list = [cfg.puzzle.image].concat(cfg.puzzle.imageFallbacks || []).filter(Boolean);
    for (const src of list) {
      try { const i = await loadImg(src); return { img: i, w: i.naturalWidth, h: i.naturalHeight, url: src, sig: src + '|' + i.naturalWidth + 'x' + i.naturalHeight }; } catch (e) { /* suivant */ }
    }
    return fallbackSource();
  }

  /* ---------- Géométrie & bords ---------- */
  function setGeometry(cols, rows) {
    const aspect = source.w / source.h;
    G = { cols, rows, W: WORLD_W, H: WORLD_W / aspect };
    G.cw = G.W / cols; G.ch = G.H / rows; G.M = 0.32 * WORLD_W; G.u = Math.min(G.cw, G.ch);
    G.pad = Math.ceil(0.34 * G.u);
    G.cvW = G.cw + 2 * G.pad; G.cvH = G.ch + 2 * G.pad;
    G.rad2 = (G.cvW * G.cvW + G.cvH * G.cvH) / 4;
  }
  function makeEdges(rng) {
    const mk = () => { const j = 0.04, u = () => (rng() * 2 - 1) * j; return { flip: rng() < 0.5, t: 0.095 + rng() * 0.02, a: u(), b: u(), c: u(), d: u(), e: u() }; };
    const H = [], V = [];
    for (let r = 0; r <= G.rows; r++) { H[r] = []; for (let c = 0; c < G.cols; c++) H[r][c] = (r === 0 || r === G.rows) ? null : mk(); }
    for (let r = 0; r < G.rows; r++) { V[r] = []; for (let c = 0; c <= G.cols; c++) V[r][c] = (c === 0 || c === G.cols) ? null : mk(); }
    return { H, V };
  }
  // 10 points (coordonnées plateau) d'un bord canonique (H : gauche→droite ; V : haut→bas)
  function edgePts(e, x0, y0, horiz) {
    const len = horiz ? G.cw : G.ch, u = G.u, sg = e && e.flip ? -1 : 1;
    const f = e ? [[0, 0], [0.2, e.a], [0.5 + e.b + e.d, -e.t + e.c], [0.5 - e.t + e.b, e.t + e.c], [0.5 - 2 * e.t + e.b - e.d, 3 * e.t + e.c], [0.5 + 2 * e.t + e.b - e.d, 3 * e.t + e.c], [0.5 + e.t + e.b, e.t + e.c], [0.5 + e.b + e.d, -e.t + e.c], [0.8, e.e], [1, 0]]
      : [[0, 0], [0.2, 0], [0.4, 0], [0.5, 0], [0.6, 0], [0.7, 0], [0.8, 0], [0.85, 0], [0.9, 0], [1, 0]];
    return f.map(([l, w]) => (horiz ? [x0 + len * l, y0 + u * w * sg] : [x0 + u * w * sg, y0 + len * l]));
  }
  function buildPath(r, c) {
    const x0 = c * G.cw, y0 = r * G.ch, path = new Path2D();
    const ox = (p) => p[0] - x0, oy = (p) => p[1] - y0;
    const top = edgePts(edges.H[r][c], x0, y0, true);
    const right = edgePts(edges.V[r][c + 1], x0 + G.cw, y0, false);
    const bottom = edgePts(edges.H[r + 1][c], x0, y0 + G.ch, true).reverse();
    const left = edgePts(edges.V[r][c], x0, y0, false).reverse();
    path.moveTo(0, 0);
    [top, right, bottom, left].forEach((pts) => {
      for (let i = 1; i < 10; i += 3) path.bezierCurveTo(ox(pts[i]), oy(pts[i]), ox(pts[i + 1]), oy(pts[i + 1]), ox(pts[i + 2]), oy(pts[i + 2]));
    });
    path.closePath();
    return path;
  }
  function renderCanvas(p, k, s) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(G.cvW * s); cv.height = Math.ceil(G.cvH * s);
    cv.style.width = G.cvW + 'px'; cv.style.height = G.cvH + 'px';
    const ctx = cv.getContext('2d');
    ctx.scale(cv.width / G.cvW, cv.height / G.cvH); ctx.translate(G.pad, G.pad);
    const x0 = p.c * G.cw, y0 = p.r * G.ch;
    ctx.save(); ctx.clip(p.path);
    const lx0 = Math.max(-G.pad, -x0), ly0 = Math.max(-G.pad, -y0), lx1 = Math.min(G.cw + G.pad, G.W - x0), ly1 = Math.min(G.ch + G.pad, G.H - y0);
    ctx.drawImage(source.img, (lx0 + x0) * k, (ly0 + y0) * k, (lx1 - lx0) * k, (ly1 - ly0) * k, lx0, ly0, lx1 - lx0, ly1 - ly0);
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = 3; ctx.stroke(p.path);
    ctx.restore();
    ctx.strokeStyle = 'rgba(70,35,35,.4)'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round'; ctx.stroke(p.path);
    return cv;
  }

  /* ---------- Construction ---------- */
  async function build(saved) {
    const d = S;
    setGeometry(d.cols, d.rows);
    edges = makeEdges(NU.mulberry32(d.seed));
    els.reserve.style.cssText = `left:${-G.M}px;top:${-G.M}px;width:${G.W + 2 * G.M}px;height:${G.H + 2 * G.M}px`;
    els.board.style.cssText = `width:${G.W}px;height:${G.H}px`;
    els.pieces.innerHTML = ''; pieces = []; sel = null;
    const k = source.w / G.W;
    const n = d.cols * d.rows;
    let s = Math.min(2, Math.max(0.8, k));
    s = Math.min(s, Math.sqrt(70e6 / (4 * n * G.cvW * G.cvH)));
    const byId = {}; if (saved) saved.forEach((q) => { byId[q.id] = q; });
    for (let r = 0; r < d.rows; r++) {
      for (let c = 0; c < d.cols; c++) {
        const id = r * d.cols + c;
        const p = { id, r, c, tx: c * G.cw + G.cw / 2, ty: r * G.ch + G.ch / 2, path: buildPath(r, c), x: 0, y: 0, rot: 0, locked: false, z: 0, dragging: false, g: id };
        const cv = renderCanvas(p, k, s);
        p.el = document.createElement('div'); p.el.className = 'piece';
        p.el.style.width = G.cvW + 'px'; p.el.style.height = G.cvH + 'px';
        p.spin = document.createElement('div'); p.spin.className = 'spin'; p.spin.appendChild(cv); p.el.appendChild(p.spin);
        els.pieces.appendChild(p.el); pieces.push(p);
        const q = byId[id];
        if (q) { p.x = q.x; p.y = q.y; p.rot = q.rot; p.locked = !!q.locked; p.z = q.z || 0; p.g = q.g != null ? q.g : id; }
        if (id % 12 === 11) await NU.sleep(0);
      }
    }
    if (!saved) scatter();
    pieces.forEach((p) => { if (p.locked) { p.x = p.tx; p.y = p.ty; p.el.classList.add('locked'); } clampPiece(p); paint(p); });
    S.zTop = Math.max(S.zTop || 0, ...pieces.map((p) => p.z));
  }
  function scatter() {
    const rng = Math.random, d = diffById(S.diff), slots = [];
    const sx = G.cw * 1.05, sy = G.ch * 1.05;
    for (let y = -G.M + G.ch / 2; y < G.H + G.M - G.ch / 2 + 1; y += sy) {
      for (let x = -G.M + G.cw / 2; x < G.W + G.M - G.cw / 2 + 1; x += sx) {
        if (x + G.cw * 0.5 > 0 && x - G.cw * 0.5 < G.W && y + G.ch * 0.5 > 0 && y - G.ch * 0.5 < G.H) continue;
        slots.push([x, y]);
      }
    }
    while (slots.length < pieces.length) { const a = rng() * 6.28; slots.push([G.W / 2 + Math.cos(a) * (G.W / 2 + G.M * 0.6), G.H / 2 + Math.sin(a) * (G.H / 2 + G.M * 0.6)]); }
    const sh = NU.shuffle(slots), order = NU.shuffle(pieces);
    order.forEach((p, i) => {
      p.x = sh[i][0] + NU.rand(-0.22, 0.22) * G.cw; p.y = sh[i][1] + NU.rand(-0.22, 0.22) * G.ch;
      p.rot = rng() < d.rotated ? NU.pick([90, 180, 270]) : 0; p.z = i + 2; p.locked = false;
    });
    S.zTop = pieces.length + 2;
  }
  function clampPiece(p) {
    const m = G.u * 0.4;
    p.x = NU.clamp(p.x, -G.M + m, G.W + G.M - m); p.y = NU.clamp(p.y, -G.M + m, G.H + G.M - m);
  }
  function paint(p) {
    p.el.style.transform = `translate3d(${p.x - G.cvW / 2}px,${p.y - G.cvH / 2}px,0)`;
    p.spin.style.transform = `rotate(${p.rot}deg)${p.dragging ? ' scale(1.05)' : ''}`;
    p.el.style.zIndex = p.locked ? 1 : 10 + p.z;
  }

  /* ---------- Vue (zoom / déplacement) ---------- */
  function measure() {
    const r = els.stage.getBoundingClientRect(); stageRect = { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  function applyView() { els.world.style.transform = `translate(${view.tx}px,${view.ty}px) scale(${view.s})`; }
  function clampView() {
    const { width: sw, height: sh } = stageRect, s = view.s, M = G.M;
    const cl = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : NU.clamp(v, lo, hi));
    view.tx = cl(view.tx, sw - (G.W + M) * s, M * s); view.ty = cl(view.ty, sh - (G.H + M) * s, M * s);
  }
  function fitView(keepZoom) {
    measure(); if (!G) return;
    const oldFit = view.fit, wasFit = Math.abs(view.s - oldFit) < 1e-6;
    view.fit = Math.min(stageRect.width / (G.W + 2 * G.M), stageRect.height / (G.H + 2 * G.M)) * 0.97;
    view.min = view.fit; view.max = Math.max(view.fit * 6, Math.min(2.6, view.fit * 12));
    if (!keepZoom || wasFit || view.s < view.min) {
      view.s = view.fit;
      view.tx = (stageRect.width - (G.W + 2 * G.M) * view.s) / 2 + G.M * view.s;
      view.ty = (stageRect.height - (G.H + 2 * G.M) * view.s) / 2 + G.M * view.s;
    }
    clampView(); applyView();
  }
  function zoomAt(cx, cy, ns) {
    ns = NU.clamp(ns, view.min, view.max);
    const wx = (cx - view.tx) / view.s, wy = (cy - view.ty) / view.s;
    view.s = ns; view.tx = cx - wx * ns; view.ty = cy - wy * ns; clampView(); applyView();
  }
  const toWorld = (cx, cy) => ({ x: (cx - stageRect.left - view.tx) / view.s, y: (cy - stageRect.top - view.ty) / view.s });
  const toScreen = (x, y) => ({ x: stageRect.left + view.tx + x * view.s, y: stageRect.top + view.ty + y * view.s });

  /* ---------- Hit-test précis (forme réelle de la pièce) ---------- */
  function hit(cx, cy) {
    const w = toWorld(cx, cy); let best = null;
    hitCtx.lineWidth = Math.max(10 / view.s, 3) * 2;
    for (const p of pieces) {
      if (p.locked || (best && p.z < best.z)) continue;
      const dx = w.x - p.x, dy = w.y - p.y;
      if (dx * dx + dy * dy > G.rad2) continue;
      const a = (-p.rot * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
      const lx = dx * cs - dy * sn + G.cw / 2, ly = dx * sn + dy * cs + G.ch / 2;
      if (hitCtx.isPointInPath(p.path, lx, ly) || hitCtx.isPointInStroke(p.path, lx, ly)) best = p;
    }
    return best;
  }

  /* ---------- Sélection / rotation / pose ---------- */
  function select(p) {
    if (sel === p) return;
    if (sel) sel.el.classList.remove('selected');
    sel = p; if (p) p.el.classList.add('selected');
    els.rotPill.hidden = !p;
  }
  const snapTol = () => Math.min(Math.max(0.3 * G.u, 14 / view.s), 0.42 * G.u);
  const members = (p) => pieces.filter((q) => q.g === p.g);
  function clampShift(ms, sx, sy) {
    const m = G.u * 0.4, lo = -G.M + m, hx = G.W + G.M - m, hy = G.H + G.M - m;
    let ax = -Infinity, bx = Infinity, ay = -Infinity, by = Infinity;
    for (const s of ms) { ax = Math.max(ax, lo - s.x); bx = Math.min(bx, hx - s.x); ay = Math.max(ay, lo - s.y); by = Math.min(by, hy - s.y); }
    return [Math.min(bx, Math.max(ax, sx)), Math.min(by, Math.max(ay, sy))];
  }
  // Fait pivoter le groupe entier autour de la pièce p
  function rotate(p, dir) {
    if (!p || p.locked || inputLocked || paused) return;
    const ms = members(p);
    ms.forEach((m) => {
      if (m !== p) { const vx = m.x - p.x, vy = m.y - p.y; if (dir > 0) { m.x = p.x - vy; m.y = p.y + vx; } else { m.x = p.x + vy; m.y = p.y - vx; } }
      m.rot += 90 * dir;
    });
    const [sx, sy] = clampShift(ms, 0, 0);
    ms.forEach((m) => { m.x += sx; m.y += sy; paint(m); });
    NU.sfx.play('rotate');
    if (drag && ms.includes(drag.p)) snapshot(); else settle(p, false);
  }
  function bringGroupFront(ms) { ms.slice().sort((a, b) => a.z - b.z).forEach((m) => { S.zTop++; m.z = S.zTop; paint(m); }); }
  function lockGroup(ms) {
    ms.forEach((m) => {
      m.locked = true; m.dragging = false; m.rot = Math.round(m.rot / 360) * 360; m.x = m.tx; m.y = m.ty; m.z = 0;
      m.el.classList.remove('dragging', 'selected'); m.el.classList.add('snap', 'locked', 'flash');
      if (sel === m) { sel = null; els.rotPill.hidden = true; }
      paint(m);
      setTimeout(() => m.el.classList.remove('snap', 'flash'), 650);
    });
    NU.sfx.play('place');
    const sp = toScreen(ms[0].tx, ms[0].ty); NU.burst(sp.x, sp.y, { n: 7 + Math.min(ms.length, 8), types: ['star', 'heart'], speed: 140, gravity: 60, size: [3, 8], life: [0.5, 1] });
    hud(); queueSave(true);
    const done = placed();
    if (done < pieces.length && (done % 7 === 0 || Math.random() < 0.1)) randomMessage();
    if (isSolvedRuntime()) finish();
  }
  const lock = (p) => lockGroup(members(p));
  const placed = () => pieces.reduce((n, p) => n + (p.locked ? 1 : 0), 0);
  // Emboîte p (et son groupe) avec les pièces voisines correctement placées
  function mergeAround(p) {
    const tol = snapTol(); let first = true, any = false, found = true;
    while (found) {
      found = false; const g = p.g, cur = members(p);
      search:
      for (const a of cur) {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const r = a.r + dr, c = a.c + dc;
          if (r < 0 || c < 0 || r >= G.rows || c >= G.cols) continue;
          const q = pieces[r * G.cols + c];
          if (q.g === g || q.locked || norm(q) !== norm(a)) continue;
          const ang = (a.rot * Math.PI) / 180, cs = Math.cos(ang), sn = Math.sin(ang), vx = q.tx - a.tx, vy = q.ty - a.ty;
          const mx = q.x - (a.x + vx * cs - vy * sn), my = q.y - (a.y + vx * sn + vy * cs);
          if (Math.hypot(mx, my) > tol) continue;
          const qs = members(q), mover = first ? cur : qs, k = first ? 1 : -1;
          mover.forEach((m) => { m.x += k * mx; m.y += k * my; });
          qs.forEach((m) => { m.g = g; });
          const all = members(p), [sx, sy] = clampShift(all, 0, 0);
          all.forEach((m) => { m.x += sx; m.y += sy; m.el.classList.add('snap', 'flash'); paint(m); setTimeout(() => m.el.classList.remove('snap', 'flash'), 600); });
          NU.sfx.play('join'); first = false; any = true; found = true; break search;
        }
      }
    }
    return any;
  }
  // Après un dépôt ou une rotation : verrouille sur le plateau, emboîte les voisines, ou compte un essai raté
  function settle(p, attempt) {
    const tol = snapTol();
    const onTarget = (arr) => arr.some((m) => norm(m) === 0 && Math.hypot(m.x - m.tx, m.y - m.ty) <= tol);
    let ms = members(p), merged = false;
    if (!onTarget(ms)) { merged = mergeAround(p); ms = members(p); }
    if (onTarget(ms)) { lockGroup(ms); return; }
    if (attempt && !merged && ms.length === 1) {
      // tentative ratée : posée comme si elle appartenait à une case du plateau
      const c = Math.round((p.x - G.cw / 2) / G.cw), r = Math.round((p.y - G.ch / 2) / G.ch);
      if (c >= 0 && c < G.cols && r >= 0 && r < G.rows && Math.hypot(p.x - (c * G.cw + G.cw / 2), p.y - (r * G.ch + G.ch / 2)) <= tol) {
        S.errors++; hud(); NU.sfx.play('nope');
        p.el.classList.remove('shake'); void p.el.offsetWidth; p.el.classList.add('shake'); setTimeout(() => p.el.classList.remove('shake'), 450);
      }
    }
    queueSave();
  }
  const drop = (p) => settle(p, true);

  /* ---------- Pointeurs ---------- */
  function onDown(e) {
    if (!active || inputLocked || paused || e.target.closest('.stage-ui')) return;
    if (e.pointerType === 'mouse' && e.button === 2) return;
    measure(); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { els.stage.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    NU.sfx.unlockAudio();
    if (mode === 'drag') { if (e.pointerId !== drag.pid) { rotate(drag.p, 1); } return; }
    if (ptrs.size === 2) { startPinch(); return; }
    const p = e.pointerType === 'mouse' && e.button === 1 ? null : hit(e.clientX, e.clientY);
    if (p) startDrag(p, e); else startPan(e);
  }
  function startDrag(p, e) {
    const w = toWorld(e.clientX, e.clientY);
    mode = 'drag'; drag = { p, pid: e.pointerId, sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY, moved: false, t: performance.now() };
    select(p);
    const ms = members(p); bringGroupFront(ms);
    ms.forEach((m) => { m.dragging = true; m.el.classList.remove('snap'); });
    (ms.length <= 10 ? ms : [p]).forEach((m) => m.el.classList.add('dragging'));
    p.el.classList.add('selected');
    snapshot(); ms.forEach(paint);
    if (!edgeRaf) edgeRaf = requestAnimationFrame(edgeLoop);
  }
  // Mémorise les positions de départ du groupe et du pointeur
  function snapshot() {
    const w = toWorld(drag.cx, drag.cy);
    drag.wx0 = w.x; drag.wy0 = w.y; drag.ms = members(drag.p).map((m) => ({ m, x: m.x, y: m.y }));
  }
  function startPan(e) {
    mode = 'pan'; pan = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, t: performance.now(), moved: 0 };
  }
  function startPinch() {
    const [a, b] = Array.from(ptrs.values());
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const mx = (a.x + b.x) / 2 - stageRect.left, my = (a.y + b.y) / 2 - stageRect.top;
    pinch = { d0: d, s0: view.s, wx: (mx - view.tx) / view.s, wy: (my - view.ty) / view.s };
    mode = 'pinch';
  }
  function onMove(e) {
    if (e.pointerType === 'mouse') hoverPt = { x: e.clientX, y: e.clientY };
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === 'drag' && e.pointerId === drag.pid) {
      drag.cx = e.clientX; drag.cy = e.clientY;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 5) drag.moved = true;
      if (drag.moved) updateDrag();
    } else if (mode === 'pan') {
      view.tx = pan.tx + (e.clientX - pan.x); view.ty = pan.ty + (e.clientY - pan.y);
      pan.moved = Math.max(pan.moved, Math.hypot(e.clientX - pan.x, e.clientY - pan.y));
      clampView(); applyView();
    } else if (mode === 'pinch' && ptrs.size >= 2) {
      const [a, b] = Array.from(ptrs.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const ns = NU.clamp(pinch.s0 * d / pinch.d0, view.min, view.max);
      const mx = (a.x + b.x) / 2 - stageRect.left, my = (a.y + b.y) / 2 - stageRect.top;
      view.s = ns; view.tx = mx - pinch.wx * ns; view.ty = my - pinch.wy * ns; clampView(); applyView();
    }
  }
  function updateDrag() {
    const w = toWorld(drag.cx, drag.cy);
    const [sx, sy] = clampShift(drag.ms, w.x - drag.wx0, w.y - drag.wy0);
    drag.ms.forEach((s) => { s.m.x = s.x + sx; s.m.y = s.y + sy; paint(s.m); });
  }
  function edgeLoop() {
    edgeRaf = 0;
    if (mode !== 'drag' || !drag) return;
    if (drag.moved && view.s > view.fit * 1.05) {
      const x = drag.cx - stageRect.left, y = drag.cy - stageRect.top, m = 56;
      let vx = 0, vy = 0;
      if (x < m) vx = (m - x) / m; else if (x > stageRect.width - m) vx = -(x - (stageRect.width - m)) / m;
      if (y < m) vy = (m - y) / m; else if (y > stageRect.height - m) vy = -(y - (stageRect.height - m)) / m;
      if (vx || vy) { const ox = view.tx, oy = view.ty; view.tx += vx * 14; view.ty += vy * 14; clampView(); if (ox !== view.tx || oy !== view.ty) { applyView(); updateDrag(); } }
    }
    edgeRaf = requestAnimationFrame(edgeLoop);
  }
  function onUp(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (mode === 'drag' && e.pointerId === drag.pid) {
      const p = drag.p, moved = drag.moved, now = performance.now();
      const ms = members(p); ms.forEach((m) => { m.dragging = false; m.el.classList.remove('dragging'); });
      mode = null; drag = null; ms.forEach(paint);
      if (moved) drop(p);
      else {
        if (lastTap && lastTap.p === p && now - lastTap.t < 330) { rotate(p, 1); lastTap = null; } else lastTap = { p, t: now };
      }
    } else if (mode === 'pan') {
      if (pan.moved < 6 && performance.now() - pan.t < 400) select(null);
      mode = null; pan = null;
    } else if (mode === 'pinch') {
      if (ptrs.size < 2) {
        mode = null; pinch = null;
        if (ptrs.size === 1) { const [id, q] = Array.from(ptrs.entries())[0]; mode = 'pan'; pan = { x: q.x, y: q.y, tx: view.tx, ty: view.ty, t: 0, moved: 99 }; }
      }
    }
    if (!ptrs.size) { mode = null; }
  }
  function onWheel(e) {
    if (!active || inputLocked || paused) return;
    e.preventDefault(); measure();
    const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
    zoomAt(e.clientX - stageRect.left, e.clientY - stageRect.top, view.s * f);
  }
  function onKey(e) {
    if (!active || inputLocked || (e.target && e.target.closest && e.target.closest('input,textarea'))) return;
    const k = e.key.toLowerCase();
    if (paused) return;
    if (k === 'r' || k === 'e' || k === 'q') {
      const dir = (k === 'q' || (k === 'r' && e.shiftKey)) ? -1 : 1;
      const t = sel || (hoverPt && (measure(), hit(hoverPt.x, hoverPt.y)));
      if (t) { if (t !== sel) select(t); rotate(t, dir); e.preventDefault(); }
    } else if (k === '+' || k === '=') zoomBtn(1.3); else if (k === '-') zoomBtn(1 / 1.3); else if (k === '0') fitView();
  }
  function zoomBtn(f) { measure(); zoomAt(stageRect.width / 2, stageRect.height / 2, view.s * f); }

  /* ---------- HUD, minuteur, messages ---------- */
  function hud() {
    if (!S) return;
    const n = pieces.length, done = placed();
    els.count.textContent = `${done}/${n}`; els.left.textContent = n - done; els.errors.textContent = S.errors;
    els.fill.style.transform = `translateY(${(21 - 16.5 * (done / n)).toFixed(2)}px)`;
    els.time.textContent = NU.formatTime(S.elapsed);
  }
  function tick() {
    const now = performance.now(); S.elapsed += now - timer.last; timer.last = now;
    els.time.textContent = NU.formatTime(S.elapsed);
    if (now - lastSave > 5000) save();
  }
  function startTimer() { if (timer.on || S.solvedAt) return; timer.on = true; timer.last = performance.now(); timer.iv = setInterval(tick, 250); }
  function stopTimer() { if (!timer.on) return; tick(); clearInterval(timer.iv); timer.on = false; }
  function randomMessage() {
    const list = NU.t('puzzleMessages'); if (!list || !list.length) return;
    let i; do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === lastMsg);
    lastMsg = i; NU.whisper(list[i]);
  }
  function scheduleMessages() {
    clearInterval(msgTimer);
    msgTimer = setInterval(() => { if (active && !paused && !inputLocked && document.visibilityState === 'visible') randomMessage(); }, 75000);
  }

  /* ---------- Sauvegarde ---------- */
  let saveT = 0;
  function queueSave(now) { if (now) { save(); return; } clearTimeout(saveT); saveT = setTimeout(save, 400); }
  function save() {
    if (!S || !pieces.length) return;
    lastSave = performance.now();
    const o = { v: 1, diff: S.diff, cols: S.cols, rows: S.rows, seed: S.seed, sig: S.sig, elapsed: Math.round(S.elapsed), errors: S.errors, solvedAt: S.solvedAt || 0, zTop: S.zTop,
      pieces: pieces.map((p) => ({ id: p.id, x: +p.x.toFixed(1), y: +p.y.toFixed(1), rot: p.rot, locked: p.locked ? 1 : 0, z: p.z, g: p.g })) };
    NU.store.set(KEY, o);
  }
  function loadSave() {
    const o = NU.store.get(KEY, null);
    if (!o || !source || o.sig !== source.sig || !Array.isArray(o.pieces) || o.pieces.length !== o.cols * o.rows) return null;
    return o;
  }
  // Vérifie qu'une sauvegarde représente bien un puzzle entièrement et correctement assemblé
  function savedIsSolved(o) {
    if (!o || !o.solvedAt) return false;
    const cw = WORLD_W / o.cols, ch = (WORLD_W / (source.w / source.h)) / o.rows, seen = new Set();
    return o.pieces.every((q) => {
      const r = Math.floor(q.id / o.cols), c = q.id % o.cols; seen.add(q.id);
      return q.locked && Math.abs(q.rot % 360) === 0 && Math.abs(q.x - (c * cw + cw / 2)) < 1 && Math.abs(q.y - (r * ch + ch / 2)) < 1;
    }) && seen.size === o.cols * o.rows;
  }
  const isSolvedRuntime = () => pieces.length > 0 && pieces.every((p) => p.locked && norm(p) === 0 && Math.abs(p.x - p.tx) < 0.01 && Math.abs(p.y - p.ty) < 0.01);

  /* ---------- Fin de partie ---------- */
  function finish() {
    inputLocked = true; stopTimer(); S.solvedAt = Date.now(); select(null); save();
    if (edgeRaf) { cancelAnimationFrame(edgeRaf); edgeRaf = 0; }
    setTimeout(() => { if (P.onSolved) P.onSolved(); }, 900);
  }

  /* ---------- Écran de réglage ---------- */
  function renderSetup() {
    const grid = els.diffGrid; grid.innerHTML = '';
    diffs().forEach((d) => {
      const b = document.createElement('button'); b.className = 'diff-card'; b.setAttribute('role', 'radio'); b.dataset.id = d.id;
      b.innerHTML = `<span class="n">${d.cols * d.rows}</span><b>${d.label}</b><small>${d.desc || ''}</small>`;
      b.setAttribute('aria-checked', d.id === selectedDiff ? 'true' : 'false');
      b.onclick = () => { selectedDiff = d.id; NU.store.set(DIFF_KEY, d.id); NU.sfx.play('click'); renderSetup(); };
      grid.appendChild(b);
    });
    els.howto.innerHTML = ''; (NU.t('setup.howto') || []).forEach((t) => { const li = document.createElement('li'); li.textContent = t; els.howto.appendChild(li); });
    const sv = loadSave();
    if (sv && !savedIsSolved(sv)) {
      els.resume.hidden = false; const done = sv.pieces.filter((q) => q.locked).length;
      els.resume.textContent = NU.t('setup.resume', { done, total: sv.cols * sv.rows });
    } else els.resume.hidden = true;
  }

  async function startGame(restore) {
    if (!source) source = await loadSource();
    let saved = null;
    if (restore) { saved = loadSave(); if (!saved) restore = false; }
    if (restore) {
      S = { diff: saved.diff, cols: saved.cols, rows: saved.rows, seed: saved.seed, sig: saved.sig, elapsed: saved.elapsed, errors: saved.errors, solvedAt: saved.solvedAt || 0, zTop: saved.zTop || 0 };
    } else {
      const d = diffById(selectedDiff);
      S = { diff: d.id, cols: d.cols, rows: d.rows, seed: (Math.random() * 4294967296) >>> 0, sig: source.sig, elapsed: 0, errors: 0, solvedAt: 0, zTop: 0 };
    }
    els.setup.hidden = true; els.game.hidden = false;
    measure();
    await build(restore ? saved.pieces : null);
    inputLocked = false; paused = false; els.pause.hidden = true; els.rotPill.hidden = true;
    active = true; fitView(); hud(); save();
    scheduleMessages();
    if (isSolvedRuntime()) { S.solvedAt = S.solvedAt || Date.now(); finish(); } else startTimer();
  }

  function setPaused(v) {
    if (!active || inputLocked) return;
    paused = v; els.pause.hidden = !v;
    if (v) { stopTimer(); save(); select(null); } else startTimer();
    els.btnPause.querySelector('use').setAttribute('href', v ? '#i-play' : '#i-pause');
  }

  async function restart() {
    const ok = await NU.confirm({ title: NU.t('game.restartTitle'), text: NU.t('game.restartText'), yes: NU.t('game.restartYes'), no: NU.t('game.restartNo') });
    if (!ok) return;
    stopTimer(); clearTimeout(saveT); NU.store.remove(KEY); active = false; inputLocked = false; paused = false;
    pieces = []; S = null; els.pieces.innerHTML = '';
    els.game.hidden = true; els.setup.hidden = false; els.rotPill.hidden = true; els.pause.hidden = true;
    renderSetup();
  }

  /* ---------- API publique ---------- */
  P.init = async function () {
    els = {
      setup: $('#setup'), game: $('#game'), stage: $('#stage'), world: $('#world'), reserve: $('#reserve'), board: $('#board'), pieces: $('#pieces'),
      diffGrid: $('#diff-grid'), howto: $('#howto'), resume: $('#btn-resume'), start: $('#btn-start'), rotPill: $('#rot-pill'),
      count: $('#hud-count'), left: $('#hud-left'), errors: $('#hud-errors'), time: $('#hud-time'), fill: $('#hm-fill'),
      pause: $('#pause-overlay'), btnPause: $('#btn-pause')
    };
    selectedDiff = NU.store.get(DIFF_KEY, null);
    if (!diffs().some((d) => d.id === selectedDiff)) selectedDiff = cfg.puzzle.defaultDifficulty || 'hard';
    const st = els.stage;
    st.addEventListener('pointerdown', onDown); st.addEventListener('pointermove', onMove);
    st.addEventListener('pointerup', onUp); st.addEventListener('pointercancel', onUp);
    st.addEventListener('wheel', onWheel, { passive: false });
    st.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!active || inputLocked || paused) return; measure(); const p = hit(e.clientX, e.clientY); if (p) { select(p); rotate(p, 1); } });
    document.addEventListener('keydown', onKey);
    $('#btn-rotl').onclick = () => rotate(sel, -1); $('#btn-rotr').onclick = () => rotate(sel, 1);
    $('#btn-pause').onclick = () => setPaused(!paused); $('#btn-resume-game').onclick = () => setPaused(false);
    $('#btn-zin').onclick = () => zoomBtn(1.35); $('#btn-zout').onclick = () => zoomBtn(1 / 1.35); $('#btn-fit').onclick = () => fitView();
    $('#btn-restart').onclick = restart;
    els.start.onclick = () => startGame(false); els.resume.onclick = () => startGame(true);
    if (window.ResizeObserver) new ResizeObserver(() => { if (active) fitView(true); }).observe(st); else window.addEventListener('resize', () => active && fitView(true));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { if (active && !inputLocked && !paused) setPaused(true); save(); } });
    window.addEventListener('pagehide', save);
    source = await loadSource();
    renderSetup();
  };
  P.enter = function () { if (S && active) { fitView(true); } else { els.setup.hidden = false; els.game.hidden = true; renderSetup(); } };
  P.leave = function () { if (active && !inputLocked) setPaused(true); };
  P.hasSolvedSave = () => !!source && savedIsSolved(loadSave());
  P.verifySolved = () => {
    if (pieces.length && S && S.solvedAt) return isSolvedRuntime();
    return savedIsSolved(loadSave());
  };
  P.getResult = () => { const o = (pieces.length && S) ? S : loadSave(); return o ? { elapsed: o.elapsed, errors: o.errors } : { elapsed: 0, errors: 0 }; };
  P.getImageURL = () => (source ? source.url : cfg.puzzle.image);
  P.isReady = () => !!source;
  P._debug = { get pieces() { return pieces; }, get G() { return G; }, get view() { return view; }, get S() { return S; }, hit, toScreen, lock, rotate };
})();
