// Self-contained script (no ES module import) for broader compatibility
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// Sample data + placeholder media generator
function placeholderImage(title, accent = "#6bb6ff", bg = "#0b0f14") {
  const svg = `<?xml version='1.0' encoding='UTF-8'?>
  <svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${accent}' stop-opacity='0.55'/>
        <stop offset='100%' stop-color='#8d7bff' stop-opacity='0.45'/>
      </linearGradient>
      <filter id='f' x='-20%' y='-20%' width='140%' height='140%'>
        <feGaussianBlur stdDeviation='60' />
      </filter>
    </defs>
    <rect width='100%' height='100%' fill='${bg}'/>
    <circle cx='20%' cy='25%' r='220' fill='url(#g)' filter='url(#f)'/>
    <circle cx='75%' cy='70%' r='260' fill='url(#g)' filter='url(#f)'/>
    <g fill='none' stroke='rgba(255,255,255,.12)'>
      <rect x='40' y='40' width='1520' height='820' rx='28'/>
    </g>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
      font-family='Segoe UI, Roboto, Helvetica, Arial' font-size='72'
      fill='white' fill-opacity='0.9' letter-spacing='1'>${title}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const projects = [
  {
    id: "realtime-dashboard",
    title: "Realtime Analytics Dashboard",
    period: { start: "2023-03", end: "2024-02" },
    summary: "A fluid, low-latency dashboard for metrics with WebSocket streaming and GPU-accelerated charts.",
    tags: ["TypeScript", "WebGL", "WebSocket", "DX"],
    media: [
      { type: "image", src: placeholderImage("Realtime Dashboard"), alt: "Realtime dashboard overview", caption: "Overview — KPIs and live streams" },
      { type: "image", src: placeholderImage("Chart Zoom", "#18c3a1"), alt: "Zoomable charts", caption: "GPU zoom and brushing" },
      { type: "image", src: placeholderImage("Alerting", "#8d7bff"), alt: "Alerting UI", caption: "Anomaly detection alerts" },
    ],
    description: "Designed a high-performance monitoring surface with liquid-glass UI. Built stream processing, progressive rendering, and tactile interactions for operators.",
  },
  {
    id: "vision-mobile",
    title: "On-device Vision App",
    period: { start: "2022-05", end: "2023-01" },
    summary: "Hybrid iOS/Android app for real-time classification and overlays with offline models.",
    tags: ["Swift", "Kotlin", "ML", "UX"],
    media: [
      { type: "image", src: placeholderImage("Vision App", "#8d7bff"), alt: "On-device vision", caption: "Live overlays and capture" },
      { type: "image", src: placeholderImage("Model Tuning", "#6bb6ff"), alt: "Model tuning", caption: "Model selection and tuning" },
    ],
    description: "Implemented a native-first experience with elegant transitions, robust offline support, and a focus on clarity under motion.",
  },
  {
    id: "infra-platform",
    title: "Internal Dev Platform",
    period: { start: "2021-01", end: "present" },
    summary: "Self-serve previews, CI insights, and golden-path templates for engineers.",
    tags: ["Platform", "DX", "Kubernetes", "CI"],
    media: [
      { type: "image", src: placeholderImage("Dev Platform", "#18c3a1"), alt: "Platform dashboard", caption: "Golden paths and insights" },
      { type: "image", src: placeholderImage("Preview Envs", "#6bb6ff"), alt: "Preview environments", caption: "Per-PR ephemeral previews" },
      { type: "image", src: placeholderImage("Insights", "#8d7bff"), alt: "Build insights", caption: "Hotspots and flake tracking" },
    ],
    description: "Led a cross-functional effort to unify tooling, reduce toil, and improve developer joy through crisp interfaces.",
  },
  {
    id: "gesture-studio",
    title: "Gesture Studio (iOS)",
    period: { start: "2024-05", end: "2024-11" },
    summary: "An iOS-inspired sandbox for fluid, haptic gestures and glassmorphism components.",
    tags: ["SwiftUI", "Core Animation", "Haptics"],
    media: [
      { type: "image", src: placeholderImage("Gesture Studio", "#6bb6ff"), alt: "Gesture studio prototypes", caption: "Springy cards and liquid blur" },
      { type: "image", src: placeholderImage("Glass Widgets", "#18c3a1"), alt: "Glass widgets", caption: "Widgets with layered translucency" },
    ],
    description: "Prototyped a suite of reusable motion patterns with spring physics, layered blurs, and tactile feedback for iOS-like experiences.",
  },
  {
    id: "liquid-ui-web",
    title: "Liquid UI Web Kit",
    period: { start: "2023-09", end: "2024-03" },
    summary: "A small React/TS component kit for liquid-glass UIs with tokens and theming.",
    tags: ["React", "TypeScript", "Design System"],
    media: [
      { type: "image", src: placeholderImage("Liquid UI", "#8d7bff"), alt: "Liquid UI kit", caption: "Glass cards, sheets, and sliders" },
      { type: "image", src: placeholderImage("Token System", "#6bb6ff"), alt: "Token system", caption: "Design tokens and theming" },
    ],
    description: "Built accessible, themeable components mirroring iOS visuals with dark-first tokens, motion primitives, and strong focus handling.",
  },
];

const experience = [
  { role: "Senior Software Engineer", org: "Acme Corp", period: "2023 — Present", details: "Web performance, design systems, and realtime interfaces." },
  { role: "Software Engineer", org: "Beta Labs", period: "2020 — 2023", details: "Built native and web features across the stack." },
  { role: "iOS Engineer (Intern)", org: "Startup X", period: "2019", details: "Prototyped camera/vision features and data viz." },
  { role: "Freelance Developer", org: "Self-Employed", period: "2017 — 2020", details: "Delivered portfolio sites, MVPs, and interactive prototypes." },
];

// Footer year
$("#year").textContent = new Date().getFullYear();

// Render projects grid
const grid = $("#projects-grid");
projects.forEach((p, i) => {
  const card = document.createElement("article");
  card.className = "project-card glass card-enter";
  card.style.animationDelay = `${90 + i * 30}ms`;
  card.setAttribute("tabindex", "0");
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${p.title} — open details`);

  const cover = document.createElement("div");
  cover.className = "cover";
  const media = document.createElement("div");
  media.className = "media";
  const firstMedia = p.media?.[0];
  media.style.backgroundImage = `url('${firstMedia?.src || ""}')`;
  cover.append(media);

  const title = document.createElement("h3");
  title.className = "project-title";
  title.textContent = p.title;

  const desc = document.createElement("p");
  desc.className = "project-desc";
  desc.textContent = p.summary;

  const meta = document.createElement("div");
  meta.className = "project-meta";
  const range = document.createElement("span");
  range.className = "chip";
  const rangeLabel = formatPeriod(p.period);
  range.textContent = rangeLabel.display;

  const tags = document.createElement("div");
  tags.className = "tags";
  (p.tags || []).slice(0, 3).forEach(t => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = t;
    tags.append(tag);
  });
  meta.append(range, tags);

  // timeline bar
  const tl = document.createElement("div");
  tl.className = "timeline-bar";
  const fill = document.createElement("div");
  fill.className = "fill";
  const pct = rangeLabel.progressPct;
  fill.style.setProperty("--p", `${pct}%`);
  tl.append(fill);

  card.append(cover, title, desc, tl, meta);
  grid.append(card);

  const open = () => openSheet(p);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
});

// Render experience timeline
const expEl = $("#experience-timeline");
experience.forEach((e) => {
  const item = document.createElement("div");
  item.className = "timeline-item";
  const card = document.createElement("div");
  card.className = "timeline-card glass";
  const role = document.createElement("p"); role.className = "timeline-role"; role.textContent = `${e.role} • ${e.period}`;
  const org = document.createElement("p"); org.className = "timeline-org"; org.textContent = `${e.org} — ${e.details}`;
  card.append(role, org); item.append(card); expEl.append(item);
});

// Sheet + slider logic
const sheet = $("#project-sheet");
const sheetTitle = $("#sheet-title");
const sheetDesc = $("#sheet-desc");
const sheetRange = $("#sheet-range");
const sheetTags = $("#sheet-tags");
const sheetBackdrop = sheet.querySelector("[data-close]");
const sheetClose = sheet.querySelector(".icon.close");

const slider = $("#sheet-slider");
const sliderTrack = $("#slider-track");
const sliderProgress = $("#slider-progress");
const btnPrev = $("#slider-prev");
const btnNext = $("#slider-next");
const sliderDots = $("#slider-dots");

let activeProject = null;
let lastTrigger = null;
let sliderState = {
  i: 0,
  count: 0,
  dur: 5000,
  raf: 0,
  t0: 0,
  paused: false,
};

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
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function openSheet(project) {
  activeProject = project;
  lastTrigger = document.activeElement;
  sheetTitle.textContent = project.title;
  sheetDesc.textContent = project.description || project.summary || "";
  const { display } = formatPeriod(project.period || {});
  sheetRange.textContent = display;
  sheetTags.innerHTML = "";
  (project.tags || []).forEach((t) => {
    const el = document.createElement("span"); el.className = "tag"; el.textContent = t; sheetTags.append(el);
  });
  buildSlider(project.media || []);
  sheet.setAttribute("aria-hidden", "false");
  // Focus the close button for accessibility
  setTimeout(() => sheetClose.focus(), 0);
  document.addEventListener("keydown", escToClose);
}

function closeSheet() {
  stopAutoplay();
  sheet.setAttribute("aria-hidden", "true");
  sliderTrack.innerHTML = ""; sliderDots.innerHTML = ""; sliderProgress.style.transform = `scaleX(0)`;
  activeProject = null;
  document.removeEventListener("keydown", escToClose);
  if (lastTrigger) lastTrigger.focus();
}
const escToClose = (e) => { if (e.key === "Escape") closeSheet(); };

sheetBackdrop.addEventListener("click", closeSheet);
sheetClose.addEventListener("click", closeSheet);

function buildSlider(media) {
  sliderTrack.innerHTML = "";
  sliderDots.innerHTML = "";
  sliderState.i = 0;
  sliderState.count = media.length;

  media.forEach((m, idx) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    let el;
    if (m.type === "video") {
      el = document.createElement("video"); el.src = m.src; el.controls = true; el.playsInline = true; el.muted = true; el.setAttribute("preload", "metadata");
    } else {
      el = document.createElement("img"); el.src = m.src; el.alt = m.alt || "";
    }
    slide.append(el);
    if (m.caption) {
      const cap = document.createElement("div"); cap.className = "caption"; cap.textContent = m.caption; slide.append(cap);
    }
    sliderTrack.append(slide);

    const dot = document.createElement("div"); dot.className = "dot"; if (idx === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goTo(idx, true));
    sliderDots.append(dot);
  });

  updateTrack();
  if (!prefersReducedMotion) startAutoplay();
}

function updateTrack() {
  const x = -sliderState.i * 100;
  sliderTrack.style.transform = `translate3d(${x}%,0,0)`;
  $$(".dot", sliderDots).forEach((d, j) => d.classList.toggle("active", j === sliderState.i));
}

function goTo(i, user = false) {
  sliderState.i = (i + sliderState.count) % sliderState.count;
  updateTrack();
  if (user) restartAutoplay();
}

function next() { goTo(sliderState.i + 1); }
function prev() { goTo(sliderState.i - 1); }

btnNext.addEventListener("click", () => next());
btnPrev.addEventListener("click", () => prev());

// Keyboard navigation inside sheet
sheet.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { next(); }
  if (e.key === "ArrowLeft") { prev(); }
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
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cursor-reactive parallax blobs + drifting dots
const blobEls = $$(".blob");
const dotsCanvas = $("#bg-dots");
const ctx = dotsCanvas.getContext ? dotsCanvas.getContext("2d") : null;
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
  const rect = document.documentElement.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  const nx = Math.max(0, Math.min(1, x / rect.width));
  const ny = Math.max(0, Math.min(1, y / rect.height));
  mouse.vX = nx - mouse.x; mouse.vY = ny - mouse.y;
  mouse.x = nx; mouse.y = ny;
}

window.addEventListener('mousemove', onPointerMove, { passive: true });
window.addEventListener('touchmove', onPointerMove, { passive: true });
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
requestAnimationFrame(animateBackground);
