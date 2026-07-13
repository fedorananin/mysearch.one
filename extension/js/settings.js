// Settings live in chrome.storage.sync so they follow the user between devices.
// Big binary blobs (background image, uploaded icons) live in chrome.storage.local:
// sync has an 8 KB per-item quota, images simply don't fit.

const SYNC_KEY = 'settings';

export const DEFAULTS = {
  // Folders are stored as {id, path}. IDs are NOT synced between devices,
  // so we keep the title path as a fallback and re-resolve it on load.
  mainFolder: { id: '1', path: [] },       // '1' = bookmarks bar
  quickFolder: { id: null, path: [] },
  quickPosition: 'top',                    // top | bottom | left | right

  viewMode: 'drill',                       // drill (folders open in place) | sections
  labelSource: 'title',                    // title | domain | none
  labelFavicon: false,                     // small favicon before the label text
  labelLines: 1,                           // 1 | 2 — max lines for the label
  openInNewTab: false,
  addButton: 'hover',                      // off | always | hover — the "+" add card

  searchEnabled: true,
  suggestEnabled: true,

  iconSize: 72,                            // tile side, px
  gridGapX: 16,                            // horizontal space between cards, px
  gridGapY: 26,                            // vertical space between card rows, px
  tileRadius: 24,                          // % of tile side, 0..50 (50 = circle)
  iconSaturation: 100,                     // % color saturation of every tile, 0 = grayscale
  iconSaturationHover: 100,                // % color saturation of a tile while hovered
  hoverZoom: 7,                            // % a tile grows on hover, 0 = no growth
  siteTileBg: 'color',                     // transparent | color | domain
  folderTileBg: 'domain',                  // transparent | color | domain (from name)
  tileBgColor: '#2b2f36',
  tileBgOpacity: 100,                      // % opacity of the single-color card background
  borderWidth: 0,                          // px
  borderColor: '#3c4043',
  iconPadding: 12,                         // inset size, % of tile side; applied per-card (icon dialog)

  themeMode: 'custom',                     // custom (colors below) | auto (system light/dark)
  pageBg: '#1d1f24',
  hasBgImage: false,                       // actual dataURL lives in storage.local
  overlayColor: '#000000',                 // tint drawn over the bg image (darken/lighten)
  overlayOpacity: 0,                       // % opacity of that tint, 0 = no overlay
  textColor: '#e8eaed',
  fontFamily: '',                          // empty = system default

  externalFavicons: true,                  // allow Google favicon service (hi-res)
};

export async function loadSettings() {
  const stored = (await chrome.storage.sync.get(SYNC_KEY))[SYNC_KEY] || {};
  // v1 had a single gridGap — carry it over to the split X/Y settings.
  if (stored.gridGap != null && stored.gridGapX == null) {
    stored.gridGapX = stored.gridGap;
    stored.gridGapY = stored.gridGap + 10;
  }
  return { ...DEFAULTS, ...stored };
}

export async function saveSettings(settings) {
  await chrome.storage.sync.set({ [SYNC_KEY]: settings });
}

// ---- storage.local helpers (bg image, custom icons) ----

export async function getBgImage() {
  const o = await chrome.storage.local.get('bgImage');
  return o.bgImage || null;
}

export async function setBgImage(dataUrl) {
  if (dataUrl) await chrome.storage.local.set({ bgImage: dataUrl });
  else await chrome.storage.local.remove('bgImage');
}

// Custom icons live in two stores:
//   emoji/text and "browser icon" choices → chrome.storage.sync (tiny strings,
//     follow the user between devices);
//   uploaded images → chrome.storage.local (5–20 KB each; sync's quotas are
//     8 KB per item / 100 KB total, images simply don't fit).
// Keys: sites by URL, folders by 'folder:<title>' (folder IDs differ between
// devices, titles don't). Entries carry a timestamp; the newer one wins.

export async function getCustomIcons() {
  const [loc, syn] = await Promise.all([
    chrome.storage.local.get('customIcons'),
    chrome.storage.sync.get('syncIcons'),
  ]);
  const merged = { ...(loc.customIcons || {}) };
  for (const [key, entry] of Object.entries(syn.syncIcons || {})) {
    if (!merged[key] || (entry.ts || 0) >= (merged[key].ts || 0)) merged[key] = entry;
  }
  return merged;
}

export async function setCustomIcon(key, icon) {
  const [loc, syn] = await Promise.all([
    chrome.storage.local.get('customIcons'),
    chrome.storage.sync.get('syncIcons'),
  ]);
  const local = loc.customIcons || {};
  const synced = syn.syncIcons || {};
  if (!icon) {
    delete local[key];
    delete synced[key];
  } else if (icon.type === 'image') {
    // An uploaded image is a per-device choice; other devices fall back to
    // whatever they resolve on their own.
    local[key] = { ...icon, ts: Date.now() };
    delete synced[key];
  } else {
    synced[key] = { ...icon, ts: Date.now() };
    delete local[key];
  }
  await chrome.storage.local.set({ customIcons: local });
  try {
    await chrome.storage.sync.set({ syncIcons: synced });
  } catch {
    // Sync quota exceeded — keep the choice working on this device at least.
    if (icon) {
      local[key] = { ...icon, ts: Date.now() };
      await chrome.storage.local.set({ customIcons: local });
    }
  }
}

// Rename/URL-edit through our own UI moves the icon entry to the new key so
// it doesn't get orphaned. If the new key already has an icon (another folder
// with the same title), that one wins and the old entry is just dropped.
export async function renameCustomIcon(oldKey, newKey) {
  if (oldKey === newKey) return;
  const [loc, syn] = await Promise.all([
    chrome.storage.local.get('customIcons'),
    chrome.storage.sync.get('syncIcons'),
  ]);
  const local = loc.customIcons || {};
  const synced = syn.syncIcons || {};
  let changed = false;
  for (const map of [local, synced]) {
    if (map[oldKey]) {
      if (!map[newKey]) map[newKey] = map[oldKey];
      delete map[oldKey];
      changed = true;
    }
  }
  if (!changed) return;
  await chrome.storage.local.set({ customIcons: local });
  try {
    await chrome.storage.sync.set({ syncIcons: synced });
  } catch { /* quota — sync copy stays under the old key until cleanup */ }
}

// Drop icon entries whose bookmark/folder no longer exists (e.g. the user
// renamed a folder in the bookmark manager, bypassing our UI). Called when
// the settings panel opens — rare enough to be free, frequent enough to keep
// the stores tidy.
export async function cleanupCustomIcons() {
  const [tree] = await chrome.bookmarks.getTree();
  const urls = new Set();
  const folderTitles = new Set();
  (function walk(node) {
    for (const child of node.children || []) {
      if (child.url) {
        urls.add(child.url);
      } else {
        folderTitles.add(child.title);
        walk(child);
      }
    }
  })(tree);
  const alive = (key) =>
    key.startsWith('folder:') ? folderTitles.has(key.slice(7)) : urls.has(key);

  const [loc, syn] = await Promise.all([
    chrome.storage.local.get('customIcons'),
    chrome.storage.sync.get('syncIcons'),
  ]);
  const local = loc.customIcons || {};
  const synced = syn.syncIcons || {};
  let changed = false;
  for (const map of [local, synced]) {
    for (const key of Object.keys(map)) {
      if (!alive(key)) {
        delete map[key];
        changed = true;
      }
    }
  }
  if (!changed) return;
  await chrome.storage.local.set({ customIcons: local });
  try {
    await chrome.storage.sync.set({ syncIcons: synced });
  } catch { /* quota — try again next time */ }
}

// One-time migration from v1 (everything in storage.local, folders keyed by
// id). Safe to call on every startup: once migrated it's a no-op.
export async function migrateIconStores() {
  const { customIcons } = await chrome.storage.local.get('customIcons');
  if (!customIcons) return;
  const local = {};
  const toSync = {};
  let changed = false;
  for (const [key, entry] of Object.entries(customIcons)) {
    let k = key;
    if (/^folder:\d+$/.test(key)) {
      try {
        const [node] = await chrome.bookmarks.get(key.slice(7));
        k = 'folder:' + node.title;
        changed = true;
      } catch {
        changed = true; // folder is gone — drop the orphaned entry
        continue;
      }
    }
    if (entry.type === 'image') {
      local[k] = entry;
    } else {
      toSync[k] = { ts: Date.now(), ...entry };
      changed = true;
    }
  }
  if (!changed) return;
  await chrome.storage.local.set({ customIcons: local });
  try {
    const { syncIcons } = await chrome.storage.sync.get('syncIcons');
    await chrome.storage.sync.set({ syncIcons: { ...toSync, ...(syncIcons || {}) } });
  } catch {
    // Quota exceeded — keep the migrated entries locally instead of losing them.
    await chrome.storage.local.set({ customIcons: { ...local, ...toSync } });
  }
}
