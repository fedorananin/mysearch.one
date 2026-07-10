import {
  DEFAULTS, loadSettings, getBgImage, getCustomIcons, setCustomIcon,
  migrateIconStores, renameCustomIcon,
} from './settings.js';
import {
  getNode, getChildren, resolveFolder, onBookmarksChanged,
} from './bookmarks.js';
import {
  renderIcon, initIconCache, isInternalUrl, iconKeyFor, labelIconFor,
  toBrowserUrl, domainOf, colorFor, INTERNAL_PAGES,
} from './icons.js';
import { initSearch } from './search.js';
import { bindCardDnd, isDraggingCard } from './dnd.js';
import {
  initMenu, showMenu, formDialog, confirmDialog, iconDialog,
} from './menu.js';
import { initSettingsUI } from './settingsui.js';

const grid = document.getElementById('grid');
const quickbar = document.getElementById('quickbar');
const breadcrumbs = document.getElementById('breadcrumbs');
const emptyhint = document.getElementById('emptyhint');

const state = {
  settings: null,
  customIcons: {},
  bgImage: null,
  rootId: null,
  trail: [], // folders drilled into, from root child down to current
};

let search = null;

// The same page doubles as the toolbar popup (popup.html sets body.popup).
const IS_POPUP = document.body.classList.contains('popup');

// ---------------------------------------------------------------- theme

const THEME_PRESETS = {
  dark: { pageBg: '#1d1f24', textColor: '#e8eaed', tileBgColor: '#2b2f36' },
  light: { pageBg: '#f2f3f5', textColor: '#1f2328', tileBgColor: '#ffffff' },
};
const darkMedia = matchMedia('(prefers-color-scheme: dark)');

// Effective colors: user's custom colors, or a preset following the system.
function palette() {
  const s = state.settings;
  if (s.themeMode === 'auto') return THEME_PRESETS[darkMedia.matches ? 'dark' : 'light'];
  return { pageBg: s.pageBg, textColor: s.textColor, tileBgColor: s.tileBgColor };
}

function applyTheme() {
  const s = state.settings;
  const pal = palette();
  const css = document.documentElement.style;
  css.setProperty('--page-bg', pal.pageBg);
  css.setProperty('--text-color', pal.textColor);
  css.setProperty('--font', s.fontFamily
    ? `"${s.fontFamily}", system-ui, sans-serif`
    : 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif');
  // The popup is small — cap sizes regardless of the user's grid settings.
  css.setProperty('--icon-size', (IS_POPUP ? Math.min(s.iconSize, 48) : s.iconSize) + 'px');
  css.setProperty('--grid-gap-x', (IS_POPUP ? Math.min(s.gridGapX, 10) : s.gridGapX) + 'px');
  css.setProperty('--grid-gap-y', (IS_POPUP ? Math.min(s.gridGapY, 16) : s.gridGapY) + 'px');
  css.setProperty('--tile-radius', s.tileRadius + '%');
  css.setProperty('--border-width', s.borderWidth + 'px');
  css.setProperty('--border-color', s.borderColor);
  css.setProperty('--tile-pad', s.iconPadding + '%');
  css.setProperty('--bg-image', state.bgImage ? `url("${state.bgImage}")` : 'none');
  // Fixed side/bottom bars make no sense inside a 420px popup.
  document.body.dataset.quickpos = IS_POPUP ? 'top' : s.quickPosition;
  document.body.classList.toggle('no-labels', s.labelSource === 'none');
  document.body.classList.toggle('label-2', s.labelLines === 2);

  // 'top' places the quick bar inside the main column, right below the search
  // box; the other positions keep it as a body child so flex-direction can
  // pin it to the corresponding edge.
  const content = document.getElementById('content');
  if (document.body.dataset.quickpos === 'top') {
    if (quickbar.parentElement !== content) content.insertBefore(quickbar, breadcrumbs);
  } else if (quickbar.parentElement !== document.body) {
    document.body.insertBefore(quickbar, content);
  }
}

// ---------------------------------------------------------------- open

function openUrl(url, { newTab = false } = {}) {
  const real = toBrowserUrl(url);
  if (IS_POPUP) {
    // Navigating inside the popup would be useless — open a tab and close.
    chrome.tabs.create({ url: real });
    window.close();
  } else if (isInternalUrl(real)) {
    // chrome:// pages can only be opened through the tabs API.
    if (newTab) chrome.tabs.create({ url: real });
    else chrome.tabs.update({ url: real });
  } else if (newTab) {
    chrome.tabs.create({ url: real });
  } else {
    location.href = real;
  }
}

async function drill(node) {
  const trail = [node];
  let pid = node.parentId;
  while (pid && pid !== state.rootId) {
    const parent = await getNode(pid);
    if (!parent || parent.id === '0') break;
    trail.unshift(parent);
    pid = parent.parentId;
  }
  state.trail = trail;
  renderMain();
}

// ---------------------------------------------------------------- cards

function labelFor(node) {
  const s = state.settings;
  if (!node.url) return node.title || '(untitled)';
  if (s.labelSource === 'domain') {
    return domainOf(node.url) || node.title || node.url;
  }
  return node.title || domainOf(node.url) || node.url;
}

function createCard(node, parentId, { quick = false } = {}) {
  const s = state.settings;
  const card = document.createElement('div');
  card.className = 'card';

  const tile = document.createElement('div');
  tile.className = 'tile';
  const bgMode = node.url ? s.siteTileBg : s.folderTileBg;
  if (bgMode === 'domain') {
    tile.style.background = colorFor(node.url ? (domainOf(node.url) || node.title) : node.title);
  } else if (bgMode === 'color') {
    tile.style.background = palette().tileBgColor;
  } else {
    tile.style.background = 'transparent';
  }
  renderIcon(tile, node, s, state.customIcons);
  card.appendChild(tile);

  if (quick) {
    card.title = labelFor(node);
  } else {
    const label = document.createElement('span');
    label.className = 'label';
    const text = document.createElement('span');
    text.className = 'ltext';
    // The favicon lives INSIDE the text flow (start of the first line), so it
    // hugs the first word no matter how the centered text wraps.
    if (s.labelFavicon) text.appendChild(labelIconFor(node));
    text.appendChild(document.createTextNode(labelFor(node)));
    label.appendChild(text);
    label.title = node.title || node.url || '';
    card.appendChild(label);
  }

  card.addEventListener('click', (e) => {
    if (!node.url) {
      drill(node);
      return;
    }
    openUrl(node.url, { newTab: s.openInNewTab || e.ctrlKey || e.metaKey });
  });
  card.addEventListener('auxclick', (e) => {
    if (e.button === 1 && node.url) {
      e.preventDefault();
      openUrl(node.url, { newTab: true });
    }
  });

  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showCardMenu(e, node);
  });

  bindCardDnd(card, node, parentId, node.index);
  return card;
}

function makeCards(nodes, parentId) {
  const box = document.createElement('div');
  box.className = 'cards';
  box.dataset.parent = parentId;
  for (const node of nodes) box.appendChild(createCard(node, parentId));
  return box;
}

// ---------------------------------------------------------------- context menus

function showCardMenu(e, node) {
  const isFolder = !node.url;
  const items = [];

  if (isFolder) {
    items.push({ label: 'Open', onClick: () => drill(node) });
    items.push({ label: 'Open all as tab group', onClick: () => openAsTabGroup(node) });
  } else {
    items.push({ label: 'Open in new tab', onClick: () => openUrl(node.url, { newTab: true }) });
  }

  items.push({
    label: 'Edit…',
    onClick: async () => {
      const fields = [{ name: 'title', label: 'Title', value: node.title }];
      if (!isFolder) fields.push({ name: 'url', label: 'URL', value: node.url });
      const values = await formDialog({ title: isFolder ? 'Edit folder' : 'Edit bookmark', fields });
      if (!values) return;
      const change = { title: values.title };
      if (!isFolder && values.url) change.url = values.url;
      await chrome.bookmarks.update(node.id, change);
      // The custom icon is keyed by folder title / site URL — follow the edit.
      const newKey = iconKeyFor(isFolder ? { title: values.title } : { url: values.url || node.url });
      await renameCustomIcon(iconKeyFor(node), newKey);
    },
  });

  items.push({
    label: 'Change icon…',
    onClick: async () => {
      const key = iconKeyFor(node);
      const result = await iconDialog(state.customIcons[key], { isFolder });
      if (result === null) return;
      await setCustomIcon(key, result === 'reset' ? null : result);
    },
  });

  items.push('sep', {
    label: 'Delete',
    danger: true,
    onClick: async () => {
      const name = node.title || node.url;
      const ok = await confirmDialog(
        isFolder ? `Delete folder “${name}” and everything in it?` : `Delete “${name}”?`,
      );
      if (!ok) return;
      if (isFolder) await chrome.bookmarks.removeTree(node.id);
      else await chrome.bookmarks.remove(node.id);
    },
  });

  showMenu(e.clientX, e.clientY, items);
}

// A bookmarks folder unfolds into a named, colored tab group — a workspace.
async function openAsTabGroup(folder) {
  const children = await getChildren(folder.id);
  const urls = children.filter((c) => c.url).map((c) => toBrowserUrl(c.url));
  if (!urls.length) return;
  const tabIds = [];
  for (const url of urls) {
    tabIds.push((await chrome.tabs.create({ url, active: false })).id);
  }
  const groupId = await chrome.tabs.group({ tabIds });
  const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
  let h = 0;
  for (const ch of folder.title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  await chrome.tabGroups.update(groupId, { title: folder.title, color: colors[h % colors.length] });
  if (IS_POPUP) window.close();
}

function currentFolderId() {
  return state.trail.length ? state.trail[state.trail.length - 1].id : state.rootId;
}

function showBackgroundMenu(e) {
  e.preventDefault();
  showMenu(e.clientX, e.clientY, [
    {
      label: 'New bookmark…',
      onClick: async () => {
        const values = await formDialog({
          title: 'New bookmark',
          okLabel: 'Add',
          fields: [
            { name: 'title', label: 'Title' },
            { name: 'url', label: 'URL', placeholder: 'https://…' },
          ],
        });
        if (!values || !values.url) return;
        let url = values.url;
        if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
        await chrome.bookmarks.create({ parentId: currentFolderId(), title: values.title, url });
      },
    },
    {
      label: 'New folder…',
      onClick: async () => {
        const values = await formDialog({
          title: 'New folder',
          okLabel: 'Add',
          fields: [{ name: 'title', label: 'Name' }],
        });
        if (!values || !values.title) return;
        await chrome.bookmarks.create({ parentId: currentFolderId(), title: values.title });
      },
    },
    {
      label: 'Add browser page…',
      onClick: async () => {
        const values = await formDialog({
          title: 'Add browser page',
          okLabel: 'Add',
          fields: [{
            name: 'page',
            label: 'Page',
            type: 'select',
            options: INTERNAL_PAGES.map((p) => ({ value: p.url, label: p.title })),
          }],
        });
        if (!values) return;
        const page = INTERNAL_PAGES.find((p) => p.url === values.page);
        await chrome.bookmarks.create({
          parentId: currentFolderId(),
          title: page.title,
          url: page.url,
        });
      },
    },
  ]);
}

// ---------------------------------------------------------------- rendering

function renderBreadcrumbs(rootNode) {
  if (!state.trail.length) {
    breadcrumbs.hidden = true;
    breadcrumbs.textContent = '';
    return;
  }
  breadcrumbs.textContent = '';
  const rootLink = document.createElement('a');
  rootLink.textContent = rootNode.title || 'Home';
  rootLink.addEventListener('click', () => {
    state.trail = [];
    renderMain();
  });
  breadcrumbs.appendChild(rootLink);

  state.trail.forEach((node, i) => {
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = '›';
    breadcrumbs.appendChild(sep);
    if (i === state.trail.length - 1) {
      const cur = document.createElement('span');
      cur.className = 'current';
      cur.textContent = node.title || '(untitled)';
      breadcrumbs.appendChild(cur);
    } else {
      const link = document.createElement('a');
      link.textContent = node.title || '(untitled)';
      link.addEventListener('click', () => {
        state.trail = state.trail.slice(0, i + 1);
        renderMain();
      });
      breadcrumbs.appendChild(link);
    }
  });
  breadcrumbs.hidden = false;
}

async function renderMain() {
  const s = state.settings;
  const rootNode = await resolveFolder(s.mainFolder, '1');
  state.rootId = rootNode?.id ?? null;

  grid.textContent = '';
  emptyhint.hidden = true;

  if (!rootNode) {
    emptyhint.textContent = 'Pick a bookmarks folder in Settings to get started.';
    emptyhint.hidden = false;
    breadcrumbs.hidden = true;
    return;
  }

  // Validate the trail — folders may have been deleted meanwhile.
  const validTrail = [];
  for (const t of state.trail) {
    const node = await getNode(t.id);
    if (!node || node.url) break;
    validTrail.push(node);
  }
  state.trail = validTrail;

  renderBreadcrumbs(rootNode);

  const current = state.trail.length ? state.trail[state.trail.length - 1] : rootNode;
  const children = await getChildren(current.id);

  if (!children.length) {
    emptyhint.textContent =
      'This folder is empty. Right-click anywhere to add a bookmark, or pick another folder in Settings.';
    emptyhint.hidden = false;
    return;
  }

  if (s.viewMode === 'sections' && !state.trail.length) {
    grid.classList.add('sections');
    const loose = children.filter((c) => c.url);
    const folders = children.filter((c) => !c.url);
    if (loose.length) grid.appendChild(makeCards(loose, current.id));
    for (const folder of folders) {
      const title = document.createElement('h2');
      title.className = 'section-title';
      title.textContent = folder.title || '(untitled)';
      grid.appendChild(title);
      const sub = await getChildren(folder.id);
      grid.appendChild(makeCards(sub, folder.id));
    }
  } else {
    grid.classList.remove('sections');
    grid.appendChild(makeCards(children, current.id));
  }
}

async function renderQuickbar() {
  const s = state.settings;
  const folder = await resolveFolder(s.quickFolder, null);
  if (!folder) {
    quickbar.hidden = true;
    quickbar.textContent = '';
    return;
  }
  const children = await getChildren(folder.id);
  const links = children.filter((c) => c.url);
  quickbar.textContent = '';
  for (const node of links) quickbar.appendChild(createCard(node, folder.id, { quick: true }));
  quickbar.hidden = links.length === 0;
}

function renderAll() {
  renderQuickbar();
  renderMain();
}

// ---------------------------------------------------------------- init

async function init() {
  await migrateIconStores();
  [state.settings, state.customIcons, state.bgImage] = await Promise.all([
    loadSettings(), getCustomIcons(), getBgImage(), initIconCache(),
  ]);

  applyTheme();
  initMenu();
  initSettingsUI(state);
  search = initSearch(state);
  renderAll();

  grid.addEventListener('contextmenu', (e) => {
    // Only for empty space — cards stop propagation themselves.
    showBackgroundMenu(e);
  });
  document.body.addEventListener('contextmenu', (e) => {
    if (e.target === document.body || e.target.id === 'content') showBackgroundMenu(e);
  });

  // A link dragged in from outside (address bar, another page) becomes a
  // bookmark in the currently open folder.
  document.addEventListener('dragover', (e) => {
    if (!isDraggingCard() && e.dataTransfer?.types.includes('text/uri-list')) e.preventDefault();
  });
  document.addEventListener('drop', async (e) => {
    if (isDraggingCard()) return;
    const raw = e.dataTransfer.getData('text/uri-list').split('\n')[0]?.trim() ||
      e.dataTransfer.getData('text/plain').trim();
    if (!/^https?:\/\//i.test(raw)) return;
    e.preventDefault();
    let title = raw;
    try { title = new URL(raw).hostname.replace(/^www\./, ''); } catch { /* keep url */ }
    await chrome.bookmarks.create({ parentId: currentFolderId(), title, url: raw });
  });

  // Auto theme follows the system.
  darkMedia.addEventListener('change', () => {
    if (state.settings.themeMode === 'auto') {
      applyTheme();
      renderAll();
    }
  });

  // Re-render when bookmarks change anywhere (manager, another window, sync).
  let bookmarksTimer = null;
  onBookmarksChanged(() => {
    clearTimeout(bookmarksTimer);
    bookmarksTimer = setTimeout(renderAll, 100);
  });

  // React to settings/icons changed here or in another tab.
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'sync' && changes.syncIcons) {
      state.customIcons = await getCustomIcons();
      renderAll();
    }
    if (area === 'sync' && changes.settings) {
      // Update in place: the settings panel and search module hold references
      // to this object — swapping it out would leave them editing a stale copy.
      Object.assign(state.settings, DEFAULTS, changes.settings.newValue || {});
      state.bgImage = state.settings.hasBgImage ? await getBgImage() : null;
      applyTheme();
      search.refresh();
      renderAll();
    } else if (area === 'local' && (changes.customIcons || changes.bgImage)) {
      state.customIcons = await getCustomIcons();
      state.bgImage = await getBgImage();
      applyTheme();
      renderAll();
    }
  });
}

init();
