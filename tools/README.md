Tools

`generate-sitemaps.js`
- Usage: `node tools/generate-sitemaps.js`
- Scans all `.html` pages in the repo and writes `sitemap-pro-pages.xml` and `sitemap.xml` in the project root.
- Uses `data/pages.json` as optional metadata for page priority and change frequency.

Admin workflow (local)
1. Run `npm run admin:start` from the repo root to start the admin server.
2. Open `http://localhost:4000` in a browser.
3. Use password `admin` to unlock controls and manage JSON values.
4. Use the admin server buttons to load/save pages and config, and to regenerate sitemaps.
5. If you prefer file-based editing, run `npm run sitemap:regen` after updating `data/pages.json`.

Note: For production, implement a secure authenticated admin backend with proper repository access.
