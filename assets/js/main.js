// Self-contained script (no ES module import) for broader compatibility
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
// Global: reduced motion preference (use early and often)
const prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Derive accent/highlight colors from the background image
(function deriveDynamicPalette() {
  const root = document.documentElement;
  const bgEl = document.querySelector('.bg-image');
  if (!bgEl) return;

  // Extract url(...) from computed style
  function getBgUrl() {
    try {
      const cs = window.getComputedStyle(bgEl);
      const bi = cs && cs.backgroundImage || '';
      const m = bi.match(/url\(["']?([^"')]+)["']?\)/i);
      if (m && m[1]) return m[1];
    } catch {}
    return null;
  }

  // Helpers: RGB <-> HSL conversions
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function toHex(r,g,b) { const hx = (n)=>n.toString(16).padStart(2,'0'); return `#${hx(r)}${hx(g)}${hx(b)}`; }

  // Simple quantization: 4 bits per channel histogram
  function getPalette(img) {
    const size = 64; // downsampled sampling size
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const hist = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i+3];
      if (a < 10) continue; // skip transparent
      const r = data[i], g = data[i+1], b = data[i+2];
      const [h, s, l] = rgbToHsl(r, g, b);
      // ignore extremely dark/bright pixels (mostly vignette/overlays)
      if (l < 0.07 || l > 0.92) continue;
      // quantize to 4 bits/channel
      const rq = r >> 4, gq = g >> 4, bq = b >> 4;
      const key = (rq << 8) | (gq << 4) | bq;
      hist.set(key, (hist.get(key) || 0) + 1);
    }
    const entries = Array.from(hist.entries()).sort((a,b)=>b[1]-a[1]);
    const colors = entries.slice(0, 16).map(([key]) => {
      const rq = (key >> 8) & 0xF, gq = (key >> 4) & 0xF, bq = key & 0xF;
      return [rq << 4 | rq, gq << 4 | gq, bq << 4 | bq];
    });
    return colors;
  }

  function pickTwo(colors) {
    if (!colors || colors.length === 0) return null;
    // First: the most common
    const primary = colors[0];
    // Second: most different by hue and distance
    let best = null, bestScore = -1;
    const [pr,pg,pb] = primary;
    const [ph,ps,pl] = rgbToHsl(pr,pg,pb);
    for (let i=1;i<colors.length;i++) {
      const [r,g,b] = colors[i];
      const [h,s,l] = rgbToHsl(r,g,b);
      // score: hue distance + lightness distance + saturation
      const dh = Math.min(Math.abs(h-ph), 1-Math.abs(h-ph));
      const dl = Math.abs(l-pl);
      const score = dh*2 + dl + s*0.5;
      if (score > bestScore) { bestScore = score; best = colors[i]; }
    }
    return [primary, best || primary];
  }

  function bumpSat(s, min, mult) { return clamp01(Math.max(min, s * mult)); }
  function adjustForHighlight([r,g,b]) {
    let [h,s,l] = rgbToHsl(r,g,b);
    // Ensure strong pop on dark bg: higher saturation, slightly brighter
    s = bumpSat(s, 0.65, 1.25);
    l = clamp01(Math.max(l, 0.58));
    return hslToRgb(h,s,l);
  }
  function adjustForAccent([r,g,b], lighten = false) {
    let [h,s,l] = rgbToHsl(r,g,b);
    if (lighten) {
      s = bumpSat(s, 0.55, 1.2);
      l = clamp01(Math.max(l, 0.65));
    } else {
      s = bumpSat(s, 0.6, 1.2);
      l = clamp01(Math.max(l, 0.52));
    }
    return hslToRgb(h,s,l);
  }

  function applyVars(primary, secondary) {
    const [hr,hg,hb] = adjustForHighlight(primary);
    const hiHex = toHex(hr,hg,hb);
    const [a1r,a1g,a1b] = adjustForAccent(primary);
    const [a2r,a2g,a2b] = adjustForAccent(secondary, true);
    const a1Hex = toHex(a1r,a1g,a1b);
    const a2Hex = toHex(a2r,a2g,a2b);
    try {
      root.style.setProperty('--hi', hiHex);
      root.style.setProperty('--hi-ring', `rgba(${hr}, ${hg}, ${hb}, 0.28)`);
      root.style.setProperty('--hi-ring-strong', `rgba(${hr}, ${hg}, ${hb}, 0.36)`);
      root.style.setProperty('--hi-glow', `rgba(${hr}, ${hg}, ${hb}, 0.22)`);
      root.style.setProperty('--accent', a1Hex);
      root.style.setProperty('--accent-2', a2Hex);
      root.style.setProperty('--accent-rgb', `${a1r}, ${a1g}, ${a1b}`);
      root.style.setProperty('--accent2-rgb', `${a2r}, ${a2g}, ${a2b}`);
      // keep --accent-3 as is or derive a triad if desired
    } catch {}
  }

  function run(url) {
    if (!url) return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const colors = getPalette(img);
        const picked = pickTwo(colors);
        if (picked) applyVars(picked[0], picked[1]);
      } catch {}
    };
    // ensure same-origin path
    img.src = url;
  }

  // Start once DOM is ready (background element exists)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => run(getBgUrl()), { once: true });
  } else {
    run(getBgUrl());
  }
})();

// Loader: fade out on window load with fallback
(function initLoader() {
  const loader = document.getElementById('loader');
  const pctEl = document.getElementById('loader-percent');
  if (!loader) return;

  const MIN_MS = 500; // minimum visible time
  const FAILSAFE_MS = 3000; // force-finish safety
  const start = (window.performance && performance.now) ? performance.now() : Date.now();
  let loaded = document.readyState === 'complete';
  let finished = false;
  let target = MIN_MS;
  let rafId = 0;

  const setPct = (v) => {
    const pct = Math.max(0, Math.min(100, Math.round(v)));
    if (pctEl) pctEl.textContent = pct + '%';
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    if (rafId) cancelAnimationFrame(rafId);
    setPct(100);
    loader.classList.add('hide');
    // Keep the page gated until user acknowledges the dev warning
    document.documentElement.classList.add('gated');
    document.body.classList.add('gated');
    document.documentElement.classList.remove('loading');
    document.body.classList.remove('loading');
    // notify others that loader is done (for reveal timing)
    try { window.dispatchEvent(new Event('loader:done')); } catch { }
    setTimeout(() => loader.parentNode && loader.parentNode.removeChild(loader), 700);
  };

  const nowTS = () => (window.performance && performance.now) ? performance.now() : Date.now();
  const tick = () => {
    const elapsed = nowTS() - start;
    if (loaded) target = Math.max(target, elapsed);
    let p = Math.min(1, elapsed / target);
    if (!loaded) p = Math.min(p, 0.99); // avoid hitting 100% before load
    setPct(p * 100);
    if (loaded && elapsed >= target) finish();
    else rafId = requestAnimationFrame(tick);
  };

  // Update on load to ensure we respect min 1s
  window.addEventListener('load', () => { loaded = true; }, { once: true });
  // Failsafe: if load stalls, still finish at FAILSAFE_MS minimum
  setTimeout(() => { loaded = true; target = Math.max(target, FAILSAFE_MS); }, FAILSAFE_MS);

  // If page is already loaded, still honor the 1s minimum
  rafId = requestAnimationFrame(tick);
})();

// Reveal-on-scroll helper (staggered, bidirectional: in when visible, out when not)
const supportsIO = typeof window !== 'undefined' && 'IntersectionObserver' in window;
const revealQueue = [];
// Hysteresis state to stop rapid in/out near viewport edges
const _revealState = new WeakMap(); // el -> { visible: boolean, t: number }
const isLoading = () => {
  const de = document.documentElement;
  return de.classList.contains('loading') || de.classList.contains('gated');
};

function computeStaggerIndex(el) {
  const parent = el && el.parentElement;
  if (!parent) return 0;
  const kids = Array.from(parent.children).filter(c => c.classList && c.classList.contains('reveal'));
  const idx = kids.indexOf(el);
  return Math.max(0, idx);
}
function applyReveal(target, entering) {
  if (!target) return;
  if (entering) {
    const idx = computeStaggerIndex(target);
    const delay = Math.min(idx, 12) * 70; // cap long lists
    target.style.setProperty('--reveal-delay', delay + 'ms');
    target.classList.add('in');
  } else {
    target.classList.remove('in');
  }
  try {
    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    _revealState.set(target, { visible: !!entering, t: now });
  } catch {}
}

const observer = supportsIO ? new IntersectionObserver((entries) => {
  const now = (window.performance && performance.now) ? performance.now() : Date.now();
  const ENTER_R = 0.18; // enter when >=18% visible
  const EXIT_R = 0.06;  // exit only when <=6% visible (hysteresis)
  const COOLDOWN = 160; // ms minimum between state flips
  const vH = window.innerHeight || document.documentElement.clientHeight || 0;
  entries.forEach((entry) => {
    const el = entry.target;
    const ratio = entry.intersectionRatio || 0;
    const st = _revealState.get(el) || { visible: false, t: 0 };

    // Determine intents with hysteresis and offscreen guard
    const wantsEnter = entry.isIntersecting && ratio >= ENTER_R;
    const rect = entry.boundingClientRect || { top: 0, bottom: 0 };
    const farOff = (rect.bottom <= 0) || (rect.top >= vH); // fully outside viewport
    const wantsExit = (!entry.isIntersecting || ratio <= EXIT_R || farOff);

    if (!st.visible && wantsEnter) {
      if (isLoading()) revealQueue.push(el); else applyReveal(el, true);
      _revealState.set(el, { visible: true, t: now });
      return;
    }
    if (st.visible && wantsExit && (now - st.t) > COOLDOWN) {
      applyReveal(el, false);
      _revealState.set(el, { visible: false, t: now });
      return;
    }
  });
}, { rootMargin: '0px 0px -10% 0px', threshold: [0, 0.06, 0.18, 0.5, 1] }) : null;
const reveal = (el) => { if (!el) return; if (observer) observer.observe(el); else el.classList.add('in'); };
function flushRevealQueue(delay = 150) {
  if (revealQueue.length) {
    setTimeout(() => {
      const now = (window.performance && performance.now) ? performance.now() : Date.now();
      revealQueue.forEach(el => { el.classList.add('in'); try { _revealState.set(el, { visible: true, t: now }); } catch {} });
      revealQueue.length = 0;
    }, delay);
  }
}
// Flush when the gate opens (after user acknowledges)
window.addEventListener('gate:open', () => flushRevealQueue(150));

// Ensure profile card reveals and delay navbar appearance after gate opens
window.addEventListener('gate:open', () => {
  // reveal profile card if still pending
  const pc = document.getElementById('profile-card');
  if (pc && !pc.classList.contains('in')) {
    // small delay to feel like other sections
    setTimeout(() => { try { applyReveal(pc, true); } catch { pc.classList.add('in'); } }, 120);
  }
  // delay nav bar show a bit for a softer entrance
  setTimeout(() => document.body.classList.remove('nav-hidden'), 450);
});

// Development warning overlay logic
(function initDevWarning() {
  const warn = document.getElementById('dev-warning');
  const hint = document.getElementById('warn-hint');
  // Button removed; proceed as long as overlay exists
  if (!warn) return;
  // Update hint text for device type (tap vs click)
  try {
    const isCoarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    if (hint) hint.textContent = isCoarse ? 'Tap anywhere to continue' : 'Click anywhere to continue';
  } catch {}
  const show = () => {
    warn.setAttribute('aria-hidden', 'false');
    warn.classList.add('show');
  };
  const hide = () => {
    warn.classList.remove('show');
    warn.setAttribute('aria-hidden', 'true');
    // allow content to animate in
    document.documentElement.classList.remove('gated');
    document.body.classList.remove('gated');
    try { window.dispatchEvent(new Event('gate:open')); } catch { }
    setTimeout(() => warn.parentNode && warn.parentNode.removeChild(warn), 700);
  };
  window.addEventListener('loader:done', show, { once: true });
  // Also allow tapping/clicking anywhere on the overlay to continue
  warn.addEventListener('click', (e) => {
    // Prevent accidental propagation and trigger the same hide action
    try { e.preventDefault(); e.stopPropagation(); } catch {}
    hide();
  }, { once: true });
})();

// (Flags now use SVG as the primary method; no platform detection needed.)

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
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

// Removed footer year hookup (no #year element in DOM)

// Typewriter animation for profile subtitle/bio (skip if reduced motion)
(function typewriter() {
  if (prefersReducedMotion) return; // respect
  // Only type subtitle and bio to avoid jumpy title
  const items = [
    { sel: '.subtitle', speed: 12, start: 150 },
    { sel: '.bio', speed: 8, start: 500 },
  ];
  items.forEach(({ sel, speed, start }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const full = el.textContent;
    // Lock height to avoid layout jump
    const h = el.getBoundingClientRect().height;
    el.style.minHeight = h + 'px';
    el.textContent = '';
    setTimeout(() => {
      let i = 0;
      const id = setInterval(() => {
        el.textContent = full.slice(0, ++i);
        if (i >= full.length) { clearInterval(id); el.style.minHeight = ''; }
      }, speed);
    }, start);
  });
})();

// Observe existing reveal elements (items only)
$$('.reveal').forEach(el => reveal(el));

// Safety: if reveal observer fails, force show shortly after gate opens
function revealFallback() {
  const pending = $$('.reveal:not(.in)');
  if (pending.length > 0) pending.forEach(el => el.classList.add('in'));
}
if (isLoading()) window.addEventListener('gate:open', () => setTimeout(revealFallback, 180));
else setTimeout(revealFallback, 400);

// Render projects grid
const grid = $("#projects-grid");
function displayTitle(title) {
  return String(title).replace(/\s*\([^)]*\)\s*$/, '');
}

function stripHTML(html = '') {
  const tmp = document.createElement('div');
  tmp.innerHTML = String(html);
  return tmp.textContent || tmp.innerText || '';
}

function getPreview(p) {
  if (p && p.descriptionHTML) return stripHTML(p.descriptionHTML);
  if (p && p.description) return String(p.description);
  if (p && p.summary) return String(p.summary);
  return '';
}

function isPresent(period) {
  const end = (period && period.end) || '';
  return String(end).toLowerCase() === 'present';
}

function renderProjects(projects = []) {
  projects.forEach((p) => {
    const card = document.createElement("article");
    card.className = "project-card glass reveal";
  card.setAttribute("tabindex", "0");
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${displayTitle(p.title)} — open details`);

  const cover = document.createElement("div");
  cover.className = "cover";
  const media = document.createElement("div");
  media.className = "media";
  const firstMedia = p.media?.[0];
  const src = (firstMedia && firstMedia.type === 'placeholder')
    ? placeholderImage('#0b0f14')
    : (firstMedia && firstMedia.src) || '';
  media.style.backgroundImage = `url('${src}')`;
  cover.append(media);

  const title = document.createElement("h3");
  title.className = "project-title";
  title.textContent = displayTitle(p.title);

  const desc = document.createElement("p");
  desc.className = "project-desc";
  desc.textContent = getPreview(p);

  const meta = document.createElement("div");
  meta.className = "project-meta";
  const tags = document.createElement("div");
  tags.className = "tags";
  (p.tags || []).slice(0, 3).forEach(t => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = t;
    tags.append(tag);
  });
  // mark ongoing
  if (isPresent(p.period)) {
    card.classList.add('ongoing');
    const ongoing = document.createElement('span');
    ongoing.className = 'chip ongoing';
    ongoing.textContent = 'Ongoing';
    tags.prepend(ongoing);
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
  card.append(cover, title, desc, tl, meta, pdate, hint);
  grid.append(card);
  reveal(card);

  const open = () => openSheet(p);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
}

// Render experience timeline
const expEl = $("#experience-timeline");
function renderExperience(experience = []) {
  experience.forEach((e) => {
    const item = document.createElement("div");
    item.className = "timeline-item reveal";
  const card = document.createElement("div");
  card.className = "timeline-card glass";
  const logo = document.createElement("div"); logo.className = "logo-badge"; logo.textContent = (e.logo && e.logo.text) || initials(e.org);
  if (e.logo && e.logo.bg) logo.style.background = e.logo.bg;
  if (e.logo && e.logo.color) card.style.setProperty('--logo-color', e.logo.color);
  const wrap = document.createElement("div");
  const role = document.createElement("p"); role.className = "timeline-role"; role.textContent = `${e.role}`;
  const org = document.createElement("p"); org.className = "timeline-org"; org.textContent = `${e.org}`;
  const note = document.createElement("p"); note.className = "timeline-note"; note.textContent = `${e.details}`;
  // ongoing highlight
  if (/present/i.test(e.period)) {
    card.classList.add('ongoing');
    const pill = document.createElement('span'); pill.className = 'chip ongoing'; pill.textContent = 'Ongoing';
    role.appendChild(pill);
  }
  wrap.append(role, org, note);
  const date = createDateBadge(e.period, (e.logo && e.logo.color));
    card.append(logo, wrap, date); item.append(card); expEl.append(item);
    reveal(item);
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
    const [projects, experience, education] = await Promise.all([
      loadJSON('assets/data/projects.json'),
      loadJSON('assets/data/experience.json'),
      loadJSON('assets/data/education.json'),
    ]);
    renderProjects(projects);
    renderExperience(experience);
    renderEducation(education);
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
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let s = new Date();
  try { s = parseYM(periodObj.start || ''); } catch { }
  const sM = months[s.getMonth()];
  const sY = s.getFullYear();
  let eText = 'Present';
  if (periodObj.end && String(periodObj.end).toLowerCase() !== 'present') {
    const e = parseYM(periodObj.end);
    eText = `${months[e.getMonth()]} ${e.getFullYear()}`;
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
  typeTimer: 0,
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
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function openSheet(project) {
  activeProject = project;
  lastTrigger = document.activeElement;
  sheetTitle.textContent = displayTitle(project.title);
  if (project.descriptionHTML) {
    sheetDesc.innerHTML = project.descriptionHTML;
  } else {
    sheetDesc.textContent = project.description || project.summary || "";
  }
  // Remove date range from project sheet
  if (sheetRange) { sheetRange.textContent = ''; sheetRange.style.display = 'none'; }
  sheetTags.innerHTML = "";
  (project.tags || []).forEach((t) => {
    const el = document.createElement("span"); el.className = "tag"; el.textContent = t; sheetTags.append(el);
  });
  buildSlider(project.media || []);
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
      sheetBody.append(cta);
    }
  } catch { }
  // Robust scroll lock: capture scroll and fix body BEFORE applying classes to avoid jumps
  try {
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  } catch {}
  // Block background scroll via CSS class (body only)
  document.body.classList.add('modal-open');
  // Focus the close button for accessibility
  setTimeout(() => { try { sheetClose.focus({ preventScroll: true }); } catch { try { sheetClose.focus(); } catch { } } }, 0);
  document.addEventListener("keydown", escToClose);
  // Block background scrolling while the sheet is open (multi-input)
  document.addEventListener('touchmove', touchBlocker, { passive: false });
  window.addEventListener('wheel', wheelBlocker, { passive: false });
  document.addEventListener('keydown', keyBlocker, true);
}

function closeSheet() {
  stopAutoplay();
  if (sliderState.typeTimer) { clearInterval(sliderState.typeTimer); sliderState.typeTimer = 0; }
  sheet.setAttribute("aria-hidden", "true");
  sliderTrack.innerHTML = ""; sliderDots.innerHTML = ""; sliderProgress.style.transform = `scaleX(0)`;
  activeProject = null;
  document.removeEventListener("keydown", escToClose);
  document.body.classList.remove('modal-open');
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
    window.scrollTo(0, y);
    // restore scroll-behavior next tick
    setTimeout(() => { root.style.scrollBehavior = prev; }, 0);
  } catch {}
  document.removeEventListener('touchmove', touchBlocker, { passive: false });
  window.removeEventListener('wheel', wheelBlocker, { passive: false });
  document.removeEventListener('keydown', keyBlocker, true);
  if (lastTrigger && lastTrigger.focus) {
    try { lastTrigger.focus({ preventScroll: true }); } catch { try { lastTrigger.focus(); } catch {} }
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

  // Hide controls/progress when only a single (or zero) media item
  const isSingle = sliderState.count <= 1;
  if (btnPrev) { btnPrev.style.display = isSingle ? 'none' : ''; btnPrev.setAttribute('aria-hidden', String(isSingle)); btnPrev.tabIndex = isSingle ? -1 : 0; }
  if (btnNext) { btnNext.style.display = isSingle ? 'none' : ''; btnNext.setAttribute('aria-hidden', String(isSingle)); btnNext.tabIndex = isSingle ? -1 : 0; }
  if (sliderDots) sliderDots.style.display = isSingle ? 'none' : '';
  if (sliderProgress) sliderProgress.style.display = isSingle ? 'none' : '';
  if (isSingle) stopAutoplay();
  slider.classList.toggle('single', isSingle);

  media.forEach((m, idx) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    let el;
    if (m.type === "video") {
      el = document.createElement("video"); el.src = m.src; el.controls = true; el.playsInline = true; el.muted = true; el.setAttribute("preload", "metadata");
    } else {
      el = document.createElement("img");
      const src = (m.type === 'placeholder') ? placeholderImage('#0b0f14') : m.src;
      el.src = src; el.alt = m.alt || m.caption || ""; el.loading = 'lazy'; el.decoding = 'async';
    }
    slide.append(el);
    sliderTrack.append(slide);

    const dot = document.createElement("div"); dot.className = "dot"; if (idx === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goTo(idx, true));
    sliderDots.append(dot);
  });

  updateTrack(true);
  if (!prefersReducedMotion && sliderState.count > 1) startAutoplay();
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
    return;
  }
  // During animation, hide captions by removing active from all slides
  setActiveSlide(-1);
  // Wait for the transform transition to finish, then activate the current slide
  const onEnd = (e) => {
    if (e && e.target !== sliderTrack) return;
    if (e && e.propertyName && e.propertyName !== 'transform') return;
    try { sliderTrack.removeEventListener('transitionend', onEnd, true); } catch {}
    setActiveSlide(sliderState.i);
    showOverlayCaption(getMediaCaption(sliderState.i));
  };
  sliderTrack.addEventListener('transitionend', onEnd, true);
}

function goTo(i, user = false) {
  if (sliderState.count <= 0) return; // nothing to do
  if (sliderState.count === 1) { updateTrack(); return; }
  sliderState.i = (i + sliderState.count) % sliderState.count;
  updateTrack();
  if (user) restartAutoplay();
}

function next() { goTo(sliderState.i + 1); }
function prev() { goTo(sliderState.i - 1); }

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
  if (sliderState.paused) { sliderState.t0 = ts - (sliderState.tAcc || 0); requestAnimationFrame(frame); return; }
  if (!sliderState.t0) sliderState.t0 = ts;
  const elapsed = ts - sliderState.t0;
  const pct = Math.min(1, elapsed / sliderState.dur);
  sliderProgress.style.transform = `scaleX(${pct})`;
  if (pct >= 1) {
    goTo(sliderState.i + 1);
    sliderState.t0 = 0;
  }
  sliderState.raf = requestAnimationFrame(frame);
}

function startAutoplay() {
  stopAutoplay();
  sliderState.t0 = 0; sliderState.paused = false; sliderState.tAcc = 0;
  sliderState.raf = requestAnimationFrame(frame);
}
function stopAutoplay() {
  if (sliderState.raf) cancelAnimationFrame(sliderState.raf);
  sliderState.raf = 0; sliderProgress.style.transform = `scaleX(0)`;
}
function restartAutoplay() { stopAutoplay(); startAutoplay(); }

// Pause on hover/focus
const pauseAreas = [slider, sheet];
pauseAreas.forEach((el) => {
  el.addEventListener("mouseenter", () => { sliderState.paused = true; });
  el.addEventListener("mouseleave", () => { sliderState.paused = false; });
  el.addEventListener("focusin", () => { sliderState.paused = true; });
  el.addEventListener("focusout", () => { sliderState.paused = false; });
});

// Pause when tab hidden
document.addEventListener("visibilitychange", () => {
  sliderState.paused = document.hidden;
});

// Respect prefers-reduced-motion

// Cursor-reactive parallax blobs + drifting dots (disabled if no elements exist)
const blobEls = $$(".blob");
const dotsCanvas = $("#bg-dots");
const ctx = (dotsCanvas && dotsCanvas.getContext) ? dotsCanvas.getContext("2d") : null;
const bgActive = (blobEls && blobEls.length > 0) || !!ctx;
let dots = [];
let mouse = { x: 0.5, y: 0.5, vX: 0, vY: 0, t: 0 };
let lastTs = 0;

function resizeCanvas() {
  if (!ctx) return;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  dotsCanvas.width = Math.floor(dotsCanvas.clientWidth * dpr);
  dotsCanvas.height = Math.floor(dotsCanvas.clientHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  initDots();
}

function initDots() {
  if (!ctx) return;
  const w = dotsCanvas.clientWidth, h = dotsCanvas.clientHeight;
  const count = Math.floor((w * h) / 18000); // density
  dots = Array.from({ length: count }, () => spawnDot(w, h));
}
function spawnDot(w, h) {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    r: 1 + Math.random() * 2,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    drift: Math.random() * 6.28,
    hue: 200 + Math.random() * 80,
  };
}

function drawDots(dt) {
  if (!ctx) return;
  const w = dotsCanvas.clientWidth, h = dotsCanvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  for (const d of dots) {
    // gentle drift + cursor influence
    const g = 0.02; // gravity toward cursor
    const tx = mouse.x * w, ty = mouse.y * h;
    d.vx += (tx - d.x) * g * 0.0005;
    d.vy += (ty - d.y) * g * 0.0005;
    d.vx += Math.cos(d.drift) * 0.02; // ambient swirl
    d.vy += Math.sin(d.drift) * 0.02;

    d.x += d.vx * (dt * 0.06);
    d.y += d.vy * (dt * 0.06);
    d.drift += 0.005 * dt * 0.06;

    // wrap around
    if (d.x < -10) d.x = w + 10; if (d.x > w + 10) d.x = -10;
    if (d.y < -10) d.y = h + 10; if (d.y > h + 10) d.y = -10;

    ctx.beginPath();
    ctx.fillStyle = `hsla(${d.hue}, 90%, 70%, 0.35)`;
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function animateBackground(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.max(16, ts - lastTs); // clamp
  lastTs = ts;
  mouse.t += dt * 0.001;

  // If tab is hidden, skip heavy work but keep the loop alive
  if (document.hidden) { requestAnimationFrame(animateBackground); return; }

  // Parallax for blobs with subtle oscillation
  blobEls.forEach((el, i) => {
    const ax = (i + 1) * 1.8; // amplitude scale
    const ay = (i + 1) * 1.2;
    const oscX = Math.cos(mouse.t * (0.2 + i * 0.05)) * 4;
    const oscY = Math.sin(mouse.t * (0.25 + i * 0.04)) * 3;
    const mx = (mouse.x - 0.5) * ax * 10; // stronger near edges
    const my = (mouse.y - 0.5) * ay * 10;
    el.style.transform = `translate3d(${mx + oscX}px, ${my + oscY}px, 0) scale(1.03)`;
  });

  drawDots(dt);
  requestAnimationFrame(animateBackground);
}

function onPointerMove(e) {
  // Avoid layout thrash by using viewport size instead of getBoundingClientRect
  const vw = window.innerWidth || document.documentElement.clientWidth || 1;
  const vh = window.innerHeight || document.documentElement.clientHeight || 1;
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  const nx = Math.max(0, Math.min(1, cx / vw));
  const ny = Math.max(0, Math.min(1, cy / vh));
  mouse.vX = nx - mouse.x; mouse.vY = ny - mouse.y;
  mouse.x = nx; mouse.y = ny;
}

if (bgActive && !prefersReducedMotion) {
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
}
// Throttle expensive resizes to animation frames
let resizeRaf = 0;
function onResizeThrottled() {
  if (resizeRaf) return;
  resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; resizeCanvas(); });
}
if (bgActive) window.addEventListener('resize', onResizeThrottled);
if (bgActive && !prefersReducedMotion) {
  resizeCanvas();
  requestAnimationFrame(animateBackground);
} else {
  try { if (dotsCanvas) dotsCanvas.style.display = 'none'; } catch {}
}

// loader removed

// Timeline progress effect (cache nodes to avoid repeated queries)
const timelineEls = Array.from(document.querySelectorAll('.timeline'));
function updateTimelineProgress() {
  const vH = window.innerHeight || document.documentElement.clientHeight;
  for (let i = 0; i < timelineEls.length; i++) {
    const tl = timelineEls[i];
    const rect = tl.getBoundingClientRect();
    const center = vH * 0.5;
    const ratio = Math.max(0, Math.min(1, (center - rect.top) / (rect.height || 1)));
    tl.style.setProperty('--progressRatio', ratio.toFixed(3));
  }
}

// Nav active section highlight
const navMap = new Map([
  ['#profile-card', document.querySelector('.shortcut-link[href="#profile-card"]')],
  ['#experience', document.querySelector('.shortcut-link[href="#experience"]')],
  ['#projects', document.querySelector('.shortcut-link[href="#projects"]')],
  ['#education', document.querySelector('.shortcut-link[href="#education"]')],
]);
function setActiveNav(sel) {
  navMap.forEach((link, key) => { if (link) link.classList.toggle('active', key === sel); });
}
const navSections = ['#profile-card', '#experience', '#projects', '#education'];
// IntersectionObserver-based scrollspy with click lock until scroll idle
let navLockActive = false;
let navIdleTimer = 0;
function releaseNavLockSoon() {
  clearTimeout(navIdleTimer);
  navIdleTimer = setTimeout(() => {
    navLockActive = false;
    updateActiveNavByIO();
    try { window.removeEventListener('scroll', releaseNavLockSoon); } catch {}
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

// Scroll indicator (count reveals dynamically so late-rendered items are included)
const scrollInd = document.getElementById('scroll-indicator');
function updateScrollIndicator() {
  if (!scrollInd) return;
  const atBottom = (window.innerHeight + (window.scrollY || window.pageYOffset || 0)) >= ((document.documentElement.scrollHeight || 0) - 2);
  const remaining = document.querySelectorAll('.reveal:not(.in)').length;
  const shouldShow = !atBottom && remaining > 0;
  scrollInd.classList.toggle('show', shouldShow);
}

// Back-to-top visibility + behavior
const backTop = document.getElementById('back-to-top');
function updateBackTop() {
  if (!backTop) return;
  const y = window.scrollY || window.pageYOffset || 0;
  const show = y > (window.innerHeight * 0.35);
  backTop.classList.toggle('show', show);
}
updateBackTop();
// Batch scroll/resize-driven updates with a single rAF per frame
let _scrollRaf = 0, _resizeRaf = 0;
function flushScroll() {
  _scrollRaf = 0;
  updateTimelineProgress();
  updateScrollIndicator();
  updateBackTop();
}
function onScrollRaf() { if (_scrollRaf) return; _scrollRaf = requestAnimationFrame(flushScroll); }
function flushResize() {
  _resizeRaf = 0;
  updateTimelineProgress();
  updateScrollIndicator();
  updateBackTop();
}
function onResizeRaf() { if (_resizeRaf) return; _resizeRaf = requestAnimationFrame(flushResize); }
window.addEventListener('scroll', onScrollRaf, { passive: true });
window.addEventListener('resize', onResizeRaf);
// Initial paint for scroll-dependent UI
updateTimelineProgress();
updateScrollIndicator();
if (backTop) backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

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
    // Use the actual bottom edge from the top of the viewport (no hardcoded gaps)
    const offset = Math.max(0, Math.ceil(rect.bottom));
    try { document.documentElement.style.setProperty('--nav-offset', offset + 'px'); } catch {}
  }
  const queue = () => { if (raf) return; raf = requestAnimationFrame(measure); };
  // Initial and after load (fonts/images can change height)
  if (document.readyState !== 'loading') measure(); else window.addEventListener('DOMContentLoaded', measure, { once: true });
  window.addEventListener('load', queue, { once: true });
  // Recalculate on resize/orientation changes
  window.addEventListener('resize', queue);
  window.addEventListener('orientationchange', queue);
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
    try { document.documentElement.style.setProperty('--dev-banner-h', h + 'px'); } catch {}
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
  } catch {}
})();

// Make the development banner dismissible (no persistence; shows every refresh)
(function devBannerDismiss() {
  function init() {
    const banner = document.querySelector('.dev-banner');
    if (!banner) return;
    const hide = () => {
      banner.classList.add('is-hidden');
      try { document.documentElement.style.setProperty('--dev-banner-h', '0px'); } catch {}
    };
    const btn = banner.querySelector('.dev-banner-close');
    if (btn) btn.addEventListener('click', hide);
  }
  if (document.readyState !== 'loading') init();
  else window.addEventListener('DOMContentLoaded', init, { once: true });
})();

// Debug reset UI removed by request; use external tool/bookmarklet instead

// Try to retrieve LinkedIn profile image (best-effort, with fallback)
(async function hydrateAvatar() {
  const avatarEl = document.querySelector('.avatar');
  if (!avatarEl) return;
  const fallback = null; // set to 'assets/img/profile.jpg' if you add a local image
  try {
    const url = 'https://r.jina.ai/http://www.linkedin.com/in/yinshengkai/';
    // Guard fetch with a soft timeout to avoid long stalls
    const controller = ('AbortController' in window) ? new AbortController() : null;
    const to = setTimeout(() => { try { controller && controller.abort(); } catch {} }, 3500);
    const res = await fetch(url, controller ? { signal: controller.signal } : undefined);
    clearTimeout(to);
    if (!res.ok) throw new Error('fetch failed');
    const text = await res.text();
    const m = text.match(/property=\"og:image\" content=\"([^\"]+)/i);
    const img = m && m[1];
    if (img) {
      const imgEl = document.createElement('img');
      imgEl.className = 'avatar-img';
      imgEl.src = img;
      imgEl.decoding = 'async';
      imgEl.loading = 'lazy';
      imgEl.setAttribute('referrerpolicy', 'no-referrer');
      imgEl.alt = 'Profile picture';
      avatarEl.innerHTML = '';
      avatarEl.appendChild(imgEl);
      return;
    }
  } catch (e) { /* ignore */ }
  if (fallback) {
    const imgEl = document.createElement('img');
    imgEl.className = 'avatar-img';
    imgEl.src = fallback;
    imgEl.alt = 'Profile picture';
    imgEl.decoding = 'async';
    imgEl.loading = 'lazy';
    avatarEl.innerHTML = '';
    avatarEl.appendChild(imgEl);
  }
})();

// Utility: initials from org
function initials(name = '') {
  const parts = name.replace(/\(.+?\)/g, '').split(/[\s—-]+/).filter(Boolean);
  const letters = parts.slice(0, 3).map(p => p[0].toUpperCase()).join('');
  return letters || '•';
}
