/* ============================================================
   script.js — point d'entrée : écrans, réglages, musique, détails
   ============================================================ */
(function () {
  'use strict';
  const NU = window.NU, cfg = NU.cfg, $ = NU.$;

  /* ---------- Démarrage ---------- */
  NU.initFx();
  document.title = NU.t('pageTitle') || document.title;
  NU.applyTexts();
  NU.applySettings();
  NU.bg.mood = 'intro';

  // Titre d'accueil : apparition mot par mot
  const titleEl = $('#intro-title');
  titleEl.innerHTML = '';
  NU.t('intro.title').split(' ').forEach((w, i) => {
    const s = document.createElement('span'); s.className = 'word'; s.style.setProperty('--i', i); s.textContent = w; titleEl.appendChild(s); titleEl.appendChild(document.createTextNode(' '));
  });

  /* ---------- Écrans ---------- */
  function showScreen(id) {
    NU.$$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    NU.bg.mood = id === 'screen-intro' ? 'intro' : 'calm';
  }
  const begin = $('#btn-begin');
  const solved = () => NU.puzzle.isReady() && NU.puzzle.hasSolvedSave();
  function refreshBegin() { begin.textContent = solved() ? NU.t('intro.buttonDone') : NU.t('intro.button'); }
  NU.puzzle.init().then(refreshBegin);

  begin.onclick = async () => {
    NU.sfx.unlockAudio(); NU.sfx.play('click');
    if (!NU.puzzle.isReady()) return;
    if (solved()) {
      // Puzzle déjà terminé : on revérifie puis on retrouve directement la finale
      await NU.veil(async () => { showScreen('screen-puzzle'); NU.$$('.screen').forEach((s) => s.classList.remove('active')); NU.finale.play({ instant: true }); });
      return;
    }
    await NU.veil(async () => { showScreen('screen-puzzle'); NU.puzzle.enter(); });
  };
  $('#btn-back').onclick = async () => { await NU.veil(async () => { NU.puzzle.leave(); showScreen('screen-intro'); refreshBegin(); }); };

  // Quand le puzzle est terminé
  NU.puzzle.onSolved = () => { NU.finale.play(); };

  /* ---------- Réglages ---------- */
  const panels = { music: $('#music-panel'), settings: $('#settings-panel') };
  const btns = { music: $('#btn-music'), settings: $('#btn-settings') };
  function togglePanel(name) {
    Object.keys(panels).forEach((k) => {
      const open = k === name && panels[k].hidden;
      panels[k].hidden = !open; btns[k].setAttribute('aria-expanded', String(open));
    });
  }
  btns.music.onclick = (e) => { e.stopPropagation(); togglePanel('music'); };
  btns.settings.onclick = (e) => { e.stopPropagation(); togglePanel('settings'); };
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.panel, .topbar')) return;
    Object.keys(panels).forEach((k) => { panels[k].hidden = true; btns[k].setAttribute('aria-expanded', 'false'); });
  });
  const setSound = $('#set-sound'), setAnim = $('#set-anim');
  setSound.checked = NU.settings.sound; setAnim.checked = NU.settings.anim;
  setSound.onchange = () => { NU.settings.sound = setSound.checked; NU.applySettings(); NU.sfx.unlockAudio(); NU.sfx.play('click'); };
  setAnim.onchange = () => { NU.settings.anim = setAnim.checked; NU.applySettings(); };

  /* ---------- Lecteur de musique ---------- */
  (function music() {
    const m = cfg.music || {};
    const tracks = (m.tracks && m.tracks.length ? m.tracks : (m.file ? [{ file: m.file, title: m.title }] : []));
    const titleEl = $('#mp-title');
    const playBtn = $('#mp-play'), seek = $('#mp-seek'), vol = $('#mp-vol'), time = $('#mp-time'), missing = $('#mp-missing');
    const prevBtn = $('#mp-prev'), nextBtn = $('#mp-next');
    const audio = new Audio(); audio.preload = 'metadata';
    let ok = tracks.length > 0, idx = 0;
    const fail = () => {
      ok = false; playBtn.disabled = true; seek.disabled = true; missing.hidden = false; missing.textContent = NU.t('music.missing');
    };
    const load = (i, autoplay) => {
      idx = (i + tracks.length) % tracks.length;
      titleEl.textContent = (tracks[idx].title || 'Musique') + (tracks.length > 1 ? ` (${idx + 1}/${tracks.length})` : '');
      audio.src = tracks[idx].file; seek.value = 0; time.textContent = '0:00';
      if (autoplay) audio.play().catch(() => {});
    };
    prevBtn.hidden = nextBtn.hidden = tracks.length < 2;
    prevBtn.onclick = () => ok && load(idx - 1, !audio.paused);
    nextBtn.onclick = () => ok && load(idx + 1, !audio.paused);
    audio.addEventListener('ended', () => load(idx + 1, true));
    if (!ok) { titleEl.textContent = m.title || 'Musique'; fail(); } else { audio.addEventListener('error', fail); load(0, false); }
    const setRange = (r) => r.style.setProperty('--v', (r.value / r.max * 100) + '%');
    const setIcon = () => playBtn.querySelector('use').setAttribute('href', audio.paused ? '#i-play' : '#i-pause');
    const savedVol = NU.store.get('notre-univers:vol', 60); vol.value = savedVol; audio.volume = savedVol / 100; setRange(vol); setRange(seek);
    playBtn.onclick = () => { if (!ok) return; if (audio.paused) audio.play().catch(() => fail()); else audio.pause(); };
    audio.addEventListener('play', setIcon); audio.addEventListener('pause', setIcon);
    vol.oninput = () => { audio.volume = vol.value / 100; setRange(vol); NU.store.set('notre-univers:vol', +vol.value); };
    seek.oninput = () => { if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration; setRange(seek); };
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      seek.value = Math.round(audio.currentTime / audio.duration * 1000); setRange(seek);
      const s = Math.floor(audio.currentTime); time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    });
    setIcon();
    // Lancement dès la première interaction (les navigateurs interdisent de démarrer un son sans geste).
    // Se fait une seule fois : si elle met en pause, on ne relance jamais de force.
    let auto = !ok;
    const autoStart = (e) => {
      if (auto) return;
      if (e.target.closest && e.target.closest('#music-panel, #btn-music')) { auto = true; return; }
      auto = true;
      if (audio.paused) audio.play().catch(() => {});
      document.removeEventListener('click', autoStart, true);
    };
    document.addEventListener('click', autoStart, true);
  })();

  /* ---------- Petits détails ---------- */
  // Étoiles + son doux sur les boutons
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.btn, .icon-btn');
    if (b && (e.clientX || e.clientY)) NU.sparkle(e.clientX, e.clientY);
  });
  // Traînée d'étoiles derrière le curseur (souris uniquement)
  let lastTrail = 0;
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !NU.settings.anim) return;
    const now = performance.now(); if (now - lastTrail < 110) return; lastTrail = now;
    NU.fx.add({ type: Math.random() < 0.5 ? 'star' : 'heart', x: e.clientX + NU.rand(-4, 4), y: e.clientY + NU.rand(-4, 4), vx: NU.rand(-10, 10), vy: NU.rand(10, 30), g: 0, rot: 0, vr: NU.rand(-2, 2),
      size: NU.rand(3, 6), life: 0.8, fade: 0.8, base: 0.7, color: NU.pick(['#f4b6c2', '#e0626f', '#fff1c9']) });
  });
  // Phrases douces aléatoires
  (function whispers() {
    const list = NU.t('whispers'); if (!list || !list.length) return;
    const loop = () => {
      setTimeout(() => {
        const busy = document.querySelector('.modal:not([hidden]), .letter-overlay, .hug-overlay, .lightbox, .msg-modal, #screen-puzzle.active #game:not([hidden])');
        if (!busy && document.visibilityState === 'visible') NU.whisper(NU.pick(list));
        loop();
      }, NU.rand(50000, 90000));
    };
    loop();
  })();
  // Débloque l'audio au premier geste (jamais de lecture automatique de musique)
  document.addEventListener('pointerdown', () => NU.sfx.unlockAudio(), { once: true });
})();
