// Builds assets/stats.svg and assets/projects/*.svg from the GitHub GraphQL API.
// Run: GITHUB_TOKEN=xxx node scripts/build-stats.mjs   (GitHub Actions runs it daily)
import { writeFileSync, mkdirSync } from "node:fs";

const LOGIN = process.env.PROFILE_LOGIN || "Bankkyz";
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error("GITHUB_TOKEN is required");

// Repos shown as project cards (in order). tag = short label on the card.
const PROJECTS = [
  { repo: "burger-pos", title: "Burger POS", tag: "POS System" },
  { repo: "Narai_shop", title: "Narai Shop", tag: "E-commerce" },
  { repo: "promediafx-portfolio", title: "ProMediaFX", tag: "Portfolio" },
  { repo: "Love-Memory", title: "Love Memory", tag: "Interactive" },
];

const LANG_COLORS = { TypeScript: "#3178c6", JavaScript: "#f7df1e", HTML: "#e34f26", CSS: "#a78bfa", Java: "#b07219", Python: "#3572a5" };
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (n) => n.toLocaleString("en-US");

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
  createdAt
  followers{totalCount}
  repositories(first:100, ownerAffiliations:OWNER, privacy:PUBLIC, isFork:false, orderBy:{field:PUSHED_AT,direction:DESC}){
    totalCount
    nodes{ name stargazerCount pushedAt description homepageUrl primaryLanguage{name}
      languages(first:10, orderBy:{field:SIZE,direction:DESC}){ edges{ size node{ name color } } } }
  }
  contributionsCollection{
    totalCommitContributions totalPullRequestContributions totalIssueContributions
    contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } }
  }
}}`, { login: LOGIN });

const u = data.user;
const repos = u.repositories.nodes;
const cal = u.contributionsCollection.contributionCalendar;
const days = cal.weeks.flatMap((w) => w.contributionDays);
const stars = repos.reduce((s, r) => s + r.stargazerCount, 0);

// streaks
let cur = 0, longest = 0, run = 0;
for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
for (let i = days.length - 1; i >= 0; i--) {
  if (days[i].contributionCount > 0) cur++;
  else if (i === days.length - 1) continue; // today may be empty yet
  else break;
}

// languages by size
const langs = {};
for (const r of repos) for (const e of r.languages.edges) {
  langs[e.node.name] = langs[e.node.name] || { size: 0, color: e.node.color };
  langs[e.node.name].size += e.size;
}
const totalSize = Object.values(langs).reduce((s, l) => s + l.size, 0) || 1;
const topLangs = Object.entries(langs).sort((a, b) => b[1].size - a[1].size).slice(0, 5)
  .map(([name, l]) => ({ name, pct: (l.size / totalSize) * 100, color: LANG_COLORS[name] || l.color || "#94a3b8" }));

// weekly activity line
const weekly = cal.weeks.map((w) => w.contributionDays.reduce((s, d) => s + d.contributionCount, 0));
const peak = Math.max(1, ...weekly);
const today = new Date().toISOString().slice(0, 10);

// ---------- stats.svg ----------
const W = 1200, H = 400;
const cx = 600, cy = 150, R = 66;
const ringLen = 2 * Math.PI * R;
const ringPct = longest ? Math.min(1, cur / longest) : 0;

const chartX = 60, chartY = 290, chartW = 1080, chartH = 70;
const pts = weekly.map((v, i) => [chartX + (i / Math.max(1, weekly.length - 1)) * chartW, chartY + chartH - (v / peak) * chartH]);
const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
const area = `${line} L${chartX + chartW} ${chartY + chartH} L${chartX} ${chartY + chartH} Z`;

const tile = (x, y, label, value, color) => `
  <rect x="${x}" y="${y}" width="170" height="54" rx="10" fill="#0f1529" stroke="#1e293b"/>
  <rect x="${x}" y="${y + 10}" width="3" height="34" rx="1.5" fill="${color}"/>
  <text x="${x + 16}" y="${y + 21}" class="mono" font-size="9" letter-spacing="2" fill="#64748b">${label}</text>
  <text x="${x + 16}" y="${y + 44}" class="sans" font-size="20" font-weight="800" fill="${color}">${value}</text>`;

const langRows = topLangs.map((l, i) => {
  const y = 64 + i * 34;
  return `<text x="820" y="${y + 4}" class="sans" font-size="14" font-weight="700" fill="#e2e8f0">${esc(l.name)}</text>
  <rect x="930" y="${y - 5}" width="160" height="8" rx="4" fill="#1e293b"/>
  <rect class="grow" x="930" y="${y - 5}" width="${Math.max(4, (l.pct / 100) * 160).toFixed(1)}" height="8" rx="4" fill="${l.color}" style="animation-delay:${i * 0.12}s"/>
  <text x="1140" y="${y + 4}" text-anchor="end" class="mono" font-size="12" fill="#cbd5e1">${l.pct.toFixed(1)}%</text>`;
}).join("");

const stats = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5eead4"/><stop offset="0.5" stop-color="#a78bfa"/><stop offset="1" stop-color="#fbbf24"/></linearGradient>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a78bfa" stop-opacity="0.35"/><stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></linearGradient>
    <style>
      .mono{font-family:'JetBrains Mono','Cascadia Code',Consolas,monospace}
      .sans{font-family:'Segoe UI','Inter',Arial,sans-serif}
      .grow{transform-box:fill-box;transform-origin:left;animation:grow 1.2s cubic-bezier(.2,.8,.2,1) both}
      @keyframes grow{from{transform:scaleX(0)}}
      .ring{animation:ring 1.6s cubic-bezier(.2,.8,.2,1) both}
      @keyframes ring{from{stroke-dashoffset:${ringLen.toFixed(1)}}}
      .draw{stroke-dasharray:3000;animation:draw 2.4s ease-out both}
      @keyframes draw{from{stroke-dashoffset:3000}}
      .fade{animation:fade 1.5s ease .8s both}@keyframes fade{from{opacity:0}}
    </style>
  </defs>
  <rect width="${W}" height="${H}" rx="18" fill="#080b16"/>
  <g stroke="#5eead4" stroke-width="2" fill="none" opacity="0.7"><path d="M20 40 V20 H40"/><path d="M1160 20 H1180 V40"/><path d="M20 360 V380 H40"/><path d="M1160 380 H1180 V360"/></g>

  <text x="60" y="52" class="mono" font-size="10" letter-spacing="3" fill="#64748b">CONTRIBUTIONS · LAST 12 MONTHS</text>
  <text x="58" y="112" class="sans" font-size="62" font-weight="900" fill="url(#g)">${fmt(cal.totalContributions)}</text>
  ${tile(60, 140, "COMMITS", fmt(u.contributionsCollection.totalCommitContributions), "#5eead4")}
  ${tile(242, 140, "PULL REQUESTS", fmt(u.contributionsCollection.totalPullRequestContributions), "#fb7185")}
  ${tile(60, 202, "PUBLIC REPOS", fmt(u.repositories.totalCount), "#a78bfa")}
  ${tile(242, 202, "STARS EARNED", fmt(stars), "#fbbf24")}

  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#1e293b" stroke-width="10"/>
  <circle class="ring" cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="url(#g)" stroke-width="10" stroke-linecap="round"
    stroke-dasharray="${(ringLen * Math.max(0.02, ringPct)).toFixed(1)} ${ringLen.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>
  <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="sans" font-size="44" font-weight="900" fill="#e0e7ff">${cur}</text>
  <text x="${cx}" y="${cy + 36}" text-anchor="middle" class="mono" font-size="9" letter-spacing="3" fill="#94a3b8">DAY STREAK</text>
  <text x="${cx}" y="${cy + 100}" text-anchor="middle" class="mono" font-size="11" fill="#94a3b8">LONGEST <tspan fill="#fb7185">${longest}</tspan> · SYNC ${today}</text>

  <text x="820" y="36" class="mono" font-size="10" letter-spacing="3" fill="#64748b">TOP LANGUAGES · BY CODE SIZE</text>
  ${langRows}

  <text x="60" y="280" class="mono" font-size="10" letter-spacing="3" fill="#64748b">ACTIVITY · ${weekly.length} WEEKS</text>
  <text x="1140" y="280" text-anchor="end" class="mono" font-size="10" letter-spacing="2" fill="#64748b">PEAK <tspan fill="#fbbf24">${peak}</tspan> / WEEK</text>
  <path class="fade" d="${area}" fill="url(#fill)"/>
  <path class="draw" d="${line}" fill="none" stroke="url(#g)" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="#a78bfa" stroke-opacity="0.3"/>
</svg>
`;

// ---------- project cards ----------
const card = (p, r) => {
  const langs = (r?.languages.edges || []).slice(0, 3).map((e) => e.node.name);
  const host = r?.homepageUrl ? r.homepageUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") : `github.com/${LOGIN}/${p.repo}`;
  const live = Boolean(r?.homepageUrl);
  const pushed = r ? r.pushedAt.slice(0, 10) : "";
  const pills = [p.tag, ...langs].slice(0, 3);
  let px = 28;
  const pillSvg = pills.map((t, i) => {
    const w = t.length * 7.4 + 22;
    const c = i === 0 ? "#fbbf24" : "#5eead4";
    const s = `<rect x="${px}" y="150" width="${w}" height="24" rx="12" fill="${c}" fill-opacity="0.08" stroke="${c}" stroke-opacity="0.5"/>
      <text x="${px + w / 2}" y="166" text-anchor="middle" class="mono" font-size="11" fill="${c}">${esc(t)}</text>`;
    px += w + 8;
    return s;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="210" viewBox="0 0 560 210">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5eead4"/><stop offset="0.5" stop-color="#a78bfa"/><stop offset="1" stop-color="#fbbf24"/></linearGradient>
    <radialGradient id="o" cx="1" cy="0" r="0.9"><stop offset="0" stop-color="#7c3aed" stop-opacity="0.35"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <style>
      .mono{font-family:'JetBrains Mono','Cascadia Code',Consolas,monospace}
      .sans{font-family:'Segoe UI','Inter',Arial,sans-serif}
      .p{animation:p 2s ease-in-out infinite}@keyframes p{50%{opacity:.25}}
      .sweep{animation:sw 3.5s ease-in-out infinite}@keyframes sw{from{transform:translateX(-200px)}to{transform:translateX(760px)}}
    </style>
    <clipPath id="c"><rect width="560" height="210" rx="16"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="560" height="210" fill="#0b1020"/>
    <rect width="560" height="210" fill="url(#o)"/>
    <rect class="sweep" x="0" y="0" width="120" height="3" fill="url(#g)"/>
  </g>
  <rect x="0.5" y="0.5" width="559" height="209" rx="16" fill="none" stroke="#a78bfa" stroke-opacity="0.35"/>
  ${live ? `<rect x="28" y="26" width="76" height="22" rx="11" fill="#34d399" fill-opacity="0.1" stroke="#34d399" stroke-opacity="0.6"/>
  <circle class="p" cx="42" cy="37" r="3.5" fill="#34d399"/><text x="52" y="41" class="mono" font-size="10" letter-spacing="2" fill="#34d399">LIVE</text>`
  : `<rect x="28" y="26" width="80" height="22" rx="11" fill="#94a3b8" fill-opacity="0.08" stroke="#94a3b8" stroke-opacity="0.4"/>
  <text x="68" y="41" text-anchor="middle" class="mono" font-size="10" letter-spacing="2" fill="#94a3b8">SOURCE</text>`}
  <text x="532" y="41" text-anchor="end" class="mono" font-size="10" fill="#64748b">${pushed ? "updated " + pushed : ""}</text>
  <text x="28" y="98" class="sans" font-size="34" font-weight="900" fill="#f1f5f9">${esc(p.title)}</text>
  <text x="28" y="126" class="mono" font-size="12" fill="#a78bfa">${esc(host)} ↗</text>
  ${pillSvg}
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
console.log(`stats: ${cal.totalContributions} contributions, streak ${cur}/${longest}, ${repos.length} repos`);
