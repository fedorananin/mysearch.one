// Search box: no logic of its own — every query goes straight to mysearch.one,
// which handles bangs and routing. Suggestions come from Brave directly:
// host_permissions in the manifest lets extension pages bypass CORS,
// so no server-side proxy is needed here.

const SEARCH_URL = 'https://mysearch.one/?q=';
const SUGGEST_URL = 'https://search.brave.com/api/suggest?q=';

export function initSearch(state) {
  const form = document.getElementById('searchform');
  const input = document.getElementById('searchinput');
  const list = document.getElementById('suggestions');

  let items = [];
  let active = -1;
  let debounceTimer = null;
  let lastQuery = '';

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

  const hide = () => {
    list.hidden = true;
    list.textContent = '';
    items = [];
    active = -1;
  };

  const render = () => {
    list.textContent = '';
    items.forEach((text, i) => {
      const li = document.createElement('li');
      li.textContent = text;
      li.classList.toggle('active', i === active);
      li.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep input focus
        go(text);
      });
      list.appendChild(li);
    });
    list.hidden = items.length === 0;
  };

  const fetchSuggestions = async (q) => {
    try {
      const res = await fetch(SUGGEST_URL + encodeURIComponent(q));
      if (!res.ok) return;
      const data = await res.json(); // OpenSearch format: [query, [suggestions]]
      if (q !== input.value.trim()) return; // stale response
      items = Array.isArray(data?.[1]) ? data[1].slice(0, 8) : [];
      active = -1;
      render();
    } catch {
      /* offline or blocked — silently no suggestions */
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    go(active >= 0 ? items[active] : input.value);
  });

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(debounceTimer);
    if (!q || !state.settings.suggestEnabled) {
      lastQuery = '';
      hide();
      return;
    }
    if (q === lastQuery) return;
    lastQuery = q;
    debounceTimer = setTimeout(() => fetchSuggestions(q), 120);
  });

  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      active = (active + dir + items.length) % items.length;
      render();
      input.value = items[active];
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
