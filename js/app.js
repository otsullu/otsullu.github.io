/* ═══════════════════════════════════════════════════════════════════
   OTS Ullu — Production App Script
   Modules: Theme · Nav · Reveal · Timeline · Videos · Resources · Dispatches
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ── MOCK DATA ──────────────────────────────────────────────────── */

const TIMELINE_DATA = [
  {
    date: 'Jun 25, 2025',
    title: 'Reactivated — First Covered Call Placed',
    desc: 'The origin trade that restarted a decades-long options journey and triggered the entire system build.',
    live: false,
  },
  {
    date: 'Jun – Dec 2025',
    title: 'Manual Phase: Spreadsheet Engine',
    desc: 'All trade data collected manually via file exports from eTrade and Fidelity. Core workflow established on spreadsheets.',
    live: false,
  },
  {
    date: 'Jan – Feb 2026',
    title: 'Broker Feed Normalization',
    desc: 'Resolved Fidelity feed gaps (missing transaction IDs, format inconsistencies, and rounding errors) via custom normalization logic.',
    live: false,
  },
  {
    date: 'Feb – Mar 2026',
    title: 'Roll Chaining Algorithm — Solved',
    desc: 'Split and batched order executions broke trade lineage. The chaining problem, which all available AI tools were unable to solve, was resolved through first-principles database engineering.',
    live: false,
  },
  {
    date: 'Apr 2026',
    title: 'POC "Equity Market" — Live',
    desc: 'First operational system deployed. Running production workload — the core engine processing real trade data end-to-end.',
    live: false,
  },
  {
    date: 'Apr 2026',
    title: 'Pushover Notification Integration',
    desc: 'Real-time push notifications integrated into the trade workflow. Alerts delivered at key trade events without manual monitoring.',
    live: false,
  },
  {
    date: 'May 2026',
    title: 'Proprietary Charts, Graphs & Recommendation Engine',
    desc: 'Bespoke visualisations and a proprietary analytics engine built with AI assistance. Recommendation engine launched covering MVP-1\'s two core strategies.',
    live: false,
  },
  {
    date: 'May 2026',
    title: 'MVP-1 Live: Short Covered Call and Short Cash-Secured Put',
    desc: 'Short Covered Call: retain the underlying stock and maximise premium income in minimum time. Short Cash-Secured Put: avoid assignment and collect maximum premium.',
    live: true,
  },
  {
    date: 'MVP-2 — Roadmap',
    title: 'Next: Fine-Tune, Logarithmic Scale & Wheel',
    desc: 'Refine recommendation engine with expanded parameters, replace linear with logarithmic scale, and begin Wheel Strategy integration.',
    live: false,
  },
];


const TICKER_DATA = [
  { sym: 'TSLA',  contracts: 3311 },
  { sym: 'NVDA',  contracts: 1068 },
  { sym: 'COIN',  contracts:  872 },
  { sym: 'PLTR',  contracts:  703 },
  { sym: 'META',  contracts:  511 },
  { sym: 'AMZN',  contracts:  495 },
  { sym: 'GOOGL', contracts:  430 },
  { sym: 'MSFT',  contracts:  417 },
  { sym: 'QQQ',   contracts:  196 },
  { sym: 'AAPL',  contracts:  137 },
  { sym: 'Others', contracts:  613 },
];

const VIDEO_DATA = [
  { id: 'o-1VRq2GCmo', lang: 'Bengali',   title: 'Indian Stock Market Basics — Bengali' },
  { id: 'sR4cDLvJIhc', lang: 'English',   title: 'Indian Stock Market Basics — English' },
  { id: '0kDb7Qnjx9E', lang: 'Gujarati',  title: 'Indian Stock Market Basics — Gujarati' },
  { id: 'NbVIdEArUDM', lang: 'Hindi',     title: 'Indian Stock Market Basics — Hindi' },
  { id: 'LGLo30W4-MA', lang: 'Kannada',   title: 'Indian Stock Market Basics — Kannada' },
  { id: 'S0eSn_aS0P0', lang: 'Malayalam', title: 'Indian Stock Market Basics — Malayalam' },
  { id: '1WX3uf99VH4', lang: 'Marathi',   title: 'Indian Stock Market Basics — Marathi' },
  { id: 'vwz0cZ4KmOI', lang: 'Odia',      title: 'Indian Stock Market Basics — Odia' },
  { id: 'gcKGy-36_qQ', lang: 'Punjabi',   title: 'Indian Stock Market Basics — Punjabi' },
  { id: 'jrDLWNBTyqQ', lang: 'Tamil',     title: 'Indian Stock Market Basics — Tamil' },
  { id: 'NKA6Jtmu11g', lang: 'Telugu',    title: 'Indian Stock Market Basics — Telugu' },
  { id: 'uiLuxb33jZ0', lang: 'Urdu',      title: 'Indian Stock Market Basics — Urdu' },
];

const RESOURCE_DATA = [
  {
    type: 'TOOL',
    title: "Dhurandhar's Dilemma: Payoff vs. Invest",
    desc: 'Compare mortgage prepayment against market investment with inflation-adjusted projections, real versus nominal returns, and live benchmark data. Runs entirely in your browser.',
    readTime: 'Interactive',
    url: 'https://fintech.samvishwas.com/Calculators/payoff-vs-invest.html',
    contributor: 'Sam Vishwas, Founder',
  },
  {
    type: 'PDF',
    title: 'Magnificent 7: Economic Moats and Competitive Advantages',
    readTime: '12 min read',
    comingSoon: true,
  },
  {
    type: 'PPT',
    title: 'Covered Call Mechanics: Strike Selection Framework',
    readTime: '8 min read',
    comingSoon: true,
  },
  {
    type: 'PDF',
    title: 'Wheel Strategy Playbook: Entry, Management and Exit Rules',
    readTime: '18 min read',
    comingSoon: true,
  },
  {
    type: 'XLS',
    title: 'Options Premium Income Calculator: Monthly Yield Tracker',
    readTime: 'Interactive',
    comingSoon: true,
  },
  {
    type: 'PDF',
    title: 'Behavioural Finance: 12 Cognitive Biases Costing You Returns',
    readTime: '15 min read',
    comingSoon: true,
  },
  {
    type: 'PPT',
    title: 'Cash-Secured Put Strategy: IV Rank and Delta Entry Matrix',
    readTime: '10 min read',
    comingSoon: true,
  },
  {
    type: 'SOON',
    title: 'Position Canvas: Your Strategy in Two and Three Dimensions',
    desc: 'Visualize every open position across two and three dimensions. Validate your strategy, feel the Greeks in motion, and explore outcomes using advanced charting and visualization techniques.',
    readTime: 'Coming Soon',
    comingSoon: true,
  },
];

const FOUNDER_QUOTES = [
  'Compounding builds wealth; derivatives, when mastered, reveal the deeper rhythm of financial growth, where logic meets imagination.',
  'Diversification matters, but early portfolios often grow faster when one strong equity, amplified smartly through derivatives, takes center stage instead of being spread too thin.',
  'We\'re often so busy minting pennies that we forget to pause and explore the paths that could make us dollars.',
  'Success has no map; it appears to those who walk the unknown with purpose.',
];

const DISPATCH_DATA = [
  {
    title: 'Why the Wheel Strategy Outperforms Buy-and-Hold in Sideways Markets',
    excerpt: 'A quantitative examination of risk-adjusted returns across three market regimes, with a focus on theta decay harvesting and systematic roll logic.',
  },
  {
    title: 'The IV Rank Illusion: What Most Options Traders Get Wrong',
    excerpt: 'Implied volatility rank is widely misused. We unpack why raw IV percentile is more actionable than IV rank for premium-selling strategies.',
  },
  {
    title: 'Covered Calls on ETFs vs. Individual Stocks: A Risk-Adjusted Analysis',
    excerpt: 'Diversified underlying vs. concentrated single-stock exposure in covered call writing. The data reveals a counterintuitive result for income investors.',
  },
];

/* ── THEME ──────────────────────────────────────────────────────── */
(function initTheme() {
  const stored = localStorage.getItem('ots-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = stored || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

function setupThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('ots-theme', next);
  });
}

/* ── AUTO-HIDE NAV ──────────────────────────────────────────────── */
function setupNav() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  let lastY = 0;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;

    if (y > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    if (y > lastY && y > 80) {
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }

    lastY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
}

/* ── INTERSECTION REVEAL ────────────────────────────────────────── */
function setupReveal() {
  const els = document.querySelectorAll('.reveal-up');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  els.forEach((el) => observer.observe(el));
}

/* ── ENGINEERING TIMELINE ───────────────────────────────────────── */
function renderTimeline() {
  const container = document.getElementById('engineeringTimeline');
  if (!container) return;

  const html = TIMELINE_DATA.map((item, i) => {
    const isLive = item.live;
    return `
      <div class="timeline-item${isLive ? ' is-live' : ''}">
        <div class="timeline-date">${item.date}</div>
        <div class="timeline-title">${item.title}</div>
        <div class="timeline-desc">${item.desc}</div>
        ${isLive ? `
          <div class="timeline-live-panel">
            <span class="live-dot"></span>
            Now Building
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

/* ── TICKER SHELF ───────────────────────────────────────────────── */
function renderTickers() {
  const list = document.getElementById('tickerList');
  if (!list) return;

  list.innerHTML = TICKER_DATA.map((t) => {
    const isOther = t.sym === 'Others';
    const inner = `
      <span class="ticker-sym">${t.sym}</span>
      <span class="ticker-contracts">${t.contracts.toLocaleString()} contracts</span>
    `;
    if (isOther) {
      return `<div class="ticker-chip ticker-chip-other">${inner}</div>`;
    }
    return `<a
      class="ticker-chip ticker-chip-link"
      href="https://finance.yahoo.com/quote/${t.sym}"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="${t.sym} on Yahoo Finance"
    >${inner}</a>`;
  }).join('');
}


/* ── INDIAN RADAR CAROUSEL ──────────────────────────────────────── */
function renderVideoCarousel(filter = 'all') {
  const carousel = document.getElementById('videoCarousel');
  if (!carousel) return;

  const filtered = filter === 'all'
    ? VIDEO_DATA
    : VIDEO_DATA.filter((v) => v.lang === filter);

  const html = filtered.map((v) => `
    <a
      href="https://www.youtube.com/watch?v=${v.id}"
      target="_blank"
      rel="noopener noreferrer"
      class="video-card"
      aria-label="Watch ${v.title} on YouTube"
    >
      <img
        src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg"
        alt="${v.title}"
        loading="lazy"
        width="480"
        height="360"
      />
      <div class="video-card-overlay">
        <div class="video-lang-badge">${v.lang}</div>
        <div class="video-play-btn" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </div>
        <p class="video-card-title">${v.title}</p>
      </div>
    </a>
  `).join('');

  carousel.innerHTML = html || '<p style="color:var(--fg-meta);padding:20px 0;">No videos for this filter.</p>';
}

function setupLangFilter() {
  const filter = document.getElementById('langFilter');
  if (!filter) return;

  filter.addEventListener('click', (e) => {
    const pill = e.target.closest('.lang-pill');
    if (!pill) return;

    filter.querySelectorAll('.lang-pill').forEach((p) => {
      p.classList.remove('active');
      p.setAttribute('aria-selected', 'false');
    });

    pill.classList.add('active');
    pill.setAttribute('aria-selected', 'true');
    renderVideoCarousel(pill.dataset.lang);
  });
}

/* ── INSIGHT SHELF ──────────────────────────────────────────────── */
function renderResources() {
  const grid = document.getElementById('resourceGrid');
  if (!grid) return;

  const html = RESOURCE_DATA.map((r) => {
    if (r.comingSoon) {
      const badgeLabel = r.type === 'SOON' ? 'SOON' : 'PLACEHOLDER';
      return `
        <div class="resource-card resource-card-soon reveal-up" onclick="showResourceNotice(this)" role="button" tabindex="0" aria-label="${r.title} — Coming Soon">
          <div class="resource-card-soon-header">
            <span class="resource-type-badge badge-${r.type.toLowerCase()}">${r.type}</span>
            <span class="resource-placeholder-label">${badgeLabel}</span>
          </div>
          <p class="resource-title">${r.title}</p>
          ${r.desc ? `<p class="resource-desc">${r.desc}</p>` : ''}
          <div class="resource-meta">
            <span class="resource-dot"></span>
            ${r.readTime}
          </div>
        </div>
      `;
    }
    const isExternal = r.url && r.url !== '#';
    const attrs = isExternal ? `target="_blank" rel="noopener noreferrer"` : '';
    return `
      <a href="${r.url}" class="resource-card${r.contributor ? ' resource-card-contributed' : ''} reveal-up" ${attrs} aria-label="${r.title}">
        <span class="resource-type-badge badge-${r.type.toLowerCase()}">${r.type}</span>
        <p class="resource-title">${r.title}</p>
        ${r.desc ? `<p class="resource-desc">${r.desc}</p>` : ''}
        <div class="resource-meta">
          <span class="resource-dot"></span>
          ${r.readTime}
        </div>
        ${r.contributor ? `<div class="resource-contributor">Contributed by ${r.contributor}</div>` : ''}
      </a>
    `;
  }).join('');

  grid.innerHTML = html;
}

function showResourceNotice(el) {
  if (el.dataset.active) return;
  el.dataset.active = 'true';
  const meta = el.querySelector('.resource-meta');
  const original = meta.innerHTML;
  meta.innerHTML = '<span style="color:var(--accent)">We are building this. Thank you for your interest.</span>';
  setTimeout(() => {
    meta.innerHTML = original;
    delete el.dataset.active;
  }, 3000);
}

/* ── ANALYTICAL DISPATCHES ──────────────────────────────────────── */
function renderDispatches() {
  const feed = document.getElementById('dispatchFeed');
  if (!feed) return;

  const html = DISPATCH_DATA.map((d) => `
    <article class="dispatch-card reveal-up">
      <div class="dispatch-left">
        <h3 class="dispatch-title">${d.title}</h3>
        <p class="dispatch-excerpt">${d.excerpt}</p>
      </div>
      <div class="dispatch-right">
        <button class="dispatch-coming-soon" onclick="showDispatchNotice(this)" type="button">
          Coming Soon
        </button>
      </div>
    </article>
  `).join('');

  feed.innerHTML = html;
}

function showDispatchNotice(btn) {
  if (btn.dataset.active) return;
  btn.dataset.active = 'true';
  const original = btn.textContent;
  btn.textContent = 'We are working on this. Thank you for your interest.';
  btn.classList.add('dispatch-notice-active');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('dispatch-notice-active');
    delete btn.dataset.active;
  }, 3000);
}

/* ── FOUNDER QUOTE STRIP ────────────────────────────────────────── */
function renderFounderQuote() {
  const el = document.getElementById('founderQuote');
  if (!el) return;
  const quote = FOUNDER_QUOTES[Math.floor(Math.random() * FOUNDER_QUOTES.length)];
  el.querySelector('.fq-text').textContent = '“' + quote + '”';
}

/* ── FOOTER YEAR ────────────────────────────────────────────────── */
function setFooterYear() {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
}

/* ── STATS FROM JSON ────────────────────────────────────────────── */
function applyStats(s) {
  const t = s.trade;
  const v = s.surveillance;

  /* stat bar */
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('statContracts',    Number(t.contracts).toLocaleString());
  set('statTransactions', Number(t.transactions).toLocaleString());
  set('statUnderlyings',  t.underlyings);
  set('statAccounts',     t.accounts);

  /* strategy split */
  const total = t.ccContracts + t.cspContracts;
  const ccPct  = Math.round((t.ccContracts  / total) * 100);
  const cspPct = 100 - ccPct;
  const ccBar  = document.querySelector('.split-bar-cc');
  const cspBar = document.querySelector('.split-bar-csp');
  if (ccBar)  { ccBar.style.width  = ccPct  + '%'; ccBar.closest('.split-item').querySelector('.split-pct').textContent  = ccPct  + '%'; ccBar.closest('.split-item').querySelector('.split-sub').textContent  = Number(t.ccContracts).toLocaleString()  + ' contracts'; }
  if (cspBar) { cspBar.style.width = cspPct + '%'; cspBar.closest('.split-item').querySelector('.split-pct').textContent = cspPct + '%'; cspBar.closest('.split-item').querySelector('.split-sub').textContent = Number(t.cspContracts).toLocaleString() + ' contracts'; }

  /* velocity stats */
  const velNums = document.querySelectorAll('.vel-num');
  if (velNums.length >= 4) {
    velNums[0].textContent = t.avgEventsPerDay + '+';
    velNums[1].textContent = t.peakEventsPerDay;
    velNums[2].textContent = t.tradingDays;
  }

  /* tickers */
  const others = t.contracts - t.topTickers.reduce((a, x) => a + x.contracts, 0);
  TICKER_DATA.length = 0;
  t.topTickers.forEach(x => TICKER_DATA.push(x));
  TICKER_DATA.push({ sym: 'Others', contracts: others });
  renderTickers();

  /* surveillance stats */
  const survNums = document.querySelectorAll('.surv-num');
  if (survNums.length >= 6) {
    survNums[0].textContent = Number(v.rowsPerCycle).toLocaleString();
    survNums[1].textContent = v.fieldsTracked;
    survNums[2].textContent = Math.round(v.evaluationsPerCycle / 1000) + 'K';
    survNums[3].textContent = Math.round(v.evaluationsPerDay / 1000000) + 'M';
    survNums[4].textContent = v.cyclesPerDay;
    survNums[5].textContent = v.dataStreams;
  }
}

function loadStats() {
  fetch('data/stats.json')
    .then(r => r.json())
    .then(applyStats)
    .catch(() => { /* silently keep hardcoded fallback values */ });
}

/* ── INIT ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  setupNav();
  setupReveal();
  renderTimeline();
  renderTickers();
  renderVideoCarousel();
  setupLangFilter();
  renderResources();
  renderDispatches();
  renderFounderQuote();
  setFooterYear();
  loadStats();

  // Re-run reveal after dynamic content is injected
  requestAnimationFrame(() => setupReveal());
});
