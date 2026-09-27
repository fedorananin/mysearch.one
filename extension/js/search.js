// Search box: no logic of its own — every query goes straight to mysearch.one,
// which handles bangs and routing. Suggestions come from Brave directly:
// host_permissions in the manifest lets extension pages bypass CORS,
// so no server-side proxy is needed here.
//
// Matching bookmarks are listed above the suggestions. When the query is the
// start of a bookmark's title or domain, that bookmark is preselected, so
// typing "adm" + Enter opens the admin panel; arrow keys move between the
// entries and back to the plain query (which then goes to mysearch.one).

import { labelIconFor, domainOf } from './icons.js';

const SEARCH_URL = 'https://mysearch.one/?q=';
const SUGGEST_URL = 'https://search.brave.com/api/suggest?q=';
const MAX_BOOKMARKS = 5;
const MAX_SUGGESTIONS = 8;

// openBookmark(url, {newTab, background}) — main.js's openUrl, so a bookmark
// found here opens exactly like a click on its card.
export function initSearch(state, { openBookmark }) {
  const form = document.getElementById('searchform');
  const input = document.getElementById('searchinput');
  const list = document.getElementById('suggestions');

  let bookmarks = []; // bookmark nodes matching the query
  let suggestions = []; // strings from Brave
  let active = -1; // index into entries(); -1 = the typed query itself
  let typed = ''; // what the user typed (arrowing through suggestions overwrites input)
  let debounceTimer = null;
  let lastQuery = '';
  let generation = 0; // bumped on hide, so late results don't reopen the list

  const entries = () => [
    ...bookmarks.map((node) => ({ node })),
    ...suggestions.map((text) => ({ text })),
  ];

  const go = (q) => {
    q = q.trim();
    if (!q) return;
    const url = SEARCH_URL + encodeURIComponent(q);
    if (document.body.classList.contains('popup')) {
      chrome.tabs.create({ url });
      window.close();
    } else {
      location.href = url;
    }
  };

  const openNode = (node, { background = false } = {}) => {
    hide();
    openBookmark(node.url, {
      newTab: background || state.settings.openInNewTab,
      background,
    });
  };

  const hide = () => {
    generation++;
    list.hidden = true;
    list.textContent = '';
    bookmarks = [];
    suggestions = [];
    active = -1;
  };

  const render = () => {
    list.textContent = '';
    entries().forEach((entry, i) => {
      const li = document.createElement('li');
      li.classList.toggle('active', i === active);
      if (entry.node) {
        li.className += ' bm';
        if (i === bookmarks.length - 1 && suggestions.length) li.className += ' last-bm';
        const title = document.createElement('span');
        title.className = 'bmtitle';
        title.textContent = entry.node.title || domainOf(entry.node.url) || entry.node.url;
        const domain = document.createElement('span');
        domain.className = 'bmdomain';
        domain.textContent = domainOf(entry.node.url) || entry.node.url;
        li.append(labelIconFor(entry.node), title, domain);
        li.title = entry.node.url;
      } else {
        li.textContent = entry.text;
      }
      li.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep input focus
        if (e.button > 1) return;
        if (entry.node) openNode(entry.node, { background: e.button === 1 || e.ctrlKey || e.metaKey });
        else go(entry.text);
      });
      list.appendChild(li);
    });
    list.hidden = list.children.length === 0;
  };

  // Rank: title starts with the query > a title word does > domain starts
  // with it > anything else chrome.bookmarks.search matched (e.g. the path).
  const rank = (node, q) => {
    const title = (node.title || '').toLowerCase();
    const domain = (domainOf(node.url) || '').toLowerCase();
    if (title.startsWith(q)) return 0;
    if (domain.startsWith(q)) return 1;
    if (title.split(/[\s\-–—|:·.,/()]+/).some((w) => w.startsWith(q))) return 2;
    return 3;
  };

  const searchBookmarks = async (q) => {
    if (!state.settings.bookmarkSearch) return [];
    let found = [];
    try {
      found = await chrome.bookmarks.search(q);
    } catch {
      return [];
    }
    const lq = q.toLowerCase();
    const seen = new Set();
    return found
      .filter((n) => n.url && !seen.has(n.url) && seen.add(n.url))
      .map((n) => ({ n, r: rank(n, lq) }))
      .sort((a, b) => a.r - b.r)
      .slice(0, MAX_BOOKMARKS)
      .map(({ n, r }) => Object.assign(n, { rank: r }));
  };

  const fetchSuggestions = async (q) => {
    if (!state.settings.suggestEnabled) return [];
    try {
      const res = await fetch(SUGGEST_URL + encodeURIComponent(q));
      if (!res.ok) return [];
      const data = await res.json(); // OpenSearch format: [query, [suggestions]]
      return Array.isArray(data?.[1]) ? data[1].slice(0, MAX_SUGGESTIONS) : [];
    } catch {
      return []; // offline or blocked — silently no suggestions
    }
  };

  const update = async (q) => {
    // Bookmarks are local and fast — show them without waiting for Brave.
    const gen = generation;
    const found = await searchBookmarks(q);
    if (q !== typed || gen !== generation) return; // stale
    bookmarks = found;
    suggestions = [];
    active = bookmarks[0]?.rank <= 1 ? 0 : -1;
    render();

    const sugg = await fetchSuggestions(q);
    if (q !== typed || gen !== generation) return;
    suggestions = sugg;
    render(); // bookmarks come first, so `active` still points at the same entry
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const entry = entries()[active];
    if (entry?.node) openNode(entry.node);
    else go(entry ? entry.text : input.value);
  });

  input.addEventListener('input', () => {
    const q = input.value.trim();
    typed = q;
    clearTimeout(debounceTimer);
    if (!q) {
      lastQuery = '';
      hide();
      return;
    }
    if (q === lastQuery) return;
    lastQuery = q;
    debounceTimer = setTimeout(() => update(q), 120);
  });

  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    const all = entries();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // Positions -1 … len-1: the extra slot is the plain typed query.
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      active = ((active + 1 + dir + all.length + 1) % (all.length + 1)) - 1;
      render();
      const entry = all[active];
      input.value = entry?.text ?? typed;
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && all[active]?.node) {
      // Ctrl/Cmd+Enter on a bookmark: open it in a background tab.
      e.preventDefault();
      openNode(all[active].node, { background: true });
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  input.addEventListener('blur', () => setTimeout(hide, 120));

  // Start typing anywhere on the page → focus goes to the search box.
  document.addEventListener('keydown', (e) => {
    if (!state.settings.searchEnabled || form.hidden) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1) return;
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement || t.isContentEditable) return;
    if (document.getElementById('dlg').open) return;
    input.focus();
  });

  const refresh = () => {
    form.hidden = !state.settings.searchEnabled;
  };
  refresh();
  return { refresh };
}
