/* Artora Beauty Bar — interactions. No dependencies. */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const BOOK_URL = 'https://www.vagaro.com/artorabeautybar/services';

  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let scrollY = window.scrollY;
  const frameTasks = [];   // run every animation frame
  const resizeTasks = [];  // run on resize

  /* ------------------------------------------------------------------
     Sound: a soft generated pad that brightens as the page lifts.
     Off until the visitor turns it on.
  ------------------------------------------------------------------ */
  const Sound = (() => {
    let ctx, master, filter, reverbIn, chordTimer, sparkleTimer;
    let on = false, chordIndex = 0, lastChime = 0, currentChord = null;
    const CHORDS = [
      [146.83, 220.0, 329.63, 369.99, 554.37],  // D major 9
      [123.47, 185.0, 293.66, 329.63, 440.0],   // B minor 11
      [98.0, 146.83, 246.94, 369.99, 440.0],    // G major 9
      [110.0, 164.81, 246.94, 277.18, 369.99],  // A 6/9
    ];
    const CHIMES = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51];

    function impulse(seconds, decay) {
      const len = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    function build() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -14; limiter.ratio.value = 6;
      limiter.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = 0; master.connect(limiter);

      filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700; filter.Q.value = 0.5;
      const dry = ctx.createGain(); dry.gain.value = 0.5;
      const wet = ctx.createGain(); wet.gain.value = 0.9;
      const reverb = ctx.createConvolver(); reverb.buffer = impulse(4.5, 2.4);
      reverbIn = ctx.createGain();
      filter.connect(dry); dry.connect(master);
      filter.connect(reverbIn); reverbIn.connect(reverb); reverb.connect(wet); wet.connect(master);
      return true;
    }

    function tone(freq, start, attack, hold, release, peak, type, dest) {
      const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + attack);
      gain.gain.setValueAtTime(peak, start + attack + hold);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
      osc.connect(gain); gain.connect(dest);
      osc.start(start); osc.stop(start + attack + hold + release + 0.1);
    }

    function playChord() {
      if (!on) return;
      const t = ctx.currentTime + 0.05;
      currentChord = CHORDS[chordIndex++ % CHORDS.length];
      currentChord.forEach((f, i) => {
        const peak = i === 0 ? 0.085 : 0.045;
        tone(f, t, 4.5, 3.5, 8, peak, 'sine', filter);
        tone(f * 1.004, t, 5, 3, 8, peak * 0.4, 'triangle', filter);
      });
      chordTimer = setTimeout(playChord, 9500);
    }

    function sparkle() {
      if (!on) return;
      if (currentChord) {
        const f = currentChord[1 + Math.floor(Math.random() * 4)] * (Math.random() < 0.5 ? 2 : 4);
        tone(f, ctx.currentTime + 0.02, 0.02, 0.05, 3, 0.018, 'sine', reverbIn);
      }
      sparkleTimer = setTimeout(sparkle, 2600 + Math.random() * 4200);
    }

    function setOn(next) {
      if (next && !ctx && !build()) return false;
      on = next;
      clearTimeout(chordTimer); clearTimeout(sparkleTimer);
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      if (on) {
        ctx.resume();
        master.gain.linearRampToValueAtTime(0.75, t + 2.5);
        playChord();
        sparkleTimer = setTimeout(sparkle, 3000);
      } else {
        master.gain.linearRampToValueAtTime(0, t + 0.6);
        setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 800);
      }
      return on;
    }

    doc.addEventListener('visibilitychange', () => {
      if (!ctx || !on) return;
      if (doc.hidden) { clearTimeout(chordTimer); clearTimeout(sparkleTimer); ctx.suspend(); }
      else { ctx.resume(); playChord(); sparkleTimer = setTimeout(sparkle, 2500); }
    });

    return {
      get on() { return on; },
      toggle() { return setOn(!on); },
      // page progress 0..1 opens the filter: the sound gets lighter as the shades do
      brightness(p) { if (on && ctx) filter.frequency.setTargetAtTime(520 + 2700 * p, ctx.currentTime, 0.5); },
      chime() {
        if (!on || !ctx) return;
        const now = performance.now();
        if (now - lastChime < 140) return;
        lastChime = now;
        const f = CHIMES[Math.floor(Math.random() * CHIMES.length)];
        tone(f, ctx.currentTime + 0.01, 0.01, 0.03, 2.2, 0.03, 'sine', reverbIn);
      },
      tap() {
        if (!on || !ctx) return;
        tone(196, ctx.currentTime + 0.005, 0.005, 0.02, 0.35, 0.09, 'sine', filter);
      },
    };
  })();

  function initSound() {
    const btn = $('#soundToggle');
    if (!btn) return;
    const label = $('.sound-label', btn);
    btn.addEventListener('click', () => {
      const on = Sound.toggle();
      btn.setAttribute('aria-pressed', String(on));
      label.textContent = on ? 'Sound on' : 'Sound off';
    });
    doc.addEventListener('click', e => {
      if (e.target.closest('a, button') && !e.target.closest('#soundToggle')) Sound.tap();
    });
  }

  /* ------------------------------------------------------------------
     Opening curtain
  ------------------------------------------------------------------ */
  function initCurtain(ready) {
    const curtain = $('#curtain');
    if (!curtain) return;
    if (reduce) { curtain.classList.add('is-gone'); return; }
    const started = performance.now();
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      const wait = Math.max(0, 1250 - (performance.now() - started));
      setTimeout(() => {
        curtain.classList.add('is-open');
        root.classList.add('is-revealed');
        setTimeout(() => curtain.classList.add('is-gone'), 1400);
      }, wait);
    };
    ready.then(open);
    setTimeout(open, 3200);
  }

  /* ------------------------------------------------------------------
     Hero: the wordmark is cut from an espresso field and filled with
     moving hair. Scrolling zooms through the T until the reels fill the screen.
  ------------------------------------------------------------------ */
  function initHero(fontsReady) {
    const hero = $('#top');
    const stage = $('#heroStage');
    if (!hero || !stage) return;
    const svg = $('#heroMask');
    const word = $('#heroWord');
    const cutBg = $('#heroCutBg');
    const field = $('#heroFieldRect');
    const band = $('#heroBand');
    const copy = $('#heroCopy');
    const cue = $('#heroCue');
    const scrim = $('#heroScrim');
    const reels = $('#heroReels');
    const quote = $('#heroQuote');
    const quoteText = $('#heroQuoteText');
    const videos = $$('.hero-reel', hero);

    // Light the quote word by word
    const words = quoteText.textContent.trim().split(/\s+/);
    quoteText.textContent = '';
    const wordEls = words.map((w, i) => {
      const span = doc.createElement('span');
      span.className = 'w';
      span.textContent = w;
      quoteText.appendChild(span);
      if (i < words.length - 1) quoteText.appendChild(doc.createTextNode(' '));
      return span;
    });

    // Measuring helpers (a hidden SVG, so metrics match the mask exactly)
    const NS = 'http://www.w3.org/2000/svg';
    const measurer = doc.createElementNS(NS, 'svg');
    measurer.setAttribute('aria-hidden', 'true');
    measurer.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px;visibility:hidden;overflow:hidden';
    const mText = doc.createElementNS(NS, 'text');
    mText.setAttribute('font-family', 'Bodoni Moda');
    mText.setAttribute('font-weight', '900');
    measurer.appendChild(mText);
    body.appendChild(measurer);

    function textLength(str, size) {
      mText.removeAttribute('textLength');
      mText.setAttribute('font-size', size);
      mText.textContent = str;
      return mText.getComputedTextLength();
    }
    function charExtent(str, size, index, fitLength) {
      mText.setAttribute('font-size', size);
      mText.textContent = str;
      if (fitLength) { mText.setAttribute('textLength', fitLength); mText.setAttribute('lengthAdjust', 'spacing'); }
      else mText.removeAttribute('textLength');
      const ext = mText.getExtentOfChar(index);
      return { x: ext.x, width: ext.width };
    }
    // Cap height and stem width of the T, read from pixels
    function glyphMetrics() {
      try {
        const c = doc.createElement('canvas'); c.width = 320; c.height = 320;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.font = '900 200px "Bodoni Moda"';
        x.fillText('T', 60, 260);
        const cap = x.measureText('T').actualBoundingBoxAscent;
        const row = x.getImageData(0, Math.round(260 - cap * 0.5), 320, 1).data;
        let a = -1, b = -1;
        for (let i = 0; i < 320; i++) if (row[i * 4 + 3] > 128) { if (a < 0) a = i; b = i; }
        const stem = (b - a + 1) / 200;
        if (cap > 80 && stem > 0.05 && stem < 0.5) return { cap: cap / 200, stem };
      } catch (e) { /* fall through */ }
      return { cap: 0.7, stem: 0.19 };
    }

    let geo = null;       // geometry of the current layout
    let metrics = null;

    function layout() {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      if (!W || !H) return;
      metrics = metrics || glyphMetrics();
      const headerH = ($('#siteHeader') || {}).offsetHeight || 72;
      const top = headerH + H * 0.02;
      const bottom = copy.offsetTop - H * 0.045;
      const availH = Math.max(120, bottom - top);
      const stacked = W / H < 0.8;
      let html = '';

      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      cutBg.setAttribute('width', W); cutBg.setAttribute('height', H);
      field.setAttribute('width', W); field.setAttribute('height', H);

      if (!stacked) {
        const unit = textLength('ARTORA', 100) / 100;                    // width in em
        const size = Math.min((W * 0.9) / unit, (availH * 0.94) / metrics.cap);
        const len = unit * size;
        const capH = metrics.cap * size;
        const x0 = (W - len) / 2;
        const capTop = top + (availH - capH) / 2;
        const baseline = capTop + capH;
        const t = charExtent('ARTORA', size, 2);
        const showBand = capH > 150;
        const bandH = Math.max(capH * 0.115, 22);
        const bandY = capTop + capH * 0.49;
        html = `<text x="${x0}" y="${baseline}" font-size="${size}" font-family="Bodoni Moda" font-weight="900" fill="#000">ARTORA</text>`;
        if (showBand) html += `<rect id="heroBandRect" x="${x0 - size}" y="${bandY}" width="${len + size * 2}" height="${bandH}" fill="#fff"/>`;
        band.classList.remove('is-stacked');
        band.style.display = showBand ? '' : 'none';
        band.style.left = x0 + 'px'; band.style.width = len + 'px';
        band.style.top = bandY + 'px'; band.style.height = bandH + 'px';
        band.style.fontSize = clamp(bandH * 0.36, 9, 15) + 'px';
        geo = { W, H, ox: x0 + t.x + t.width / 2, oy: capTop + capH * 0.24, stem: metrics.stem * size };
      } else {
        const l1 = textLength('ART', 100) / 100;
        const l2 = textLength('ORA', 100) / 100;
        const unit = Math.max(l1, l2);
        const gapRatio = 0.2;
        const size = Math.min((W * 0.88) / unit, (availH * 0.96) / (metrics.cap * 2 + gapRatio));
        const len = unit * size;
        const capH = metrics.cap * size;
        const gap = Math.max(30, gapRatio * size);
        const x0 = (W - len) / 2;
        const blockTop = top + (availH - (capH * 2 + gap)) / 2;
        const b1 = blockTop + capH;
        const b2 = b1 + gap + capH;
        const t = charExtent('ART', size, 2, len);
        const attrs = `font-size="${size}" font-family="Bodoni Moda" font-weight="900" fill="#000" textLength="${len}" lengthAdjust="spacing"`;
        html = `<text x="${x0}" y="${b1}" ${attrs}>ART</text><text x="${x0}" y="${b2}" ${attrs}>ORA</text>`;
        band.classList.add('is-stacked');
        band.style.display = '';
        band.style.left = x0 + 'px'; band.style.width = len + 'px';
        band.style.top = b1 + 'px'; band.style.height = gap + 'px';
        band.style.fontSize = clamp(gap * 0.3, 9, 13) + 'px';
        geo = { W, H, ox: x0 + t.x + t.width / 2, oy: blockTop + capH * 0.55, stem: metrics.stem * size };
      }
      word.innerHTML = html;
      geo.bandRect = $('#heroBandRect');
      geo.maxScale = (1.7 * Math.max(geo.ox, geo.W - geo.ox)) / (geo.stem / 2);
      current = -1; // force a redraw
    }

    // Scroll state
    let target = 0, smooth = 0, current = -1, inView = true;

    function measureProgress() {
      const span = hero.offsetHeight - vh;
      target = span > 0 ? clamp((scrollY - hero.offsetTop) / span) : 0;
    }

    function draw(p) {
      if (!geo) return;
      const z = clamp(p / 0.56);                       // zoom phase
      const q = clamp((p - 0.58) / 0.26);              // quote phase
      if (reduce) {
        field.style.opacity = 1 - clamp((p - 0.3) / 0.2);
      } else {
        const s = Math.pow(geo.maxScale, Math.pow(z, 1.25));
        word.setAttribute('transform', `translate(${geo.ox} ${geo.oy}) scale(${s}) translate(${-geo.ox} ${-geo.oy})`);
        field.style.opacity = 1 - clamp((z - 0.82) / 0.18);
        reels.style.transform = `scale(${1.14 - 0.14 * z})`;
      }
      svg.style.visibility = p >= 0.56 && !reduce ? 'hidden' : 'visible';
      const fadeOut = 1 - clamp(z / 0.16);
      if (geo.bandRect) geo.bandRect.setAttribute('fill-opacity', fadeOut);
      band.style.opacity = fadeOut;
      copy.style.opacity = fadeOut;
      copy.style.transform = `translateY(${-z * 60}px)`;
      copy.style.pointerEvents = fadeOut < 0.4 ? 'none' : '';
      copy.style.visibility = fadeOut <= 0 ? 'hidden' : '';
      cue.style.opacity = 1 - clamp(p / 0.04);
      scrim.style.opacity = clamp((p - 0.42) / 0.16);
      quote.style.opacity = clamp((p - 0.54) / 0.08);
      quote.style.transform = reduce ? '' : `translateY(${(1 - clamp((p - 0.54) / 0.2)) * 40}px)`;
      const lit = q * (wordEls.length + 1);
      wordEls.forEach((el, i) => el.classList.toggle('is-lit', i < lit));
    }

    function frame() {
      if (!inView) return;
      smooth = reduce ? target : lerp(smooth, target, 0.14);
      if (Math.abs(smooth - target) < 0.0004) smooth = target;
      if (smooth !== current) { current = smooth; draw(smooth); }
    }

    // Reels: load only the ones shown, play only while the hero is on screen
    function startVideos() {
      if (reduce || saveData) return;
      videos.forEach(v => {
        if (getComputedStyle(v).display === 'none') return;
        v.muted = true; v.defaultMuted = true; v.playsInline = true;
        if (!v.src) { v.src = v.dataset.src; v.load(); }
        const attempt = v.play();
        if (attempt && attempt.catch) attempt.catch(() => {});
      });
    }
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) startVideos(); else videos.forEach(v => v.pause());
    }).observe(hero);
    ['touchstart', 'click'].forEach(t => doc.addEventListener(t, () => { if (inView) startVideos(); }, { once: true, passive: true }));

    fontsReady.then(() => { layout(); measureProgress(); smooth = target; frame(); });
    let lastW = vw, lastH = vh;
    resizeTasks.push(() => {
      // phones fire resize when the address bar slides; only re-lay out on real changes
      if (vw === lastW && Math.abs(vh - lastH) < 130) return;
      lastW = vw; lastH = vh;
      layout(); startVideos();
    });
    frameTasks.push(() => { measureProgress(); frame(); });
  }

  /* ------------------------------------------------------------------
     Chrome follows the shade underneath it
  ------------------------------------------------------------------ */
  function initShades() {
    const sections = $$('[data-shade]').map(el => ({
      el,
      tone: el.dataset.tone,
      name: el.dataset.shade,
      level: el.dataset.level,
      bg: (getComputedStyle(el).getPropertyValue('--bg') || '').trim() || '#1B100A',
      id: el.id,
    }));
    const header = $('#siteHeader');
    const badge = $('#bookBadge');
    const sound = $('#soundToggle');
    const gauge = $('#gauge');
    const gaugeDot = $('#gaugeDot');
    const gaugeLevel = $('#gaugeLevel');
    const gaugeName = $('#gaugeName');
    const hero = $('#top');
    const navLinks = $$('.site-nav a');
    const state = {};

    // a section's own colour starts after its melt zone
    const measureMelt = () => sections.forEach(s => {
      s.melt = (parseFloat(getComputedStyle(s.el).backgroundImage.match(/([\d.]+)px\)$/)?.[1]) || 0) * 0.6;
    });
    measureMelt();
    resizeTasks.push(measureMelt);
    function sectionAt(y) {
      let found = sections[0];
      for (const s of sections) if (s.top + s.melt <= y) found = s;
      return found;
    }
    function set(key, value, apply) { if (state[key] !== value) { state[key] = value; apply(value); } }

    function update(now, moved) {
      if (!moved) return;
      sections.forEach(s => { s.top = s.el.getBoundingClientRect().top; });
      const top = sectionAt(36);
      const mid = sectionAt(vh / 2);
      const low = sectionAt(vh - 70);

      set('tone', top.tone, v => { body.dataset.tone = v; });
      set('chrome', top.bg, v => root.style.setProperty('--chrome-bg', v));
      set('solid', scrollY > hero.offsetHeight - 80, v => header.classList.toggle('is-solid', v));

      set('lowTone', low.tone + low.bg, () => {
        [badge, sound].forEach(el => { if (el) { el.dataset.tone = low.tone; el.style.setProperty('--chrome-bg', low.bg); } });
      });
      set('badge', scrollY > vh * 0.5, v => badge && badge.classList.toggle('is-on', v));
      set('scrolled', scrollY > vh * 0.5, v => body.classList.toggle('is-scrolled', v));

      set('mid', mid.name, () => {
        if (gauge) { gauge.dataset.tone = mid.tone; gauge.style.setProperty('--chrome-bg', mid.bg); gaugeLevel.textContent = mid.level; gaugeName.textContent = mid.name; }
        navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + mid.id));
      });

      const max = root.scrollHeight - vh;
      const progress = max > 0 ? clamp(scrollY / max) : 0;
      if (gaugeDot) gaugeDot.style.top = (progress * 100).toFixed(2) + '%';
      Sound.brightness(progress);
    }
    frameTasks.push(update);
  }

  /* ------------------------------------------------------------------
     Marquee: drifts on its own, hurries when you scroll
  ------------------------------------------------------------------ */
  function initMarquee() {
    const track = $('#marqueeTrack');
    if (!track || reduce) return;
    const originals = Array.from(track.children);
    originals.forEach(node => track.appendChild(node.cloneNode(true)));
    let x = 0, lastScroll = scrollY, velocity = 0, half = 0, visible = false, last = performance.now();
    const measure = () => { half = track.scrollWidth / 2; };
    measure();
    resizeTasks.push(measure);
    (doc.fonts ? doc.fonts.ready : Promise.resolve()).then(measure);
    new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(track.parentElement);
    frameTasks.push(now => {
      const dt = Math.min(64, now - last); last = now;
      const dy = scrollY - lastScroll; lastScroll = scrollY;
      velocity = lerp(velocity, dy, 0.12);
      if (!visible || !half) return;
      x -= (0.055 * dt) + Math.abs(velocity) * 0.9;
      if (x <= -half) x += half;
      track.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${clamp(velocity * -0.12, -7, 7).toFixed(2)}deg)`;
    });
  }

  /* ------------------------------------------------------------------
     Arrivals: glints on headings, wipes on images
  ------------------------------------------------------------------ */
  function initReveals() {
    const items = $$('[data-glint], [data-reveal], .look');
    if (!('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => {
      let n = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.classList.contains('look')) $('.look-media', el).style.transitionDelay = `0s, ${(n++ * 0.09).toFixed(2)}s, 0s`;
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    items.forEach(el => io.observe(el));
  }

  /* ------------------------------------------------------------------
     Gentle parallax inside framed photos
  ------------------------------------------------------------------ */
  function initParallax() {
    const items = $$('[data-parallax]');
    if (reduce || !items.length) return;
    items.forEach(img => { img.style.scale = '1.12'; });
    frameTasks.push((now, moved) => {
      if (!moved) return;
      items.forEach(img => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const speed = parseFloat(img.dataset.parallax) || 0.06;
        const limit = r.height * 0.05;
        const y = clamp((r.top + r.height / 2 - vh / 2) * -speed, -limit, limit);
        img.style.translate = `0 ${y.toFixed(1)}px`;
      });
    });
  }

  /* ------------------------------------------------------------------
     Videos: fetch near the viewport, play only while visible
  ------------------------------------------------------------------ */
  function initLazyVideos() {
    const videos = $$('video[data-lazy-video]');
    if (!videos.length) return;
    const visible = new Set();
    videos.forEach(v => { v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('webkit-playsinline', ''); });

    const allowed = v => !reduce && !saveData && !(v.classList.contains('story-media') && !v.classList.contains('is-active'));
    function load(v) { if (!v.dataset.loaded) { v.dataset.loaded = '1'; v.src = v.dataset.src; v.load(); } }
    function start(v) {
      if (!allowed(v)) return;
      load(v);
      const attempt = v.play();
      if (attempt && attempt.catch) attempt.catch(() => {
        v.addEventListener('canplay', () => { if (visible.has(v) && allowed(v)) v.play().catch(() => {}); }, { once: true });
      });
    }
    if (!('IntersectionObserver' in window)) return;
    const player = new IntersectionObserver(entries => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) { visible.add(v); start(v); } else { visible.delete(v); v.pause(); }
      });
    }, { rootMargin: '120px 0px', threshold: 0 });
    videos.forEach(v => player.observe(v));
    // Phones in Low Power Mode block autoplay until the first touch
    ['touchstart', 'click'].forEach(t => doc.addEventListener(t, () => visible.forEach(start), { once: true, passive: true }));
    return { refresh() { visible.forEach(v => (allowed(v) ? start(v) : v.pause())); } };
  }

  /* ------------------------------------------------------------------
     Philosophy: the picture changes as each idea reaches the middle
  ------------------------------------------------------------------ */
  function initStory(videoCtl) {
    const steps = $$('.story-step');
    const media = $$('.story-media');
    if (!steps.length || !('IntersectionObserver' in window)) return;
    const activate = index => {
      steps.forEach(s => s.classList.toggle('is-active', s.dataset.story === index));
      media.forEach(m => m.classList.toggle('is-active', m.dataset.story === index));
      if (videoCtl) videoCtl.refresh();
    };
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) activate(e.target.dataset.story); });
    }, { rootMargin: '-48% 0px -48% 0px', threshold: 0 });
    steps.forEach(s => io.observe(s));
  }

  /* ------------------------------------------------------------------
     Services: one open at a time, with a picture that trails the pointer
  ------------------------------------------------------------------ */
  function initMenu() {
    const items = $$('.menu-item');
    if (!items.length) return;
    items.forEach(item => {
      const btn = $('.menu-toggle-row', item);
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        items.forEach(other => {
          other.classList.toggle('is-open', other === item && open);
          $('.menu-toggle-row', other).setAttribute('aria-expanded', String(other === item && open));
        });
      });
    });

    const preview = $('#menuPreview');
    const img = $('#menuPreviewImg');
    if (!preview || !finePointer || reduce) return;
    let tx = 0, ty = 0, x = 0, y = 0, active = false, lastX = 0;
    items.forEach(item => {
      const row = $('.menu-toggle-row', item);
      row.addEventListener('pointerenter', e => {
        const src = item.dataset.preview;
        if (!src) return;
        if (img.getAttribute('src') !== src) img.src = src;
        if (!active) { x = tx = e.clientX; y = ty = e.clientY; }
        active = true;
        preview.classList.add('is-on');
        Sound.chime();
      });
      row.addEventListener('pointerleave', () => { active = false; preview.classList.remove('is-on'); });
    });
    window.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    window.addEventListener('scroll', () => { if (active) { active = false; preview.classList.remove('is-on'); } }, { passive: true });
    frameTasks.push(() => {
      if (!active && Math.abs(tx - x) < 0.5) return;
      x = lerp(x, tx, 0.14); y = lerp(y, ty, 0.14);
      const tilt = clamp((x - lastX) * 0.6, -9, 9); lastX = x;
      const w = preview.offsetWidth, h = preview.offsetHeight;
      const px = clamp(x + 36, 12, vw - w - 12);
      const py = clamp(y - h * 0.55, 12, vh - h - 12);
      preview.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
    });
  }

  /* ------------------------------------------------------------------
     Lookbook: filters, gloss on hover, full-screen viewer
  ------------------------------------------------------------------ */
  function initLookbook() {
    const grid = $('#looks');
    if (!grid) return;
    const looks = $$('.look', grid);
    const filters = $$('#lookFilters .filter');
    const cursor = $('#cursorTag');

    // Filters
    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        filters.forEach(b => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
        let shown = 0;
        looks.forEach(look => {
          const match = filter === 'all' || look.dataset.tags.split(' ').includes(filter);
          const media = $('.look-media', look);
          look.classList.remove('is-in');
          media.style.transitionDelay = '0s';
          if (match) {
            look.hidden = false;
            look.classList.remove('is-out');
            const delay = Math.min(shown++, 8) * 0.06;
            requestAnimationFrame(() => requestAnimationFrame(() => {
              media.style.transitionDelay = `0s, ${delay.toFixed(2)}s, 0s`;
              look.classList.add('is-in');
            }));
          } else {
            look.hidden = true;
          }
        });
      });
    });

    // Gloss and tilt follow the pointer
    if (finePointer && !reduce) {
      looks.forEach(look => {
        const media = $('.look-media', look);
        look.addEventListener('pointermove', e => {
          const r = look.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          media.style.setProperty('--px', px.toFixed(3));
          media.style.transform = `rotateY(${((px - 0.5) * 7).toFixed(2)}deg) rotateX(${((0.5 - py) * 5).toFixed(2)}deg)`;
        });
        look.addEventListener('pointerenter', () => {
          media.style.transitionDelay = '0s';
          if (cursor) { cursor.textContent = look.dataset.type === 'video' ? 'Play' : 'View'; cursor.classList.add('is-on'); }
          Sound.chime();
        });
        look.addEventListener('pointerleave', () => {
          media.style.transform = '';
          if (cursor) cursor.classList.remove('is-on');
        });
      });
      if (cursor) {
        let cx = 0, cy = 0, tx = 0, ty = 0;
        window.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
        window.addEventListener('scroll', () => cursor.classList.remove('is-on'), { passive: true });
        frameTasks.push(() => {
          cx = lerp(cx, tx, 0.2); cy = lerp(cy, ty, 0.2);
          cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
        });
      }
    }

    // Viewer
    const viewer = $('#viewer');
    const stageEl = $('#viewerStage');
    const captionEl = $('#viewerCaption');
    const countEl = $('#viewerCount');
    const closeBtn = $('#viewerClose');
    const prevBtn = $('#viewerPrev');
    const nextBtn = $('#viewerNext');
    let list = [], index = 0, lastFocus = null;

    function show(dir) {
      const look = list[index];
      stageEl.style.setProperty('--dir', dir);
      stageEl.textContent = '';
      let el;
      if (look.dataset.type === 'video') {
        el = doc.createElement('video');
        Object.assign(el, { src: look.getAttribute('href'), controls: true, autoplay: !reduce, muted: true, loop: true, playsInline: true });
        const poster = $('video', look); if (poster && poster.poster) el.poster = poster.poster;
      } else {
        el = doc.createElement('img');
        el.src = look.getAttribute('href');
        el.alt = ($('img', look) || {}).alt || look.dataset.caption;
      }
      stageEl.appendChild(el);
      captionEl.textContent = look.dataset.caption;
      countEl.textContent = `${index + 1} of ${list.length}`;
      // warm the next picture
      const next = list[(index + 1) % list.length];
      if (next && next.dataset.type === 'image') { const pre = new Image(); pre.src = next.getAttribute('href'); }
    }
    function open(look) {
      list = looks.filter(l => !l.hidden);
      index = Math.max(0, list.indexOf(look));
      lastFocus = doc.activeElement;
      viewer.hidden = false;
      body.classList.add('is-viewer-open');
      if (cursor) cursor.classList.remove('is-on');
      requestAnimationFrame(() => viewer.classList.add('is-open'));
      show(1);
      closeBtn.focus({ preventScroll: true });
    }
    function close() {
      if (viewer.hidden) return;
      viewer.classList.remove('is-open');
      body.classList.remove('is-viewer-open');
      setTimeout(() => { viewer.hidden = true; stageEl.textContent = ''; }, 300);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    function step(dir) { index = (index + dir + list.length) % list.length; show(dir); Sound.chime(); }

    looks.forEach(look => look.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault(); open(look);
    }));
    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', () => step(-1));
    nextBtn.addEventListener('click', () => step(1));
    viewer.addEventListener('click', e => { if (e.target === viewer || e.target === stageEl) close(); });
    doc.addEventListener('keydown', e => {
      if (viewer.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Tab') {
        const f = [closeBtn, prevBtn, nextBtn].concat($$('video', stageEl));
        const i = f.indexOf(doc.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    let touchX = null, touchY = null;
    stageEl.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
    stageEl.addEventListener('touchend', e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      const dy = e.changedTouches[0].clientY - touchY;
      touchX = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     Buttons that lean toward the pointer
  ------------------------------------------------------------------ */
  function initMagnetic() {
    if (!finePointer || reduce) return;
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${(dx * 0.22).toFixed(1)}px, ${(dy * 0.3).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------
     Footer wordmark: a rose gloss crosses it as it scrolls into view
  ------------------------------------------------------------------ */
  function initFooterWord() {
    const wordEl = $('.footer-word');
    if (!wordEl) return;
    if (reduce) { wordEl.style.setProperty('--sweep', '0%'); return; }
    frameTasks.push((now, moved) => {
      if (!moved) return;
      const r = wordEl.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) return;
      const p = clamp((vh - r.top) / (vh * 0.75 + r.height));
      wordEl.style.setProperty('--sweep', ((1 - p) * 100).toFixed(1) + '%');
    });
  }

  /* ------------------------------------------------------------------
     Open now? (studio time is New York time)
  ------------------------------------------------------------------ */
  function initHours() {
    const out = $('#openStatus');
    if (!out) return;
    const HOURS = { 2: [600, 1080], 3: [600, 1080], 4: [600, 1080], 6: [570, 1080] }; // minutes from midnight
    const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const fmt = m => {
      const h = Math.floor(m / 60), min = m % 60;
      return `${((h + 11) % 12) + 1}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    };
    function update() {
      let day, minutes;
      try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
        const get = type => parts.find(p => p.type === type).value;
        day = NAMES.indexOf(get('weekday'));
        minutes = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
      } catch (e) { return; }
      if (day < 0 || isNaN(minutes)) return;
      const today = HOURS[day];
      let text, open = false;
      if (today && minutes >= today[0] && minutes < today[1]) {
        open = true;
        text = `Open now, until ${fmt(today[1])}`;
      } else if (today && minutes < today[0]) {
        text = `Closed now, opens today at ${fmt(today[0])}`;
      } else {
        let next = day;
        for (let i = 1; i <= 7; i++) { next = (day + i) % 7; if (HOURS[next]) break; }
        const when = next === (day + 1) % 7 ? 'tomorrow' : NAMES[next];
        text = `Closed now, opens ${when} at ${fmt(HOURS[next][0])}`;
      }
      out.textContent = text;
      out.classList.toggle('is-open', open);
      out.hidden = false;
      $$('.hours tr').forEach(tr => tr.classList.toggle('is-today', tr.dataset.days.split(' ').includes(String(day))));
    }
    update();
    setInterval(update, 60000);
  }

  /* ------------------------------------------------------------------
     Small-screen menu
  ------------------------------------------------------------------ */
  function initMobileMenu() {
    const btn = $('#menuToggle');
    const menu = $('#mobileMenu');
    if (!btn || !menu) return;
    let timer;
    function set(open) {
      clearTimeout(timer);
      btn.setAttribute('aria-expanded', String(open));
      body.classList.toggle('is-menu-open', open);
      if (open) {
        menu.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      } else {
        menu.classList.remove('is-open');
        timer = setTimeout(() => { menu.hidden = true; }, 800);
      }
    }
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach(a => a.addEventListener('click', () => set(false)));
    doc.addEventListener('keydown', e => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
    resizeTasks.push(() => { if (vw > 900 && btn.getAttribute('aria-expanded') === 'true') set(false); });
  }

  /* ------------------------------------------------------------------
     Welcome splash: "Ayfer Salon is now Artora Beauty Bar"
     Shows only to visitors redirected from ayfersalon.com (?from=ayfersalon or referrer).
     Set WELCOME_ALWAYS = true to preview it on every load.
  ------------------------------------------------------------------ */
  const WELCOME_ALWAYS = false;
  function initWelcomeSplash() {
    const splash = $('#welcomeSplash');
    if (!splash) return;
    const params = new URLSearchParams(location.search);
    const fromOldSite = params.get('from') === 'ayfersalon' || /ayfersalon\.com/i.test(doc.referrer);
    if (!WELCOME_ALWAYS && !fromOldSite) return;

    // Tidy the address bar so the ?from= tag isn't bookmarked or shared
    if (params.has('from')) {
      params.delete('from');
      const q = params.toString();
      history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
    }

    const closeBtn = $('#welcomeClose');
    const enterBtn = $('#welcomeEnter');
    const lastFocus = doc.activeElement;

    function close() {
      splash.classList.remove('open');
      body.classList.remove('welcome-locked');
      setTimeout(() => { splash.hidden = true; }, 500);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      doc.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const f = $$('button, a[href]', splash);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    splash.hidden = false;
    body.classList.add('welcome-locked');
    requestAnimationFrame(() => requestAnimationFrame(() => splash.classList.add('open')));
    enterBtn.focus({ preventScroll: true });
    closeBtn.addEventListener('click', close);
    enterBtn.addEventListener('click', close);
    splash.addEventListener('click', e => { if (e.target === splash) close(); });
    doc.addEventListener('keydown', onKey);
  }

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  function boot() {
    const year = $('#currentYear');
    if (year) year.textContent = new Date().getFullYear();

    const fontsReady = (doc.fonts && doc.fonts.load
      ? Promise.all([doc.fonts.load('900 100px "Bodoni Moda"'), doc.fonts.ready])
      : Promise.resolve()
    ).catch(() => {});
    const fontsOrTimeout = Promise.race([fontsReady, new Promise(r => setTimeout(r, 2500))]);

    initCurtain(fontsOrTimeout);
    initWelcomeSplash();
    initHero(fontsOrTimeout);
    initShades();
    initMarquee();
    initReveals();
    initParallax();
    const videoCtl = initLazyVideos();
    initStory(videoCtl);
    initMenu();
    initLookbook();
    initMagnetic();
    initFooterWord();
    initHours();
    initMobileMenu();
    initSound();

    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
    window.addEventListener('resize', () => {
      vw = window.innerWidth; vh = window.innerHeight;
      resizeTasks.forEach(fn => fn());
    });
    // One loop for everything. `moved` is true on frames where the page scrolled or resized.
    let prevY = -1, settle = 30;
    window.addEventListener('resize', () => { settle = 10; });
    window.addEventListener('load', () => { settle = 10; });
    const loop = now => {
      const moved = scrollY !== prevY || settle > 0;
      prevY = scrollY; if (settle > 0) settle--;
      frameTasks.forEach(fn => fn(now, moved));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
