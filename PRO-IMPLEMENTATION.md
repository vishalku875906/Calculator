Pro Implementation Notes

Overview
- Pro features will be gated behind a paywall. This repository includes UI stubs and informational pages; the actual payment and account system is implemented as a recommended integration (Stripe + server-side subscription management).

Suggested approach
1. Authentication: add OAuth/email+password (Auth0 or custom) to manage accounts.
2. Payment: use Stripe Checkout + webhooks to create subscriptions and assign `pro` flag to user accounts.
3. Feature gating: server-side checks to allow full calculators only for users with `pro` role; for static-hosted sites, implement token-based JS that unlocks Pro UI for authenticated users.

Files added as stubs
- Hindi placeholder pages: `hi/` versions for each Pro page (translate fully later).
- `sitemap-pro-pages.xml` was added and referenced in `robots.txt`.

Next steps to finalize paywall
- Create backend endpoints for auth and subscription webhooks.
- Add client-side login UI and account management pages.
- Replace placeholder Pro buttons with checks that redirect to sign-up or show paywall modal.

Implemented test paywall (local stub)
- Added `assets/paywall.js` and `assets/paywall.css` which implement a modal and a localStorage-based `calculatorPro_isPro` flag for testing.
- Added `account/login.html` to toggle the test Pro flag in the browser.
- Pro pages include paywall modal and will show a banner or modal when `calculatorPro_isPro` is not set.

Replace with production flow
- Integrate Auth (Auth0, Firebase, or custom) and Stripe for subscriptions.
- Use server-side sessions or JWT to authorize access to pro calculators; do not rely on client-side flags for production gating.

Admin tools
- Added `/admin/index.html` — static admin UI to manage `data/pages.json` and `data/site-config.json` locally.
- Added `tools/generate-sitemaps.js` to regenerate `sitemap-pro-pages.xml` and `sitemap.xml` from `data/pages.json`.
- Workflow: edit JSON via admin UI, run the Node script locally, commit updated sitemap and JSON files.

Notes
- Keep SEO pages public (excerpts and descriptions) even if calculators are gated, so search engines can index feature pages and convert traffic.
- Use `hreflang` tags for language variants; ensure both language pages contain alternate links to each other.
