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
    Open `.htaccess` and update the domain in the redirect rule to match your own domain (or remove the block if you don't need canonical redirects).
    ```apache
    # Change 'mysearch.one' to your actual domain
    RewriteCond %{HTTP_HOST} !^your-domain\.com$ [NC]
    RewriteRule ^(.*)$ https://your-domain.com/$1 [R=301,L]
    ```
4.  **Done!** Access your site.

## 🤝 Contributing

This is a simple, open-source project. Feel free to fork it, add your own bangs in `index.php`, and submit a pull request!

## 📄 License

Free to use and modify.
