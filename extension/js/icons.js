// Icon resolution: custom icon → built-in icon for browser-internal pages →
// external favicon services (Google/DuckDuckGo, icon.horse as a hi-res
// booster; each individually optional) → Chrome's local favicon cache →
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
  folder: 'M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8z',
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

// Tiny icon shown before the label text (optional setting). Browser favicon
// cache ONLY — no external services at this size; the cache serves a standard
// globe when it has nothing. Folders and internal pages get their glyphs.
export function labelIconFor(node) {
  let el;
  if (!node.url) {
    el = svgGlyph('folder');
  } else if (isInternalUrl(node.url)) {
    el = svgGlyph(internalGlyphFor(node.url));
  } else {
    el = document.createElement('img');
    el.src = faviconCacheUrl(node.url, 16);
    el.alt = '';
  }
  el.setAttribute('class', 'lico');
  return el;
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

// ---- crisp scaling for small icons -----------------------------------------
// A 16-32px favicon smoothly stretched over a 72px tile (144+ physical pixels
// on Retina) turns to mush. Nearest-neighbor upscaling by an INTEGER factor
// keeps every source pixel a sharp square; the final non-integer CSS scale to
// the actual tile size then only softens the block edges a touch (the classic
// pixel-art supersampling trick).
//
// Chromium's _favicon/ endpoint resizes the stored bitmap to EXACTLY the
// requested size itself — nearest-neighbor when the request is an integer
// multiple of the stored size, blurry Lanczos otherwise (see Chromium
// components/favicon_base/select_favicon_frames.cc, GetResizedBitmap). So for
// the local path the whole trick is the request size: 192 is a multiple of
// every common favicon size (16/32/48/64) and covers a 96px tile on 2x
// displays. Requesting 64 (the old behavior) NN-scales 16/32 but Lanczos-mushes
// 48, and is too small for Retina anyway.
const CRISP_SIZE = 192;

// Nearest-neighbor prescale for small external icons (the canvas equivalent of
// what _favicon/ does for local ones). Resolves to null when the image is
// already big enough (or unreadable) — caller keeps the original.
function crispUpscale(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(null);
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || w >= SHARP_ENOUGH) return resolve(null);
      const k = Math.ceil(CRISP_SIZE / w);
      const canvas = document.createElement('canvas');
      canvas.width = w * k;
      canvas.height = h * k;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, w * k, h * k);
      try {
        resolve(canvas.toDataURL());
      } catch {
        resolve(null);
      }
    };
    img.src = src;
  });
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

// The key is bumped whenever resolution improves (v2: DuckDuckGo, v3:
// icon.horse, v4: crisp upscaling), so already-cached blurry icons don't
// linger for another week.
const CACHE_KEY = 'iconCacheV4';

export async function initIconCache() {
  iconCache = (await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY] || {};
  chrome.storage.local.remove(['iconCache', 'iconCacheV2', 'iconCacheV3']); // old caches
  const now = Date.now();
  for (const [key, entry] of Object.entries(iconCache)) {
    if (now - entry.ts > EVICT_AFTER) delete iconCache[key];
  }
}

function flushCache() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => chrome.storage.local.set({ [CACHE_KEY]: iconCache }), 800);
}

// Settings keys of the switchable external sources. Cached icons may have come
// from a source the user just disabled, so toggling any of these drops the
// cache (main.js) — icons re-resolve immediately from the enabled set instead
// of after the weekly refresh.
export const ICON_SOURCE_KEYS = ['iconSrcGoogle', 'iconSrcDdg', 'iconSrcIconHorse'];

export function clearIconCache() {
  iconCache = {};
  flushCache();
}

// a: 1 = icon has transparent pixels (render inset), 0 = fully opaque
// (render edge to edge), undefined = not analyzed yet.
// p: the pinned source id this entry was resolved with ('google'/'ddg'/
// 'horse'), absent = the automatic cascade. An entry only serves renders with
// the same pin, so (un)pinning a bookmark re-resolves it immediately.
function cachePut(key, value, a, p) {
  iconCache[key] = {
    v: value,
    ts: Date.now(),
    ...(a !== undefined && { a }),
    ...(p && { p }),
  };
  flushCache();
}

// Does the image contain meaningful transparency? Sampled at 32x32; >2% of
// transparent pixels counts (catches rounded-corner icons, ignores stray
// antialiasing). Same-origin/data: URLs only — the canvas must stay readable.
function hasAlpha(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(false);
    img.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let transparent = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 128) transparent++;
        }
        resolve(transparent > size * size * 0.02);
      } catch {
        resolve(false);
      }
    };
    img.src = src;
  });
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
  const width = await imageWidth(dataUrl);
  if (width <= 16) throw new Error('placeholder');
  return { dataUrl, width };
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

// Below this width an icon visibly blurs on a full-size tile — worth asking
// one more (slower) source for a sharper version before settling.
const SHARP_ENOUGH = 64;

// One entry per external service: request URL builder + the settings key of
// its privacy toggle. The ids ('google'/'ddg'/'horse') are also what a
// per-bookmark pin ({type:'source', value}) and the cache entry's `p` field
// store — don't rename them.
const SOURCES = {
  google: {
    key: 'iconSrcGoogle',
    url: (u) => 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON' +
      `&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(u.origin)}&size=128`,
  },
  ddg: {
    key: 'iconSrcDdg',
    url: (u) => `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`,
  },
  horse: {
    key: 'iconSrcIconHorse',
    url: (u) => 'https://icon.horse/icon/' + u.hostname,
  },
};

// A single specific service, chosen by the user for this bookmark. No size
// judgement, no fallbacks — an explicit pin means "I want what THIS service
// has" (icon.horse's generated letter tile included).
async function fetchPinnedIcon(pageUrl, provider) {
  const u = new URL(pageUrl);
  return (await fetchIconData(SOURCES[provider].url(u))).dataUrl;
}

async function fetchExternalIcon(pageUrl, settings) {
  const u = new URL(pageUrl); // caller guarantees a valid http(s) URL
  const google = settings.iconSrcGoogle && SOURCES.google.url(u);
  const ddg = settings.iconSrcDdg && SOURCES.ddg.url(u);
  // Subdomains: DuckDuckGo first — it keeps per-subdomain icons
  // (calendar.notion.so ≠ notion.so), which Google collapses into one.
  // Bare domains: Google first — 128px beats DDG's typical 32px.
  const order = (isSubdomainHost(u.hostname) ? [ddg, google] : [google, ddg])
    .filter(Boolean);
  let best = null;
  let lastError;
  for (const src of order) {
    try {
      const icon = await fetchIconData(src);
      if (icon.width >= SHARP_ENOUGH) return icon.dataUrl;
      if (!best || icon.width > best.width) best = icon;
    } catch (e) {
      lastError = e;
    }
  }
  // Quality booster: Google and DDG top out at ~32px for some sites (GitHub —
  // SVG favicon + apple-touch-icon, neither indexed hi-res). icon.horse crawls
  // the site itself and serves the largest icon it finds. Only consulted when
  // a source above confirmed an icon EXISTS but served it blurry: for iconless
  // sites icon.horse answers with its own generated letter tile (a perfectly
  // valid 256px PNG — undetectable), and our local letter tile is the better
  // fallback. With Google and DDG both switched off there is no such signal,
  // so icon.horse is then simply asked directly, best-effort.
  if (settings.iconSrcIconHorse && (best || order.length === 0)) {
    try {
      const icon = await fetchIconData(SOURCES.horse.url(u));
      if (!best || icon.width > best.width) return icon.dataUrl;
    } catch (e) {
      lastError = e;
    }
  }
  if (best) return best.dataUrl;
  throw lastError || new Error('no icon sources enabled');
}

// Fills `tile` (an empty div) with the best available icon for the bookmark.
export function renderIcon(tile, bookmark, settings, customIcons) {
  tile.textContent = '';
  const url = bookmark.url || '';
  const label = bookmark.title || domainOf(url) || url;

  const custom = customIcons[iconKeyFor(bookmark)];
  if (custom?.type === 'emoji') {
    tile.appendChild(textEl(custom.value));
    return;
  }
  if (custom?.type === 'image') {
    // User-uploaded images are shown as-is: no auto padding (fileToIcon
    // letterboxing would otherwise trigger the transparency heuristic).
    tile.style.setProperty('--tile-pad', '0%');
    const img = document.createElement('img');
    img.src = custom.value;
    img.alt = '';
    tile.appendChild(img);
    return;
  }

  // Folders without a custom icon get the folder glyph tinted by their title.
  if (!url) {
    tile.appendChild(svgGlyph('folder'));
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
  // Per-bookmark pinned source. A pin whose service is globally disabled is
  // ignored (→ browser cache): the privacy toggles outrank per-card choices.
  const pin = (custom?.type === 'source' && settings[SOURCES[custom.value]?.key])
    ? custom.value
    : null;
  const localOnly = custom?.type === 'local' || (custom?.type === 'source' && !pin);
  const anySource = ICON_SOURCE_KEYS.some((k) => settings[k]);
  const useExternal = anySource && domain && !localOnly;

  const img = document.createElement('img');
  img.alt = '';
  tile.appendChild(img);

  // Auto padding: icons with transparency render inset (--tile-pad from the
  // global setting), fully opaque icons fill the tile edge to edge. Pointless
  // when the tile itself is transparent — there is no card to clash with.
  const tileHasBg =
    (bookmark.url ? settings.siteTileBg : settings.folderTileBg) !== 'transparent';
  const setPad = (on) => {
    if (on && tileHasBg) tile.style.removeProperty('--tile-pad');
    else tile.style.setProperty('--tile-pad', '0%');
  };
  setPad(false); // edge to edge until we know better

  const showLetter = () => {
    img.remove();
    tile.style.background = colorFor(domain || label);
    tile.appendChild(letterEl(label));
  };
  const showLocal = () => {
    img.onerror = showLetter;
    // Crisp mode asks the browser cache for CRISP_SIZE: an integer multiple of
    // every common stored favicon size, so Chromium upscales nearest-neighbor
    // (sharp squares) instead of Lanczos (mush). See the CRISP_SIZE comment.
    img.src = faviconCacheUrl(url, settings.smallIconScaling === 'crisp' ? CRISP_SIZE : 64);
    // The browser cache icon changes between visits — analyze on every render.
    hasAlpha(img.src).then(setPad);
  };

  if (!useExternal) {
    showLocal();
    return;
  }

  const entry = iconCache[url];
  // An entry resolved under a different pin doesn't count — refetch below.
  const match = !!entry && (entry.p ?? null) === pin;
  if (match && entry.v === FALLBACK) {
    showLocal();
  } else if (match && entry.v) {
    img.src = entry.v;
    if (entry.a === undefined) {
      // Cached before transparency analysis existed — analyze once, persist.
      hasAlpha(entry.v).then((a) => {
        setPad(a);
        entry.a = a ? 1 : 0;
        flushCache();
      });
    } else {
      setPad(!!entry.a);
    }
  }

  if (match && Date.now() - entry.ts < REFRESH_AFTER) return;

  // No usable cache entry (first sighting, changed pin) or a stale one —
  // resolve in background.
  (pin ? fetchPinnedIcon(url, pin) : fetchExternalIcon(url, settings))
    .then(async (dataUrl) => {
      // Small survivors of the cascade (e.g. a 32px DDG icon that icon.horse
      // couldn't beat) get the same nearest-neighbor treatment before caching.
      // Toggling the setting clears the cache (main.js), so 'off' re-resolves
      // the originals.
      if (settings.smallIconScaling === 'crisp') {
        dataUrl = (await crispUpscale(dataUrl)) || dataUrl;
      }
      const a = (await hasAlpha(dataUrl)) ? 1 : 0;
      cachePut(url, dataUrl, a, pin);
      if (img.isConnected) {
        if (img.src !== dataUrl) img.src = dataUrl;
        setPad(!!a);
      }
    })
    .catch(() => {
      // Only remember the failure when we're sure it's "nothing there", not a
      // network hiccup hiding a previously good icon (an entry from another
      // pin doesn't count as good here).
      if (!match || !entry.v || entry.v === FALLBACK) {
        cachePut(url, FALLBACK, undefined, pin);
        showLocal();
      }
    });
}
