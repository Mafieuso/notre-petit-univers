/* ============================================================
   surprise.js — grande finale + tout ce qui est verrouillé
   (mots doux, lettre, compteur, câlin, galerie)
   La surprise n'existe PAS dans le DOM avant la résolution.
   ============================================================ */
(function () {
  'use strict';
  const NU = window.NU, cfg = NU.cfg, $ = NU.$;
  let unlocked = false;

  /* =============== FINALE =============== */
  NU.finale = {
    async play(opts = {}) {
      const f = $('#finale'); const instant = !!opts.instant || !NU.settings.anim;
      const res = NU.puzzle.getResult();
      $('#finale-img').src = NU.puzzle.getImageURL();
      $('#finale-title').textContent = NU.t('finale.title');
      $('#finale-stats').textContent = NU.t('finale.stats', { time: NU.formatTime(res.elapsed), errors: res.errors });
      const msg = $('#finale-msg'); msg.innerHTML = '';
      const words = NU.t('finale.message').split(' ');
      const btn = $('#btn-unlock'); btn.textContent = NU.t('finale.button'); btn.hidden = true;
      btn.onclick = () => NU.surprise.unlock();
      words.forEach((w, i) => {
        const s = document.createElement('span'); s.className = 'word'; s.textContent = w + ' ';
        s.style.setProperty('--i', instant ? 0 : i + 14); s.style.marginRight = '.25em'; msg.appendChild(s);
      });
      f.hidden = false; void f.offsetWidth; f.classList.add('on');
      NU.bg.mood = 'calm';
      if (instant) { $('#finale-stats').classList.add('in'); btn.hidden = false; return; }
      NU.sfx.play('win');
      const W = innerWidth, H = innerHeight;
      NU.sparkleField(7);
      setTimeout(() => { NU.burst(W / 2, H * 0.38, { n: 60, types: ['heart', 'star'], speed: 520, gravity: 260, size: [8, 20], life: [1.2, 2.4] }); }, 700);
      setTimeout(() => { NU.rain({ types: ['petal'], rate: 22, duration: 14 }); NU.floatHearts(8, 10); }, 1100);
      setTimeout(() => { NU.burst(W * 0.1, H, { n: 40, types: ['heart'], speed: 700, gravity: 500, up: true, size: [8, 16], life: [1.5, 2.6] }); NU.burst(W * 0.9, H, { n: 40, types: ['heart'], speed: 700, gravity: 500, up: true, size: [8, 16], life: [1.5, 2.6] }); }, 2200);
      setTimeout(() => NU.burst(W / 2, H * 0.3, { n: 36, types: ['heart', 'star'], speed: 450, gravity: 200, size: [6, 16] }), 3600);
      const total = (words.length + 14) * 130 + 1200;
      await NU.sleep(total);
      $('#finale-stats').classList.add('in'); btn.hidden = false;
    }
  };

  /* =============== SURPRISE =============== */
  NU.surprise = {
    isUnlocked: () => unlocked,
    async unlock() {
      // Vérification : le puzzle doit réellement être terminé
      if (!NU.puzzle.verifySolved()) { NU.whisper('Le puzzle n’est pas encore terminé ♡'); return false; }
      if (unlocked) return true;
      unlocked = true;
      NU.sfx.play('unlock');
      await NU.veil(async () => {
        build();
        $('#finale').hidden = true; $('#finale').classList.remove('on');
        NU.$$('.screen').forEach((s) => s.classList.remove('active'));
        NU.bg.mood = 'calm';
      });
      NU.burst(innerWidth / 2, innerHeight / 2, { n: 24, speed: 400 });
      return true;
    }
  };

  const T = (k, v) => NU.t(k, v);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const heartSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-heart"/></svg>';
  const HEART_COLORS = ['#f4a0b0', '#e0626f', '#f7a1a8', '#e48fa3', '#f08d9d'];

  function build() {
    const root = $('#surprise-root'); root.innerHTML = '';
    const sc = el('div', 'surprise'); sc.id = 's-scroll'; root.appendChild(sc);
    sc.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="hug-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4a0b0"/><stop offset="1" stop-color="#d9475a"/></linearGradient></defs></svg>`);
    const sections = [
      ['s-rain', buildRain], ['s-letter', buildLetter], ['s-counter', buildCounter], ['s-hug', buildHug], ['s-gallery', buildGallery], ['s-outro', buildOutro]
    ];
    const nav = el('nav', 's-nav'); nav.setAttribute('aria-label', 'Sections'); root.appendChild(nav);
    sections.forEach(([id, fn], i) => {
      const sec = el('section', 's-sec'); sec.id = id; sc.appendChild(sec); fn(sec, i);
      const b = el('button'); b.setAttribute('aria-label', 'Section ' + (i + 1)); b.dataset.go = id; b.onclick = () => sec.scrollIntoView({ behavior: NU.settings.anim ? 'smooth' : 'auto' }); nav.appendChild(b);
    });
    // Révélation au scroll + point actif
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) {
          NU.$$('.reveal', en.target).forEach((r) => r.classList.add('in'));
          NU.$$('button', nav).forEach((b) => b.classList.toggle('on', b.dataset.go === en.target.id));
          en.target.dispatchEvent(new CustomEvent('nu:enter'));
        } else en.target.dispatchEvent(new CustomEvent('nu:leave'));
      });
    }, { root: sc, threshold: 0.45 });
    NU.$$('.s-sec', sc).forEach((s) => io.observe(s));
    NU.$$('.scroll-hint', sc).forEach((b) => { b.onclick = () => $('#' + b.dataset.go).scrollIntoView({ behavior: NU.settings.anim ? 'smooth' : 'auto' }); });
  }
  const head = (kicker, title, sub) => `<div class="s-head reveal"><p class="kicker">${kicker}</p><h2 class="h2">${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}</div>`;
  const hint = (to) => `<button class="scroll-hint" data-go="${to}" aria-label="${T('rain.next')}">${NU.icon('down')}</button>`;

  /* ---------- 1. Pluie de mots doux ---------- */
  function buildRain(sec) {
    const msgs = T('rain.messages'); const found = new Set();
    sec.innerHTML = head(T('rain.kicker'), T('rain.title'), T('rain.hint'));
    const sky = el('div', 'rain-sky'); sec.appendChild(sky);
    const cnt = el('div', 'rain-count reveal'); sec.appendChild(cnt);
    const end = el('div', 'rain-end'); sec.appendChild(end);
    sec.insertAdjacentHTML('beforeend', hint('s-letter'));
    const updateCount = () => { cnt.textContent = `${found.size}/${msgs.length} ${T('rain.found')}`; if (found.size === msgs.length) end.textContent = T('rain.allFound'); };
    updateCount();
    let queue = [], timer = 0, visible = false, spawnN = 0;
    const nextIdx = () => { if (!queue.length) queue = NU.shuffle(msgs.map((_, i) => i)); return queue.pop(); };

    function open(i, node) {
      NU.sfx.play('heart');
      const r = node.getBoundingClientRect(); NU.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 12, speed: 220, gravity: 120 });
      found.add(i); node.classList.add('found'); updateCount();
      const m = el('div', 'msg-modal');
      m.innerHTML = `<div class="msg-card">${heartSvg}<p></p></div><button class="icon-btn msg-close" aria-label="Fermer">${NU.icon('close')}</button>`;
      m.querySelector('p').textContent = msgs[i];
      const close = () => { m.remove(); };
      m.onclick = close; document.body.appendChild(m);
      NU.floatHearts(2.5, 14);
    }
    function mkHeart(i, staticMode) {
      const b = el('button', 'heart-bubble'); b.setAttribute('aria-label', msgs[i]);
      b.style.setProperty('--c', NU.pick(HEART_COLORS));
      b.innerHTML = `<span class="hb-in">${heartSvg}${staticMode ? '' : '<span class="hb-text"></span>'}</span>`;
      if (!staticMode) b.querySelector('.hb-text').textContent = msgs[i];
      b.onclick = (e) => { e.stopPropagation(); open(i, b); };
      return b;
    }
    function spawn() {
      if (!visible) return;
      const max = innerWidth < 600 ? 5 : 8;
      if (sky.children.length >= max) return;
      const size = NU.rand(innerWidth < 600 ? 60 : 70, innerWidth < 600 ? 90 : 110);
      const b = mkHeart(nextIdx(), false);
      b.style.setProperty('--x', NU.rand(4, Math.max(10, 92 - (size / innerWidth) * 100)) + '%');
      b.style.setProperty('--size', size + 'px'); b.style.setProperty('--dur', NU.rand(16, 24) + 's'); b.style.setProperty('--sw', NU.rand(2.5, 4.5) + 's');
      b.addEventListener('animationend', (ev) => { if (ev.target === b) b.remove(); });
      sky.appendChild(b); spawnN++;
    }
    function render() {
      clearInterval(timer); sky.innerHTML = '';
      if (!NU.settings.anim) {
        sky.className = 'rain-sky rain-static';
        msgs.forEach((_, i) => sky.appendChild(mkHeart(i, true)));
      } else {
        sky.className = 'rain-sky';
        timer = setInterval(() => spawn(), innerWidth < 600 ? 1900 : 1400);
        for (let k = 0; k < 3; k++) setTimeout(spawn, 300 + k * 700);
      }
    }
    sec.addEventListener('nu:enter', () => { visible = true; if (!sky.children.length || !timer) render(); });
    sec.addEventListener('nu:leave', () => { visible = false; });
    document.addEventListener('nu:settings', render);
    render();
  }

  /* ---------- 2. Lettre d'amour ---------- */
  function buildLetter(sec) {
    sec.innerHTML = head(T('letter.kicker'), T('letter.title'), T('letter.hint')) + `
      <div class="envelope-wrap reveal"><button class="envelope" id="envelope" aria-label="${T('letter.hint')}">
        <div class="env-back"></div><div class="env-paper"><span>${T('letter.envelopeTo')}</span></div>
        <div class="env-front"><i></i></div><div class="env-flap"></div><div class="env-seal">${heartSvg}</div>
      </button></div>` + hint('s-counter');
    const env = $('#envelope', sec); let opened = false;
    env.onclick = async () => {
      if (!opened) { opened = true; env.classList.add('open'); NU.sfx.play('envelope'); const r = env.getBoundingClientRect(); NU.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 12, speed: 200, gravity: 60 }); await NU.sleep(NU.settings.anim ? 1500 : 0); }
      openLetter();
    };
  }
  function openLetter() {
    const ov = el('div', 'letter-overlay');
    ov.innerHTML = `<div class="paper"><button class="icon-btn small paper-close" aria-label="${T('letter.close')}">${NU.icon('close')}</button><p class="paper-text typing"></p><p class="paper-sign"></p><p class="paper-skip">${T('letter.skip')}</p></div>`;
    document.body.appendChild(ov);
    const paper = $('.paper', ov), txt = $('.paper-text', ov), sign = $('.paper-sign', ov), skip = $('.paper-skip', ov);
    sign.textContent = T('letter.signature');
    const full = T('letter.text'); let i = 0, done = false, tm = 0, hearts = 0;
    const finish = () => { clearTimeout(tm); done = true; txt.textContent = full; txt.classList.remove('typing'); sign.classList.add('in'); skip.hidden = true; clearInterval(hi); NU.burst(innerWidth / 2, innerHeight / 2, { n: 18, speed: 260, gravity: 120 }); };
    const close = () => { clearTimeout(tm); clearInterval(hi); ov.remove(); };
    const heartFx = () => {
      if (!NU.settings.anim || hearts > 40) return; hearts++;
      const h = el('div', 'pheart', heartSvg); const s = NU.rand(14, 30);
      h.style.cssText = `width:${s}px;left:${NU.rand(5, 95)}vw;top:${NU.rand(20, 90)}vh;--r:${NU.rand(-30, 30)}deg`;
      document.body.appendChild(h); setTimeout(() => h.remove(), 3100);
    };
    const hi = setInterval(heartFx, 500);
    const step = () => {
      if (done) return;
      if (i >= full.length) { finish(); return; }
      const ch = full[i++]; txt.textContent = full.slice(0, i); paper.scrollTop = paper.scrollHeight;
      const d = ch === '\n' ? 260 : /[.!?]/.test(ch) ? 320 : ch === ',' ? 140 : NU.settings.anim ? 30 : 4;
      tm = setTimeout(step, d);
    };
    paper.onclick = (e) => { if (e.target.closest('.paper-close')) { close(); return; } if (!done) finish(); };
    ov.onclick = (e) => { if (e.target === ov) close(); };
    NU.sfx.play('heart'); step();
  }

  /* ---------- 3. Compteur ---------- */
  function buildCounter(sec) {
    sec.innerHTML = head(T('counter.kicker'), T('counter.title')) + `<p class="counter-since reveal"></p><div class="counter-grid reveal">
      ${['days', 'hours', 'minutes', 'seconds'].map((k) => `<div class="cbox"><b data-k="${k}">0</b><span>${T('counter.' + k)}</span></div>`).join('')}</div>
      <p class="counter-note reveal">${T('counter.note')}</p>` + hint('s-hug');
    const start = new Date(cfg.startDate); const valid = !isNaN(start);
    const since = $('.counter-since', sec);
    since.textContent = valid ? `${T('counter.subtitle')} ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : '';
    const B = {}; NU.$$('b[data-k]', sec).forEach((b) => { B[b.dataset.k] = b; });
    const set = (k, v) => { const s = String(v); if (B[k].textContent !== s) { B[k].textContent = s; if (NU.settings.anim && k === 'seconds') { B[k].classList.remove('tick'); void B[k].offsetWidth; B[k].classList.add('tick'); } } };
    const upd = () => {
      if (!valid) return;
      let ms = Date.now() - start.getTime();
      if (ms < 0) { since.textContent = T('counter.future'); ms = 0; }
      const s = Math.floor(ms / 1000);
      set('days', Math.floor(s / 86400)); set('hours', Math.floor((s % 86400) / 3600)); set('minutes', Math.floor((s % 3600) / 60)); set('seconds', s % 60);
    };
    upd(); setInterval(upd, 1000);
  }

  /* ---------- 4. Câlin ---------- */
  function buildHug(sec) {
    sec.innerHTML = head(T('hug.kicker'), T('hug.title')) + `<button class="hug-btn reveal" id="hug-btn">${heartSvg}<span>${T('hug.button')}</span></button>` + hint('s-gallery');
    const msgs = T('hug.messages'); let last = -1;
    const pickMsg = () => { let i; do { i = Math.floor(Math.random() * msgs.length); } while (msgs.length > 1 && i === last); last = i; return msgs[i]; };
    $('#hug-btn', sec).onclick = () => {
      const ov = el('div', 'hug-overlay');
      ov.innerHTML = `<div class="big-heart">${heartSvg}</div><p class="hug-msg"></p><div class="hug-actions"><button class="btn ghost" data-a="again">${T('hug.again')}</button><button class="btn primary" data-a="close">${T('hug.close')}</button></div>`;
      const m = $('.hug-msg', ov); m.textContent = pickMsg();
      document.body.appendChild(ov); NU.sfx.play('heart');
      NU.floatHearts(10, 12); NU.burst(innerWidth / 2, innerHeight * 0.4, { n: 30, types: ['heart'], speed: 320, gravity: -40, size: [8, 18], life: [1.5, 2.8] });
      if (navigator.vibrate) { try { navigator.vibrate([90, 70, 90, 500, 90, 70, 90]); } catch (e) { /* ignore */ } }
      ov.onclick = (e) => {
        const a = e.target.closest('[data-a]');
        if (a && a.dataset.a === 'again') { m.textContent = pickMsg(); NU.sfx.play('heart'); NU.burst(innerWidth / 2, innerHeight * 0.4, { n: 20, types: ['heart'], speed: 300, gravity: -30 }); return; }
        ov.remove();
      };
    };
  }

  /* ---------- 5. Galerie ---------- */
  function buildGallery(sec) {
    sec.innerHTML = head(T('gallery.kicker'), T('gallery.title'), T('gallery.hint')) + '<div class="gallery-grid reveal"></div>' + hint('s-outro');
    const grid = $('.gallery-grid', sec); const photos = (cfg.gallery && cfg.gallery.photos) || [];
    const media = (p, cls) => {
      const wrap = el('div'); wrap.style.display = 'contents';
      const img = new Image(); img.className = cls; img.alt = p.caption || ''; img.loading = 'lazy';
      img.onerror = () => { const ph = el('div', 'ph', `${heartSvg}<span>${T('gallery.placeholder')}</span>`); img.replaceWith(ph); };
      img.src = p.src; wrap.appendChild(img); return wrap;
    };
    photos.forEach((p, i) => {
      const b = el('button', 'polaroid'); b.style.setProperty('--rot', NU.rand(-6, 6).toFixed(1) + 'deg');
      b.appendChild(media(p, 'ph-img')); const cap = el('span', 'cap'); cap.textContent = p.caption || ''; b.appendChild(cap);
      b.onclick = () => lightbox(i); grid.appendChild(b);
    });
    function lightbox(idx) {
      const lb = el('div', 'lightbox');
      lb.innerHTML = `<div class="lb-card"><div class="lb-media"></div><div class="cap"></div></div>
        <button class="icon-btn lb-nav prev" aria-label="${T('gallery.prev')}">${NU.icon('left')}</button>
        <button class="icon-btn lb-nav next" aria-label="${T('gallery.next')}">${NU.icon('right')}</button>
        <button class="icon-btn lb-close" aria-label="${T('gallery.close')}">${NU.icon('close')}</button>`;
      const show = (n) => {
        idx = (n + photos.length) % photos.length; const p = photos[idx];
        const m = $('.lb-media', lb); m.innerHTML = ''; m.appendChild(media(p, 'ph-img')); $('.cap', lb).textContent = p.caption || '';
        const card = $('.lb-card', lb); card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
      };
      const close = () => { lb.remove(); document.removeEventListener('keydown', key); };
      const key = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1); };
      lb.onclick = (e) => { if (e.target.closest('.prev')) show(idx - 1); else if (e.target.closest('.next')) show(idx + 1); else if (e.target === lb || e.target.closest('.lb-close')) close(); };
      let sx = null; lb.addEventListener('pointerdown', (e) => { sx = e.clientX; }); lb.addEventListener('pointerup', (e) => { if (sx != null && Math.abs(e.clientX - sx) > 60) show(idx + (e.clientX < sx ? 1 : -1)); sx = null; });
      document.addEventListener('keydown', key); document.body.appendChild(lb); show(idx); NU.sfx.play('heart');
    }
  }

  /* ---------- 6. Final ---------- */
  function buildOutro(sec) {
    sec.innerHTML = `<div class="outro-heart reveal">${heartSvg}</div><h2 class="title reveal">${T('outro.title')}</h2><p class="outro-text reveal">${T('outro.text')}</p><button class="btn ghost reveal" id="btn-top">${T('outro.top')}</button>`;
    $('#btn-top', sec).onclick = () => $('#s-rain').scrollIntoView({ behavior: NU.settings.anim ? 'smooth' : 'auto' });
    sec.addEventListener('nu:enter', () => { NU.burst(innerWidth / 2, innerHeight * 0.4, { n: 30, types: ['heart', 'star'], speed: 380, gravity: 120, size: [8, 18] }); NU.rain({ types: ['petal', 'heart'], rate: 10, duration: 5 }); });
  }
})();
