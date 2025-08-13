// Simple data module for projects and experience.

// Generates a themed SVG placeholder as a data URL
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

export const projects = [
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
    description: "Built accessible, themeable components mirroring iOS 16–17 visuals with dark-first tokens, motion primitives, and strong focus handling.",
  },
];

export const experience = [
  {
    role: "Senior Software Engineer",
    org: "Acme Corp",
    period: "2023 — Present",
    details: "Web performance, design systems, and realtime interfaces.",
  },
  {
    role: "Software Engineer",
    org: "Beta Labs",
    period: "2020 — 2023",
    details: "Built native and web features across the stack.",
  },
  {
    role: "iOS Engineer (Intern)",
    org: "Startup X",
    period: "2019",
    details: "Prototyped camera/vision features and data viz.",
  },
  {
    role: "Freelance Developer",
    org: "Self-Employed",
    period: "2017 — 2020",
    details: "Delivered portfolio sites, MVPs, and interactive prototypes.",
  },
];
