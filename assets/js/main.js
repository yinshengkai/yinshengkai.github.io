// Self-contained script (no ES module import) for broader compatibility
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));


// Reveal-on-scroll helper (staggered, bidirectional: in when visible, out when not)
const supportsIO = typeof window !== 'undefined' && 'IntersectionObserver' in window;


function computeStaggerIndex(el) {
  const parent = el && el.parentElement;
  if (!parent) return 0;
  const kids = Array.from(parent.children).filter(c => c.classList && c.classList.contains('reveal'));
  const idx = kids.indexOf(el);
  return Math.max(0, idx);
}
// Reversible reveal with small hysteresis to avoid flicker on fast scroll
const HIDE_DELAY = 140; // ms
function applyReveal(target, entering) {
  if (!target) return;
  const any = /** @type {any} */ (target);
  if (entering) {
    // Cancel any pending hide
    if (any._revealHideTimer) { clearTimeout(any._revealHideTimer); any._revealHideTimer = 0; }
    const idx = computeStaggerIndex(target);
    const delay = Math.min(idx, 12) * 70; // cap long lists
    target.style.setProperty('--reveal-delay', delay + 'ms');
    target.classList.add('in');
  } else {
    // Debounce hide to prevent rapid toggle when scrolling fast
    if (any._revealHideTimer) return; // already queued
    any._revealHideTimer = setTimeout(() => {
      target.classList.remove('in');
      any._revealHideTimer = 0;
    }, HIDE_DELAY);
  }
}

// IO config: enter when a sliver shows; hide when fully gone
const observer = supportsIO ? new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const el = entry.target;
    const ratio = entry.intersectionRatio || 0;
    if (entry.isIntersecting && ratio > 0.02) {
      applyReveal(el, true);
    } else if (!entry.isIntersecting && ratio === 0) {
      applyReveal(el, false);
    }
  });
}, { root: null, rootMargin: '0px 0px -4% 0px', threshold: [0, 0.02, 0.1] }) : null;
const reveal = (el) => { if (!el) return; if (observer) observer.observe(el); else el.classList.add('in'); };



// Placeholder media generator (blank background; no text)
function placeholderImage(bg = "#0b0f14") {
  const svg = `<?xml version='1.0' encoding='UTF-8'?>
  <svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'>
    <rect width='100%' height='100%' fill='${bg}'/>
  </svg>`;
  // btoa fails on non-ASCII; encode to UTF-8 safely first
  const base64 = (() => {
    try {
      return btoa(unescape(encodeURIComponent(svg)));
    } catch {
      // Fallback: minimal manual percent-decoding then btoa
      const utf8 = encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode('0x' + p));
      return btoa(utf8);
    }
  })();
  return `data:image/svg+xml;base64,${base64}`;
}

// Data loading (modular content via JSON files under assets/data)
async function loadJSON(url) {
  // Allow default HTTP caching for better performance on static assets
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}



// Typewriter animation for profile bio only (skip if reduced motion)
(function typewriter() {
  try {
    const mql = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql && mql.matches) return; // skip for reduced motion
  } catch {}
  const items = [
    { sel: '.bio', speed: 8, start: 500 },
  ];
  items.forEach(({ sel, speed, start }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const full = el.textContent || '';
    // Lock height to avoid layout jump
    const h = el.getBoundingClientRect().height;
    el.style.minHeight = h + 'px';
    el.textContent = '';
    setTimeout(() => {
      let i = 0;
      const id = setInterval(() => {
        if (i >= full.length) {
          clearInterval(id);
          el.style.minHeight = '';
          return;
        }
        const span = document.createElement('span');
        span.className = 'bio-char';
        span.textContent = full.charAt(i++);
        el.appendChild(span);
      }, speed);
    }, start);
  });
})();

// Observe existing reveal elements (items only)
$$('.reveal').forEach(el => reveal(el));

// Safety: if reveal observer fails, force show shortly after
function revealFallback() {
  const pending = $$('.reveal:not(.in)');
  if (pending.length > 0) pending.forEach(el => el.classList.add('in'));
}
setTimeout(revealFallback, 400);

// Force all reveal elements visible (safety against complex layout shifts)
function forceRevealAll() {
  try { $$('.reveal').forEach(el => el.classList.add('in')); } catch { }
}

// Scroll/resize fallback to ensure re-entry on mobile when IO misses events
function revealCheckAll() {
  const vH = window.innerHeight || document.documentElement.clientHeight || 0;
  const margin = 32; // small cushion
  const items = document.querySelectorAll('.reveal');
  for (let i = 0; i < items.length; i++) {
    const el = items[i];
    const r = el.getBoundingClientRect();
    const visible = (r.bottom > -margin) && (r.top < vH + margin);
    if (visible) applyReveal(el, true);
  }
}

// Shared month names
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Render projects grid
const grid = $("#projects-grid");
function displayTitle(title) {
  return String(title).replace(/\s*\([^)]*\)\s*$/, '');
}

function getPreview(p) {
  if (p && p.description) return String(p.description);
  if (p && p.summary) return String(p.summary);
  return '';
}

// Build normalized media entries for a project.
// Input: project.media uses { filename, description } (preferred) or legacy entries with { type, src/caption/accent }.
// Output: Array of { type: 'image'|'video'|'placeholder', src, caption }
function normalizeMedia(project) {
  const id = (project && project.id) ? String(project.id) : '';
  const base = id ? `assets/projects/${id}/` : '';
  const items = Array.isArray(project && project.media) ? project.media : [];
  const isVideoExt = (fn = '') => /\.(mp4|webm|mov|m4v)$/i.test(fn);
  const isImageExt = (fn = '') => /\.(png|jpe?g|gif|webp|avif)$/i.test(fn);
  const out = [];
  for (const m of items) {
    if (m && m.filename) {
      const filename = String(m.filename).replace(/^\/+/, '');
      const src = base ? base + filename : filename;
      const desc = m.description || m.caption || '';
      if (isVideoExt(filename)) out.push({ type: 'video', src, caption: desc });
      else if (isImageExt(filename)) out.push({ type: 'image', src, caption: desc });
      else out.push({ type: 'image', src, caption: desc });
    } else if (m && m.type === 'video' && m.src) {
      out.push({ type: 'video', src: m.src, caption: m.caption || '' });
    } else if (m && m.type === 'image' && m.src) {
      out.push({ type: 'image', src: m.src, caption: m.caption || '' });
    } else if (m && m.type === 'placeholder') {
      out.push({ type: 'placeholder', src: '', caption: m.caption || '' });
    }
  }
  // Fallback to a single placeholder if empty
  return out.length ? out : [{ type: 'placeholder', src: '', caption: '' }];
}

function isPresent(period) {
  const end = (period && period.end) || '';
  return String(end).toLowerCase() === 'present';
}

// Layout tags to fill a single line, truncating with an ellipsis tag if needed
function layoutCardTags(tagsEl, names = [], prefixElems = []) {
  if (!tagsEl) return;
  // Reset and allow wrap for measuring line breaks
  tagsEl.innerHTML = '';
  const prevWrap = tagsEl.style.flexWrap;
  tagsEl.style.flexWrap = 'wrap';

  const appendTag = (label) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = label;
    tagsEl.appendChild(tag);
    return tag;
  };

  // Append fixed prefixes first (e.g., Ongoing chip)
  const fixed = Array.isArray(prefixElems) ? prefixElems : [];
  fixed.forEach(el => { if (el) tagsEl.appendChild(el); });

  let baseTop = null;
  let shown = 0;
  for (let i = 0; i < names.length; i++) {
    const el = appendTag(String(names[i]));
    const top = el.offsetTop;
    if (baseTop == null) baseTop = top;
    if (top > baseTop) { tagsEl.removeChild(el); break; }
    shown++;
  }
  const remaining = names.length - shown;
  if (remaining > 0) {
    const dots = document.createElement('span');
    dots.className = 'tag more';
    dots.textContent = '…';
    dots.setAttribute('aria-label', `${remaining} more`);
    tagsEl.appendChild(dots);
    // Ensure dots fits on the same first line; if not, remove last tag(s)
    if (baseTop != null && dots.offsetTop > baseTop) {
      // Remove tags before dots until dots fits or only prefixes remain
      while (tagsEl.childNodes.length > fixed.length + 1 && dots.offsetTop > baseTop) {
        const beforeDots = tagsEl.childNodes[tagsEl.childNodes.length - 2];
        if (!beforeDots || beforeDots === dots) break;
        tagsEl.removeChild(beforeDots);
      }
      // If still doesn't fit, remove dots
      if (dots.offsetTop > baseTop) {
        try { tagsEl.removeChild(dots); } catch { }
      }
    }
  }
  // Restore nowrap for final layout and hide overflow
  tagsEl.style.flexWrap = prevWrap || '';
}

function observeTagLayout(tagsEl, names = [], prefixElems = []) {
  if (!tagsEl) return;
  const rerender = () => layoutCardTags(tagsEl, names, prefixElems);
  try {
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => rerender());
      ro.observe(tagsEl);
    } else {
      window.addEventListener('resize', rerender);
    }
  } catch {
    window.addEventListener('resize', rerender);
  }
}

function renderProjects(projects = []) {
  projects.forEach((p) => {
    const card = document.createElement("article");
    card.className = "project-card glass reveal";
    // Ensure unified highlight behavior on cards
    card.classList.add('hl');
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${displayTitle(p.title)} — open details`);

    const cover = document.createElement("div");
    cover.className = "cover";
    const media = document.createElement("div");
    media.className = "media";
    // Force uniform black preview for grid cards
    media.style.background = '#000000';
    // Build auto-scrolling preview from project media (images/videos, muted)
    try { buildCardPreview(media, normalizeMedia(p)); } catch { }
    cover.append(media);

    const title = document.createElement("h3");
    title.className = "project-title";
    title.textContent = displayTitle(p.title);
    const titleRow = document.createElement('div');
    titleRow.className = 'project-title-row';
    titleRow.append(title);

    const desc = document.createElement("p");
    desc.className = "project-desc";
    desc.textContent = getPreview(p);

    const meta = document.createElement("div");
    meta.className = "project-meta";
    const tags = document.createElement("div");
    tags.className = "tags";
    const tagNames = Array.isArray(p.tags) ? p.tags.slice() : [];
    // mark ongoing
    if (isPresent(p.period)) {
      card.classList.add('ongoing');
      const ongoing = document.createElement('span');
      ongoing.className = 'chip ongoing';
      ongoing.textContent = 'Ongoing';
      // For skQuant, show pill beside title instead of in tags
      if ((p.id || '').toLowerCase() === 'skquant' || /sk\s*quant/i.test(p.title || '')) {
        titleRow.append(ongoing);
      } else {
        // Defer adding; handle in layout as fixed prefix
        // We'll capture this in prefixElems below
        tags.__ongoing = ongoing;
      }
    }
    meta.append(tags);

    // timeline bar
    const tl = document.createElement("div");
    tl.className = "timeline-bar";
    const fill = document.createElement("div");
    fill.className = "fill";
    const per = formatPeriod(p.period || {});
    const pct = per.progressPct;
    fill.style.setProperty("--p", `${pct}%`);
    tl.append(fill);

    // project date footer (console-styled, no pill)
    const pdate = createProjectDate(p.period || {});
    // Tap/click affordance hint (aria-hidden, purely visual)
    const hint = document.createElement('div');
    hint.className = 'tap-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = `
    <span class="label">View details</span>
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path fill="currentColor" d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
    </svg>`;
    card.append(cover, titleRow, desc, tl, meta, pdate, hint);
    grid.append(card);
    // Compute tags to fill one line and append ellipsis if overflow
    const prefix = tags.__ongoing ? [tags.__ongoing] : [];
    layoutCardTags(tags, tagNames, prefix);
    observeTagLayout(tags, tagNames, prefix);
    reveal(card);

    const open = () => openSheet(p);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
}

// Build an auto-scrolling preview inside a project card's media container
function buildCardPreview(container, mediaList) {
  if (!container) return;
  const list = Array.isArray(mediaList) ? mediaList : [];
  // Structure: .preview-rail > .preview-track > [ .preview-item* ]
  const rail = document.createElement('div');
  rail.className = 'preview-rail';
  const track = document.createElement('div');
  track.className = 'preview-track';
  rail.append(track);

  // Create slides
  const slides = [];
  list.forEach((m) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    const frame = document.createElement('div');
    frame.className = 'media-box';
    let el;
    if (m.type === 'video') {
      el = document.createElement('video');
      el.src = m.src;
      el.muted = true; el.defaultMuted = true; el.setAttribute('muted','');
      try { el.volume = 0; } catch {}
      el.loop = true; el.playsInline = true; el.setAttribute('playsinline','');
      el.preload = 'metadata';
      el.controls = false;
      try { el.disablePictureInPicture = true; } catch {}
      try { el.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback'); } catch {}
    } else if (m.type === 'image') {
      el = document.createElement('img'); el.src = m.src; el.alt = m.caption || '';
      el.loading = 'lazy'; el.decoding = 'async';
    } else {
      el = document.createElement('img'); el.src = placeholderImage('#000000'); el.alt = '';
    }
    frame.append(el);
    item.append(frame);
    slides.push(item);
  });
  // If only one, duplicate once to keep motion consistent
  const seq = slides.length <= 1 ? slides.concat(slides.map(s => s.cloneNode(true))) : slides;
  seq.forEach((s) => track.appendChild(s));

  container.innerHTML = '';
  container.appendChild(rail);

  // Adaptive slideshow: each item duration is either image=8s or video length
  let idx = 0;
  const count = slides.length;
  if (count === 0) return;
  let timer = 0;
  let paused = false;

  function clearTimer() { if (timer) { clearTimeout(timer); timer = 0; } }

  function activeIndex() { return idx % count; }
  function allItems() { return Array.from(track.querySelectorAll('.preview-item')); }

  function scheduleNext(ms) {
    clearTimer();
    if (paused) return;
    const dur = Math.max(500, Number(ms) || 8000);
    timer = window.setTimeout(() => { advance(); }, dur);
  }

  function updateActive(play = true) {
    const col = activeIndex();
    const x = -(col * 100);
    track.style.transform = `translate3d(${x}%,0,0)`;
    const items = allItems();
    items.forEach((it, j) => {
      const v = it.querySelector('video');
      if (!v) return;
      // Reset any previous end handler
      try { v.onended = null; } catch {}
      // Always hard-mute previews
      v.muted = true; v.defaultMuted = true; v.setAttribute('muted','');
      try { v.volume = 0; } catch {}
      v.playsInline = true; v.setAttribute('playsinline','');
      v.loop = false; // let it end so we can advance
      if (j % count === col && play && !paused) {
        try { v.play().catch(() => {}); } catch {}
        // Advance when the active video ends
        v.onended = () => { if (!paused && activeIndex() === col) { clearTimer(); advance(); } };
      } else {
        try { v.pause(); v.currentTime = 0; } catch {}
      }
    });
  }

  function currentDurationMs() {
    const col = activeIndex();
    const items = allItems();
    const it = items[col];
    if (!it) return 8000;
    const v = it.querySelector('video');
    if (v) {
      const dur = (isFinite(v.duration) && v.duration > 0) ? v.duration * 1000 : 8000;
      // If metadata not yet loaded, try to schedule after it arrives
      if (!(isFinite(v.duration) && v.duration > 0)) {
        const onMeta = () => {
          v.removeEventListener('loadedmetadata', onMeta);
          if (!paused && activeIndex() === col) { scheduleNext(v.duration * 1000); }
        };
        try { v.addEventListener('loadedmetadata', onMeta, { once: true }); } catch { v.addEventListener('loadedmetadata', onMeta); }
      }
      return dur;
    }
    return 8000;
  }

  function advance() {
    idx = (idx + 1) % count;
    updateActive(true);
    scheduleNext(currentDurationMs());
  }

  // Initial paint
  updateActive(true);
  scheduleNext(currentDurationMs());

  // Pause on hover/focus
  const root = container.closest('.project-card') || container;
  const onEnter = () => { paused = true; clearTimer(); const items = allItems(); const v = items[activeIndex()] && items[activeIndex()].querySelector('video'); if (v) { try { v.pause(); } catch {} } };
  const onLeave = () => { paused = false; updateActive(true); scheduleNext(currentDurationMs()); };
  root.addEventListener('mouseenter', onEnter);
  root.addEventListener('mouseleave', onLeave);
  root.addEventListener('focusin', onEnter);
  root.addEventListener('focusout', onLeave);
  // Pause when not visible
  try {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          paused = !en.isIntersecting;
          if (paused) { onEnter(); } else { onLeave(); }
        });
      }, { root: null, threshold: 0.05 });
      io.observe(root);
    }
  } catch {}

  // Register global preview pause control
  try {
    window._cardPreviews = window._cardPreviews || [];
    const handle = {
      root,
      setPaused: (p) => { if (p) onEnter(); else onLeave(); }
    };
    window._cardPreviews.push(handle);
  } catch {}
}

// Global helper to pause/resume all card previews
function pauseAllCardPreviews(pause = true) {
  try {
    const arr = window._cardPreviews || [];
    arr.forEach(h => { if (h && typeof h.setPaused === 'function') h.setPaused(!!pause); });
  } catch {}
}

// Logos scroller: load image filenames from assets/logos/manifest.json and build infinite track
// Remove near-white background and trim transparent padding; returns when done
function normalizeLogo(img) {
  return new Promise((resolve) => {
    try {
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      if (!w || !h) { resolve(); return; }
      const max = 800;
      const scale = Math.min(1, max / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, cw, ch);
      let data = ctx.getImageData(0, 0, cw, ch);
      const a = data.data;
      const idx = (x, y) => (y * cw + x) * 4;
      const corners = [idx(0, 0), idx(cw - 1, 0), idx(0, ch - 1), idx(cw - 1, ch - 1)];
      const whiteish = (i) => a[i] > 240 && a[i + 1] > 240 && a[i + 2] > 240 && a[i + 3] > 200;
      const hasWhiteBG = corners.some(i => whiteish(i));
      if (hasWhiteBG) {
        for (let i = 0; i < a.length; i += 4) {
          if (a[i] > 240 && a[i + 1] > 240 && a[i + 2] > 240) a[i + 3] = 0; // make white transparent
        }
      }
      // Find tight bounds of non-transparent pixels
      let minX = cw, minY = ch, maxX = 0, maxY = 0;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const alpha = a[idx(x, y) + 3];
          if (alpha > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (minX <= maxX && minY <= maxY) {
        const w2 = maxX - minX + 1, h2 = maxY - minY + 1;
        const c2 = document.createElement('canvas'); c2.width = w2; c2.height = h2;
        const ctx2 = c2.getContext('2d');
        // put updated data back then crop-draw
        ctx.putImageData(data, 0, 0);
        ctx2.drawImage(c, minX, minY, w2, h2, 0, 0, w2, h2);
        img.src = c2.toDataURL('image/png');
      }
    } catch { }
    resolve();
  });
}

async function renderLogos() {
  const track = document.getElementById('logos-track');
  if (!track) return;
  let files = [];
  try {
    // Expecting an array like: ["company1.svg", "company2.png", ...]
    const res = await fetch('assets/logos/manifest.json');
    if (!res.ok) throw new Error('No logos manifest');
    files = await res.json();
  } catch {
    // If no manifest present, quietly skip
    return;
  }
  const makeImgs = () => files.map(fn => {
    const wrap = document.createElement('div');
    wrap.className = 'logo';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = `assets/logos/${fn}`;
    const base = String(fn).split('/').pop() || '';
    img.alt = base.replace(/[-_]/g, ' ').replace(/\.[a-zA-Z0-9]+$/, '').trim() || 'Company logo';
    wrap.appendChild(img);
    return wrap;
  });
  // Triple sequence for smoother loop buffer
  const seqA = makeImgs();
  const seqB = makeImgs();
  const seqC = makeImgs();
  seqA.forEach(el => track.appendChild(el));
  seqB.forEach(el => track.appendChild(el));
  seqC.forEach(el => track.appendChild(el));
  // Compute half-width and set animation distance/duration after images are ready
  const imgs = Array.from(track.querySelectorAll('img'));
  const whenReady = Promise.all(imgs.map(img => {
    if (img.decode) return img.decode().catch(() => { });
    return new Promise(res => { if (img.complete) res(); else img.onload = () => res(); });
  }));
  whenReady.then(async () => {
    // Normalize each image: remove white BG and trim padding
    await Promise.all(imgs.map(normalizeLogo));
    // Switch to JS-driven RAF scroller for smoother performance
    const cycle = Math.max(1, Math.round(track.scrollWidth / 3));
    track.classList.add('js-logos');
    let x = 0;
    let raf = 0;
    let last = performance.now();
    const speed = 40; // px per second
    const frame = (now) => {
      const dt = Math.max(0, Math.min(100, now - last));
      last = now;
      const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const v = prefersReduced ? 0 : speed;
      x -= (v * dt) / 1000;
      if (x <= -cycle) x += cycle;
      track.style.transform = `translate3d(${x}px,0,0)`;
      raf = requestAnimationFrame(frame);
    };
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
      try {
        if (document.hidden) { if (raf) cancelAnimationFrame(raf); }
        else { raf = requestAnimationFrame((t) => { last = t; frame(t); }); }
      } catch { }
    });
  }).finally(() => {
    reveal(track.closest('.reveal'));
  });
}

// Render education timeline
const eduEl = document.getElementById('education-timeline');
function renderEducation(education = []) {
  if (!eduEl) return;
  education.forEach((e) => {
    const item = document.createElement('div');
    item.className = 'timeline-item reveal';
    const card = document.createElement('div'); card.className = 'timeline-card glass';
    const logo = document.createElement('div'); logo.className = 'logo-badge'; logo.textContent = (e.logo && e.logo.text) || initials(e.school);
    if (e.logo && e.logo.color) card.style.setProperty('--logo-color', e.logo.color);
    const wrap = document.createElement('div');
    const role = document.createElement('p'); role.className = 'timeline-role'; role.textContent = e.degree;
    const school = document.createElement('p'); school.className = 'timeline-org'; school.textContent = e.school;
    const detail = document.createElement('p'); detail.className = 'timeline-note'; detail.textContent = e.details;
    wrap.append(role, school, detail);
    const date = createDateBadge(e.period, (e.logo && e.logo.color));
    card.append(logo, wrap, date); item.append(card); eduEl.append(item);
    reveal(item);
  });
}

// Kick off loading and rendering of modular data
(async function initData() {
  try {
    const [projects, education] = await Promise.all([
      loadJSON('assets/data/projects.json'),
      loadJSON('assets/data/education.json'),
    ]);
    renderProjects(projects);
    renderEducation(education);
    renderLogos();
  } catch (err) {
    console.error('Failed to load data files:', err);
  }
})();

function createDateBadge(period, color) {
  const date = document.createElement('div');
  date.className = 'timeline-date';
  if (color) date.style.setProperty('--logo-color', color);
  const { start, end } = parsePeriod(period);
  const text = document.createElement('span');
  text.className = 'pd-text';
  const endIsPresent = !end.y || /present/i.test(String(end.m || ''));
  const endHTML = endIsPresent ? 'Present' : `<span class="m">${end.m}</span> <span class="y">${end.y}</span>`;
  text.innerHTML = `<span class="m">${start.m}</span> <span class="y">${start.y}</span> <span class="date-dash">–</span> ${endHTML}`;
  date.append(text);
  return date;
}

function createProjectDate(periodObj) {
  const date = document.createElement('div');
  date.className = 'project-date';
  let s = new Date();
  try { s = parseYM(periodObj.start || ''); } catch { }
  const sM = MONTHS[s.getMonth()];
  const sY = s.getFullYear();
  let eText = 'Present';
  if (periodObj.end && String(periodObj.end).toLowerCase() !== 'present') {
    const e = parseYM(periodObj.end);
    eText = `${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
  }
  const text = document.createElement('span');
  text.className = 'pd-text';
  text.innerHTML = `<span class=\"m\">${sM}</span> <span class=\"y\">${sY}</span> <span class=\"date-dash\">–</span> ${eText}`;
  date.append(text);
  return date;
}



function parsePeriod(period = '') {
  const cleaned = period.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(/—|–|-/).map(s => s.trim());
  const start = toMY(parts[0]);
  const end = toMY(parts[1] || 'Present');
  return { start, end };
}

function toMY(s = '') {
  const m = /([A-Za-z]{3,})\s+(\d{4})/i.exec(s);
  if (!m) return { m: s || 'Present', y: '' };
  const mo = m[1].slice(0, 3);
  const y = m[2];
  return { m: mo, y };
}

// Sheet + slider logic
const sheet = $("#project-sheet");
const sheetTitle = $("#sheet-title");
const sheetDesc = $("#sheet-desc");
const sheetBody = document.querySelector('#project-sheet .sheet-body');
const sheetRange = $("#sheet-range");
const sheetTags = $("#sheet-tags");
const sheetBackdrop = sheet.querySelector("[data-close]");
const sheetClose = sheet.querySelector(".close");

const slider = $("#sheet-slider");
const sliderTrack = $("#slider-track");
const sliderProgress = $("#slider-progress");
const btnPrev = $("#slider-prev");
const btnNext = $("#slider-next");
// Ensure a play/pause button exists on the slider
let ppBtn = slider && slider.querySelector('.pp-btn');
if (!ppBtn && slider) { ppBtn = document.createElement('button'); ppBtn.type = 'button'; ppBtn.className = 'pp-btn'; slider.appendChild(ppBtn); }

function updatePPBtnVisibility(activeIndex = sliderState.i) {
  try {
    if (!ppBtn || !sliderTrack) return;
    const slides = $$(".slide", sliderTrack);
    const sl = slides[activeIndex];
    const hasVideo = !!(sl && sl.querySelector && sl.querySelector('video'));
    ppBtn.style.display = hasVideo ? '' : 'none';
  } catch {}
}
const sliderDots = $("#slider-dots");
// Overlay caption element inside slider (not transformed with track)
const sliderCap = $("#slider-cap");

let activeProject = null;
let lastTrigger = null;
let sliderState = {
  i: 0,
  count: 0,
  dur: 5000,
  raf: 0,
  t0: 0,
  paused: false,
  media: [],
  durs: [],
};
let savedScrollY = 0;

// Scroll lock via event blockers (keeps scrollbar width stable)
const isSheetVisible = () => sheet && sheet.getAttribute('aria-hidden') === 'false';
const withinPanel = (target) => {
  const panel = sheet && sheet.querySelector('.sheet-panel');
  return !!(panel && panel.contains(target));
};
// Touch (mobile)
const touchBlocker = (e) => {
  if (!isSheetVisible()) return;
  if (withinPanel(e.target)) return; // allow gestures within sheet
  try { e.preventDefault(); } catch { }
};
// Wheel (desktop)
const wheelBlocker = (e) => {
  if (!isSheetVisible()) return;
  if (withinPanel(e.target)) return; // allow wheel inside sheet
  try { e.preventDefault(); } catch { }
};
// Keys (arrows, page up/down, space, home/end)
const keyBlocker = (e) => {
  if (!isSheetVisible()) return;
  const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
  if (!keys.includes(e.key)) return;
  // allow typing in inputs/selects/textareas inside sheet
  const target = e.target;
  const tag = (target && target.tagName) ? target.tagName.toLowerCase() : '';
  const editable = target && (target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select');
  if (editable) return;
  if (withinPanel(target)) return; // let the sheet handle it
  e.preventDefault();
};

// (reveal observer defined earlier)

function formatPeriod(period) {
  const start = parseYM(period?.start);
  const end = period?.end && period.end.toLowerCase() !== "present" ? parseYM(period.end) : new Date();
  const displayEnd = period?.end && period.end.toLowerCase() !== "present" ? formatYM(end) : "Present";
  const spanMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const elapsedMonths = Math.max(0, Math.min(spanMonths, (new Date().getFullYear() - start.getFullYear()) * 12 + (new Date().getMonth() - start.getMonth())));
  const progressPct = spanMonths > 0 ? Math.round((elapsedMonths / spanMonths) * 100) : 100;
  return { display: `${formatYM(start)} – ${displayEnd}`, progressPct };
}

function parseYM(s) {
  if (!s) return new Date();
  const [y, m = "01"] = String(s).split("-");
  return new Date(Number(y), Number(m) - 1, 1);
}
function formatYM(d) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function openSheet(project) {
  activeProject = project;
  lastTrigger = document.activeElement;
  sheetTitle.textContent = displayTitle(project.title);
  sheetDesc.textContent = project.description || project.summary || "";
  // Remove date range from project sheet
  if (sheetRange) { sheetRange.textContent = ''; sheetRange.style.display = 'none'; }
  sheetTags.innerHTML = "";
  (project.tags || []).forEach((t) => {
    const el = document.createElement("span"); el.className = "tag"; el.textContent = t; sheetTags.append(el);
  });
  // Normalize media to build sheet slider
  buildSlider(normalizeMedia(project) || []);
  // Ensure default state is playing when sheet opens
  try {
    sliderState.paused = false;
    updatePlayPauseUI();
    try { syncSliderVideoPlayback(sliderState.i); } catch {}
  } catch {}
  sheet.setAttribute("aria-hidden", "false");
  // Insert CTA, if any
  try {
    const prev = document.getElementById('sheet-cta');
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
    if (project.cta && project.cta.href && sheetBody) {
      const cta = document.createElement('div');
      cta.id = 'sheet-cta';
      cta.className = 'sheet-cta';
      const a = document.createElement('a');
      a.className = 'btn primary';
      a.href = project.cta.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = project.cta.label || 'Learn more';
      cta.append(a);
      const wrap = document.getElementById('sheet-desc-wrap');
      if (wrap) wrap.append(cta); else sheetBody.append(cta);
      try { layoutSheetMedia(); } catch {}
    }
  } catch { }
  // After content builds, size the media area
  try {
    requestAnimationFrame(() => { layoutSheetMedia(); });
    setTimeout(() => { layoutSheetMedia(); }, 50);
  } catch {}
  // Robust scroll lock: capture scroll and fix body BEFORE applying classes to avoid jumps
  try {
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    // Compensate for scrollbar width to prevent horizontal content shift
    const sw = Math.max(0, (window.innerWidth || 0) - (document.documentElement.clientWidth || 0));
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    if (sw > 0) { document.body.style.paddingRight = sw + 'px'; }
  } catch { }
  // Block background scroll via CSS class (body only)
  document.body.classList.add('modal-open');
  // Pause all card previews while sheet is open
  try { pauseAllCardPreviews(true); } catch {}
  // Notify listeners (e.g., parallax) to re-evaluate transforms
  try { window.dispatchEvent(new Event('modal-change')); } catch { }
  // Focus the close button for accessibility
  setTimeout(() => { try { sheetClose.focus({ preventScroll: true }); } catch { try { sheetClose.focus(); } catch { } } }, 0);
  document.addEventListener("keydown", escToClose);
  // Block background scrolling while the sheet is open (multi-input)
  document.addEventListener('touchmove', touchBlocker, { passive: false });
  window.addEventListener('wheel', wheelBlocker, { passive: false });
  document.addEventListener('keydown', keyBlocker, true);
  // Ensure all reveals remain visible when modal opens
  forceRevealAll();
}

function closeSheet() {
  stopAutoplay();
  sheet.setAttribute("aria-hidden", "true");
  sliderTrack.innerHTML = ""; sliderDots.innerHTML = ""; sliderProgress.style.transform = `scaleX(0)`;
  activeProject = null;
  document.removeEventListener("keydown", escToClose);
  document.body.classList.remove('modal-open');
  // Resume card previews
  try { pauseAllCardPreviews(false); } catch {}
  // Notify listeners (e.g., parallax) to re-evaluate transforms
  try { window.dispatchEvent(new Event('modal-change')); } catch { }
  // Restore scroll without jumping to top
  try {
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    // Unfix body and restore scroll position
    document.body.style.position = '';
    const y = savedScrollY || 0;
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    window.scrollTo(0, y);
    // restore scroll-behavior next tick
    setTimeout(() => { root.style.scrollBehavior = prev; }, 0);
  } catch { }
  document.removeEventListener('touchmove', touchBlocker, { passive: false });
  window.removeEventListener('wheel', wheelBlocker, { passive: false });
  document.removeEventListener('keydown', keyBlocker, true);
  if (lastTrigger && lastTrigger.focus) {
    try { lastTrigger.focus({ preventScroll: true }); } catch { try { lastTrigger.focus(); } catch { } }
  }
}
const escToClose = (e) => { if (e.key === "Escape") closeSheet(); };

sheetBackdrop.addEventListener("click", closeSheet);
sheetClose.addEventListener("click", closeSheet);

function buildSlider(media) {
  sliderTrack.innerHTML = "";
  sliderDots.innerHTML = "";
  sliderState.i = 0;
  sliderState.count = media.length;
  sliderState.media = media.slice();
  sliderState.durs = new Array(sliderState.count).fill(8000);

  // Controls/progress visibility; show progress for single-video projects
  const isSingle = sliderState.count <= 1;
  const isSingleVideo = sliderState.count === 1 && media[0] && media[0].type === 'video';
  if (btnPrev) { btnPrev.style.display = isSingle ? 'none' : ''; btnPrev.setAttribute('aria-hidden', String(isSingle)); btnPrev.tabIndex = isSingle ? -1 : 0; }
  if (btnNext) { btnNext.style.display = isSingle ? 'none' : ''; btnNext.setAttribute('aria-hidden', String(isSingle)); btnNext.tabIndex = isSingle ? -1 : 0; }
  if (sliderDots) sliderDots.style.display = isSingle ? 'none' : '';
  if (sliderProgress) sliderProgress.style.display = (isSingle && !isSingleVideo) ? 'none' : '';
  if (isSingle && !isSingleVideo) stopAutoplay();
  slider.classList.toggle('single', isSingle);

  media.forEach((m, idx) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    const frame = document.createElement('div');
    frame.className = 'media-box';
    let el;
    if (m.type === "video") {
      el = document.createElement("video");
      el.src = m.src;
      // Enforce silent, inline playback
      el.controls = false;
      el.autoplay = true; try { el.setAttribute('autoplay', ''); } catch {}
      el.playsInline = true; el.setAttribute('playsinline', '');
      el.muted = true; el.defaultMuted = true; el.setAttribute('muted', '');
      try { el.volume = 0; } catch {}
      // Loop videos so they repeat seamlessly
      el.loop = true;
      el.preload = 'metadata';
      try { el.disablePictureInPicture = true; } catch {}
      try { el.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback'); } catch {}
      // Show loading indicator until the video can play
      try { slide.classList.add('loading'); } catch {}
      // Update duration when metadata is loaded
      try {
        el.addEventListener('loadedmetadata', () => {
          const d = (isFinite(el.duration) && el.duration > 0) ? el.duration * 1000 : 8000;
          sliderState.durs[idx] = d;
          try { layoutSheetMedia(); } catch {}
        });
        const clearLoading = () => { try { slide.classList.remove('loading'); } catch {} };
        el.addEventListener('canplay', clearLoading);
        el.addEventListener('canplaythrough', clearLoading);
        el.addEventListener('playing', clearLoading);
        const setLoading = () => { try { slide.classList.add('loading'); } catch {} };
        el.addEventListener('waiting', setLoading);
        el.addEventListener('stalled', setLoading);
        el.addEventListener('seeking', setLoading);
        // No ended handler needed; videos loop
      } catch {}
    } else {
      el = document.createElement("img");
      const src = (m.type === 'placeholder') ? placeholderImage('#000000') : m.src;
      el.src = src; el.alt = m.alt || m.caption || "";
      try { el.addEventListener('load', () => { try { layoutSheetMedia(); } catch {} }); } catch {}
    }
    frame.append(el);
    slide.append(frame);
    sliderTrack.append(slide);

    const dot = document.createElement("div"); dot.className = "dot"; if (idx === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goTo(idx, true));
    sliderDots.append(dot);
  });

  updateTrack(true);
  // Start autoplay for multi-slide, and also for single-video so progress updates
  if (sliderState.count > 1 || isSingleVideo) startAutoplay();
  // Ensure the slider uses available space while keeping desc >= 1/2
  try { layoutSheetMedia(); } catch {}
}

function setActiveSlide(i) {
  const slides = $$(".slide", sliderTrack);
  slides.forEach((sl, idx) => sl.classList.toggle('active', idx === i));
}

function getMediaCaption(i) {
  const m = sliderState.media && sliderState.media[i];
  return (m && m.caption) ? String(m.caption) : '';
}
function showOverlayCaption(text) {
  if (!sliderCap) return;
  const t = String(text || '').trim();
  if (!t) { hideOverlayCaption(); return; }
  sliderCap.textContent = t;
  sliderCap.classList.add('show');
}
function hideOverlayCaption() {
  if (!sliderCap) return;
  sliderCap.classList.remove('show');
}

function updateTrack(initial = false) {
  const x = -sliderState.i * 100;
  sliderTrack.style.transform = `translate3d(${x}%,0,0)`;
  $$(".dot", sliderDots).forEach((d, j) => d.classList.toggle("active", j === sliderState.i));
  // Hide caption during movement; it will show when transition ends
  hideOverlayCaption();

  // If initial render or no transition on track, set active immediately.
  const cs = window.getComputedStyle(sliderTrack);
  const props = (cs.transitionProperty || '').split(',').map(s => s.trim());
  const durations = (cs.transitionDuration || '').split(',').map(s => parseFloat(s) || 0);
  const idxTransform = props.findIndex(p => p === 'transform' || p === 'all');
  const hasTransition = !initial && idxTransform !== -1 && (durations[idxTransform] > 0 || durations[0] > 0);

  if (!hasTransition) {
    setActiveSlide(sliderState.i);
    showOverlayCaption(getMediaCaption(sliderState.i));
    try { syncSliderVideoPlayback(sliderState.i); } catch {}
    try { updatePPBtnVisibility(sliderState.i); } catch {}
    return;
  }
  // During animation, hide captions by removing active from all slides
  setActiveSlide(-1);
  // Wait for the transform transition to finish, then activate the current slide
  const onEnd = (e) => {
    if (e && e.target !== sliderTrack) return;
    if (e && e.propertyName && e.propertyName !== 'transform') return;
    try { sliderTrack.removeEventListener('transitionend', onEnd, true); } catch { }
    setActiveSlide(sliderState.i);
    showOverlayCaption(getMediaCaption(sliderState.i));
    try { syncSliderVideoPlayback(sliderState.i); } catch {}
    try { updatePPBtnVisibility(sliderState.i); } catch {}
  };
  sliderTrack.addEventListener('transitionend', onEnd, true);
}

// Ensure only the active slide's video plays, and all are muted
function syncSliderVideoPlayback(activeIndex) {
  const slides = $$(".slide", sliderTrack);
  slides.forEach((sl, idx) => {
    const v = sl && sl.querySelector && sl.querySelector('video');
    if (!v) return;
    // Hard-mute
    v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
    try { v.volume = 0; } catch {}
    v.playsInline = true; v.setAttribute('playsinline', '');
    if (idx === activeIndex) {
      if (!sliderState.paused) {
        try { v.play().catch(() => {}); } catch {}
      } else {
        try { v.pause(); } catch {}
      }
    } else {
      try { v.pause(); v.currentTime = 0; } catch {}
    }
  });
}

function goTo(i, user = false) {
  if (sliderState.count <= 0) return; // nothing to do
  if (sliderState.count === 1) { updateTrack(); return; }
  sliderState.i = (i + sliderState.count) % sliderState.count;
  updateTrack();
  if (user) restartAutoplay();
}

function next() { goTo(sliderState.i + 1, true); }
function prev() { goTo(sliderState.i - 1, true); }

btnNext.addEventListener("click", () => next());
btnPrev.addEventListener("click", () => prev());

// Basic swipe gestures for slider (mobile-friendly)
let touchStartX = 0, touchStartY = 0;
let touchEndX = 0, touchEndY = 0;
function onTouchStart(e) {
  const t = e.touches && e.touches[0];
  if (!t) return;
  touchStartX = t.clientX; touchStartY = t.clientY;
}
function onTouchMove(e) {
  const t = e.touches && e.touches[0];
  if (!t) return;
  touchEndX = t.clientX; touchEndY = t.clientY;
}
function onTouchEnd() {
  const dx = (touchEndX || touchStartX) - touchStartX;
  const dy = (touchEndY || touchStartY) - touchStartY;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) next(); else prev();
    restartAutoplay();
  }
  touchStartX = touchStartY = touchEndX = touchEndY = 0;
}
sliderTrack.addEventListener('touchstart', onTouchStart, { passive: true });
sliderTrack.addEventListener('touchmove', onTouchMove, { passive: true });
sliderTrack.addEventListener('touchend', onTouchEnd);

// Keyboard navigation inside sheet
sheet.addEventListener("keydown", (e) => {
  if (sliderState.count > 1) {
    if (e.key === "ArrowRight") { next(); }
    if (e.key === "ArrowLeft") { prev(); }
  }
});

// Autoplay with progress bar
function frame(ts) {
  if (sliderState.paused) { sliderState.t0 = ts; sliderState.raf = requestAnimationFrame(frame); return; }
  if (!sliderState.t0) sliderState.t0 = ts;

  const slides = $$(".slide", sliderTrack);
  const sl = slides[sliderState.i];
  const v = sl && sl.querySelector && sl.querySelector('video');
  let pct = 0;
  let advanced = false;

  if (v && isFinite(v.duration) && v.duration > 0) {
    // Progress based on video playback
    const dur = v.duration;
    const ct = v.currentTime || 0;
    pct = Math.max(0, Math.min(1, ct / dur));
    const isSingleVideo = (sliderState.count === 1);
    if (v.ended || pct >= 1) {
      if (isSingleVideo) {
        // Keep on the same slide; restart progress cycle
        sliderState.t0 = 0;
        advanced = false;
      } else {
        goTo(sliderState.i + 1);
        sliderState.t0 = 0;
        advanced = true;
      }
    }
  } else {
    // Fallback to time-based for images or before metadata is ready
    const durMs = sliderState.durs[sliderState.i] || sliderState.dur || 8000;
    const elapsed = ts - sliderState.t0;
    pct = Math.min(1, elapsed / durMs);
    if (pct >= 1) {
      goTo(sliderState.i + 1);
      sliderState.t0 = 0;
      advanced = true;
    }
  }
  sliderProgress.style.transform = `scaleX(${pct})`;
  if (!advanced) sliderState.raf = requestAnimationFrame(frame);
}

function startAutoplay() {
  stopAutoplay();
  sliderState.t0 = 0; sliderState.paused = false;
  sliderState.raf = requestAnimationFrame(frame);
  try { updatePlayPauseUI(); } catch {}
}
function stopAutoplay() {
  if (sliderState.raf) cancelAnimationFrame(sliderState.raf);
  sliderState.raf = 0; sliderProgress.style.transform = `scaleX(0)`;
  try { updatePlayPauseUI(); } catch {}
}
function restartAutoplay() { stopAutoplay(); startAutoplay(); }

// Remove focus-based pausing so opening the sheet doesn't pause playback.

// Pause when tab hidden
document.addEventListener("visibilitychange", () => {
  sliderState.paused = document.hidden;
  try { syncSliderVideoPlayback(sliderState.i); } catch {}
  try { updatePlayPauseUI(); } catch {}
});

function updatePlayPauseUI() {
  try {
    if (!slider) return;
    slider.classList.toggle('paused', !!sliderState.paused);
  } catch {}
}

if (ppBtn) {
  ppBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sliderState.paused = !sliderState.paused;
    // Do not stop/start autoplay loop; frame() handles paused state without resetting
    try { syncSliderVideoPlayback(sliderState.i); } catch {}
    updatePlayPauseUI();
  });
}

// Layout the sheet's slider height for non-desktop: max 50% of body height, keep 16:9
function layoutSheetMedia() {
  if (!slider) return;
  const panel = sheet && sheet.querySelector('.sheet-panel');
  const body = sheet && sheet.querySelector('.sheet-body');
  if (!panel || !body) { try { slider.style.height = ''; } catch {} return; }
  const w = slider.clientWidth || body.clientWidth || panel.clientWidth || 0;
  const isDesktop = (window.innerWidth >= 901) && (window.innerHeight >= 701);
  const bodyH = body.clientHeight || 0;
  if (!w || !bodyH) { try { slider.style.height = ''; } catch {} return; }
  if (isDesktop) {
    // Desktop uses CSS variable-driven split; avoid inline height
    try { slider.style.height = ''; } catch {}
    // Fallback: if computed height collapses (rare), set an explicit 50% or 16:9 height
    const hNow = slider.clientHeight || slider.offsetHeight || 0;
    if (hNow < 40) {
      const desiredMax = Math.floor(bodyH * 0.5);
      const arH = Math.round((w * 9) / 16);
      const h = Math.max(0, Math.min(desiredMax, arH));
      slider.style.height = h + 'px';
    }
    return;
  }
  const desiredMax = Math.floor(bodyH * 0.5);
  const arH = Math.round((w * 9) / 16);
  // Always cap by 16:9 based on available width to avoid horizontal overflow/cropping
  const h = Math.max(0, Math.min(desiredMax, arH));
  slider.style.height = h + 'px';
}

// Recompute layout on resize/orientation or when modal visibility changes
window.addEventListener('resize', () => { try { layoutSheetMedia(); } catch {} });
window.addEventListener('orientationchange', () => { try { layoutSheetMedia(); } catch {} });
window.addEventListener('modal-change', () => { try { layoutSheetMedia(); } catch {} });






// Nav active section highlight
const navMap = new Map([
  ['#profile-card', document.querySelector('.shortcut-link[href="#profile-card"]')],
  ['#projects', document.querySelector('.shortcut-link[href="#projects"]')],
  ['#education', document.querySelector('.shortcut-link[href="#education"]')],
]);
function setActiveNav(sel) {
  navMap.forEach((link, key) => { if (link) link.classList.toggle('active', key === sel); });
}
const navSections = ['#profile-card', '#projects', '#education'];
// IntersectionObserver-based scrollspy with click lock until scroll idle
let navLockActive = false;
let navIdleTimer = 0;
function releaseNavLockSoon() {
  clearTimeout(navIdleTimer);
  navIdleTimer = setTimeout(() => {
    navLockActive = false;
    updateActiveNavByIO();
    try { window.removeEventListener('scroll', releaseNavLockSoon); } catch { }
  }, 220);
}
function startNavLock(target) {
  navLockActive = true;
  setActiveNav(target);
  clearTimeout(navIdleTimer);
  window.addEventListener('scroll', releaseNavLockSoon, { passive: true, once: false });
  releaseNavLockSoon();
}
const navRatios = new Map();
function updateActiveNavByIO() {
  if (navLockActive) return;
  let bestSel = null, best = 0;
  navRatios.forEach((ratio, sel) => { if (ratio > best) { best = ratio; bestSel = sel; } });
  if (bestSel) setActiveNav(bestSel);
}
const navObserver = (typeof window !== 'undefined' && 'IntersectionObserver' in window)
  ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const id = en.target.getAttribute('id');
      const sel = id ? `#${id}` : null;
      if (sel && navMap.has(sel)) navRatios.set(sel, en.intersectionRatio || 0);
    });
    updateActiveNavByIO();
  }, { root: null, rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] })
  : null;
if (navObserver) {
  navSections.forEach(sel => { const el = document.querySelector(sel); if (el) navObserver.observe(el); });
}
// Reflect clicks and hash changes immediately and lock until scroll idle
document.querySelectorAll('.shortcut-link').forEach(a => {
  a.addEventListener('click', () => {
    const href = a.getAttribute('href');
    if (href && navMap.has(href)) startNavLock(href);
  });
});
window.addEventListener('hashchange', () => {
  const h = location.hash;
  if (h && navMap.has(h)) startNavLock(h);
});


// Batch scroll/resize-driven updates with a single rAF per frame
let _scrollRaf = 0, _resizeRaf = 0;
function flushScroll() {
  _scrollRaf = 0;
  // Ensure reveal state stays in sync on mobile
  revealCheckAll();
}
function onScrollRaf() { if (_scrollRaf) return; _scrollRaf = requestAnimationFrame(flushScroll); }
function flushResize() {
  _resizeRaf = 0;
  revealCheckAll();
}
function onResizeRaf() { if (_resizeRaf) return; _resizeRaf = requestAnimationFrame(flushResize); }
window.addEventListener('scroll', onScrollRaf, { passive: true });
window.addEventListener('resize', onResizeRaf);
// Initial paint for scroll-dependent UI
revealCheckAll();

// Center-based scrollspy handles edges; no extra edge hack needed

// Dynamically compute navbar height and apply as CSS var for top padding/scroll-margin
(function dynamicNavOffset() {
  const wrapSel = '.top-shortcuts .shortcuts-wrap';
  let raf = 0;
  function measure() {
    raf = 0;
    const wrap = document.querySelector(wrapSel);
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    // Use the element's own height (stable even if transformed off-screen)
    const offset = Math.max(0, Math.ceil(rect.height || wrap.offsetHeight || wrap.clientHeight || 0));
    try { document.documentElement.style.setProperty('--nav-offset', offset + 'px'); } catch { }
    // Layout shift may move reveal targets; refresh reveal states
    try { revealCheckAll(); } catch {}
  }
  const queue = () => { if (raf) return; raf = requestAnimationFrame(measure); };
  // Initial and after load (fonts/images can change height)
  if (document.readyState !== 'loading') measure(); else window.addEventListener('DOMContentLoaded', measure, { once: true });
  window.addEventListener('load', queue, { once: true });
  // Recalculate on resize/orientation changes
  window.addEventListener('resize', queue);
  window.addEventListener('orientationchange', queue);
  // Ensure we re-measure when the modal sheet opens/closes, since the navbar
  // is transformed during that state which can temporarily report a smaller rect.
  window.addEventListener('modal-change', () => {
    // Measure now and again after the navbar transition completes.
    queue();
    setTimeout(queue, 360);
  });
  // Also re-measure after the navbar finishes its own transform transition.
  try {
    const nav = document.querySelector(wrapSel);
    if (nav) nav.addEventListener('transitionend', (e) => {
      if (e && e.propertyName && e.propertyName.includes('transform')) queue();
    });
  } catch {}
})();

// Generic: apply unified highlight class to interactive controls
(function unifyHighlight() {
  const sels = ['.btn', '.icon-link', '.shortcut-link.icon', '.project-card'];
  const nodes = document.querySelectorAll(sels.join(','));
  nodes.forEach(el => el.classList.add('hl'));
})();

// Dynamically compute bottom dev banner height and set CSS var to avoid overlap
(function dynamicDevBannerHeight() {
  const sel = '.dev-banner';
  let raf = 0;
  function measure() {
    raf = 0;
    const el = document.querySelector(sel);
    if (!el) return;
    const h = Math.ceil(el.getBoundingClientRect().height || 0);
    try { document.documentElement.style.setProperty('--dev-banner-h', h + 'px'); } catch { }
    // Banner height affects bottom padding; refresh reveal states
    try { revealCheckAll(); } catch {}
  }
  const queue = () => { if (raf) return; raf = requestAnimationFrame(measure); };
  if (document.readyState !== 'loading') measure(); else window.addEventListener('DOMContentLoaded', measure, { once: true });
  window.addEventListener('load', queue, { once: true });
  window.addEventListener('resize', queue);
  window.addEventListener('orientationchange', queue);
  try {
    if ('ResizeObserver' in window) {
      const el = document.querySelector(sel);
      if (el) new ResizeObserver(queue).observe(el);
    }
  } catch { }
})();

// Make the development banner dismissible (no persistence; shows every refresh)
(function devBannerDismiss() {
  function init() {
    const banner = document.querySelector('.dev-banner');
    if (!banner) return;
    const hide = () => {
      banner.classList.add('is-hidden');
      try { document.documentElement.style.setProperty('--dev-banner-h', '0px'); } catch { }
    };
    const btn = banner.querySelector('.dev-banner-close');
    if (btn) btn.addEventListener('click', hide);
  }
  if (document.readyState !== 'loading') init();
  else window.addEventListener('DOMContentLoaded', init, { once: true });
})();



// Singapore clock tile
(function initSGClock() {
  const el = document.getElementById('sg-clock');
  if (!el) return;
  const hh = el.querySelector('.hh');
  const mm = el.querySelector('.mm');
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', hour12: false, hour: '2-digit', minute: '2-digit' });
  } catch { return; }
  const tick = () => {
    try {
      const parts = fmt.formatToParts(new Date());
      const h = parts.find(p => p.type === 'hour')?.value || '--';
      const m = parts.find(p => p.type === 'minute')?.value || '--';
      if (hh) hh.textContent = h;
      if (mm) mm.textContent = m;
      // Blinking handled via CSS; no JS opacity changes
    } catch { }
  };
  tick();
  setInterval(tick, 1000);
})();

// Background parallax (scroll + mouse)
(function bgParallax() {
  const el = document.querySelector('.bg-image');
  if (!el) return;
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  let targetX = 0, targetY = 0; // from mouse
  let scrollY = 0; // from scroll (frozen when modal open)
  let raf = 0;
  const baseScale = 1.06;
  const maxMouseShift = 8; // px
  const scrollFactor = 0.1; // slower than scroll
  const update = () => {
    const pr = prefersReduced && prefersReduced.matches;
    const x = pr ? 0 : targetX;
    // While modal/sheet is open, freeze parallax at the saved scroll position to avoid jumps
    const frozenY = (typeof savedScrollY === 'number') ? savedScrollY : scrollY;
    const baseY = (document.body && document.body.classList && document.body.classList.contains('modal-open')) ? frozenY : scrollY;
    const y = (pr ? 0 : targetY) + (baseY * scrollFactor);
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${baseScale})`;
    raf = 0;
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  const onScroll = () => {
    // Ignore scroll updates while modal is open to keep background stable
    if (!(document.body && document.body.classList && document.body.classList.contains('modal-open'))) {
      scrollY = window.scrollY || window.pageYOffset || 0;
    }
    queue();
  };
  const onMove = (e) => {
    const w = window.innerWidth || 1, h = window.innerHeight || 1;
    const nx = (e.clientX / w - 0.5) * 2; // -1..1
    const ny = (e.clientY / h - 0.5) * 2; // -1..1
    targetX = nx * maxMouseShift;
    targetY = ny * maxMouseShift;
    queue();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('mousemove', onMove, { passive: true });
  // Re-evaluate when modal state changes
  window.addEventListener('modal-change', queue);
  onScroll();
})();

// Ensure reveal reacts to modal/layout changes immediately
try { window.addEventListener('modal-change', () => { revealCheckAll(); forceRevealAll(); }); } catch {}

// Utility: initials from org
function initials(name = '') {
  const parts = name.replace(/\(.+?\)/g, '').split(/[\s—-]+/).filter(Boolean);
  const letters = parts.slice(0, 3).map(p => p[0].toUpperCase()).join('');
  return letters || '•';
}
