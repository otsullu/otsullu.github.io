/* OTS Ullu — Main App JS
   Handles: data loading, geo-detection, video grid, search, filters, modal,
            autoplay strip, featured-today section, playlist cards
*/

const CHANNEL_URL = 'https://www.youtube.com/@otsullu';
const PAGE_SIZE = 12;

let allVideos    = [];
let allPlaylists = [];
let filteredVideos = [];
const shownIds = new Set();   // global dedup — no video appears in two sections
let displayedCount = 0;
let activePlaylist = 'all';
let isIndia = false;

// ── Bootstrap ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initModal();
  initSlideVideo();
  initCarouselStatic();   // start carousel immediately with static slides
  await loadData();        // then enrich with dynamic slides + data
  detectGeo();
  initSearch();
  initFilters();
  updateFooter();
});

// ── Data Loading ───────────────────────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch('data/videos.json?v=' + Date.now());
    const data = await res.json();
    allVideos    = data.videos   || [];
    allPlaylists = data.playlists || [];
    filteredVideos = [...allVideos];

    document.getElementById('stat-videos').textContent    = allVideos.length + '+';
    document.getElementById('stat-playlists').textContent = allPlaylists.length;

    if (data.channel?.updated) {
      const d = new Date(data.channel.updated);
      document.getElementById('stat-updated').textContent =
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    buildCarousel();
    renderPlaylistCards();
    renderFeaturedToday();
    launchAutoplay();
    prioritiseArchive();
    setSmartDefaultFilter();
    renderVideoGrid(true);
  } catch (e) {
    console.warn('Failed to load videos.json', e);
    document.getElementById('videoGrid').innerHTML =
      '<p style="color:var(--text-muted);text-align:center;padding:40px">Videos loading…</p>';
  }
}

// ── Geo Detection ──────────────────────────────────────────────────────────
async function detectGeo() {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const geo = await res.json();
    isIndia = (geo.country_code === 'IN');
  } catch (_) {
    // fallback: detect from browser language
    const lang = navigator.language || navigator.userLanguage || '';
    isIndia = lang.startsWith('hi') || lang.startsWith('ta') || lang.startsWith('te') ||
              lang.startsWith('mr') || lang.startsWith('gu') || lang.startsWith('kn') ||
              lang.startsWith('ml') || lang.startsWith('pa') || lang.startsWith('bn');
  }
  applyGeo();
}

function applyGeo() {
  const ctaHead   = document.getElementById('cta-headline');
  const ctaSub    = document.getElementById('cta-sub');
  const spotlight = document.getElementById('geo-spotlight');

  if (isIndia) {
    if (ctaHead) ctaHead.textContent = 'Subscribe to Build Wisdom, Not Chase Tips';
    if (ctaSub)  ctaSub.textContent  = 'Frameworks, principles & research-backed insights — Hindi, Marathi, Tamil, Telugu, Gujarati, Kannada and more.';
    // Auto-advance carousel to Indian Radar slide (slide index 1)
    setTimeout(() => goToSlide(1), 1200);
    if (spotlight) spotlight.style.display = 'none';
  } else {
    if (ctaHead) ctaHead.textContent = 'Subscribe to Build Wisdom, Not Chase Tips';
    if (ctaSub)  ctaSub.textContent  = 'Frameworks, principles, and research-backed guidance — so you can make your own confident decisions.';
    if (spotlight) spotlight.style.display = 'none';
  }
}

// ── Search ─────────────────────────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById('searchInput');
  const clear = document.getElementById('searchClear');

  input.addEventListener('input', () => {
    clear.style.display = input.value ? 'block' : 'none';
    applyFilters();
  });
  clear.addEventListener('click', () => {
    input.value = '';
    clear.style.display = 'none';
    applyFilters();
  });
}

// ── Filters ────────────────────────────────────────────────────────────────
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveFilter(btn.dataset.playlist);
    });
  });
}

function setActiveFilter(playlist) {
  activePlaylist = playlist;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.playlist === playlist);
  });
  applyFilters();
}

// Set default filter to whichever core playlist has the most recent video
function setSmartDefaultFilter() {
  const CORE = ['news-radar', 'knowledge-radar', 'wealth-academy', 'options-academy'];
  let bestPlaylist = null, bestDate = '';

  CORE.forEach(plId => {
    const latest = allVideos
      .filter(v => v.playlist === plId)
      .sort((a, b) => (b.published || '').localeCompare(a.published || ''))[0];
    if (latest && (latest.published || '') > bestDate) {
      bestDate = latest.published;
      bestPlaylist = plId;
    }
  });

  if (!bestPlaylist) return;
  activePlaylist = bestPlaylist;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.playlist === bestPlaylist);
  });
  filteredVideos = allVideos.filter(v => v.playlist === bestPlaylist);
}

// Collect IDs already shown above the archive and sink them to the bottom
function prioritiseArchive() {
  const usedIds = new Set();

  // Autoplay strip video
  const autoplay = allVideos.find(v => v.featured) ||
    [...allVideos].sort((a, b) => parseInt(b.views) - parseInt(a.views))[0];
  if (autoplay) usedIds.add(autoplay.id);

  // Most Popular + Most Recent (carousel slides 3 & 4)
  const popular = [...allVideos].sort((a, b) => parseInt(b.views||0) - parseInt(a.views||0))[0];
  const recent  = [...allVideos].sort((a, b) => (b.published||'').localeCompare(a.published||''))[0];
  if (popular) usedIds.add(popular.id);
  if (recent)  usedIds.add(recent.id);

  // Featured Today — picks are random so we sink the top-viewed + featured-flagged ones
  allVideos.filter(v => v.featured).forEach(v => usedIds.add(v.id));

  // Indian Radar "Basics" series — already prominently shown in carousel
  allVideos
    .filter(v => v.india && /Indian Stock Market Basics in/i.test(v.title))
    .forEach(v => usedIds.add(v.id));

  // Re-sort: unseen first (by published date desc), seen last (by published date desc)
  allVideos = [
    ...allVideos.filter(v => !usedIds.has(v.id)),
    ...allVideos.filter(v =>  usedIds.has(v.id)),
  ];
  filteredVideos = [...allVideos];
}

function applyFilters() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();

  filteredVideos = allVideos.filter(v => {
    const matchPlaylist = activePlaylist === 'all' || v.playlist === activePlaylist;
    const matchSearch   = !query ||
      v.title.toLowerCase().includes(query) ||
      (v.lang || '').toLowerCase().includes(query) ||
      (v.playlist || '').toLowerCase().includes(query);
    return matchPlaylist && matchSearch;
  });

  displayedCount = 0;
  renderVideoGrid(true);
}

// ── Video Grid ─────────────────────────────────────────────────────────────
function renderVideoGrid(reset = false) {
  const grid    = document.getElementById('videoGrid');
  const noRes   = document.getElementById('noResults');
  const moreBtn = document.getElementById('loadMoreWrap');

  if (reset) {
    grid.innerHTML = '';
    displayedCount = 0;
  }

  if (filteredVideos.length === 0) {
    noRes.style.display   = 'block';
    moreBtn.style.display = 'none';
    return;
  }
  noRes.style.display = 'none';

  const slice = filteredVideos.slice(displayedCount, displayedCount + PAGE_SIZE);
  slice.forEach(v => grid.appendChild(buildVideoCard(v)));
  displayedCount += slice.length;

  moreBtn.style.display = displayedCount < filteredVideos.length ? 'block' : 'none';

  if (!document.getElementById('loadMoreBtn')._bound) {
    document.getElementById('loadMoreBtn').addEventListener('click', () => renderVideoGrid(false));
    document.getElementById('loadMoreBtn')._bound = true;
  }
}

function buildVideoCard(v) {
  const card = document.createElement('div');
  card.className = 'video-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', v.title);

  const badgeClass = v.playlist === 'indian-radar' ? 'badge-india' :
                     v.playlist === 'shorts'        ? 'badge-short' : '';
  const badgeLabel = v.playlist === 'indian-radar' ? '🇮🇳 India' :
                     v.playlist === 'shorts'        ? 'Short' :
                     v.playlist === 'options-academy' ? 'Options Academy' :
                     v.playlist === 'wealth-academy'  ? 'Wealth Academy' : '';

  const langTag = v.india ?
    `<div class="video-playlist-tag">🇮🇳 IndianRadar.AI</div>` :
    v.playlist !== 'indian-radar' ? `<div class="video-playlist-tag">${labelFor(v.playlist)}</div>` : '';

  card.innerHTML = `
    <div class="video-thumb-wrap">
      <img src="${v.thumb}" alt="${escHtml(v.title)}" loading="lazy" />
      <div class="video-play-btn">
        <svg viewBox="0 0 68 48" width="54" height="38">
          <path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C56.1 0 34 0 34 0S11.9 0 7.5 1.7a8.5 8.5 0 0 0-6 6C0 12.1 0 24 0 24s0 11.9 1.5 16.3a8.5 8.5 0 0 0 6 6C11.9 48 34 48 34 48s22.1 0 26.5-1.7a8.5 8.5 0 0 0 6-6C68 35.9 68 24 68 24s0-11.9-1.5-16.3z" fill="#ff0000"/>
          <path d="M45 24 27 14v20" fill="#fff"/>
        </svg>
      </div>
      ${badgeLabel ? `<span class="video-badge ${badgeClass}">${badgeLabel}</span>` : ''}
    </div>
    <div class="video-info">
      ${langTag}
      <div class="video-title">${escHtml(v.title)}</div>
      <div class="video-meta">
        <span>${v.views} views</span>
        <span>${v.published}</span>
      </div>
    </div>
  `;

  const open = () => openModal(v);
  card.addEventListener('click', open);
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });

  return card;
}

// ── Modal ──────────────────────────────────────────────────────────────────
function initModal() {
  const overlay = document.getElementById('modalOverlay');
  const closeBtn = document.getElementById('modalClose');

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function openModal(v) {
  const overlay = document.getElementById('modalOverlay');
  const iframe  = document.getElementById('modalIframe');
  const meta    = document.getElementById('modalMeta');

  iframe.src = `https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0`;
  meta.innerHTML = `
    <h3>${escHtml(v.title)}</h3>
    <p>${v.views} views · ${v.published}${v.india ? ' · 🇮🇳 IndianRadar.AI' : ''}</p>
  `;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  const iframe  = document.getElementById('modalIframe');
  overlay.classList.remove('open');
  iframe.src = '';
  document.body.style.overflow = '';
}

// ── Slide 1 inline video — plays once on click, stays on page ──────────────
function initSlideVideo() {
  const playBtn = document.getElementById('slideVideoPlay');
  const thumb   = document.getElementById('slideVideoThumb');
  const iframe  = document.getElementById('slideVideoIframe');
  if (!playBtn) return;

  playBtn.addEventListener('click', () => {
    // Hide thumbnail + play button, show iframe
    thumb.style.display   = 'none';
    playBtn.style.display = 'none';
    iframe.style.display  = 'block';
    // autoplay=1, no loop (loop=0), no related videos
    iframe.src = 'https://www.youtube.com/embed/8V2Z0tr-Nhk?autoplay=1&rel=0&loop=0&modestbranding=1';
  });
}

// ── Nav (hamburger) ────────────────────────────────────────────────────────
function initNav() {
  const ham = document.getElementById('hamburger');
  const nav = document.getElementById('mobileNav');
  ham.addEventListener('click', () => nav.classList.toggle('open'));

  // close mobile nav on link click
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => nav.classList.remove('open'));
  });
}

// ── Footer ─────────────────────────────────────────────────────────────────
function updateFooter() {
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  document.getElementById('footer-updated').textContent =
    'Data refreshed: ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Hero Carousel ──────────────────────────────────────────────────────────
let carouselIndex       = 0;
let carouselTotal       = 0;
let carouselTimer       = null;
let carouselUserStopped = false;   // once user manually navigates, stop auto-rotation
const CAROUSEL_INTERVAL = 6000;

// Called immediately on DOMContentLoaded — starts carousel with the 2 static HTML slides
function initCarouselStatic() {
  const track = document.getElementById('carouselTrack');
  if (!track) return;
  carouselTotal = track.querySelectorAll('.carousel-slide').length;
  buildCarouselDots();

  // Honor deep-link hash — #slide-indian-radar locks to that slide forever
  const _hashEl  = document.querySelector(`.carousel-slide[id="${location.hash.slice(1)}"]`);
  const _startIdx = _hashEl ? parseInt(_hashEl.dataset.index || 0) : 0;
  if (_startIdx > 0) carouselUserStopped = true;
  updateCarouselPosition(_startIdx);
  if (!carouselUserStopped) startCarouselTimer();

  document.getElementById('carouselPrev').addEventListener('click', () => { carouselUserStopped = true; stopCarouselTimer(); stepCarousel(-1); });
  document.getElementById('carouselNext').addEventListener('click', () => { carouselUserStopped = true; stopCarouselTimer(); stepCarousel(1);  });
  const carousel = document.getElementById('heroCarousel');
  carousel.addEventListener('mouseenter', stopCarouselTimer);
  carousel.addEventListener('mouseleave', () => { if (!carouselUserStopped) startCarouselTimer(); });
}

// Share-link buttons — copy deep-link URL to clipboard
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-slide-share');
  if (!btn) return;
  const slideId = btn.dataset.slide;
  const url = `${location.origin}${location.pathname}#${slideId}`;
  navigator.clipboard.writeText(url).then(() => {
    const span = btn.querySelector('span');
    btn.classList.add('copied');
    span.textContent = 'Copied!';
    setTimeout(() => { btn.classList.remove('copied'); span.textContent = 'Share'; }, 2200);
  });
});

// Called after data loads — populates india collage and appends dynamic slides
function buildCarousel() {
  const track = document.getElementById('carouselTrack');
  if (!track || allVideos.length === 0) return;

  // ── Slide 2: Indian Radar — only "Indian Stock Market Basics in [Language]" series ──
  const indiaVideos = allVideos.filter(v => v.india === true && /Indian Stock Market Basics in/i.test(v.title));
  window._indiaVideos = indiaVideos;  // keep for reshuffle on carousel visit

  function renderIndiaCollage() {
    const collage = document.getElementById('indiaCollage');
    if (!collage || !indiaVideos.length) return;
    collage.scrollLeft = 0;
    // Sort alphabetically by language extracted from title
    const sorted = [...indiaVideos].sort((a, b) => {
      const lang = v => { const m = v.title.match(/Basics in (\w+)/i); return m ? m[1] : 'ZZZ'; };
      return lang(a).localeCompare(lang(b));
    });
    collage.innerHTML = sorted.map(v => `
      <a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener"
         title="${escHtml(v.title)}">
        <img src="${v.thumb}" alt="${escHtml(v.title)}" loading="lazy" />
      </a>
    `).join('');
  }
  window.renderIndiaCollage = renderIndiaCollage;
  renderIndiaCollage();

  // ── Build dynamic slides and append DIRECTLY to track ──
  // Slide 3: Most Popular · Slide 4: Most Recent — never pick India videos
  const nonIndiaVideos = allVideos.filter(v => !v.india);
  const popular = [...nonIndiaVideos].sort((a, b) => parseInt(b.views || 0) - parseInt(a.views || 0))[0];
  const recent  = [...nonIndiaVideos]
    .filter(v => !popular || v.id !== popular.id)
    .sort((a, b) => (b.published || '').localeCompare(a.published || ''))[0];

  // Register carousel picks so Featured Today and autoplay never repeat them
  if (popular) shownIds.add(popular.id);
  if (recent)  shownIds.add(recent.id);

  const shareIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;

  [
    { badge: '🔥 Most Popular',  bgColor: 'linear-gradient(135deg,#1a0a00,#2a1400)', v: popular },
    { badge: '🆕 Most Recent',   bgColor: 'linear-gradient(135deg,#001a1a,#002a2a)', v: recent  },
  ].forEach(item => {
    if (!item.v) return;
    const v     = item.v;
    const safet = escHtml(v.title).replace(/'/g, '&#39;');
    const ytUrl = `https://www.youtube.com/watch?v=${v.id}`;
    const slide = document.createElement('div');
    slide.className = 'carousel-slide slide-feature';
    slide.style.background = item.bgColor;
    slide.innerHTML = `
      <button class="btn-slide-share" data-slide="slide-feature-${v.id}" title="Copy link">${shareIcon}</button>
      <div class="container slide-inner">
        <div class="slide-text">
          <div class="slide-badge">${item.badge}</div>
          <h2 style="font-size:clamp(18px,2.4vw,32px);font-weight:800;color:#fff;margin-bottom:14px;line-height:1.3">${safet}</h2>
          <p class="slide-sub">${parseInt(v.views).toLocaleString()} views · ${v.published}</p>
          <div class="slide-actions">
            <a href="${ytUrl}" target="_blank" rel="noopener" class="btn-primary">▶ Watch on YouTube</a>
          </div>
        </div>
        <div class="slide-visual">
          <a href="${ytUrl}" target="_blank" rel="noopener" class="slide-feature-thumb">
            <img src="${v.thumb}" alt="${safet}" />
            <div class="slide-feature-play">▶</div>
          </a>
        </div>
      </div>
    `;
    track.appendChild(slide);
  });

  // ── Slide 5: Quiz ──────────────────────────────────────────────────────────
  const quizVideos = shuffle(allVideos.filter(v => /🦉\s*Quiz/i.test(v.title)));
  if (quizVideos.length) {
    const quizSlide = document.createElement('div');
    quizSlide.className = 'carousel-slide slide-quiz';
    quizSlide.id = 'slide-quiz';
    quizSlide.innerHTML = `
      <button class="btn-slide-share" data-slide="slide-quiz" title="Copy link">${shareIcon}</button>
      <div class="container slide-inner">
        <div class="slide-text">
          <div class="slide-badge">🦉 Quick Quiz</div>
          <h2 style="font-size:clamp(22px,2.8vw,38px);font-weight:800;color:#fff;margin-bottom:10px;line-height:1.2">Test Your<br/><span style="color:var(--gold)">Market Knowledge</span></h2>
          <p class="slide-sub">Short quizzes — can you answer before time runs out?</p>
          <div class="quiz-thumb-strip" id="quizThumbStrip">
            ${quizVideos.map((v, i) => `
              <button class="quiz-thumb-btn ${i === 0 ? 'active' : ''}" data-qid="${v.id}" title="${escHtml(v.title)}">
                <img src="${v.thumb}" alt="${escHtml(v.title)}" loading="lazy"/>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="slide-visual">
          <div class="quiz-player-box">
            <iframe id="quizIframe" src="https://www.youtube.com/embed/${quizVideos[0].id}?autoplay=1&mute=1&rel=0&loop=0&modestbranding=1"
              frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
          </div>
        </div>
      </div>
    `;

    // Thumbnail strip — click to switch video
    quizSlide.querySelectorAll('.quiz-thumb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        quizSlide.querySelectorAll('.quiz-thumb-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const iframe = quizSlide.querySelector('#quizIframe');
        iframe.src = `https://www.youtube.com/embed/${btn.dataset.qid}?autoplay=1&rel=0&loop=0&modestbranding=1`;
      });
    });

    track.appendChild(quizSlide);
  }

  // Rebuild dots now that dynamic slides are added
  stopCarouselTimer();
  carouselTotal = track.querySelectorAll('.carousel-slide').length;
  buildCarouselDots();
  updateCarouselPosition(0);
  startCarouselTimer();
}

function buildCarouselDots() {
  const dots = document.getElementById('carouselDots');
  dots.innerHTML = '';
  for (let i = 0; i < carouselTotal; i++) {
    const btn = document.createElement('button');
    btn.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    btn.setAttribute('aria-label', `Slide ${i + 1}`);
    btn.addEventListener('click', () => { carouselUserStopped = true; stopCarouselTimer(); goToSlide(i); });
    dots.appendChild(btn);
  }
}

function updateCarouselPosition(idx) {
  carouselIndex = idx;
  const track = document.getElementById('carouselTrack');
  track.querySelectorAll('.carousel-slide').forEach((s, i) =>
    s.classList.toggle('active', i === idx)
  );
  document.querySelectorAll('.carousel-dot').forEach((d, i) =>
    d.classList.toggle('active', i === idx)
  );
}

function stepCarousel(dir) {
  goToSlide((carouselIndex + dir + carouselTotal) % carouselTotal);
}

function goToSlide(idx) {
  stopCarouselTimer();
  updateCarouselPosition(idx);
  if (!carouselUserStopped) startCarouselTimer();
}

function startCarouselTimer() {
  stopCarouselTimer();
  carouselTimer = setInterval(() => stepCarousel(1), CAROUSEL_INTERVAL);
}
function stopCarouselTimer() {
  if (carouselTimer) { clearInterval(carouselTimer); carouselTimer = null; }
}

// ── Playlist Cards ─────────────────────────────────────────────────────────
const PLAYLIST_META = {
  'news-radar':      { emoji: '📡', bg: 'linear-gradient(135deg,#1a0a0a,#2a1010)', title: 'Breaking Market Intelligence' },
  'knowledge-radar': { emoji: '🧠', bg: 'linear-gradient(135deg,#0a1a1a,#102a2a)', title: 'Research-Backed Wisdom' },
  'wealth-academy':  { emoji: '💰', bg: 'linear-gradient(135deg,#1a1a0a,#2a2a10)', title: 'Long-Term Wealth Building' },
  'options-academy': { emoji: '📊', bg: 'linear-gradient(135deg,#0a1a0a,#102a10)', title: 'Options Income Strategies' },
  'indian-radar':    { emoji: '🇮🇳', bg: 'linear-gradient(135deg,#1a0a00,#2a1500)', title: 'भारतीय निवेशकों के लिए' },
  'infomercials':    { emoji: '🎬', bg: 'linear-gradient(135deg,#0a0a1a,#10102a)', title: 'Platform & Announcements' },
};

function renderPlaylistCards() {
  const grid = document.getElementById('playlistGrid');
  if (!grid) return;
  grid.innerHTML = '';
  allPlaylists.forEach((pl, i) => {
    const meta  = PLAYLIST_META[pl.id] || { emoji: '▶', bg: 'var(--bg-card)', title: pl.label };
    const count = allVideos.filter(v => v.playlist === pl.id).length;
    const card  = document.createElement('div');
    card.className  = 'playlist-card' + (i === 0 ? ' playlist-card-top' : '');
    const thumbStyle = pl.thumb
      ? `background-image:url(${pl.thumb});background-size:cover;background-position:center`
      : `background:${meta.bg}`;

    card.innerHTML  = `
      <div class="playlist-thumb" style="${thumbStyle}">
        <div class="playlist-thumb-overlay"></div>
        <div class="playlist-rank">#${i + 1}</div>
      </div>
      <div class="playlist-info">
        <span class="playlist-tag" style="color:${pl.color}">${pl.label}</span>
        <h3>${meta.title}</h3>
        <div class="playlist-footer">
          <span class="playlist-count">${count} video${count !== 1 ? 's' : ''}</span>
          <a class="playlist-cta" href="https://www.youtube.com/playlist?list=${pl.ytId}" target="_blank" rel="noopener">View Playlist →</a>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ── Featured Today (changes every page load) ────────────────────────────────
function renderFeaturedToday() {
  const wrap = document.getElementById('featuredLayout');
  if (!wrap || allVideos.length === 0) return;

  // Pick 3 unique videos not already shown in carousel or autoplay
  const avail    = shuffle(allVideos.filter(v => !shownIds.has(v.id)));
  const nonIndia = avail.filter(v => !v.india);
  const india    = avail.filter(v => v.india);
  const picks = [];
  if (nonIndia[0]) picks.push(nonIndia[0]);
  if (india[0])    picks.push(india[0]);
  // third: any unseen not already in picks
  const third = avail.find(v => !picks.some(p => p.id === v.id));
  if (third) picks.push(third);
  picks.forEach(v => shownIds.add(v.id));

  wrap.innerHTML = picks.map((v, i) => `
    <div class="featured-card ${i === 0 ? 'featured-card-main' : ''}"
         role="button" tabindex="0"
         onclick="openModalById('${v.id}','${escHtml(v.title).replace(/'/g,"\\'")}','${v.views}','${v.published}','${v.lang||''}')">
      <div class="featured-thumb-wrap">
        <img src="${v.thumb}" alt="${escHtml(v.title)}" loading="lazy" />
        <div class="featured-play">
          <svg viewBox="0 0 68 48" width="44" height="30">
            <path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C56.1 0 34 0 34 0S11.9 0 7.5 1.7a8.5 8.5 0 0 0-6 6C0 12.1 0 24 0 24s0 11.9 1.5 16.3a8.5 8.5 0 0 0 6 6C11.9 48 34 48 34 48s22.1 0 26.5-1.7a8.5 8.5 0 0 0 6-6C68 35.9 68 24 68 24s0-11.9-1.5-16.3z" fill="#ff0000"/>
            <path d="M45 24 27 14v20" fill="#fff"/>
          </svg>
        </div>
        <span class="featured-playlist-tag">${labelFor(v.playlist)}</span>
      </div>
      <div class="featured-info">
        <div class="featured-title">${escHtml(v.title)}</div>
        <div class="video-meta"><span>${v.views} views</span><span>${v.published}</span></div>
      </div>
    </div>
  `).join('');

  document.getElementById('featured-sub').textContent =
    'Refreshed on every visit — ' + new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
}

function labelFor(playlistId) {
  const pl = allPlaylists.find(p => p.id === playlistId);
  return pl ? pl.label : playlistId;
}

function openModalById(id, title, views, published, lang) {
  openModal({ id, title, views, published, lang });
}

// ── Autoplay Strip ──────────────────────────────────────────────────────────
function launchAutoplay() {
  // Pick featured-flagged video; if already shown elsewhere, pick next most-viewed unseen
  const featured = allVideos.find(v => v.featured && !shownIds.has(v.id)) ||
                   [...allVideos].filter(v => !shownIds.has(v.id))
                     .sort((a, b) => parseInt(b.views) - parseInt(a.views))[0];
  if (!featured) return;
  shownIds.add(featured.id);

  const strip   = document.getElementById('autoplayStrip');
  const iframe  = document.getElementById('autoplayIframe');
  const titleEl = document.getElementById('autoplayTitle');
  const metaEl  = document.getElementById('autoplayMeta');
  const ytLink  = document.getElementById('autoplayYT');

  iframe.src = `https://www.youtube.com/embed/${featured.id}?autoplay=1&mute=1&rel=0&modestbranding=1`;
  titleEl.textContent = featured.title;
  metaEl.textContent  = `${featured.views} views · ${featured.published}${featured.lang ? ' · ' + featured.lang : ''}`;
  ytLink.href = `https://www.youtube.com/watch?v=${featured.id}`;
  strip.style.display = 'block';
}


// ── Utilities ──────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
