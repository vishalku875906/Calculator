Admin Server

This folder contains a simple Express admin server to manage site config and pages JSON.

Setup
1. Install dependencies:
   ```bash
   cd admin-server
   npm install
   ```

2. Configure environment variables:
   - `ADMIN_USER` — admin username (default: `admin`)
   - `ADMIN_PASSWORD` — admin password (default: `admin`)
   - `SESSION_SECRET` — session secret for login cookies (default: `calculator-admin-session-secret`)
   - `GITHUB_TOKEN` — GitHub personal access token with repository write permissions (optional)
   - `REPO_OWNER` — GitHub repository owner
   - `REPO_NAME` — GitHub repository name
   - `SITE_URL` — canonical site URL used in sitemap generation (optional)

3. Start the server:
   ```bash
   ADMIN_USER=admin ADMIN_PASSWORD=admin SESSION_SECRET=yourSecret REPO_OWNER=yourUser REPO_NAME=Calculator GITHUB_TOKEN=ghp_... npm start
   ```

4. Open `http://localhost:4000` to use the admin UI.

API Endpoints
- `GET /status` — server status and GitHub integration availability
- `GET /pages` — returns `data/pages.json`
- `GET /config` — returns `data/site-config.json`
- `POST /update-pages` — update `data/pages.json` and optionally commit to GitHub
- `POST /update-config` — update `data/site-config.json` and optionally commit to GitHub
- `POST /regen-sitemaps` — regenerate `sitemap.xml` and `sitemap-pro-pages.xml` by scanning site `.html` pages and applying optional metadata from `data/pages.json`

Usage
- Serve the admin UI directly by navigating to `http://localhost:4000`.
- For production, secure it behind HTTPS and stronger authentication.
- Use the admin UI buttons to load/save JSON and regenerate sitemaps.
