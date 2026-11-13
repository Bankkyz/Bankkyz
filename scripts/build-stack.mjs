// Generates assets/arsenal.svg (AI toolkit) and assets/ship.svg (what I can make).
// Edit the lists below, then run: node scripts/build-stack.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const LIME = "#d4ff3a", ORANGE = "#ff6a1a", INK = "#070707", PAPER = "#f5f5f0", GRAY = "#6b6b6b";

// AI toolkit — one row per role
const ARSENAL = [
  { role: "THINK",  note: "plan · research · write",  tools: ["Claude", "ChatGPT", "Gemini", "Perplexity"] },
  { role: "BUILD",  note: "agents that ship code",    tools: ["Claude Code", "Cursor", "v0", "GitHub Copilot"] },
  { role: "CREATE", note: "image · voice · video",    tools: ["Midjourney", "ElevenLabs", "HyperFrames", "Suno"] },
  { role: "SHIP",   note: "live in minutes",          tools: ["Vercel", "GitHub", "Supabase", "Actions"] },
];

// What I can make — big numbered blocks
const SHIP = [
  ["WEB APPS", "full products from one prompt"],
  ["SHOPS", "online stores that sell"],
  ["SYSTEMS", "POS, dashboards, back-office"],
  ["MOTION", "animated clips & explainers"],
  ["VOICE", "AI narration & dialogue"],
  ["AUTOMATION", "bots & workflows that run alone"],
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const STYLE = `
  .h{font-family:'Arial Black','Segoe UI Black','Helvetica Neue',Impact,sans-serif;font-weight:900}
  .m{font-family:'JetBrains Mono','Cascadia Code',Consolas,monospace}
  .row{animation:row .7s cubic-bezier(.2,.9,.2,1) both}
  @keyframes row{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:none}}
  .scan{animation:scan 3s ease-in-out infinite}
  @keyframes scan{0%{transform:translateX(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateX(1100px);opacity:0}}
  .pip{animation:pip 1.6s ease-in-out infinite}@keyframes pip{50%{opacity:.2}}
`;

// ---------- arsenal.svg ----------
{
  const W = 1200, rowH = 78, top = 70, H = top + ARSENAL.length * rowH + 30;
  let rows = "";
  ARSENAL.forEach((r, i) => {
    const y = top + i * rowH;
    const accent = i % 2 ? ORANGE : LIME;
    let x = 330;
    const chips = r.tools.map((t) => {
      const w = Math.round(t.length * 10.2 + 40);
      const s = `<rect x="${x}" y="${y + 16}" width="${w}" height="38" fill="none" stroke="${PAPER}" stroke-opacity="0.25"/>
        <rect x="${x}" y="${y + 16}" width="4" height="38" fill="${accent}"/>
        <text x="${x + 20}" y="${y + 41}" class="m" font-size="16" font-weight="700" fill="${PAPER}">${esc(t)}</text>`;
      x += w + 12;
      return s;
    }).join("");
    rows += `<g class="row" style="animation-delay:${(i * 0.12).toFixed(2)}s">
      <line x1="40" y1="${y + rowH - 4}" x2="${W - 40}" y2="${y + rowH - 4}" stroke="${PAPER}" stroke-opacity="0.08"/>
      <text x="40" y="${y + 36}" class="h" font-size="30" fill="${accent}">${r.role}</text>
      <text x="42" y="${y + 58}" class="m" font-size="11" letter-spacing="1" fill="${GRAY}">${esc(r.note)}</text>
      <text x="300" y="${y + 42}" class="m" font-size="18" fill="${GRAY}">→</text>
      ${chips}
    </g>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><style>${STYLE}</style><clipPath id="c"><rect width="${W}" height="${H}" rx="20"/></clipPath></defs>
  <g clip-path="url(#c)">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <text x="40" y="42" class="m" font-size="12" letter-spacing="3" fill="${GRAY}">LOADOUT // MODELS &amp; TOOLS I COMMAND</text>
  <circle class="pip" cx="${W - 52}" cy="38" r="5" fill="${LIME}"/>
  <text x="${W - 66}" y="42" text-anchor="end" class="m" font-size="12" letter-spacing="3" fill="${LIME}">ALL SYSTEMS ARMED</text>
  ${rows}
  <rect class="scan" x="40" y="${top}" width="2" height="${ARSENAL.length * rowH - 8}" fill="${LIME}" opacity="0.7"/>
  </g>
</svg>
`;
  mkdirSync(new URL("../assets/", import.meta.url), { recursive: true });
  writeFileSync(new URL("../assets/arsenal.svg", import.meta.url), svg);
}

// ---------- ship.svg ----------
{
  const W = 1200, cols = 3, cw = (W - 80 - 2 * 16) / cols, ch = 150, top = 60;
  const H = top + Math.ceil(SHIP.length / cols) * (ch + 16) + 24;
  const blocks = SHIP.map(([title, sub], i) => {
    const x = 40 + (i % cols) * (cw + 16), y = top + Math.floor(i / cols) * (ch + 16);
    const hot = i === 0 || i === 4;
    const bg = hot ? LIME : "#111111", fg = hot ? INK : PAPER, num = hot ? INK : ORANGE;
    return `<g class="row" style="animation-delay:${(i * 0.1).toFixed(2)}s">
      <rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${bg}" stroke="${PAPER}" stroke-opacity="${hot ? 0 : 0.12}"/>
      <text x="${x + 22}" y="${y + 40}" class="m" font-size="14" font-weight="700" fill="${num}">${String(i + 1).padStart(2, "0")}/</text>
      <text x="${x + cw - 22}" y="${y + 40}" text-anchor="end" class="m" font-size="18" fill="${fg}" opacity="0.6">↗</text>
      <text x="${x + 20}" y="${y + 104}" class="h" font-size="36" letter-spacing="-1" fill="${fg}">${esc(title)}</text>
      <text x="${x + 22}" y="${y + 130}" class="m" font-size="12" fill="${fg}" opacity="0.7">${esc(sub)}</text>
    </g>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><style>${STYLE}</style><clipPath id="c"><rect width="${W}" height="${H}" rx="20"/></clipPath></defs>
  <g clip-path="url(#c)">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <text x="40" y="38" class="m" font-size="12" letter-spacing="3" fill="${GRAY}">OUTPUT // IF YOU CAN DESCRIBE IT, I CAN SHIP IT</text>
  ${blocks}
  </g>
</svg>
`;
  writeFileSync(new URL("../assets/ship.svg", import.meta.url), svg);
}
console.log("wrote assets/arsenal.svg, assets/ship.svg");
