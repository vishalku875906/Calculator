# Calculator Pro AI static calculator hub

Generated from the attached project brief.

- Categories: 101
- Calculator pages: 1152
- Pages with working JS formula hooks included: 12
- Stack: static HTML + CSS + vanilla JS
- No API required

## What is included

- Homepage with scientific calculator widget
- Autocomplete search
- Category pages
- Individual calculator pages
- Formula / example / FAQ / related tools sections
- Light / dark mode
- Print / Save PDF flow via browser print
- CSV export for result tables
- Sitemap, robots, privacy, contact, about, disclaimer pages

## Important

This scaffold generates SEO-ready static HTML for all tools from the brief. A first batch of high-demand calculators already has working formulas in `assets/site.js`.

To make more calculators fully functional, add their exact logic in the `calculate()` switch inside `assets/site.js` and optionally add sample values in `fillSample()`.

## Admin and Pro features

- Admin UI: `/admin/index.html` provides a browser-based scaffold for editing `data/pages.json` and `data/site-config.json`.
- Local admin server: `admin-server/server.js` can run an Express admin interface with optional GitHub commit support and built-in sitemap regeneration.
- Sitemap generator: `tools/generate-sitemaps.js` scans all `.html` pages and writes `sitemap.xml` and `sitemap-pro-pages.xml`, using `data/pages.json` only as optional metadata.
- PWA support: `manifest.json` and `service-worker.js` are included for mobile installability and offline-ready page caching.
- Pro paywall stub: `assets/paywall.js`, `assets/paywall.css`, and `account/login.html` simulate Pro activation via localStorage.
- Multilingual support: English and Hindi pages are available for key Pro calculators.

## How to use the admin tools

1. Install the admin server dependencies and start it from the repo root:
   ```bash
   npm run admin:start
   ```
   If you want to install admin dependencies separately, run:
   ```bash
   npm run admin:install
   ```
2. Visit `http://localhost:4000` to open the admin UI with live server support.
3. Use the server buttons to load/save JSON and regenerate sitemaps.
4. If you edit files directly, run `npm run sitemap:regen` to update `sitemap.xml` and `sitemap-pro-pages.xml`.
5. For GitHub commit integration, set `GITHUB_TOKEN`, `REPO_OWNER`, and `REPO_NAME` before starting the admin server.
