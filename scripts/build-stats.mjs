// Builds assets/stats.svg and assets/projects/*.svg from the GitHub GraphQL API.
// Run: GITHUB_TOKEN=xxx node scripts/build-stats.mjs   (GitHub Actions runs it daily)
import { writeFileSync, mkdirSync } from "node:fs";

const LOGIN = process.env.PROFILE_LOGIN || "Bankkyz";
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error("GITHUB_TOKEN is required");

// Project cards: the prompt that started it, and what came out.
const PROJECTS = [
  { repo: "burger-pos", title: "BURGER POS", prompt: "build a point-of-sale system for a burger shop" },
  { repo: "Narai_shop", title: "NARAI SHOP", prompt: "make an online store people actually buy from" },
  { repo: "promediafx-portfolio", title: "PROMEDIAFX", prompt: "design a portfolio for a media & FX studio" },
  { repo: "Love-Memory", title: "LOVE MEMORY", prompt: "turn our memories into an interactive gift" },
];

const LIME = "#d4ff3a", ORANGE = "#ff6a1a", INK = "#070707", PAPER = "#f5f5f0", GRAY = "#6b6b6b";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (n) => n.toLocaleString("en-US");
const STYLE = `
  .h{font-family:'Arial Black','Segoe UI Black','Helvetica Neue',Impact,sans-serif;font-weight:900}
  .m{font-family:'JetBrains Mono','Cascadia Code',Consolas,monospace}
`;

async function gql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const data = await gql(`query($login:String!){ user(login:$login){
  repositories(first:100, ownerAffiliations:OWNER, privacy:PUBLIC, isFork:false, orderBy:{field:PUSHED_AT,direction:DESC}){
    totalCount
    nodes{ name stargazerCount pushedAt homepageUrl
      languages(first:10, orderBy:{field:SIZE,direction:DESC}){ totalSize } }
  }
  contributionsCollection{
    totalCommitContributions totalPullRequestContributions
    contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } }
  }
}}`, { login: LOGIN });

const u = data.user;
const repos = u.repositories.nodes;
const cal = u.contributionsCollection.contributionCalendar;
const days = cal.weeks.flatMap((w) => w.contributionDays);
const live = repos.filter((r) => r.homepageUrl).length;

let cur = 0, longest = 0, run = 0;
for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
for (let i = days.length - 1; i >= 0; i--) {
  if (days[i].contributionCount > 0) cur++;
  else if (i === days.length - 1) continue;
  else break;
}
const weekly = cal.weeks.map((w) => w.contributionDays.reduce((s, d) => s + d.contributionCount, 0));
const peak = Math.max(1, ...weekly);
const today = new Date().toISOString().slice(0, 10);

// ---------- stats.svg : brutalist "machine log" ----------
const W = 1200, H = 380;
const cells = [
  ["SHIPPED", fmt(u.repositories.totalCount), "public builds"],
  ["LIVE", fmt(live), "deployed & online"],
  ["COMMITS", fmt(u.contributionsCollection.totalCommitContributions), "last 12 months"],
  ["STREAK", `${cur}D`, `best ${longest} days`],
];
const cw = (W - 80) / 4;
const cellSvg = cells.map(([k, v, s], i) => {
  const x = 40 + i * cw;
  const hot = i === 0;
  return `<rect x="${x}" y="70" width="${cw - 12}" height="130" fill="${hot ? LIME : "#111"}"/>
  <text x="${x + 20}" y="98" class="m" font-size="12" font-weight="700" letter-spacing="3" fill="${hot ? INK : ORANGE}">${k}</text>
  <text x="${x + 18}" y="166" class="h" font-size="58" letter-spacing="-2" fill="${hot ? INK : PAPER}">${esc(v)}</text>
  <text x="${x + 20}" y="188" class="m" font-size="11" fill="${hot ? INK : GRAY}">${esc(s)}</text>`;
}).join("");

const bx = 40, by = 250, bw = W - 80, bh = 90, n = weekly.length;
const barW = bw / n;
const bars = weekly.map((v, i) => {
  const h = Math.max(2, (v / peak) * bh);
  const hot = v === peak;
  return `<rect x="${(bx + i * barW + 1).toFixed(1)}" y="${(by + bh - h).toFixed(1)}" width="${(barW - 2).toFixed(1)}" height="${h.toFixed(1)}" fill="${hot ? ORANGE : v ? LIME : "#1c1c1c"}"/>`;
}).join("");

const stats = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><style>${STYLE}
    .grow{transform-box:fill-box;transform-origin:bottom;animation:g 1.4s cubic-bezier(.2,.9,.2,1) both}@keyframes g{from{transform:scaleY(0)}}
    .pip{animation:pip 1.6s ease-in-out infinite}@keyframes pip{50%{opacity:.2}}
  </style><clipPath id="c"><rect width="${W}" height="${H}" rx="20"/></clipPath></defs>
  <g clip-path="url(#c)">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <text x="40" y="44" class="m" font-size="12" letter-spacing="3" fill="${GRAY}">MACHINE LOG // ${fmt(cal.totalContributions)} CONTRIBUTIONS · 12 MONTHS</text>
  <circle class="pip" cx="${W - 52}" cy="40" r="5" fill="${LIME}"/>
  <text x="${W - 66}" y="44" text-anchor="end" class="m" font-size="12" letter-spacing="3" fill="${LIME}">SYNC ${today}</text>
  ${cellSvg}
  <text x="40" y="238" class="m" font-size="11" letter-spacing="3" fill="${GRAY}">OUTPUT PER WEEK</text>
  <text x="${W - 40}" y="238" text-anchor="end" class="m" font-size="11" letter-spacing="2" fill="${GRAY}">PEAK <tspan fill="${ORANGE}">${peak}</tspan></text>
  <g class="grow">${bars}</g>
  </g>
</svg>
`;

// ---------- project cards : prompt → product ----------
const card = (p, r) => {
  const host = r?.homepageUrl ? r.homepageUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") : `github.com/${LOGIN}/${p.repo}`;
  const isLive = Boolean(r?.homepageUrl);
  const pushed = r ? r.pushedAt.slice(0, 10) : "";
  const promptLen = p.prompt.length;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="250" viewBox="0 0 560 250">
  <defs><style>${STYLE}
    .type{animation:type 2.2s steps(${promptLen}) .3s both}@keyframes type{from{width:0}to{width:500px}}
    .think{opacity:0;animation:th 1s ease 2.5s both}@keyframes th{to{opacity:1}}
    .out{opacity:0;animation:out .6s cubic-bezier(.2,.9,.2,1) 3s both}@keyframes out{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    .d{animation:d 1s ease-in-out infinite}@keyframes d{50%{opacity:.2}}
    .pip{animation:d 1.6s ease-in-out infinite}
  </style>
  <clipPath id="c"><rect width="560" height="250" rx="16"/></clipPath>
  <clipPath id="t"><rect class="type" x="30" y="44" height="30"/></clipPath></defs>
  <g clip-path="url(#c)">
    <rect width="560" height="250" fill="#0d0d0d"/>
    <text x="30" y="34" class="m" font-size="11" letter-spacing="2" fill="${GRAY}">PROMPT ›</text>
    <text x="30" y="64" class="m" font-size="14" fill="${PAPER}" clip-path="url(#t)">“${esc(p.prompt)}”</text>
    <g class="think"><circle class="d" cx="34" cy="96" r="3" fill="${ORANGE}"/><circle class="d" cx="46" cy="96" r="3" fill="${ORANGE}" style="animation-delay:.2s"/><circle class="d" cx="58" cy="96" r="3" fill="${ORANGE}" style="animation-delay:.4s"/>
      <text x="72" y="100" class="m" font-size="11" fill="${ORANGE}">AI building…</text></g>
    <g class="out">
      <rect x="0" y="118" width="560" height="132" fill="${isLive ? LIME : "#1a1a1a"}"/>
      <text x="30" y="146" class="m" font-size="11" font-weight="700" letter-spacing="2" fill="${isLive ? INK : GRAY}">${isLive ? "✓ SHIPPED · LIVE" : "✓ SHIPPED · SOURCE"}</text>
      ${isLive ? `<circle class="pip" cx="536" cy="142" r="5" fill="${INK}"/>` : ""}
      <text x="28" y="196" class="h" font-size="40" letter-spacing="-1.5" fill="${isLive ? INK : PAPER}">${esc(p.title)}</text>
      <text x="30" y="226" class="m" font-size="12" fill="${isLive ? INK : LIME}">${esc(host)} ↗</text>
      <text x="530" y="226" text-anchor="end" class="m" font-size="10" fill="${isLive ? INK : GRAY}" opacity="0.7">${pushed}</text>
    </g>
  </g>
</svg>
`;
};

const outDir = new URL("../assets/", import.meta.url);
mkdirSync(new URL("projects/", outDir), { recursive: true });
writeFileSync(new URL("stats.svg", outDir), stats);
for (const p of PROJECTS) {
  const r = repos.find((x) => x.name.toLowerCase() === p.repo.toLowerCase());
  writeFileSync(new URL(`projects/${p.repo}.svg`, outDir), card(p, r));
}
console.log(`stats: ${cal.totalContributions} contributions, streak ${cur}/${longest}, ${repos.length} repos, ${live} live`);
