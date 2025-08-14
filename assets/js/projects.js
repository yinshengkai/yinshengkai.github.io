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