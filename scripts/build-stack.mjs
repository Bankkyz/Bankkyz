// Generates assets/stack.svg — edit the GROUPS list and re-run: node scripts/build-stack.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const GROUPS = [
  { title: "LANGUAGES", color: "#5eead4", items: [
    ["TS", "TypeScript", "#3178c6"], ["JS", "JavaScript", "#f7df1e"],
    ["</>", "HTML", "#e34f26"], ["{ }", "CSS", "#663399"] ] },
  { title: "FRAMEWORKS", color: "#a78bfa", items: [
    ["⚛", "React", "#61dafb"], ["N", "Next.js", "#e5e7eb"],
    ["~", "Tailwind", "#38bdf8"], ["⬢", "Node.js", "#5fa04e"] ] },
  { title: "TOOLS & DEPLOY", color: "#fbbf24", items: [
    ["▲", "Vercel", "#e5e7eb"], ["⎇", "Git", "#f05032"],
    ["◉", "GitHub", "#e5e7eb"], ["✦", "Figma", "#f24e1e"] ] },
];

const W = 1200, H = 350;
const tileW = 150, tileH = 92, gap = 14;
const colW = 2 * tileW + gap;
const xs = [60, (W - colW) / 2, W - 60 - colW];
const top = 74;
const hub = { x: W / 2, y: 312 };

let tiles = "", wires = "";
GROUPS.forEach((g, gi) => {
  const x0 = xs[gi];
  tiles += `<text x="${x0}" y="${top - 18}" class="mono" font-size="11" font-weight="700" letter-spacing="3" fill="${g.color}">${g.title.replace(/&/g, "&amp;")}</text>`;
  g.items.forEach(([mono, name, brand], i) => {
    const x = x0 + (i % 2) * (tileW + gap);
    const y = top + Math.floor(i / 2) * (tileH + gap);
    const delay = (gi * 4 + i) * 0.08;
    tiles += `
    <g class="pop" style="animation-delay:${delay.toFixed(2)}s">
      <rect x="${x}" y="${y}" width="${tileW}" height="${tileH}" rx="14" fill="#0f1529" stroke="${g.color}" stroke-opacity="0.35"/>
      <rect x="${x + tileW / 2 - 22}" y="${y + 12}" width="44" height="44" rx="11" fill="${brand}" fill-opacity="0.14" stroke="${brand}" stroke-opacity="0.6"/>
      <text x="${x + tileW / 2}" y="${y + 41}" text-anchor="middle" class="sans" font-size="${mono.length > 2 ? 15 : 20}" font-weight="800" fill="${brand}">${mono.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>
      <text x="${x + tileW / 2}" y="${y + 77}" text-anchor="middle" class="mono" font-size="11" fill="#cbd5e1">${name}</text>
    </g>`;
  });
  const bx = x0 + colW / 2, by = top + 2 * tileH + gap;
  wires += `<path d="M${bx} ${by} V${hub.y} H${hub.x}" fill="none" stroke="${g.color}" stroke-opacity="0.45" stroke-width="1.5"/>
    <circle r="3.5" fill="${g.color}"><animateMotion dur="${2.4 + gi * 0.5}s" repeatCount="indefinite" path="M${bx} ${by} V${hub.y} H${hub.x}"/></circle>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#334155" opacity="0.5"/></pattern>
    <linearGradient id="hubg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5eead4"/><stop offset="0.5" stop-color="#a78bfa"/><stop offset="1" stop-color="#fbbf24"/></linearGradient>
    <style>
      .mono{font-family:'JetBrains Mono','Cascadia Code',Consolas,monospace}
      .sans{font-family:'Segoe UI','Inter',Arial,sans-serif}
      .pop{animation:pop .7s cubic-bezier(.2,.9,.3,1.3) both}
      @keyframes pop{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    </style>
  </defs>
  <rect width="${W}" height="${H}" rx="18" fill="#080b16"/>
  <rect width="${W}" height="${H}" rx="18" fill="url(#dots)"/>
  ${wires}
  ${tiles}
  <rect x="${hub.x - 90}" y="${hub.y - 20}" width="180" height="40" rx="10" fill="#0f1529" stroke="url(#hubg)" stroke-width="2"/>
  <text x="${hub.x}" y="${hub.y + 5}" text-anchor="middle" class="mono" font-size="14" font-weight="800" letter-spacing="4" fill="#e0e7ff">BANKKYZ.CORE</text>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="#a78bfa" stroke-opacity="0.3"/>
</svg>
`;
mkdirSync(new URL("../assets/", import.meta.url), { recursive: true });
writeFileSync(new URL("../assets/stack.svg", import.meta.url), svg);
console.log("wrote assets/stack.svg");
