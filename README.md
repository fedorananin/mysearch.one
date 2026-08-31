# mysearch.one 🔎

**mysearch.one** is a minimalist, privacy-focused search aggregator and redirector. It unifies multiple search engines, AI services, and tools into a single, lightweight interface.

👉 **Live Demo:** [https://mysearch.one](https://mysearch.one)

---

## 🚀 What is it?

mysearch.one is **not** a search engine. It doesn't crawl the web or index pages. Instead, it acts as a smart command center for your queries.

Think of it as a "router" for your search intent. You type a query, and mysearch.one redirects it to the best service for the job—whether that's Google, YouTube, ChatGPT, or a specialized developer tool.

### Core Philosophy
*   **Efficiency:** Access 50+ services from one search bar without switching tabs.
*   **Privacy:** No tracking, no accounts, no database. Your preferences are stored locally in cookies.
*   **Simplicity:** Pure HTML/CSS/PHP. No heavy frameworks, no bloat.
*   **Speed:** Instant redirects.

## 🛠 How to Use

Simply type your query. By default, it searches using your preferred engine (e.g., Google).

To specify a service, use **bangs** (shortcuts). You can place them at the end of your query.
*   `how to cook pasta !youtube` → Searches YouTube
*   `recursion !mdn` → Searches MDN Web Docs
*   `best sci-fi movies !reddit` → Searches Reddit
*   `write a poem !gpt` → Asks ChatGPT

### Supported Prefixes
You can use any of these prefixes interchangeably: `!`, `/`, `-`, `:`, `@`.
*   `!g` = `/g` = `-g` = `:g` = `@g`

### Key Shortcuts (Bangs)

| Category | Service | Shortcut |
| :--- | :--- | :--- |
| **Search** | Google | `!g` |
| | DuckDuckGo | `!d` |
| | Bing | `!b` |
| | Brave | `!br` |
| **AI** | ChatGPT | `!gpt` |
| | Claude | `!cl` |
| | Perplexity | `!perplexity` |
| **Social** | YouTube | `!yt` |
| | Reddit | `!r` |
| | Twitter/X | `!x` |
| **Dev** | GitHub | `!gh` |
| | StackOverflow | `!st` |
| | MDN | `!mdn` |
| **Tools** | Translate | `!tr` |
| | Weather | `!wthr` |
| | Maps | `!gm` |

*See the full list on the [How it works](https://mysearch.one/?mode=howitworks) page.*

## 🌐 Companion Services

The repository also contains two small standalone tools, served as subdomains from the same codebase:

### 📍 IP Lookup — [ip.mysearch.one](https://ip.mysearch.one) ([`ip/`](ip/))
Shows your (or any) IPv4 address with geolocation, timezone, ASN/provider, and browser details.
*   **Data**: three MMDB databases, auto-refreshed by `ip/update.php` (throttled to once per 8 hours, protected by a secret key):
    *   [ipinfo.io](https://ipinfo.io) free `country_asn` — country/continent names + ASN (requires a free token);
    *   [ip-location-db](https://github.com/sapics/ip-location-db) GeoLite2 city — city/region/coordinates/timezone;
    *   [DB-IP lite](https://db-ip.com) — city-level fallback.
*   **Flags** are loaded from the [flag-icons](https://github.com/lipis/flag-icons) jsDelivr CDN — no local icon pack.
*   Quick shortcut: `!ip` on mysearch.one, or `!ip 8.8.8.8` to look up a specific address.

### 🍅 Pomodoro Timer — [pomodoro.mysearch.one](https://pomodoro.mysearch.one) ([`pomodoro/`](pomodoro/))
A minimalist Pomodoro timer with 25- and 45-minute modes, sounds, and a motivational quote for every break. Shortcut: `!pomodoro`.

## 🧩 Browser Extension — Start Page & Speed Dial

The repository also ships a companion **browser extension** (in the [`extension/`](extension/) folder) for Chromium browsers (Chrome, Edge): a new tab page built entirely from your bookmarks, with mysearch.one as the built-in search.

> ⚠️ **Not published yet.** The extension is not available in any extension store. For now it can only be installed in developer mode (see below).

### Features
*   **Bookmarks as the source of truth** — pick a bookmarks folder and it becomes your start page. Sync between devices, backups, and folder hierarchy come for free from the browser.
*   **Quick launch bar** — a second folder shown as a compact favicon-only strip (top / bottom / left / right).
*   **Sharp favicons** — fetched from Google (regular domains) and DuckDuckGo (subdomains), cached locally for instant, flicker-free loading; letter tiles as a fallback.
*   **Custom icons** — per-bookmark emoji, auto-scaled text badges, or uploaded images. Emoji/text choices sync between devices.
*   **Full management in place** — drag & drop reordering (written back to bookmarks), context-menu editing, folder drill-down with breadcrumbs or a sections view.
*   **Browser internal pages** — bookmark `chrome://` pages (passwords, bookmarks, history...) and they actually open, with automatic `chrome://` ↔ `edge://` mapping.
*   **Open a folder as a tab group** — one click turns a bookmarks folder into a named, colored tab group.
*   **"Add to start page"** — right-click any page or link to bookmark it straight into your grid or quick launch bar.
*   **Inline "+" add card** — an add button at the end of each section (always shown, on hover, or off) for quickly creating a bookmark, a folder, or a preset browser page right where you are.
*   **mysearch.one everywhere** — the search box (with Brave-powered suggestions) and the browser's default search both route through mysearch.one, so all bangs work out of the box.
*   **Customization** — themes (custom colors or auto light/dark), icon size, spacing, card shapes from square to circle, fonts, and a toolbar popup mini-dial. Fine-tune the look with icon color saturation (at rest and on hover), hover zoom, per-kind card colors and opacity (sites vs folders separately), a background image with an optional color/darken/lighten overlay, and optional section headings.

### Install (developer mode)
1.  Clone this repository (or download it).
2.  Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
3.  Click **Load unpacked** and select the `extension/` folder.
4.  Confirm the new tab / search engine prompts. Open a new tab — done. Settings live behind the gear button in the corner.

## ⚙️ Installation (Self-Hosting)

You can easily host your own instance of mysearch.one.

### Prerequisites
*   A web server (Apache/Nginx)
*   PHP 7.0 or higher

### Steps
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/fedorananin/mysearch.one.git
    ```
2.  **Upload files** to your web server's public directory.
3.  **Configure Redirects (.htaccess):**
    All three sites (search, IP lookup, Pomodoro) share one document root; the root `.htaccess` routes requests by hostname: `ip.your-domain` → `ip/`, `pomodoro.your-domain` → `pomodoro/`, everything else → the main domain. Open `.htaccess` and replace `mysearch.one` with your own domain (or strip the host-routing blocks if you only need the search).
    In a hosting panel (e.g. HestiaCP), create **one** site for `your-domain` and add `www.your-domain`, `ip.your-domain`, `pomodoro.your-domain` as aliases.
4.  **Set up the IP lookup (optional):**
    ```bash
    cp ip/config.example.php ip/config.php
    ```
    Fill in `IPINFO_TOKEN` (free token from [ipinfo.io](https://ipinfo.io/account/data-downloads)) and `UPDATE_KEY` (any long random string), then add the cron job from `ip/cron.txt` so the databases stay fresh. `ip/config.php` is gitignored — secrets never reach the repository.
5.  **Done!** Access your site.

## 🤝 Contributing

This is a simple, open-source project. Feel free to fork it, add your own bangs in `index.php`, and submit a pull request!

## 📄 License

Free to use and modify.
