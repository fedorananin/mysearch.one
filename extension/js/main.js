import {
  DEFAULTS, loadSettings, getBgImage, getCustomIcons, setCustomIcon,
  migrateIconStores, renameCustomIcon,
} from './settings.js';
import {
  getNode, getChildren, resolveFolder, onBookmarksChanged, allFolders,
} from './bookmarks.js';
import {
  renderIcon, initIconCache, clearIconCache, ICON_SOURCE_KEYS, isInternalUrl,
  iconKeyFor, labelIconFor, toBrowserUrl, domainOf, colorFor, INTERNAL_PAGES,
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
  selected: new Map(), // id → node of the cards picked for a bulk action
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
  css.setProperty('--icon-saturation', s.iconSaturation / 100);
  css.setProperty('--icon-saturation-hover', s.iconSaturationHover / 100);
  css.setProperty('--hover-scale', 1 + s.hoverZoom / 100);
  css.setProperty('--border-width', s.borderWidth + 'px');
  css.setProperty('--border-color', s.borderColor);
  css.setProperty('--tile-pad', s.iconPadding + '%');
  css.setProperty('--bg-image', state.bgImage ? `url("${state.bgImage}")` : 'none');
  // Optional tint over the background image (darken a bright photo / lighten a
  // dark one). Only meaningful when an image is set.
  css.setProperty('--overlay', state.bgImage && s.overlayOpacity > 0
    ? `color-mix(in srgb, ${s.overlayColor} ${s.overlayOpacity}%, transparent)`
    : 'transparent');
  // Fixed side/bottom bars make no sense inside a 420px popup.
  document.body.dataset.quickpos = IS_POPUP ? 'top' : s.quickPosition;
  document.body.classList.toggle('no-labels', s.labelSource === 'none');
  document.body.classList.toggle('label-2', s.labelLines === 2);
  document.body.classList.toggle('label-favicon-saturate', s.labelFaviconSaturation);

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

// `background` mirrors the browser's own convention: middle-click and
// Ctrl/Cmd+click open the tab without switching to it (Shift flips that).
function openUrl(url, { newTab = false, background = false } = {}) {
  const real = toBrowserUrl(url);
  if (IS_POPUP) {
    // Navigating inside the popup would be useless — open a tab. A background
    // open keeps the popup up so several links can be opened in one go.
    chrome.tabs.create({ url: real, active: !background });
    if (!background) window.close();
  } else if (newTab) {
    // openerTabId places the tab next to this one, like a native link click.
    chrome.tabs.getCurrent((tab) =>
      chrome.tabs.create({ url: real, active: !background, openerTabId: tab?.id }),
    );
  } else if (isInternalUrl(real)) {
    // chrome:// pages can only be opened through the tabs API.
    chrome.tabs.update({ url: real });
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
  card.dataset.id = node.id;
  if (state.selected.has(node.id)) {
    card.classList.add('selected');
    state.selected.set(node.id, node); // keep the freshest copy of the node
  }

  const tile = document.createElement('div');
  tile.className = 'tile';
  const isFolder = !node.url;
  const bgMode = isFolder ? s.folderTileBg : s.siteTileBg;
  if (bgMode === 'domain') {
    tile.style.background = colorFor(node.url ? (domainOf(node.url) || node.title) : node.title);
  } else if (bgMode === 'color') {
    // Site and folder cards get independent colors; auto theme has no per-kind
    // colors, so both fall back to the preset tile color there.
    const c = s.themeMode === 'auto'
      ? palette().tileBgColor
      : (isFolder ? s.folderTileBgColor : s.tileBgColor);
    const o = isFolder ? s.folderTileBgOpacity : s.tileBgOpacity;
    tile.style.background = o >= 100 ? c : `color-mix(in srgb, ${c} ${o}%, transparent)`;
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
    // Shift+click picks cards; once something is picked, plain clicks keep
    // picking until the selection is cleared (Esc, ✕ or a click on empty space).
    const modifier = e.ctrlKey || e.metaKey;
    if (!modifier && (e.shiftKey || state.selected.size)) {
      toggleSelected(node);
      return;
    }
    if (!node.url) {
      drill(node);
      return;
    }
    openUrl(node.url, {
      newTab: s.openInNewTab || modifier,
      background: modifier && !e.shiftKey,
    });
  });
  card.addEventListener('auxclick', (e) => {
    if (e.button === 1 && node.url) {
      e.preventDefault();
      openUrl(node.url, { newTab: true, background: !e.shiftKey });
    }
  });

  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.selected.has(node.id)) showSelectionMenu(e);
    else showCardMenu(e, node);
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

// Append the trailing "+" card to one section's cards box, adding to that
// section's own folder. Visibility (off/always/hover) is driven by the
// '.add-hover' class on the box itself, so in sections mode each section reveals
// only its own "+" on hover.
function appendAddCard(box, folderId, addMode) {
  if (addMode === 'hover') box.classList.add('add-hover');

  const card = document.createElement('div');
  card.className = 'card addcard';
  card.title = 'Add bookmark or folder';

  const tile = document.createElement('div');
  tile.className = 'tile addtile';
  const plus = document.createElement('span');
  plus.className = 'addplus';
  plus.textContent = '+';
  tile.appendChild(plus);
  card.appendChild(tile);

  card.addEventListener('click', (e) => {
    // Stop the click from bubbling to the document listener that closes the menu.
    e.stopPropagation();
    showMenu(e.clientX, e.clientY, addMenuItems(folderId));
    // In hover mode the "+" would otherwise fade out the moment the cursor
    // leaves the section for the menu — pin it visible until the menu closes.
    box.classList.add('addmenu-open');
    const ctx = document.getElementById('ctxmenu');
    const obs = new MutationObserver(() => {
      if (ctx.hidden) {
        box.classList.remove('addmenu-open');
        obs.disconnect();
      }
    });
    obs.observe(ctx, { attributes: true, attributeFilter: ['hidden'] });
  });

  box.appendChild(card);
}

// ---------------------------------------------------------------- context menus

function showCardMenu(e, node) {
  const isFolder = !node.url;
  const items = [];

  if (isFolder) {
    items.push({ label: 'Open', onClick: () => drill(node) });
    items.push({ label: 'Open all as tab group', onClick: () => openAsTabGroup(node) });
  } else {
    items.push({ label: 'Open in new tab', onClick: () => openUrl(node.url, { newTab: true, background: true }) });
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

  // Pre-filled copy placed right after the original — handy for "same link,
  // different domain" bookmarks (e.g. another site's admin panel). A folder
  // is copied together with everything inside it.
  items.push({
    label: 'Duplicate…',
    onClick: async () => {
      const fields = [{
        name: 'title',
        label: isFolder ? 'Name' : 'Title',
        value: isFolder ? `${node.title} (copy)` : node.title,
      }];
      if (!isFolder) fields.push({ name: 'url', label: 'URL', value: node.url });
      const values = await formDialog({
        title: isFolder ? 'Duplicate folder' : 'Duplicate bookmark',
        okLabel: 'Create',
        fields,
      });
      if (!values) return;
      const at = { parentId: node.parentId, index: node.index + 1 };
      if (isFolder) {
        await copyFolder(node, values.title, at);
        return;
      }
      if (!values.url) return;
      let url = values.url;
      if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
      await chrome.bookmarks.create({ ...at, title: values.title, url });
    },
  });

  items.push({
    label: 'Move to…',
    onClick: async () => {
      const parentId = await pickFolder('Move to folder', [node], node.parentId);
      if (parentId && parentId !== node.parentId) await moveNodes([node], parentId);
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

  items.push({ label: 'Select', onClick: () => toggleSelected(node) });

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

// Deep copy of a folder. Nested items keep their titles, so their custom icons
// (keyed by URL / folder title) apply to the copies as is; only the top
// folder may get a new name, and its icon is copied over to that name.
async function copyFolder(folder, title, { parentId, index }) {
  const [tree] = await chrome.bookmarks.getSubTree(folder.id);
  const copyChildren = async (children, into) => {
    for (const child of children || []) {
      const created = await chrome.bookmarks.create({
        parentId: into, title: child.title, ...(child.url ? { url: child.url } : {}),
      });
      if (!child.url) await copyChildren(child.children, created.id);
    }
  };
  const root = await chrome.bookmarks.create({ parentId, index, title });
  await copyChildren(tree.children, root.id);
  const icon = state.customIcons[iconKeyFor(folder)];
  if (icon && title !== folder.title) {
    const { ts, ...rest } = icon;
    await setCustomIcon(iconKeyFor({ title }), rest);
  }
}

// Folder picker for "Move to…". Folders being moved are left out together
// with their whole subtree — the API refuses to move a folder into itself.
// Resolves with the chosen folder id, or null if cancelled.
async function pickFolder(title, nodes, currentId) {
  const excluded = new Set(nodes.filter((n) => !n.url).map((n) => n.id));
  const options = [];
  let skipBelow = -1; // depth of the excluded folder whose subtree we're in
  for (const f of await allFolders()) {
    if (skipBelow >= 0 && f.depth > skipBelow) continue;
    skipBelow = -1;
    if (excluded.has(f.id)) {
      skipBelow = f.depth;
      continue;
    }
    options.push({
      value: f.id,
      label: '\u00a0\u00a0\u00a0\u00a0'.repeat(f.depth) + (f.title || '(untitled)'),
    });
  }
  const values = await formDialog({
    title,
    okLabel: 'Move',
    fields: [{ name: 'folder', label: 'Folder', type: 'select', options, value: currentId }],
  });
  return values?.folder || null;
}

// Appended to the end of the target folder, keeping their relative order.
async function moveNodes(nodes, parentId) {
  for (const node of nodes) {
    try {
      await chrome.bookmarks.move(node.id, { parentId });
    } catch { /* gone meanwhile, or an illegal move — skip it */ }
  }
}

// ---------------------------------------------------------------- selection

let selbar = null;

function toggleSelected(node) {
  if (state.selected.has(node.id)) state.selected.delete(node.id);
  else state.selected.set(node.id, node);
  syncSelection();
}

function clearSelection() {
  if (!state.selected.size) return;
  state.selected.clear();
  syncSelection();
}

// Selected nodes in on-screen order (that's the order they open / move in).
function selectedNodes() {
  const ids = [...document.querySelectorAll('.card.selected')].map((c) => c.dataset.id);
  return [...new Set(ids)].map((id) => state.selected.get(id)).filter(Boolean);
}

// Bring the card highlights and the action bar in line with state.selected.
// Also runs after every render: picks that are no longer on screen (deleted,
// moved away, or left behind in another folder) are dropped.
function syncSelection() {
  const onScreen = new Set();
  for (const card of document.querySelectorAll('.card[data-id]')) {
    card.classList.toggle('selected', state.selected.has(card.dataset.id));
    onScreen.add(card.dataset.id);
  }
  for (const id of state.selected.keys()) if (!onScreen.has(id)) state.selected.delete(id);

  const count = state.selected.size;
  document.body.classList.toggle('selecting', count > 0);
  if (!count) {
    if (selbar) selbar.hidden = true;
    return;
  }
  if (!selbar) {
    selbar = document.createElement('div');
    selbar.id = 'selbar';
    document.body.appendChild(selbar);
  }
  selbar.textContent = '';
  const info = document.createElement('span');
  info.className = 'count';
  info.textContent = `${count} selected`;
  selbar.appendChild(info);
  for (const action of selectionActions()) {
    const btn = document.createElement('button');
    btn.textContent = action.label;
    if (action.danger) btn.className = 'danger';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      action.onClick();
    });
    selbar.appendChild(btn);
  }
  const close = document.createElement('button');
  close.className = 'close';
  close.title = 'Clear selection (Esc)';
  close.textContent = '✕';
  close.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSelection();
  });
  selbar.appendChild(close);
  selbar.hidden = false;
}

// Bulk actions — shared by the action bar and the right-click menu.
function selectionActions() {
  const nodes = selectedNodes();
  const links = nodes.filter((n) => n.url);
  const actions = [];
  if (links.length) {
    actions.push({
      label: links.length > 1 ? `Open ${links.length} in new tabs` : 'Open in new tab',
      onClick: () => {
        openInBackground(links.map((n) => n.url));
        clearSelection();
      },
    });
  }
  actions.push({
    label: 'Move to…',
    onClick: async () => {
      const parentId = await pickFolder(`Move ${nodes.length} to folder`, nodes, nodes[0].parentId);
      if (!parentId) return;
      await moveNodes(nodes, parentId);
      clearSelection();
    },
  });
  actions.push({
    label: 'Delete',
    danger: true,
    onClick: async () => {
      const folders = nodes.length - links.length;
      const ok = await confirmDialog(
        `Delete ${nodes.length} selected item${nodes.length > 1 ? 's' : ''}?` +
          (folders ? ' Folders are deleted with everything in them.' : ''),
      );
      if (!ok) return;
      for (const node of nodes) {
        try {
          if (node.url) await chrome.bookmarks.remove(node.id);
          else await chrome.bookmarks.removeTree(node.id);
        } catch { /* already gone */ }
      }
      clearSelection();
    },
  });
  return actions;
}

function showSelectionMenu(e) {
  const actions = selectionActions();
  const del = actions.pop();
  showMenu(e.clientX, e.clientY, [
    ...actions, 'sep', { label: 'Clear selection', onClick: clearSelection }, 'sep', del,
  ]);
}

// Opens the links as background tabs right after this one, in order.
function openInBackground(urls) {
  chrome.tabs.getCurrent(async (tab) => {
    for (const [i, url] of urls.entries()) {
      await chrome.tabs.create({
        url: toBrowserUrl(url),
        active: false,
        ...(tab ? { index: tab.index + 1 + i, openerTabId: tab.id } : {}),
      });
    }
  });
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

// Menu items for adding content to a folder. Shared by the empty-space
// right-click menu and the "+" add card. When no target is given (background
// right-click) it falls back to the folder currently on screen; the section
// "+" cards pass their own section's folder id.
function addMenuItems(folderId) {
  const target = () => folderId ?? currentFolderId();
  const items = [
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
        await chrome.bookmarks.create({ parentId: target(), title: values.title, url });
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
        await chrome.bookmarks.create({ parentId: target(), title: values.title });
      },
    },
    'sep',
  ];
  // Quick presets for the browser's built-in pages. We store the chrome:// form;
  // toBrowserUrl() translates it to edge:// etc. when the card is opened.
  for (const page of INTERNAL_PAGES) {
    items.push({
      label: page.title,
      onClick: () =>
        chrome.bookmarks.create({ parentId: target(), title: page.title, url: page.url }),
    });
  }
  return items;
}

function showBackgroundMenu(e) {
  e.preventDefault();
  showMenu(e.clientX, e.clientY, addMenuItems());
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
  await renderMainView();
  syncSelection();
}

async function renderMainView() {
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

  const addEnabled = s.addButton !== 'off';
  // Build a section box for one folder, with its own trailing "+".
  const sectionBox = (nodes, folderId) => {
    const box = makeCards(nodes, folderId);
    if (addEnabled) appendAddCard(box, folderId, s.addButton);
    return box;
  };
  const sectionTitle = (text) => {
    const h = document.createElement('h2');
    h.className = 'section-title';
    h.textContent = text;
    grid.appendChild(h);
  };

  if (!children.length) {
    // Still offer the "+" so a freshly-created empty folder can be filled.
    if (addEnabled) {
      grid.classList.remove('sections');
      grid.appendChild(sectionBox([], current.id));
    }
    emptyhint.textContent =
      'This folder is empty. Right-click anywhere to add a bookmark, or pick another folder in Settings.';
    emptyhint.hidden = false;
    return;
  }

  if (s.viewMode === 'sections' && !state.trail.length) {
    grid.classList.add('sections');
    const loose = children.filter((c) => c.url);
    const folders = children.filter((c) => !c.url);
    // The loose/root section: its "+" adds to the root folder.
    if (loose.length || addEnabled) {
      if (s.mainSectionTitle) sectionTitle(rootNode.title || 'Home');
      grid.appendChild(sectionBox(loose, current.id));
    }
    for (const folder of folders) {
      sectionTitle(folder.title || '(untitled)');
      const sub = await getChildren(folder.id);
      // Each folder section gets its own "+", adding into that folder.
      grid.appendChild(sectionBox(sub, folder.id));
    }
  } else {
    grid.classList.remove('sections');
    grid.appendChild(sectionBox(children, current.id));
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
  syncSelection();
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

  // Esc or a click on empty space drops the selection. Menus and dialogs are
  // left alone: their own clicks don't reach here / Esc closes them first.
  // Capture phase: runs before the menu's own Esc handler has hidden it.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || document.getElementById('dlg').open) return;
    if (!document.getElementById('ctxmenu').hidden) return;
    clearSelection();
  }, true);
  document.addEventListener('click', (e) => {
    if (!state.selected.size || document.getElementById('dlg').open) return;
    if (e.target.closest('.card, #selbar, #ctxmenu, #dlg, #settingspanel')) return;
    clearSelection();
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
      // A toggled icon source invalidates cached icons: they may have come
      // from a now-disabled source, and a newly enabled one should apply now,
      // not after the weekly refresh. Same for the crisp-scaling mode — cached
      // icons are stored already-scaled.
      const { oldValue, newValue } = changes.settings;
      if (oldValue && newValue &&
          [...ICON_SOURCE_KEYS, 'smallIconScaling']
            .some((k) => oldValue[k] !== newValue[k])) {
        clearIconCache();
      }
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
