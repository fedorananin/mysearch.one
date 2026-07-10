// Icon resolution: custom icon → built-in icon for browser-internal pages →
// Google favicon service (hi-res, optional) → Chrome's local favicon cache →
// generated letter tile.

const IS_EDGE = navigator.userAgent.includes('Edg/');

const INTERNAL_SCHEME = /^(chrome|edge|about|brave|vivaldi|opera):/i;

// Known internal pages whose URL differs between Chrome and Edge.
// We store the chrome:// form in the bookmark and translate on open.
const EDGE_MAP = {
  'chrome://password-manager/passwords': 'edge://wallet/passwords',
  'chrome://password-manager': 'edge://wallet/passwords',
  'chrome://bookmarks': 'edge://favorites',
};

export const INTERNAL_PAGES = [
  { title: 'Bookmarks',   url: 'chrome://bookmarks',                  glyph: 'star' },
  { title: 'Passwords',   url: 'chrome://password-manager/passwords', glyph: 'key' },
  { title: 'History',     url: 'chrome://history',                    glyph: 'history' },
  { title: 'Downloads',   url: 'chrome://downloads',                  glyph: 'download' },
  { title: 'Settings',    url: 'chrome://settings',                   glyph: 'gear' },
  { title: 'Extensions',  url: 'chrome://extensions',                 glyph: 'puzzle' },
];

// Paths from Material Icons (Apache 2.0), 24x24 viewBox.
const GLYPHS = {
  star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  key: 'M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
  history: 'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  gear: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  puzzle: 'M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z',
};

export function isInternalUrl(url) {
  return INTERNAL_SCHEME.test(url || '');
}

// Key for the customIcons map: sites by URL, folders by title. Titles (unlike
// folder ids) are identical across synced devices, so folder icons can sync;
// the tradeoff is that renaming a folder detaches its custom icon.
export function iconKeyFor(node) {
  return node.url || 'folder:' + node.title;
}

// Translate the stored URL into what this browser actually understands.
export function toBrowserUrl(url) {
  if (!IS_EDGE || !url.startsWith('chrome://')) return url;
  for (const [from, to] of Object.entries(EDGE_MAP)) {
    if (url === from || url.startsWith(from + '/')) return to;
  }
  return url.replace(/^chrome:\/\//, 'edge://');
}

export function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Deterministic pleasant color from a string (same domain → same color, always).
export function colorFor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 45% 42%)`;
}

// Glyph by the internal page's "host" (chrome://password-manager/anything →
// password-manager), so any sub-path or trailing slash still matches.
const HOST_GLYPHS = {
  'bookmarks': 'star', 'favorites': 'star',            // favorites = Edge
  'password-manager': 'key', 'wallet': 'key',          // wallet = Edge
  'history': 'history',
  'downloads': 'download',
  'settings': 'gear',
  'extensions': 'puzzle',
};

function internalGlyphFor(url) {
  const host = url.match(/^[a-z][a-z0-9+.-]*:\/\/([^/]+)/i)?.[1] || '';
  // Passwords live under settings in some Chromium builds.
  if (host === 'settings' && /\/passwords/.test(url)) return 'key';
  return HOST_GLYPHS[host] || 'gear';
}

function svgGlyph(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.classList.add('glyph');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', GLYPHS[name] || GLYPHS.gear);
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);
  return svg;
}

function letterEl(label) {
  const span = document.createElement('span');
  span.className = 'letter';
  span.textContent = (label || '?').trim().charAt(0).toUpperCase() || '?';
  return span;
}

// Width of a string relative to its font size, measured with the page font —
// no guessing about average glyph widths (VPN is much wider than three "average"
// characters, emoji are square, etc).
let measureCtx = null;
function textWidthRatio(text) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = '600 100px ' + getComputedStyle(document.body).fontFamily;
  return measureCtx.measureText(text).width / 100;
}

// Split words across two lines so the widest line is as narrow as possible.
function packTwoLines(words) {
  let best = [words.join(' ')];
  let bestWidth = textWidthRatio(best[0]);
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const w = Math.max(textWidthRatio(a), textWidthRatio(b));
    if (w < bestWidth) {
      bestWidth = w;
      best = [a, b];
    }
  }
  return best;
}

// Emoji or free text, scaled to exactly fit the tile: short content renders
// big, longer text shrinks, multi-word text may wrap onto two balanced lines.
function textEl(value) {
  const span = document.createElement('span');
  span.className = 'emoji';
  const words = value.trim().split(/\s+/);
  const lines = words.length >= 2 ? packTwoLines(words) : [value.trim()];
  span.textContent = lines.join('\n');
  const widest = Math.max(...lines.map(textWidthRatio));
  // Font size as a fraction of the tile side: fill 76% of the width, but no
  // bigger than 0.78 (single line) / 0.38 (two lines must also fit vertically).
  let scale = Math.min(0.78, 0.76 / Math.max(widest, 0.01));
  if (lines.length === 2) scale = Math.min(scale, 0.38);
  // The actual font-size is resolved in CSS relative to the tile size, so the
  // same element works in the main grid and in the small quick launch bar.
  span.style.setProperty('--emoji-scale', scale);
  return span;
}

function faviconCacheUrl(url, size) {
  return chrome.runtime.getURL(
    `_favicon/?pageUrl=${encodeURIComponent(url)}&size=${size}`,
  );
}

// ---- resolved-icon cache -------------------------------------------------
// External favicons are stored as data URLs in chrome.storage.local so a new
// tab can paint them instantly instead of re-fetching (which caused visible
// flicker). Entries refresh in the background after REFRESH_AFTER; the visible
// image is only swapped if the icon actually changed.

const REFRESH_AFTER = 7 * 24 * 3600 * 1000;   // revalidate weekly
const EVICT_AFTER = 30 * 24 * 3600 * 1000;    // drop bookmarks long gone
const FALLBACK = 'FALLBACK';                  // marker: external source has nothing

let iconCache = {};
let flushTimer = null;

// v2: the key was bumped when the DuckDuckGo source was added, so week-old
// Google icons (which collapse subdomains) don't linger for another week.
const CACHE_KEY = 'iconCacheV2';

export async function initIconCache() {
  iconCache = (await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY] || {};
  chrome.storage.local.remove('iconCache'); // drop the v1 cache
  const now = Date.now();
  for (const [key, entry] of Object.entries(iconCache)) {
    if (now - entry.ts > EVICT_AFTER) delete iconCache[key];
  }
}

function cachePut(key, value) {
  iconCache[key] = { v: value, ts: Date.now() };
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => chrome.storage.local.set({ [CACHE_KEY]: iconCache }), 800);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

function imageWidth(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => resolve(img.naturalWidth);
    img.src = src;
  });
}

async function fetchIconData(src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error('http ' + res.status);
  const dataUrl = await blobToDataUrl(await res.blob());
  // imageWidth doubles as validation: DDG sometimes serves text garbage with
  // a 200 status, and Google serves a tiny globe when it has nothing —
  // undecodable or ≤16px both count as a miss.
  if ((await imageWidth(dataUrl)) <= 16) throw new Error('placeholder');
  return dataUrl;
}

// "app.example.com" is a subdomain; "example.com", "www.example.com" and
// "bbc.co.uk"-style hosts are not. Heuristic, not a full public-suffix list.
function isSubdomainHost(host) {
  const labels = host.replace(/^www\./, '').split('.');
  if (labels.length <= 2) return false;
  if (labels.length === 3 &&
      ['co', 'com', 'net', 'org', 'gov', 'ac', 'edu'].includes(labels[1])) return false;
  return true;
}

async function fetchExternalIcon(pageUrl) {
  const u = new URL(pageUrl); // caller guarantees a valid http(s) URL
  const google = 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON' +
    `&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(u.origin)}&size=128`;
  const ddg = `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`;
  // Subdomains: DuckDuckGo first — it keeps per-subdomain icons
  // (calendar.notion.so ≠ notion.so), which Google collapses into one.
  // Bare domains: Google first — 128px beats DDG's typical 32px.
  const order = isSubdomainHost(u.hostname) ? [ddg, google] : [google, ddg];
  let lastError;
  for (const src of order) {
    try {
      return await fetchIconData(src);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

// Fills `tile` (an empty div) with the best available icon for the bookmark.
export function renderIcon(tile, bookmark, settings, customIcons) {
  tile.textContent = '';
  const url = bookmark.url || '';
  const label = bookmark.title || domainOf(url) || url;

  // Folders have no URL, so their custom icons are keyed by bookmark id
  // (fine: customIcons live in storage.local, which is per-device anyway,
  // and ids are stable within a profile).
  const custom = customIcons[iconKeyFor(bookmark)];
  if (custom?.type === 'emoji') {
    tile.appendChild(textEl(custom.value));
    return;
  }
  if (custom?.type === 'image') {
    const img = document.createElement('img');
    img.src = custom.value;
    img.alt = '';
    tile.appendChild(img);
    return;
  }

  // Folders without a custom icon get the folder glyph tinted by their title.
  if (!url) {
    const svg = svgGlyph('folder');
    svg.innerHTML = '';
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8z');
    p.setAttribute('fill', 'currentColor');
    svg.appendChild(p);
    tile.appendChild(svg);
    tile.classList.add('is-folder');
    return;
  }

  if (isInternalUrl(url)) {
    tile.appendChild(svgGlyph(internalGlyphFor(url)));
    return;
  }

  // Favicon cascade: cached external icon (instant) → browser's favicon
  // cache → letter tile. 'local' skips the external source entirely — the
  // browser cache is the only thing that sees dynamic, JS-drawn favicons
  // (e.g. Notion Calendar's day number).
  const domain = domainOf(url);
  const localOnly = custom?.type === 'local';
  const useExternal = settings.externalFavicons && domain && !localOnly;

  const img = document.createElement('img');
  img.alt = '';
  tile.appendChild(img);

  const showLetter = () => {
    img.remove();
    tile.style.background = colorFor(domain || label);
    tile.appendChild(letterEl(label));
  };
  const showLocal = () => {
    img.onerror = showLetter;
    img.src = faviconCacheUrl(url, 64);
  };

  if (!useExternal) {
    showLocal();
    return;
  }

  const entry = iconCache[url];
  if (entry?.v === FALLBACK) showLocal();
  else if (entry?.v) img.src = entry.v;

  if (entry && Date.now() - entry.ts < REFRESH_AFTER) return;

  // No cache entry (first sighting) or a stale one — resolve in background.
  fetchExternalIcon(url)
    .then((dataUrl) => {
      cachePut(url, dataUrl);
      if (img.isConnected && img.src !== dataUrl) img.src = dataUrl;
    })
    .catch(() => {
      // Only remember the failure when we're sure it's "nothing there", not a
      // network hiccup hiding a previously good icon.
      if (!entry?.v || entry.v === FALLBACK) {
        cachePut(url, FALLBACK);
        showLocal();
      }
    });
}
