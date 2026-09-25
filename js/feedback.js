/* ═══════════════════════════════════════════════════════════════════
   OTS Ullu — reader feedback: 👍/👎, comments, view counts.
   Backed by Supabase (supabase/schema.sql). Stays completely dormant
   until js/feedback-config.js has a project URL + anon key.

   Public API (window.OTSFeedback):
     enabled                  – false when not configured
     trackView(item)          – count one view/play of an item
     mountBars(root)          – render stat bars into [data-fb-slot] elements
     openPanel(item)          – open the comments/rating panel for an item
     itemFromSlot(el)         – read an item from a [data-fb-slot] element
   item = { id: 'deck:…' | 'podcast:…' | 'article:…', title, url, label }
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const CFG     = window.OTS_FEEDBACK_CONFIG || {};
  const ENABLED = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);

  function itemFromSlot(el) {
    if (!el || !el.dataset || !el.dataset.fbId) return null;
    return {
      id:    el.dataset.fbId,
      title: el.dataset.fbTitle || '',
      url:   el.dataset.fbUrl || '/',
      label: el.dataset.fbLabel || 'views',
    };
  }

  if (!ENABLED) {
    const noop = () => {};
    window.OTSFeedback = { enabled: false, trackView: noop, mountBars: noop, openPanel: noop, itemFromSlot };
    return;
  }

  const LIB_URL    = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
  const PROVIDERS  = { google: 'Google', azure: 'Microsoft', linkedin_oidc: 'LinkedIn' };
  const SIGN_IN    = (CFG.providers || ['google']).filter(p => PROVIDERS[p]);
  const RETURN_KEY = 'ots-fb-return';
  const OWL_IMG    = '/assets/img/ots-ullu-mascot.jpeg';
  const MAX_LEN    = 2000;
  const IS_BOT     = !!navigator.webdriver ||
    /bot|crawl|spider|slurp|headless|lighthouse|pingdom|preview/i.test(navigator.userAgent || '');

  /* ── small utilities ─────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function storage(kind) { try { return window[kind]; } catch (e) { return null; } }
  function sGet(kind, k) { try { return storage(kind).getItem(k); } catch (e) { return null; } }
  function sSet(kind, k, v) {
    try { v == null ? storage(kind).removeItem(k) : storage(kind).setItem(k, v); } catch (e) {}
  }
  function fmtNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6)   return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 10000) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return n.toLocaleString('en-US');
  }
  function ago(iso) {
    const d = new Date(iso);
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 60)     return 'just now';
    if (s < 3600)   return Math.floor(s / 60) + 'm ago';
    if (s < 86400)  return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fullDate(iso) {
    return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  }

  let memVisitor = null;
  function visitorId() {
    let v = sGet('localStorage', 'ots-vid');
    if (v && /^[A-Za-z0-9-]{16,64}$/.test(v)) return v;
    v = memVisitor || (crypto.randomUUID
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''));
    memVisitor = v;
    sSet('localStorage', 'ots-vid', v);
    return v;
  }

  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById('fbToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fbToast';
      el.className = 'fb-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 4200);
  }

  const ICON = {
    eye:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    up:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    x:    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  };

  /* ── returning from a social sign-in ─────────────────────────────────
     Runs immediately (before the homepage restores its tab from the hash):
     take the one-time ?code off the URL and put the saved #tab back. */
  const authReturn = (function () {
    let pending = null;
    try { pending = JSON.parse(sGet('sessionStorage', RETURN_KEY) || 'null'); } catch (e) {}
    const q    = new URLSearchParams(location.search);
    const code = q.get('code');
    const err  = q.get('error_description') || q.get('error');
    if (!pending || (!code && !err)) return null;
    sSet('sessionStorage', RETURN_KEY, null);
    ['code', 'error', 'error_code', 'error_description', 'state'].forEach(k => q.delete(k));
    const qs = q.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + (pending.hash || ''));
    return { code, err, pending };
  })();
  let restore = authReturn && authReturn.code ? authReturn.pending : null;

  /* ── Supabase client + session ───────────────────────────────────── */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }

  let me      = null;   // { id, display_name, avatar_url, is_admin, is_blocked } when signed in
  let session = null;

  async function loadMe(sb) {
    if (!session) { me = null; return; }
    const { data, error } = await sb.rpc('get_me');
    me = !error && data && data[0] ? data[0] : null;
  }

  const ready = loadScript(LIB_URL).then(async () => {
    const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,   // handled above so the homepage hash survives
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'ots-fb-auth',
      },
    });
    if (authReturn && authReturn.code) {
      const { error } = await sb.auth.exchangeCodeForSession(authReturn.code);
      if (error) { restore = null; toast('Sign-in did not complete. Please try again.'); }
    } else if (authReturn && authReturn.err) {
      toast('Sign-in was cancelled.');
    }
    const { data } = await sb.auth.getSession();
    session = data.session;
    await loadMe(sb);
    sb.auth.onAuthStateChange((_event, s) => {
      const before = session && session.user && session.user.id;
      session = s;
      if ((s && s.user && s.user.id) !== before) {
        setTimeout(() => loadMe(sb).then(rerenderThreads), 0);
      }
    });
    return sb;
  });
  ready.catch(() => {});

  async function rpc(fn, args) {
    let sb;
    try { sb = await ready; } catch (e) { throw new Error('Comments are unavailable right now.'); }
    const { data, error } = await sb.rpc(fn, args || {});
    if (error) throw new Error(error.message || 'Something went wrong. Please try again.');
    return data;
  }

  /* ── stats: batching, cache, painting ────────────────────────────── */
  const stats    = new Map();   // id -> { views, uniques, up, down, comments, my_vote }
  const bars     = new Map();   // id -> Set<HTMLElement>
  const wanted   = new Set();
  let statsTimer = null;

  function blankStats() { return { views: 0, uniques: 0, up: 0, down: 0, comments: 0, my_vote: null }; }

  function refreshStats(ids) {
    ids.forEach(id => wanted.add(id));
    clearTimeout(statsTimer);
    statsTimer = setTimeout(flushStats, 60);
  }
  async function flushStats() {
    const ids = Array.from(wanted);
    wanted.clear();
    for (let i = 0; i < ids.length; i += 200) {
      try {
        const rows = await rpc('get_item_stats', { p_items: ids.slice(i, i + 200), p_visitor: visitorId() });
        (rows || []).forEach(r => {
          stats.set(r.item_id, {
            views: +r.views, uniques: +r.uniques, up: +r.up, down: +r.down,
            comments: +r.comments, my_vote: r.my_vote,
          });
          paint(r.item_id);
        });
      } catch (e) { /* counts are decoration; fail quietly */ }
    }
  }

  function paint(id) {
    const set = bars.get(id);
    if (!set) return;
    const s = stats.get(id) || blankStats();
    set.forEach(bar => {
      if (!bar.isConnected) { set.delete(bar); return; }
      bar.classList.add('is-loaded');
      bar.querySelector('.fb-views-n').textContent = fmtNum(s.views);
      bar.querySelector('.fb-noun').textContent    = s.views === 1 ? bar.dataset.noun.slice(0, -1) : bar.dataset.noun;
      bar.querySelector('.fb-uniq-n').textContent  = fmtNum(s.uniques);
      bar.querySelector('.fb-up-n').textContent    = fmtNum(s.up);
      bar.querySelector('.fb-down-n').textContent  = fmtNum(s.down);
      const up = bar.querySelector('.fb-up'), down = bar.querySelector('.fb-down');
      up.setAttribute('aria-pressed', String(s.my_vote === 1));
      down.setAttribute('aria-pressed', String(s.my_vote === -1));
      const talk = bar.querySelector('.fb-com-n');
      if (talk) talk.textContent = fmtNum(s.comments);
    });
  }

  /* ── stat bar: views · unique · 👍 · 👎 · 💬 ─────────────────────── */
  function createBar(item, withCommentsButton) {
    const bar = document.createElement('div');
    bar.className = 'fb-bar';
    const noun = item.label === 'plays' ? 'plays' : 'views';
    bar.dataset.noun = noun;
    bar.innerHTML = `
      <span class="fb-stat" title="Total ${noun} · unique visitors">
        ${ICON.eye}<b class="fb-views-n">–</b><span class="fb-lbl fb-noun">${noun}</span>
        <span class="fb-sep" aria-hidden="true">·</span><b class="fb-uniq-n">–</b><span class="fb-lbl">unique</span>
      </span>
      <span class="fb-actions">
        <button type="button" class="fb-btn fb-up" aria-pressed="false" title="Helpful">
          ${ICON.up}<span class="fb-up-n">0</span><span class="fb-sr">thumbs up</span>
        </button>
        <button type="button" class="fb-btn fb-down" aria-pressed="false" title="Not helpful">
          ${ICON.down}<span class="fb-down-n">0</span><span class="fb-sr">thumbs down</span>
        </button>
        ${withCommentsButton ? `
        <button type="button" class="fb-btn fb-talk" title="Comments">
          ${ICON.chat}<span class="fb-com-n">0</span><span class="fb-sr">comments</span>
        </button>` : ''}
      </span>`;

    bar.addEventListener('click', e => {
      const btn = e.target.closest('.fb-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();          // don't open the card underneath
      if (btn.classList.contains('fb-up'))   vote(item, 1, btn);
      if (btn.classList.contains('fb-down')) vote(item, -1, btn);
      if (btn.classList.contains('fb-talk')) openPanel(item);
    });
    bar.addEventListener('keydown', e => {
      if (e.target.closest('.fb-btn') && (e.key === 'Enter' || e.key === ' ')) e.stopPropagation();
    });

    if (!bars.has(item.id)) bars.set(item.id, new Set());
    bars.get(item.id).add(bar);
    if (stats.has(item.id)) setTimeout(() => paint(item.id), 0);
    return bar;
  }

  const voting = new Set();
  async function vote(item, value, btn) {
    if (voting.has(item.id)) return;
    voting.add(item.id);
    const before = stats.get(item.id) || blankStats();
    const next   = before.my_vote === value ? 0 : value;
    const guess  = Object.assign({}, before);
    if (before.my_vote === 1)  guess.up--;
    if (before.my_vote === -1) guess.down--;
    if (next === 1)  guess.up++;
    if (next === -1) guess.down++;
    guess.my_vote = next || null;
    stats.set(item.id, guess);
    paint(item.id);
    if (btn) { btn.classList.remove('fb-pop'); void btn.offsetWidth; btn.classList.add('fb-pop'); }
    try {
      const rows = await rpc('set_vote', {
        p_item: item.id, p_visitor: visitorId(), p_value: next, p_title: item.title, p_url: item.url,
      });
      const r = rows && rows[0];
      if (r) {
        stats.set(item.id, Object.assign({}, guess, { up: +r.up, down: +r.down, my_vote: r.my_vote }));
        paint(item.id);
      }
    } catch (e) {
      stats.set(item.id, before);
      paint(item.id);
      toast(e.message);
    } finally {
      voting.delete(item.id);
    }
  }

  function mountBars(root) {
    const slots = (root || document).querySelectorAll('[data-fb-slot]:not([data-fb-mounted])');
    const ids = [];
    slots.forEach(slot => {
      const item = itemFromSlot(slot);
      if (!item) return;
      slot.setAttribute('data-fb-mounted', '');
      slot.appendChild(createBar(item, slot.dataset.fbSlot === 'panel'));
      ids.push(item.id);
    });
    if (ids.length) refreshStats(ids);
  }

  /* ── views ───────────────────────────────────────────────────────── */
  const viewed = new Set();
  function trackView(item) {
    if (!item || IS_BOT || viewed.has(item.id)) return;
    viewed.add(item.id);
    rpc('record_view', { p_item: item.id, p_visitor: visitorId(), p_title: item.title, p_url: item.url })
      .then(() => { if (bars.has(item.id)) refreshStats([item.id]); })
      .catch(() => {});
  }

  /* ── comment threads ─────────────────────────────────────────────── */
  const threads = new Set();

  function rerenderThreads() {
    threads.forEach(t => {
      if (!t.el.isConnected) { threads.delete(t); return; }
      loadComments(t);   // is_mine depends on who is signed in
    });
  }

  function mountThread(el, item, inPanel) {
    const t = {
      el, item, inPanel,
      comments: [], loading: true, error: '',
      draft: '', replyTo: null, replyDraft: '', editing: null, editDraft: '',
      busy: false, formError: '', asOfficial: false,
    };
    if (restore && restore.item && restore.item.id === item.id) {
      t.draft      = restore.draft || '';
      t.replyTo    = restore.replyTo || null;
      t.replyDraft = restore.replyDraft || '';
      restore = null;
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
    threads.add(t);
    wireThread(t);
    render(t);
    loadComments(t);
    return t;
  }

  async function loadComments(t) {
    try {
      await ready.catch(() => {});
      t.comments = (await rpc('get_comments', { p_item: t.item.id })) || [];
      t.error = '';
    } catch (e) {
      t.error = e.message;
    }
    t.loading = false;
    render(t);
  }

  function initials(name) {
    const parts = String(name || '?').trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p.charAt(0).toUpperCase()).join('') || '?';
  }
  function hue(name) {
    let h = 0;
    for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % 360;
  }
  function avatar(name, url, official) {
    if (official) return `<img class="fb-av fb-av-owl" src="${OWL_IMG}" alt="" loading="lazy">`;
    if (url && /^https:\/\//.test(url)) {
      return `<img class="fb-av" src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-name="${esc(name)}">`;
    }
    return `<span class="fb-av fb-av-ini" style="background:hsl(${hue(name)} 42% 42%)" aria-hidden="true">${esc(initials(name))}</span>`;
  }

  function signInButtons(context) {
    return `<div class="fb-signin">
      <span class="fb-signin-lbl">${context}</span>
      ${SIGN_IN.map(p => `<button type="button" class="fb-provider fb-provider-${p}" data-act="signin" data-provider="${p}">${esc(PROVIDERS[p])}</button>`).join('')}
    </div>`;
  }

  function authBar() {
    if (!me) {
      return signInButtons('Sign in to comment or reply:') +
        `<p class="fb-privacy">Your name and photo appear with your comments. Your email is never shown.</p>`;
    }
    return `<div class="fb-me">
      ${avatar(me.display_name, me.avatar_url, false)}
      <span class="fb-me-name">${esc(me.display_name)}</span>
      <button type="button" class="fb-link" data-act="rename">Change name</button>
      <button type="button" class="fb-link" data-act="signout">Sign out</button>
    </div>`;
  }

  function composer(t) {
    if (!me) return '';
    if (me.is_blocked) return `<p class="fb-note">Your account is not able to post comments.</p>`;
    return `<form class="fb-form" data-form="main">
      <textarea class="fb-input" data-input="draft" maxlength="${MAX_LEN}" rows="3"
                placeholder="Share your thoughts…" aria-label="Write a comment">${esc(t.draft)}</textarea>
      ${t.formError && t.replyTo === null && t.editing === null ? `<p class="fb-error" role="alert">${esc(t.formError)}</p>` : ''}
      <div class="fb-form-foot">
        ${me.is_admin ? `<label class="fb-official"><input type="checkbox" data-input="official" ${t.asOfficial ? 'checked' : ''}> Post as OTS Ullu</label>` : ''}
        <span class="fb-counter">${t.draft.length}/${MAX_LEN}</span>
        <button type="submit" class="fb-submit" ${t.busy ? 'disabled' : ''}>Post</button>
      </div>
    </form>`;
  }

  function commentHtml(t, c, kids, depth) {
    const replies = (kids.get(c.id) || []);
    const repliesHtml = replies.length
      ? `<ol class="fb-replies">${replies.map(r => commentHtml(t, r, kids, depth + 1)).join('')}</ol>`
      : '';

    if (c.status !== 'visible') {
      const why = c.status === 'deleted' ? 'This comment was deleted by its author.'
                                         : 'This comment was removed by a moderator.';
      return `<li class="fb-c fb-c-gone"><div class="fb-c-main"><span class="fb-av fb-av-gone" aria-hidden="true"></span>
        <div class="fb-c-content"><p class="fb-c-body">${why}</p></div></div>${repliesHtml}</li>`;
    }

    const editing = t.editing === c.id;
    const name    = c.author_name || 'Reader';
    const body    = editing
      ? `<form class="fb-form fb-form-inline" data-form="edit" data-cid="${c.id}">
           <textarea class="fb-input" data-input="editDraft" maxlength="${MAX_LEN}" rows="3" aria-label="Edit your comment">${esc(t.editDraft)}</textarea>
           ${t.formError && t.editing === c.id ? `<p class="fb-error" role="alert">${esc(t.formError)}</p>` : ''}
           <div class="fb-form-foot">
             <button type="button" class="fb-link" data-act="cancel">Cancel</button>
             <button type="submit" class="fb-submit" ${t.busy ? 'disabled' : ''}>Save</button>
           </div>
         </form>`
      : `<p class="fb-c-body">${esc(c.body)}</p>`;

    let replyBox = '';
    if (t.replyTo === c.id) {
      replyBox = !me
        ? `<div class="fb-reply-box">${signInButtons('Sign in to reply:')}
             <button type="button" class="fb-link" data-act="cancel">Cancel</button></div>`
        : me.is_blocked ? ''
        : `<form class="fb-form fb-form-inline fb-reply-box" data-form="reply" data-cid="${c.id}">
             <textarea class="fb-input" data-input="replyDraft" maxlength="${MAX_LEN}" rows="2"
                       placeholder="Reply to ${esc(name)}…" aria-label="Write a reply">${esc(t.replyDraft)}</textarea>
             ${t.formError && t.replyTo === c.id ? `<p class="fb-error" role="alert">${esc(t.formError)}</p>` : ''}
             <div class="fb-form-foot">
               ${me.is_admin ? `<label class="fb-official"><input type="checkbox" data-input="official" ${t.asOfficial ? 'checked' : ''}> Reply as OTS Ullu</label>` : ''}
               <button type="button" class="fb-link" data-act="cancel">Cancel</button>
               <button type="submit" class="fb-submit" ${t.busy ? 'disabled' : ''}>Reply</button>
             </div>
           </form>`;
    }

    return `<li class="fb-c${c.is_official ? ' fb-c-official' : ''}" data-cid="${c.id}">
      <div class="fb-c-main">
        ${avatar(name, c.author_avatar, c.is_official)}
        <div class="fb-c-content">
          <div class="fb-c-head">
            <span class="fb-c-name">${esc(name)}</span>
            ${c.is_official ? '<span class="fb-badge">Official</span>' : ''}
            <time class="fb-c-time" datetime="${esc(c.created_at)}" title="${esc(fullDate(c.created_at))}">${esc(ago(c.created_at))}</time>
            ${c.edited_at ? `<span class="fb-edited" title="Edited ${esc(fullDate(c.edited_at))}">(edited)</span>` : ''}
          </div>
          ${body}
          ${editing ? '' : `<div class="fb-c-actions">
            <button type="button" class="fb-link" data-act="reply" data-cid="${c.id}">Reply</button>
            ${c.is_mine ? `<button type="button" class="fb-link" data-act="edit" data-cid="${c.id}">Edit</button>
                           <button type="button" class="fb-link" data-act="delete" data-cid="${c.id}">Delete</button>` : ''}
          </div>`}
          ${replyBox}
        </div>
      </div>
      ${repliesHtml}
    </li>`;
  }

  function render(t) {
    const kids = new Map();
    const top  = [];
    t.comments.forEach(c => {
      if (c.parent_id == null) top.push(c);
      else {
        if (!kids.has(c.parent_id)) kids.set(c.parent_id, []);
        kids.get(c.parent_id).push(c);
      }
    });
    top.reverse();   // newest conversations first; replies stay oldest-first
    const visible = t.comments.filter(c => c.status === 'visible').length;

    let list;
    if (t.loading)        list = '<p class="fb-note">Loading comments…</p>';
    else if (t.error)     list = `<p class="fb-error">${esc(t.error)}</p>`;
    else if (!top.length) list = '<p class="fb-note">No comments yet. Be the first to share a thought.</p>';
    else list = `<ol class="fb-list">${top.map(c => commentHtml(t, c, kids, 0)).join('')}</ol>`;

    t.el.innerHTML = `
      <div class="fb-thread">
        <div class="fb-auth">${authBar()}</div>
        ${composer(t)}
        ${t.loading || t.error ? '' : `<p class="fb-count">${visible} ${visible === 1 ? 'comment' : 'comments'}</p>`}
        ${list}
      </div>`;
  }

  function focusInput(t, name) {
    const ta = t.el.querySelector(`[data-input="${name}"]`);
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }

  function wireThread(t) {
    t.el.addEventListener('input', e => {
      const key = e.target.dataset && e.target.dataset.input;
      if (key === 'draft' || key === 'replyDraft' || key === 'editDraft') {
        t[key] = e.target.value;
        const counter = e.target.closest('form').querySelector('.fb-counter');
        if (counter) counter.textContent = `${e.target.value.length}/${MAX_LEN}`;
      }
    });
    t.el.addEventListener('change', e => {
      if (e.target.dataset && e.target.dataset.input === 'official') t.asOfficial = e.target.checked;
    });
    // Broken profile photo → initials.
    t.el.addEventListener('error', e => {
      const img = e.target;
      if (img.tagName === 'IMG' && img.classList.contains('fb-av') && !img.classList.contains('fb-av-owl')) {
        const span = document.createElement('span');
        const name = img.dataset.name || '';
        span.className = 'fb-av fb-av-ini';
        span.style.background = `hsl(${hue(name)} 42% 42%)`;
        span.textContent = initials(name);
        img.replaceWith(span);
      }
    }, true);

    t.el.addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      const kind = form.dataset.form;
      const cid  = form.dataset.cid ? Number(form.dataset.cid) : null;
      const text = (kind === 'main' ? t.draft : kind === 'reply' ? t.replyDraft : t.editDraft).trim();
      if (!text || t.busy) return;
      t.busy = true;
      t.formError = '';
      form.querySelectorAll('.fb-submit').forEach(b => { b.disabled = true; });
      try {
        if (kind === 'edit') {
          await rpc('edit_comment', { p_id: cid, p_body: text });
          t.editing = null; t.editDraft = '';
        } else {
          await rpc('post_comment', {
            p_item: t.item.id, p_body: text, p_parent: kind === 'reply' ? cid : null,
            p_as_official: !!(me && me.is_admin && t.asOfficial),
            p_title: t.item.title, p_url: t.item.url,
          });
          if (kind === 'reply') { t.replyTo = null; t.replyDraft = ''; }
          else t.draft = '';
          refreshStats([t.item.id]);
        }
        t.busy = false;
        await loadComments(t);
      } catch (err) {
        t.busy = false;
        t.formError = err.message;
        render(t);
        focusInput(t, kind === 'main' ? 'draft' : kind === 'reply' ? 'replyDraft' : 'editDraft');
      }
    });

    t.el.addEventListener('click', async e => {
      const btn = e.target.closest('[data-act]');
      if (!btn || !t.el.contains(btn)) return;
      const act = btn.dataset.act;
      const cid = btn.dataset.cid ? Number(btn.dataset.cid) : null;

      if (act === 'signin') return signIn(btn.dataset.provider, t);
      if (act === 'signout') {
        const sb = await ready.catch(() => null);
        if (sb) await sb.auth.signOut();
        session = null; me = null;
        rerenderThreads();
        return;
      }
      if (act === 'rename') {
        const name = window.prompt('Display name shown with your comments (2–40 characters):', me ? me.display_name : '');
        if (name == null) return;
        try {
          const saved = await rpc('update_display_name', { p_name: name });
          if (me) me.display_name = saved;
          rerenderThreads();
        } catch (err) { toast(err.message); }
        return;
      }
      if (act === 'reply') {
        t.replyTo = t.replyTo === cid ? null : cid;
        t.editing = null; t.formError = '';
        render(t);
        focusInput(t, 'replyDraft');
        return;
      }
      if (act === 'edit') {
        const c = t.comments.find(x => x.id === cid);
        if (!c) return;
        t.editing = cid; t.editDraft = c.body || ''; t.replyTo = null; t.formError = '';
        render(t);
        focusInput(t, 'editDraft');
        return;
      }
      if (act === 'cancel') {
        t.editing = null; t.replyTo = null; t.formError = '';
        render(t);
        return;
      }
      if (act === 'delete') {
        if (!window.confirm('Delete this comment? This cannot be undone.')) return;
        try {
          await rpc('delete_comment', { p_id: cid });
          refreshStats([t.item.id]);
          await loadComments(t);
        } catch (err) { toast(err.message); }
      }
    });
  }

  async function signIn(provider, t) {
    let sb;
    try { sb = await ready; } catch (e) { toast('Sign-in is unavailable right now.'); return; }
    sSet('sessionStorage', RETURN_KEY, JSON.stringify({
      hash: location.hash, item: t.item, panel: !!t.inPanel,
      draft: t.draft, replyTo: t.replyTo, replyDraft: t.replyDraft,
    }));
    const options = { redirectTo: location.origin + location.pathname + location.search };
    if (provider === 'azure') options.scopes = 'email';
    const { error } = await sb.auth.signInWithOAuth({ provider, options });
    if (error) {
      sSet('sessionStorage', RETURN_KEY, null);
      toast('Sign-in is unavailable right now.');
    }
  }

  /* ── panel (decks + podcast episodes) ─────────────────────────────── */
  function closePanel() {
    const ov = document.getElementById('fbPanel');
    if (!ov) return;
    ov.remove();
    if (!document.getElementById('pdfModalOverlay')) document.body.style.overflow = '';
  }

  function openPanel(item) {
    if (!item) return;
    closePanel();
    const ov = document.createElement('div');
    ov.id = 'fbPanel';
    ov.className = 'fb-overlay';
    ov.innerHTML = `
      <div class="fb-panel" role="dialog" aria-modal="true" aria-labelledby="fbPanelTitle">
        <div class="fb-panel-head">
          <div>
            <p class="fb-panel-kicker">Ratings &amp; comments</p>
            <p class="fb-panel-title" id="fbPanelTitle">${esc(item.title || 'This item')}</p>
          </div>
          <button type="button" class="fb-panel-close" aria-label="Close">${ICON.x}</button>
        </div>
        <div class="fb-panel-bar"></div>
        <div class="fb-panel-body"></div>
      </div>`;
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';

    ov.querySelector('.fb-panel-bar').appendChild(createBar(item, false));
    refreshStats([item.id]);
    mountThread(ov.querySelector('.fb-panel-body'), item, true);

    ov.addEventListener('click', e => { if (e.target === ov) closePanel(); });
    ov.querySelector('.fb-panel-close').addEventListener('click', closePanel);
    // Keep arrow keys / Escape from reaching the PDF viewer underneath.
    ov.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') closePanel();
    });
    ov.querySelector('.fb-panel-close').focus();
  }

  /* ── page-level wiring ───────────────────────────────────────────── */
  function pagePath() {
    let path = location.pathname;
    const canon = document.querySelector('link[rel="canonical"]');
    try { if (canon) path = new URL(canon.href).pathname; } catch (e) {}
    return path.replace(/index\.html$/, '') || '/';
  }

  function mountArticle() {
    const article = document.querySelector('article.article-body');
    if (!article) return;
    const path = pagePath();
    const slug = path.replace(/^\/articles\//, '').replace(/^\/+|\/+$/g, '');
    if (!slug) return;
    const og = document.querySelector('meta[property="og:title"]');
    const h1 = document.querySelector('h1');
    const item = {
      id:    'article:' + slug,
      title: (og && og.content) || (h1 && h1.textContent.trim()) || document.title,
      url:   path,
      label: 'views',
    };
    const sec = document.createElement('section');
    sec.className = 'fb-article';
    sec.setAttribute('aria-label', 'Reader feedback');
    sec.innerHTML = '<h2 class="article-section-heading">Reader Feedback</h2>';
    sec.appendChild(createBar(item, false));
    const threadEl = document.createElement('div');
    sec.appendChild(threadEl);
    article.appendChild(sec);
    refreshStats([item.id]);
    mountThread(threadEl, item, false);
    trackView(item);
  }

  async function paintSiteStats() {
    const el = document.getElementById('fbSiteStats');
    if (!el) return;
    try {
      const rows = await rpc('get_site_stats');
      const r = rows && rows[0];
      if (!r) return;
      el.textContent = `${fmtNum(r.views)} visits · ${fmtNum(r.uniques)} unique visitors`;
      el.hidden = false;
    } catch (e) {}
  }

  function init() {
    const path = pagePath();
    trackView({ id: 'page:' + path, title: document.title, url: path });
    mountArticle();
    mountBars(document);
    paintSiteStats();
    if (restore && restore.panel && restore.item) {
      const item = restore.item;
      ready.then(() => openPanel(item)).catch(() => {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.OTSFeedback = { enabled: true, trackView, mountBars, openPanel, itemFromSlot };
})();
