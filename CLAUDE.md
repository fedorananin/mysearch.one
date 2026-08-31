# mysearch.one - Search Aggregator & Redirector

## Project Overview

**mysearch.one** is a lightweight PHP-based search aggregator and redirect tool. It functions similarly to DuckDuckGo's "bang" system, allowing users to direct their queries to specific search engines or services (like Google, Yandex, YouTube, Reddit, ChatGPT) using short prefixes or suffixes (e.g., `!g`, `/yt`, `@ai`).

The repository contains four deliverables:
*   The **website** (PHP, repo root) — the search redirector itself.
*   The **browser extension** (`extension/`) — a bookmarks-based new tab / speed dial page with mysearch.one as the built-in search. Currently **unpublished**; it is loaded in developer mode only ("Load unpacked").
*   **IP lookup** (`ip/`) — served as **ip.mysearch.one**.
*   **Pomodoro timer** (`pomodoro/`) — served as **pomodoro.mysearch.one**.

### Hosting layout (one HestiaCP site)
All three PHP sites live in ONE web domain with aliases (`mysearch.one`, `www.mysearch.one`, `ip.mysearch.one`, `pomodoro.mysearch.one`) sharing a single document root. The root `.htaccess` routes by `Host`: `ip.mysearch.one` is internally rewritten to `ip/`, `pomodoro.mysearch.one` to `pomodoro/`; any other host (incl. `www`) 301s to `mysearch.one`, and `mysearch.one/ip/...` / `mysearch.one/pomodoro/...` 301 to the subdomains (no duplicate content). Because of this, code inside `ip/` and `pomodoro/` must use RELATIVE asset paths (they resolve against the subdomain root, which the rewrite maps back into the folder).

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
*   **`js/main.js`** — state, rendering (grid, drill-down with breadcrumbs or sections mode, quick launch bar, the trailing "+" add card per section), theme application (colors, fonts, and appearance CSS variables: icon saturation, hover saturation/zoom, background overlay), card context menu, tab-group opening, external link drop.
*   **`js/settings.js`** — defaults + storage helpers + custom icon stores (migration, rename-follow, dead-key cleanup).
*   **`js/icons.js`** — favicon resolution cascade and the persistent icon cache; internal-page glyphs; emoji/text tile scaling (canvas-measured).
*   **`js/bookmarks.js`** — `chrome.bookmarks` wrappers; folder refs are stored as `{id, path}` because bookmark IDs are not stable across synced devices (path of titles is the fallback).
*   **`js/search.js`** — search box; suggestions fetched from Brave **directly** (host permission bypasses CORS, unlike the website which needs `suggestions.php`).
*   **`js/dnd.js`** — card drag & drop, written back via `bookmarks.move`.
*   **`js/menu.js`** — context menu + `<dialog>` helpers (edit, icon picker with emoji/text/image/local-favicon options).
*   **`js/settingsui.js`** — the settings slide-over panel.
*   **`js/background.js`** — service worker: "Add to start page" context menu on pages/links.

### Key mechanics (learned the hard way — do not regress)
*   **Favicon cascade**: custom icon → internal-page glyph → Google `faviconV2` (128px, regular domains) / DuckDuckGo `icons.duckduckgo.com` (subdomains — Google collapses subdomains into one icon, DDG does not) → icon.horse (hi-res booster: consulted ONLY when Google/DDG confirmed an icon exists but served it <64px, e.g. GitHub — for iconless sites icon.horse returns its own generated letter tile, a valid 256px PNG that cannot be told apart from a real icon, so our local letter tile must win there) → browser favicon cache (`_favicon/`, the only source that sees dynamic JS-drawn favicons) → generated letter tile. Every external response is validated by decoding (DDG can return text garbage with HTTP 200). Each external source has its own toggle in Settings → Icon sources (`iconSrcGoogle`/`iconSrcDdg`/`iconSrcIconHorse`; the old `externalFavicons=false` migrates to all-off); the browser cache is shown as a permanently-on checkbox. Toggling any source clears the icon cache (main.js) so the change applies immediately. A bookmark can also PIN one service via the icon dialog (`{type:'source', value:'google'|'ddg'|'horse'}` in the custom-icon stores) — a pin fetches that single service with no fallbacks, is recorded in the cache entry (`p` field; entries only serve renders with the same pin, so re-pinning re-resolves instantly), and is ignored when that service's privacy toggle is off (privacy outranks pins → browser cache).
*   **Crisp scaling for small icons** (`smallIconScaling: 'crisp'|'off'`, default crisp): Chromium's `_favicon/` endpoint resizes the stored bitmap to EXACTLY the requested `size` — nearest-neighbor when the request is an integer multiple of the stored size, blurry Lanczos otherwise (Chromium `components/favicon_base/select_favicon_frames.cc`, `GetResizedBitmap`; `size=0`/"give me the original" is rejected by the URL parser). So crisp mode simply requests `size=192` (a multiple of 16/32/48/64 — every common favicon size, and enough for Retina) instead of 64. Small EXTERNAL icons (e.g. a 32px DDG survivor) get the equivalent canvas nearest-neighbor prescale (`crispUpscale`) before being cached. Toggling the setting clears the icon cache (icons are stored already-scaled). This mainly serves privacy-minded users who disable all external sources and live off the browser cache.
*   **Icon cache**: resolved external icons are stored as data URLs in `storage.local` (`iconCacheV4`) so new tabs paint instantly without flicker; background revalidation after 7 days, eviction after 30.
*   **Custom icons**: emoji/text/"browser icon"/pinned-service choices live in `storage.sync` (`syncIcons`), uploaded images in `storage.local` (`customIcons`) — sync quotas (8 KB/item, 100 KB total) don't fit images. Keys: sites by URL, folders by `folder:<title>` (titles are cross-device stable, IDs are not). Newer timestamp wins on conflict. Renames/URL edits through our UI move the key; opening the settings panel sweeps orphaned keys.
*   **Settings object identity**: `state.settings` is updated **in place** (`Object.assign`) on `storage.onChanged` — the settings panel and search module hold references to it; replacing the object silently breaks live settings (this was a real bug).
*   **Internal browser pages**: `chrome://` URLs can only be opened via `chrome.tabs.update/create`; `chrome://` ↔ `edge://` mapping lives in `icons.js` (`EDGE_MAP`, e.g. passwords → `edge://wallet/passwords`). The "+" add card and background right-click menu offer these pages as one-click presets; the bookmark always stores the `chrome://` form and `toBrowserUrl()` translates on open.
*   **Fixed-palette chrome surfaces**: the settings panel, context menu, and dialogs (`#settingspanel, #ctxmenu, #dlg` in `newtab.css`) redefine the theme CSS variables (`--text-color`, `--panel-bg`, …) to fixed dark values. This is deliberate — they must stay readable no matter what page text/background colors the user picks (a black text color used to make Settings unreadable). Do NOT make them inherit the page theme again.
*   **Background image is downscaled before storage**: `fileToBackground()` in `settingsui.js` fits the long side to 2560px and re-encodes as JPEG before writing to `storage.local`. Full-resolution photos (common from phones/OneDrive) overflow the ~10 MB local quota as base64 and the write fails — which was silent until the try/catch + downscale were added. Don't store the raw data URL.
*   **Appearance via CSS variables**: saturation (`--icon-saturation`, `--icon-saturation-hover`), hover zoom (`--hover-scale`), and the background overlay (`--overlay`, a `color-mix` tint layered over the image) are all set in `applyTheme()` and consumed in `newtab.css`. The saturation/zoom filters apply to `.tile` contents but explicitly exclude the "+" add card (`.addtile`) — it's UI chrome, not an icon. The "+" visibility (off/always/hover) is driven per-section by the `.add-hover` class on each `.cards` box, so in sections mode each section reveals only its own "+".

### Known caveats
*   Edge may be hostile to `chrome_settings_overrides.search_provider` for store-installed extensions; works when sideloaded.
*   Chrome Web Store's "single purpose" policy may question the new-tab + search-provider combo — to be resolved at publication time.

## Subdomain Services

### `ip/` — IP lookup (ip.mysearch.one)
*   **`index.php`** — the page; **`api.php`** — token-gated JSON API; **`ip.php`** — plain-text IP echo; **`functions_project.php`** — `getIPData()` / `getBrowserData()`.
*   **Databases** (`.mmdb`, gitignored, downloaded by `update.php`): `ip_database.mmdb` (ipinfo.io free country_asn — country/continent NAMES + ASN incl. `as_domain`), `geolite2-city-ipv4.mmdb` (ip-location-db GeoLite2 city), `dbip-city-lite.mmdb` (DB-IP fallback for city data). ipinfo is the ONLY source of ASN data and human-readable country/continent names — the other two cannot replace it (nearest substitute would be `@ip-location-db/asn-mmdb`, which lacks `as_domain` and names).
*   **`config.php`** (gitignored; template `config.example.php`) — `IPINFO_TOKEN` and `UPDATE_KEY`. `update.php` refuses to run without `?key=<UPDATE_KEY>` (or CLI), throttles to 8h via `last_update.txt`, and downloads to temp files so a failed fetch never clobbers a working DB. Cron line: `ip/cron.txt`.
*   **Flags** come from the jsDelivr flag-icons CDN (`FLAG_CDN` const in `index.php`); the country code `xx` (unknown/localhost) exists on the CDN as a placeholder flag. No local flag pack.

### `pomodoro/` — Pomodoro timer (pomodoro.mysearch.one)
Single-page `index.php` (25/45-min modes via `?mode=`), `quote.php` returns a random motivational quote, plus sounds/favicon. Self-contained, relative paths only.

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
