# mysearch.one - Search Aggregator & Redirector

## Project Overview

**mysearch.one** is a lightweight PHP-based search aggregator and redirect tool. It functions similarly to DuckDuckGo's "bang" system, allowing users to direct their queries to specific search engines or services (like Google, Yandex, YouTube, Reddit, ChatGPT) using short prefixes or suffixes (e.g., `!g`, `/yt`, `@ai`).

The repository contains two deliverables:
*   The **website** (PHP, repo root) — the search redirector itself.
*   The **browser extension** (`extension/`) — a bookmarks-based new tab / speed dial page with mysearch.one as the built-in search. Currently **unpublished**; it is loaded in developer mode only ("Load unpacked").

**Core Philosophy:**
*   **Not a Search Engine:** It does not crawl the web or index content. It redirects queries.
*   **Privacy:** No user tracking, no database. Settings are stored in client-side cookies.
*   **Unified Interface:** A single search bar to access multiple services.

## Architecture

The project is built with **PHP** and relies on a simple file-based structure. It is designed to run on a standard LAMP/WAMP stack (Apache server recommended due to `.htaccess` usage).

### Key Components

*   **`index.php`**: The core application logic.
    *   Parses the search query parameter (`q`).
    *   Detects "bang" commands (e.g., `!google`, `!ai`).
    *   Handles redirection logic.
    *   Manages the "Settings" page and cookie handling.
    *   Renders the UI by injecting content into `page.html`.
*   **`suggestions.php`**: Acts as a proxy for search suggestions. It fetches auto-complete suggestions from the Brave Search API (`https://search.brave.com/api/suggest`) to avoid CORS issues on the client side.
*   **`howitworks.txt`**: Contains the raw HTML content for the "How it works" / Help page.
*   **`opensearch.xml`**: OpenSearch description file, allowing browsers to add "mysearch.one" as a default search engine.
*   **`.htaccess`**: Apache configuration file used primarily for enforcing the canonical domain (`mysearch.one`) and handling URL rewrites if necessary.

## Data Structures (`index.php`)

The redirections are defined in an associative array `$bangs` within `index.php`.
*   **Key**: The shortcut (e.g., `'g'`, `'google'`).
*   **Value**: The target URL with a placeholder `{{{s}}}` for the query.

Example:
```php
'g' => 'https://www.google.com/search?q={{{s}}}&num=100',
```

## Setup & Usage

### Prerequisites
*   PHP 7.0+
*   Web Server (Apache/Nginx)

### Local Development
1.  Clone the repository to your web server's document root.
2.  Ensure the web server can serve PHP files.
3.  Access `index.php` via your browser (e.g., `http://localhost/search.local/`).

### Configuration
There is no backend database. User preferences (like default search engine or AI provider) are stored in **cookies** valid for 90 days.
*   **Settings Page**: Accessible via `/?mode=settings`.
*   **Cookies**:
    *   `default_bang`: The default service used if no bang is specified.
    *   `ai_provider`: The chosen AI service (ChatGPT, Claude, Perplexity, Custom).
    *   `ai_model`, `ai_domain`: Settings for custom OpenWebUI instances.

## Browser Extension (`extension/`)

A Manifest V3 extension for Chromium browsers (Chrome, Edge). Plain ES modules, **no build step, no frameworks** — the folder is loaded as-is via `chrome://extensions` → Developer mode → "Load unpacked". **Not published to any extension store yet.**

### Concept
Bookmarks are the single source of truth: a chosen bookmarks folder is rendered as the new tab start page (grid of cards), a second optional folder becomes a favicon-only "quick launch" bar. Sync, backups, and hierarchy come for free from the browser's bookmark engine. The search box and the omnibox default search both go straight to `https://mysearch.one/?q=...` — the extension does not reimplement any bang logic.

### Files
*   **`manifest.json`** — overrides the new tab, registers mysearch.one as the default search provider (`chrome_settings_overrides`; note: `favicon_url` must be an absolute URL despite what MV3 docs say), declares the background service worker and toolbar popup.
*   **`newtab.html` / `popup.html`** — same modules, two shells; `popup.html` sets `body.popup` (compact layout, links open in a new tab and close the popup).
*   **`js/main.js`** — state, rendering (grid, drill-down with breadcrumbs or sections mode, quick launch bar), theme application, card context menu, tab-group opening, external link drop.
*   **`js/settings.js`** — defaults + storage helpers + custom icon stores (migration, rename-follow, dead-key cleanup).
*   **`js/icons.js`** — favicon resolution cascade and the persistent icon cache; internal-page glyphs; emoji/text tile scaling (canvas-measured).
*   **`js/bookmarks.js`** — `chrome.bookmarks` wrappers; folder refs are stored as `{id, path}` because bookmark IDs are not stable across synced devices (path of titles is the fallback).
*   **`js/search.js`** — search box; suggestions fetched from Brave **directly** (host permission bypasses CORS, unlike the website which needs `suggestions.php`).
*   **`js/dnd.js`** — card drag & drop, written back via `bookmarks.move`.
*   **`js/menu.js`** — context menu + `<dialog>` helpers (edit, icon picker with emoji/text/image/local-favicon options).
*   **`js/settingsui.js`** — the settings slide-over panel.
*   **`js/background.js`** — service worker: "Add to start page" context menu on pages/links.

### Key mechanics (learned the hard way — do not regress)
*   **Favicon cascade**: custom icon → internal-page glyph → Google `faviconV2` (128px, regular domains) / DuckDuckGo `icons.duckduckgo.com` (subdomains — Google collapses subdomains into one icon, DDG does not) → browser favicon cache (`_favicon/`, the only source that sees dynamic JS-drawn favicons) → generated letter tile. Every external response is validated by decoding (DDG can return text garbage with HTTP 200).
*   **Icon cache**: resolved external icons are stored as data URLs in `storage.local` (`iconCacheV2`) so new tabs paint instantly without flicker; background revalidation after 7 days, eviction after 30.
*   **Custom icons**: emoji/text/"browser icon" choices live in `storage.sync` (`syncIcons`), uploaded images in `storage.local` (`customIcons`) — sync quotas (8 KB/item, 100 KB total) don't fit images. Keys: sites by URL, folders by `folder:<title>` (titles are cross-device stable, IDs are not). Newer timestamp wins on conflict. Renames/URL edits through our UI move the key; opening the settings panel sweeps orphaned keys.
*   **Settings object identity**: `state.settings` is updated **in place** (`Object.assign`) on `storage.onChanged` — the settings panel and search module hold references to it; replacing the object silently breaks live settings (this was a real bug).
*   **Internal browser pages**: `chrome://` URLs can only be opened via `chrome.tabs.update/create`; `chrome://` ↔ `edge://` mapping lives in `icons.js` (`EDGE_MAP`, e.g. passwords → `edge://wallet/passwords`).

### Known caveats
*   Edge may be hostile to `chrome_settings_overrides.search_provider` for store-installed extensions; works when sideloaded.
*   Chrome Web Store's "single purpose" policy may question the new-tab + search-provider combo — to be resolved at publication time.

## Development Conventions

*   **Style**: Functional PHP mixed with HTML generation.
*   **Templating**: Simple string replacement. The script reads `page.html` and replaces `###html###` with the dynamic content.
*   **Routing**: Query-parameter based routing (`?mode=settings`, `?mode=howitworks`).
*   **Safety**: `htmlspecialchars()` is used to sanitize output. `urlencode()` is used for query parameters in redirects.

## Common Bangs (Examples)
*   `!g` / `!google`: Google
*   `!yt` / `!youtube`: YouTube
*   `!ai` / `!chatgpt`: AI Chat
*   `!w` / `!wiki`: Wikipedia
*   `!gh` / `!github`: GitHub
*   `!wthr` / `!weather`: Weather
*   `!tr` / `!translate`: Google Translate
*   `!deepl` / `!дипл`: DeepL
*   `!oz` / `!ozon`: Ozon
*   `!wb` / `!wildberries`: Wildberries
*   `!mdn`: MDN Web Docs
*   `!npm`: NPM Packages
*   `!wa` / `!wolfram`: WolframAlpha
*   `!flaticon` / `!icons`: Flaticon
*   `!fa` / `!fontawesome`: FontAwesome
*   `!unsplash` / `!photos`: Unsplash
