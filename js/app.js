/* ═══════════════════════════════════════════════════════════════════
   OTS Ullu — Production App Script
   Modules: Theme · Nav · Reveal · Timeline · Videos · Resources · Dispatches
   ═══════════════════════════════════════════════════════════════════ */

/* ── HERO ROTATION ──────────────────────────────────────────────── */
const HERO_PAIRS = [
  {
    headline: '<span class="hero-headline-plain">Wealth is not a privilege.</span><br/><span class="hero-headline-accent">It is a discipline.</span>',
    mission:  'Wealth is not a privilege granted to a few. It is discipline, and the responsibility to build it is your own. OTS Ullu exists to help you meet that responsibility: we shape the mind first, then do the quiet work behind it, drawing from the world\'s universities, from behavioral finance, market science, geopolitics, and technology, and return it as clear, practical knowledge, freely given, teaching the whole structure rather than the instrument at its peak. This is wisdom earned from nothing and shared without price, offered not as charity, but as duty, so that others may build what was built before them.',
    credit:   'Claude'
  },
  {
    headline: '<span class="hero-headline-plain">Wealth is built through</span><br/><span class="hero-headline-accent">discipline, not privilege.</span>',
    mission:  'Wealth is not a privilege bestowed upon a fortunate few. It is a discipline and a responsibility everyone must learn to carry with clarity, patience, and reason. OTS Ullu exists to shape that discipline: distilling the academic, behavioral, economic, technological, and geopolitical forces that govern markets into practical knowledge that can be understood, applied, and lived. Because derivatives do not exist apart from the world around them; to understand markets is to understand business, society, science, politics, and human behavior itself. This was built from earned experience, offered freely so others may build with the same discipline, independence, and long-term conviction.',
    credit:   'ChatGPT'
  },
  {
    headline: '<span class="hero-headline-plain">Wealth is a discipline,</span><br/><span class="hero-headline-accent">your responsibility to build.</span>',
    mission:  'Wealth is not a privilege bestowed by circumstance; it is a discipline, and each of us bears the responsibility to build it. OTS Ullu exists to support the fulfillment of that responsibility. We shape the investor\'s mindset first through unflinching academic and research rigor, drawing from the highest traditions of university scholarship, behavioral finance, market science, geopolitics, technology, and the broader currents of society, then distill this knowledge into clear, practical, and actionable understanding, offered freely to all. What was built from nothing is now shared as earned wisdom. This is not charity. It is duty.',
    credit:   'Grok'
  },
  {
    headline: '<span class="hero-headline-plain">Wealth is a discipline.</span><br/><span class="hero-headline-accent">We engineer the architecture.</span>',
    mission:  'Wealth is not a privilege; it is a discipline and a deliberate responsibility. True mastery demands an understanding of the entire cascade, from the geopolitical and societal currents that shape business, down to the precise mechanics of equities and derivatives. We honor this reality by distilling complex global research into clear, open wisdom, forging the mindset required to navigate these forces. Once that foundation is set, we engineer the software tools that translate this understanding into systematic execution. Sharing this earned experience is not an act of charity, but a duty to equip those ready to build.',
    credit:   'Gemini'
  },
  {
    headline: '<span class="hero-headline-plain">Wealth is a discipline,</span><br/><span class="hero-headline-accent">and your responsibility to build.</span>',
    mission:  'Wealth is not a privilege; it is a discipline and a responsibility each person must claim for themselves. OTS Ullu exists to help you fulfill that responsibility with clarity and rigor. We shape the mind before the method, distilling the work of academia, behavioral finance, market science, geopolitics, technology, and culture into knowledge that is practical, precise, and freely given. Derivatives sit at the top of a long intellectual cascade, from equities to business, from business to society, from society to the forces that shape it, and we teach that full stack with honesty and depth. This platform was built from nothing, through earned experience, and that wisdom is shared not as charity, but as duty.',
    credit:   'Copilot'
  },
];

function setupHero() {
  const pair = HERO_PAIRS[Math.floor(Math.random() * HERO_PAIRS.length)];
  const h    = document.getElementById('heroHeadline');
  const m    = document.getElementById('heroMission');
  const a    = document.getElementById('heroAttribution');
  if (h) h.innerHTML = pair.headline;
  if (m) m.textContent = pair.mission;
  if (a) a.textContent = 'inspired by ' + pair.credit;
}

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
  { sym: 'Others', contracts:  621 },
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

const MEDIUM_ARTICLES = [
  {
    title: 'The Fallacy of Bitcoin as a Solution to Inflation',
    excerpt: 'A critical examination of the popular narrative that Bitcoin is an effective inflation hedge — and why the data tells a different story.',
    url: 'https://samvishwas.medium.com/the-fallacy-of-bitcoin-as-a-solution-to-inflation-384f820190e9',
  },
  {
    title: 'Unraveling the Intricacies of Business Ecosystems: A Deep Dive into the Robo-Advisor Landscape',
    excerpt: 'How robo-advisors reshaped wealth management — a systems-level analysis of the competitive dynamics, moats, and fragility points in the robo-advisor ecosystem.',
    url: 'https://samvishwas.medium.com/unraveling-the-intricacies-of-business-ecosystems-a-deep-dive-into-the-robo-advisor-landscape-23e34e716784',
  },
  {
    title: 'The UX Problems Facing Blockchain Technology',
    excerpt: 'Mass adoption of blockchain is blocked not by technology but by user experience — an analysis of the friction preventing mainstream uptake.',
    url: 'https://samvishwas.medium.com/the-ux-problems-facing-blockchain-technology-894d1850c1f8',
  },
  {
    title: 'Comparing the Best Layer-1 Blockchain Networks: Bitcoin, Ethereum, Binance, Solana, Cardano and More',
    excerpt: 'A rigorous comparison of the leading Layer-1 blockchains across throughput, decentralisation, security, and ecosystem depth.',
    url: 'https://samvishwas.medium.com/comparing-the-best-layer-1-blockchain-networks-bitcoin-ethereum-binance-solana-cardano-and-de48ad181ced',
  },
];

/* ── PALETTE + CONFIG ───────────────────────────────────────────── */
const PALETTES = [
  { id: 'teal',     name: 'Teal Ledger',    accent: '#0DC9C9' },
  { id: 'gold',     name: 'Gold',           accent: '#FFD700' },
  { id: 'blue',     name: 'Slate Blue',     accent: '#5B8DD6' },
  { id: 'indigo',   name: 'Ink Indigo',     accent: '#7C7CE0' },
  { id: 'forest',   name: 'Forest Capital', accent: '#4FA86B' },
  { id: 'copper',   name: 'Copper',         accent: '#C58A4E' },
  { id: 'burgundy', name: 'Burgundy',       accent: '#C25A6B' },
  { id: 'graphite', name: 'Graphite',       accent: '#9AA0A8' },
  { id: 'cyan',     name: 'Steel Cyan',     accent: '#48B5C4' },
  { id: 'amber',    name: 'Amber Signal',   accent: '#D49A3A' },
];
const VALID_PALETTE_IDS = PALETTES.map(p => p.id);

function setupConfig() {
  const trigger  = document.getElementById('configTrigger');
  const panel    = document.getElementById('configPanel');
  const scrim    = document.getElementById('configScrim');
  const closeBtn = document.getElementById('configClose');
  const grid     = document.getElementById('paletteGrid');
  const nameEl   = document.getElementById('paletteActiveName');
  if (!trigger || !panel) return;

  const html = document.documentElement;

  /* Build palette swatches (excludes the special Ullu button) */
  const activePalette = VALID_PALETTE_IDS.includes(html.getAttribute('data-palette'))
    ? html.getAttribute('data-palette') : 'gold';

  const swatchPalettes = PALETTES.filter(p => p.id !== 'ots' && p.id !== 'ullu');
  if (grid) {
    grid.innerHTML = swatchPalettes.map(p => `
      <button
        class="palette-swatch"
        data-palette-id="${p.id}"
        style="background:${p.accent}"
        aria-label="${p.name}"
        aria-pressed="${p.id === activePalette ? 'true' : 'false'}"
        title="${p.name}"
      ></button>
    `).join('');
  }
  if (nameEl) {
    const active = PALETTES.find(p => p.id === activePalette);
    nameEl.textContent = active ? active.name : '';
  }

  /* Signature buttons */
  const otsBtn  = document.getElementById('otsPaletteBtn');
  const ulluBtn = document.getElementById('ulluPaletteBtn');
  if (otsBtn)  otsBtn.setAttribute('aria-pressed',  activePalette === 'ots'  ? 'true' : 'false');
  if (ulluBtn) ulluBtn.setAttribute('aria-pressed', activePalette === 'ullu' ? 'true' : 'false');

  function syncThemeButtons() {
    const theme = html.getAttribute('data-theme') || 'dark';
    panel.querySelectorAll('.theme-seg-btn').forEach(btn => {
      btn.setAttribute('aria-pressed', btn.dataset.themeSet === theme ? 'true' : 'false');
    });
  }
  syncThemeButtons();

  /* Open / close */
  function openPanel() {
    panel.hidden = false;
    if (scrim) scrim.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    syncThemeButtons();
    const first = panel.querySelector('button:not([hidden])');
    if (first) first.focus();
  }

  function closePanel() {
    panel.hidden = true;
    if (scrim) scrim.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }

  trigger.addEventListener('click', () => panel.hidden ? openPanel() : closePanel());
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
  if (scrim)    scrim.addEventListener('click', closePanel);

  document.addEventListener('pointerdown', (e) => {
    if (panel.hidden) return;
    if (panel.contains(e.target) || trigger.contains(e.target)) return;
    closePanel();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) closePanel();
  });

  /* Theme switching */
  panel.addEventListener('click', (e) => {
    const themeBtn = e.target.closest('[data-theme-set]');
    if (themeBtn) {
      const next = themeBtn.dataset.themeSet;
      html.setAttribute('data-theme', next);
      localStorage.setItem('ots-theme', next);
      syncThemeButtons();
      return;
    }

    /* Palette switching — swatches + Ullu button */
    const swatch = e.target.closest('[data-palette-id]');
    if (swatch) {
      const id = swatch.dataset.paletteId;
      html.setAttribute('data-palette', id);
      localStorage.setItem('ots-palette', id);
      /* Update all swatch buttons */
      if (grid) {
        grid.querySelectorAll('[data-palette-id]').forEach(b => {
          b.setAttribute('aria-pressed', b.dataset.paletteId === id ? 'true' : 'false');
        });
      }
      /* Update signature buttons */
      const otsBtn2  = document.getElementById('otsPaletteBtn');
      const ulluBtn2 = document.getElementById('ulluPaletteBtn');
      if (otsBtn2)  otsBtn2.setAttribute('aria-pressed',  id === 'ots'  ? 'true' : 'false');
      if (ulluBtn2) ulluBtn2.setAttribute('aria-pressed', id === 'ullu' ? 'true' : 'false');
      /* Update active name */
      if (nameEl) {
        const active = PALETTES.find(p => p.id === id);
        nameEl.textContent = active ? (id === 'ullu' ? 'Ullu — Signature Scheme' : active.name) : '';
      }
    }
  });

  /* Roving tabindex on palette swatches */
  if (grid) {
    grid.addEventListener('keydown', (e) => {
      const swatches = [...grid.querySelectorAll('.palette-swatch')];
      const idx = swatches.indexOf(document.activeElement);
      if (idx === -1) return;
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % swatches.length;
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   next = (idx - 1 + swatches.length) % swatches.length;
      if (next !== -1) { e.preventDefault(); swatches[next].focus(); }
    });
  }
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
/* ── FREE LIBRARY ───────────────────────────────────────────────── */
function renderLibrary(data) {
  const FEATURED_PLAYLISTS = ['wealth-academy', 'options-academy', 'knowledge-radar', 'news-radar'];

  /* Featured video — highest views from non-indian-radar playlists */
  const candidates = (data.videos || []).filter(v => v.playlist !== 'indian-radar' && v.playlist !== 'infomercials');
  const featured = candidates.sort((a, b) => parseInt(b.views) - parseInt(a.views))[0];

  const featWrap = document.getElementById('featuredVideo');
  if (featWrap && featured) {
    featWrap.innerHTML = `
      <div class="featured-video">
        <div class="featured-video-embed">
          <iframe
            src="https://www.youtube.com/embed/${featured.id}?rel=0&modestbranding=1"
            title="${featured.title}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy"
          ></iframe>
        </div>
        <div class="featured-video-meta">
          <span class="featured-video-label">Featured</span>
          <h3 class="featured-video-title">${featured.title}</h3>
          <p class="featured-video-stats">${Number(featured.views).toLocaleString()} views &middot; ${featured.published}</p>
          <a href="https://www.youtube.com/watch?v=${featured.id}" target="_blank" rel="noopener" class="featured-video-link">Watch on YouTube</a>
        </div>
      </div>
    `;
  }

  /* Playlist grid — 4 core playlists */
  const playlistGrid = document.getElementById('playlistGrid');
  if (playlistGrid && data.playlists) {
    const toShow = data.playlists.filter(p => FEATURED_PLAYLISTS.includes(p.id));
    playlistGrid.innerHTML = toShow.map(p => `
      <a href="https://www.youtube.com/playlist?list=${p.ytId}" target="_blank" rel="noopener" class="playlist-card">
        <div class="playlist-card-thumb" style="background-image:url('${p.thumb}')">
          <div class="playlist-card-overlay"></div>
          <span class="playlist-card-badge" style="background:${p.color}">${p.label}</span>
        </div>
        <div class="playlist-card-body">
          <p class="playlist-card-desc">${p.desc}</p>
        </div>
      </a>
    `).join('');
  }

  /* Channel stats bar */
  const statsBar = document.getElementById('channelStatsBar');
  if (statsBar) {
    const ch = data.channel   || {};
    const en = data.engagement || {};
    const fmt = n => Number(n || 0).toLocaleString();
    const updated = ch.updated ? new Date(ch.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    const stats = [
      { label: 'Subscribers',     value: fmt(ch.subscribers) },
      { label: 'Total Views',     value: fmt(ch.totalViews)  },
      { label: 'Videos',          value: fmt(ch.videoCount)  },
      { label: 'Likes',           value: fmt(en.totalLikes)  },
      { label: 'Comments',        value: fmt(en.totalComments) },
      { label: 'Engagement Rate', value: (en.engagementRate || 0) + '%' },
    ];

    statsBar.innerHTML = `
      <div class="yt-stats-grid">
        ${stats.map(s => `
          <div class="yt-stat">
            <span class="yt-stat-value">${s.value}</span>
            <span class="yt-stat-label">${s.label}</span>
          </div>
        `).join('')}
      </div>
      ${updated ? `<p class="yt-stats-updated">Data refreshed ${updated}</p>` : ''}
    `;
  }
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

/* ── PDF SHELF LOADER ───────────────────────────────────────────── */
const AGI_PDF_ID = 'agi-blueprint';
const WM_PDF_ID  = 'wealth-mgmt-tech-trends';

function renderShelfPdfs(pdfs, baseUrl) {
  let list = [...pdfs];
  const hasAgi = list.some(p => p.id === AGI_PDF_ID);
  const hasWm  = list.some(p => p.id === WM_PDF_ID);
  if (hasAgi && hasWm) {
    const drop = Math.random() < 0.5 ? AGI_PDF_ID : WM_PDF_ID;
    list = list.filter(p => p.id !== drop);
  }
  return list.map(pdf => {
    const url  = baseUrl + encodeURIComponent(pdf.file);
    const tags = (pdf.tags || []).map(t => `<span class="pdf-tag">${t}</span>`).join('');
    return `
      <a href="${url}" class="resource-card resource-card-pdf reveal-up" target="_blank" rel="noopener noreferrer" aria-label="${pdf.title}">
        <div class="resource-card-pdf-top">
          <span class="resource-type-badge badge-pdf">PDF</span>
          ${pdf.featured ? '<span class="resource-featured-badge">Featured</span>' : ''}
        </div>
        <p class="resource-title">${pdf.title}</p>
        <p class="resource-desc">${pdf.description}</p>
        <div class="pdf-tags">${tags}</div>
        <div class="resource-meta">
          <span class="resource-dot"></span>
          ${pdf.date}
        </div>
      </a>
    `;
  }).join('');
}

function loadShelf() {
  fetch('data/pdfs.json')
    .then(r => r.json())
    .then(data => {
      const grid = document.getElementById('resourceGrid');
      if (!grid) return;
      const pdfHtml = renderShelfPdfs(data.pdfs || [], data.baseUrl || '');
      grid.insertAdjacentHTML('afterbegin', pdfHtml);
      requestAnimationFrame(() => setupReveal());
    })
    .catch(() => {});
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

  const mediumPick = MEDIUM_ARTICLES[Math.floor(Math.random() * MEDIUM_ARTICLES.length)];

  const mediumCard = `
    <article class="dispatch-card dispatch-card-live reveal-up">
      <div class="dispatch-left">
        <span class="dispatch-source-badge">Medium · Sam Vishwas</span>
        <h3 class="dispatch-title">${mediumPick.title}</h3>
        <p class="dispatch-excerpt">${mediumPick.excerpt}</p>
      </div>
      <div class="dispatch-right">
        <a href="${mediumPick.url}" target="_blank" rel="noopener noreferrer" class="dispatch-read-link">Read →</a>
      </div>
    </article>
  `;

  const comingSoonCards = DISPATCH_DATA.map((d) => `
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

  feed.innerHTML = mediumCard + comingSoonCards;
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
    .catch(() => {});
}

function loadLibrary() {
  fetch('data/videos.json')
    .then(r => r.json())
    .then(renderLibrary)
    .catch(() => {});
}

/* ── INIT ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setupHero();
  setupConfig();
  setupNav();
  setupReveal();
  renderTimeline();
  renderTickers();
  loadLibrary();
  renderResources();
  loadShelf();
  renderDispatches();
  renderFounderQuote();
  setFooterYear();
  loadStats();

  // Re-run reveal after dynamic content is injected
  requestAnimationFrame(() => setupReveal());
});
