// Self-contained script (no ES module import) for broader compatibility
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
// Global: reduced motion preference (use early and often)
const prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Reveal-on-scroll helper (staggered, bidirectional: in when visible, out when not)
const supportsIO = typeof window !== 'undefined' && 'IntersectionObserver' in window;
// Hysteresis state to stop rapid in/out near viewport edges
const _revealState = new WeakMap(); // el -> { visible: boolean, t: number }

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
  } catch { }
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
      applyReveal(el, true);
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

// Dev warning overlay removed

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
  // Allow default HTTP caching for better performance on static assets
  const res = await fetch(url);
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

// Safety: if reveal observer fails, force show shortly after
function revealFallback() {
  const pending = $$('.reveal:not(.in)');
  if (pending.length > 0) pending.forEach(el => el.classList.add('in'));
}
setTimeout(revealFallback, 400);

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
      // For skQuant, show pill beside title instead of in tags
      if ((p.id || '').toLowerCase() === 'skquant' || /sk\s*quant/i.test(p.title || '')) {
        titleRow.append(ongoing);
      } else {
        tags.prepend(ongoing);
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
  sheetDesc.textContent = project.description || project.summary || "";
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
  } catch { }
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
      el = document.createElement("video"); el.src = m.src; el.controls = true; el.playsInline = true; el.muted = true;
    } else {
      el = document.createElement("img");
      const src = (m.type === 'placeholder') ? placeholderImage('#000000') : m.src;
      el.src = src; el.alt = m.alt || m.caption || "";
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
    try { sliderTrack.removeEventListener('transitionend', onEnd, true); } catch { }
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

// Background parallax/dots removed (no corresponding DOM elements)

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

// Scroll indicator/back-to-top removed
// Batch scroll/resize-driven updates with a single rAF per frame
let _scrollRaf = 0, _resizeRaf = 0;
function flushScroll() {
  _scrollRaf = 0;
  updateTimelineProgress();
}
function onScrollRaf() { if (_scrollRaf) return; _scrollRaf = requestAnimationFrame(flushScroll); }
function flushResize() {
  _resizeRaf = 0;
  updateTimelineProgress();
}
function onResizeRaf() { if (_resizeRaf) return; _resizeRaf = requestAnimationFrame(flushResize); }
window.addEventListener('scroll', onScrollRaf, { passive: true });
window.addEventListener('resize', onResizeRaf);
// Initial paint for scroll-dependent UI
updateTimelineProgress();

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
    try { document.documentElement.style.setProperty('--nav-offset', offset + 'px'); } catch { }
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
    try { document.documentElement.style.setProperty('--dev-banner-h', h + 'px'); } catch { }
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

// Debug reset UI removed by request; use external tool/bookmarklet instead

// LinkedIn avatar fetch removed (keeps local avatar image)

// Utility: initials from org
function initials(name = '') {
  const parts = name.replace(/\(.+?\)/g, '').split(/[\s—-]+/).filter(Boolean);
  const letters = parts.slice(0, 3).map(p => p[0].toUpperCase()).join('');
  return letters || '•';
}
