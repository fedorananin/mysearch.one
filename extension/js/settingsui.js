// Settings slide-over panel. Rebuilt from scratch on every open; every change
// is saved immediately (chrome.storage.onChanged in main.js re-renders the page).

import { saveSettings, setBgImage, cleanupCustomIcons } from './settings.js';
import { allFolders, pathOf } from './bookmarks.js';
import { fileToIcon } from './menu.js';

const panel = document.getElementById('settingspanel');

// IMPORTANT: always save the exact object the panel mutates (`s` in openPanel).
// Saving `state.settings` instead broke after the first change: main.js used to
// swap that reference on storage.onChanged, so the panel kept editing a stale
// object while persisting an untouched one.
let saveTimer = null;
function save(settings) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveSettings(settings), 150);
}

export function initSettingsUI(state) {
  document.getElementById('settingsbtn').addEventListener('click', () => {
    if (panel.hidden) openPanel(state);
    else closePanel();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) closePanel();
  });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) &&
        !document.getElementById('settingsbtn').contains(e.target)) {
      closePanel();
    }
  });
}

function closePanel() {
  panel.hidden = true;
  panel.textContent = '';
}

async function openPanel(state) {
  const s = state.settings;
  panel.textContent = '';
  cleanupCustomIcons(); // fire-and-forget: sweep icon entries for dead bookmarks

  const h = document.createElement('h2');
  h.textContent = 'Settings';
  const close = document.createElement('button');
  close.id = 'closesettings';
  close.textContent = '×';
  close.title = 'Close';
  close.addEventListener('click', closePanel);
  h.appendChild(close);
  panel.appendChild(h);

  const folders = await allFolders();

  const section = (title) => {
    const el = document.createElement('h3');
    el.textContent = title;
    panel.appendChild(el);
  };

  const row = (labelText, control) => {
    const div = document.createElement('div');
    div.className = 'row';
    const label = document.createElement('label');
    label.textContent = labelText;
    div.append(label, control);
    panel.appendChild(div);
    return div;
  };

  const select = (options, value, onChange) => {
    const el = document.createElement('select');
    for (const [v, text] of options) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = text;
      el.appendChild(o);
    }
    el.value = value;
    el.addEventListener('change', () => onChange(el.value));
    return el;
  };

  const folderSelect = (current, allowNone, onChange) => {
    const options = folders.map((f) => [f.id, ' '.repeat(f.depth * 2) + (f.title || '(untitled)')]);
    if (allowNone) options.unshift(['', '— none —']);
    return select(options, current ?? '', async (v) => {
      onChange(v ? { id: v, path: await pathOf(v) } : { id: null, path: [] });
      save(s);
    });
  };

  const checkbox = (value, onChange) => {
    const el = document.createElement('input');
    el.type = 'checkbox';
    el.checked = value;
    el.addEventListener('change', () => {
      onChange(el.checked);
      save(s);
    });
    return el;
  };

  const range = (min, max, value, onChange) => {
    const el = document.createElement('input');
    el.type = 'range';
    el.min = min;
    el.max = max;
    el.value = value;
    el.addEventListener('input', () => {
      onChange(Number(el.value));
      save(s);
    });
    return el;
  };

  const color = (value, onChange) => {
    const el = document.createElement('input');
    el.type = 'color';
    el.value = value;
    el.addEventListener('input', () => {
      onChange(el.value);
      save(s);
    });
    return el;
  };

  // ---- Folders ----
  section('Folders');
  row('Main folder', folderSelect(s.mainFolder.id, false, (v) => (s.mainFolder = v)));
  row('Quick launch folder', folderSelect(s.quickFolder.id, true, (v) => (s.quickFolder = v)));
  row('Quick launch position', select(
    [['top', 'Top'], ['bottom', 'Bottom'], ['left', 'Left'], ['right', 'Right']],
    s.quickPosition,
    (v) => { s.quickPosition = v; save(s); },
  ));

  // ---- Layout ----
  section('Layout');
  row('Subfolders', select(
    [['drill', 'Open in place (drill down)'], ['sections', 'Show as sections']],
    s.viewMode,
    (v) => { s.viewMode = v; save(s); },
  ));
  row('Labels', select(
    [['title', 'Bookmark title'], ['domain', 'Domain'], ['none', 'None (icons only)']],
    s.labelSource,
    (v) => { s.labelSource = v; save(s); },
  ));
  row('Favicon in labels', checkbox(s.labelFavicon, (v) => (s.labelFavicon = v)));
  row('Label lines', select(
    [['1', 'One line'], ['2', 'Up to two lines']],
    String(s.labelLines),
    (v) => { s.labelLines = Number(v); save(s); },
  ));
  row('Open links in a new tab', checkbox(s.openInNewTab, (v) => (s.openInNewTab = v)));
  row('Icon size', range(48, 128, s.iconSize, (v) => (s.iconSize = v)));
  row('Horizontal spacing', range(0, 48, s.gridGapX, (v) => (s.gridGapX = v)));
  row('Vertical spacing', range(0, 48, s.gridGapY, (v) => (s.gridGapY = v)));

  // ---- Cards ----
  section('Cards');
  row('Corner radius', range(0, 50, s.tileRadius, (v) => (s.tileRadius = v)));
  let bgColorRow;
  const syncColorRow = () => {
    // The picker is pointless in auto theme mode — presets supply the color.
    bgColorRow.style.display =
      (s.siteTileBg === 'color' || s.folderTileBg === 'color') && s.themeMode !== 'auto'
        ? '' : 'none';
  };
  row('Site card background', select(
    [['transparent', 'Transparent'], ['color', 'Single color'], ['domain', 'Color from domain']],
    s.siteTileBg,
    (v) => {
      s.siteTileBg = v;
      syncColorRow();
      save(s);
    },
  ));
  row('Folder card background', select(
    [['transparent', 'Transparent'], ['color', 'Single color'], ['domain', 'Color from name']],
    s.folderTileBg,
    (v) => {
      s.folderTileBg = v;
      syncColorRow();
      save(s);
    },
  ));
  bgColorRow = row('Card color', color(s.tileBgColor, (v) => (s.tileBgColor = v)));
  syncColorRow();
  row('Icon padding', range(0, 25, s.iconPadding, (v) => (s.iconPadding = v)));
  const padHint = document.createElement('p');
  padHint.style.cssText = 'font-size:12px;color:var(--muted);margin:0 0 4px;line-height:1.5';
  padHint.textContent =
    'Applied automatically to icons with transparent backgrounds only — solid icons always fill the tile.';
  panel.appendChild(padHint);
  row('Border width', range(0, 4, s.borderWidth, (v) => (s.borderWidth = v)));
  row('Border color', color(s.borderColor, (v) => (s.borderColor = v)));

  // ---- Appearance ----
  section('Appearance');
  let colorRows = [];
  const syncThemeRows = () => {
    const custom = s.themeMode !== 'auto';
    for (const r of colorRows) r.style.display = custom ? '' : 'none';
    syncColorRow(); // card color row also depends on the theme mode
  };
  row('Theme', select(
    [['custom', 'Custom colors'], ['auto', 'Auto (system light/dark)']],
    s.themeMode,
    (v) => {
      s.themeMode = v;
      syncThemeRows();
      save(s);
    },
  ));
  colorRows.push(row('Background color', color(s.pageBg, (v) => (s.pageBg = v))));

  const bgBtn = document.createElement('button');
  bgBtn.className = 'small';
  bgBtn.textContent = s.hasBgImage ? 'Remove image' : 'Choose image…';
  bgBtn.addEventListener('click', async () => {
    if (s.hasBgImage) {
      await setBgImage(null);
      s.hasBgImage = false;
      bgBtn.textContent = 'Choose image…';
      save(s);
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;
        const dataUrl = await readAsDataUrl(file);
        await setBgImage(dataUrl);
        s.hasBgImage = true;
        bgBtn.textContent = 'Remove image';
        save(s);
      });
      input.click();
    }
  });
  row('Background image', bgBtn);

  colorRows.push(row('Text color', color(s.textColor, (v) => (s.textColor = v))));
  syncThemeRows();

  const fontInput = document.createElement('input');
  fontInput.type = 'text';
  fontInput.value = s.fontFamily;
  fontInput.placeholder = 'system default';
  fontInput.addEventListener('change', () => {
    s.fontFamily = fontInput.value.trim();
    save(s);
  });
  row('Font', fontInput);

  // ---- Search ----
  section('Search');
  row('Show search box', checkbox(s.searchEnabled, (v) => (s.searchEnabled = v)));
  row('Suggestions (Brave)', checkbox(s.suggestEnabled, (v) => (s.suggestEnabled = v)));

  // ---- Privacy ----
  section('Privacy');
  row('Favicons via Google & DuckDuckGo', checkbox(s.externalFavicons, (v) => (s.externalFavicons = v)));
  const hint = document.createElement('p');
  hint.style.cssText = 'font-size:12px;color:var(--muted);margin:4px 0 0;line-height:1.5';
  hint.textContent =
    'When enabled, bookmark domains are sent to Google’s and DuckDuckGo’s favicon services ' +
    'to fetch sharp icons (Google for regular domains, DuckDuckGo for subdomains). ' +
    'Disable to use only the browser’s local favicon cache (lower quality).';
  panel.appendChild(hint);

  panel.hidden = false;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => resolve(r.result);
    r.readAsDataURL(file);
  });
}
