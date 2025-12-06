# mysearch.one - Search Aggregator & Redirector

## Project Overview

**mysearch.one** is a lightweight PHP-based search aggregator and redirect tool. It functions similarly to DuckDuckGo's "bang" system, allowing users to direct their queries to specific search engines or services (like Google, Yandex, YouTube, Reddit, ChatGPT) using short prefixes or suffixes (e.g., `!g`, `/yt`, `@ai`).

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
