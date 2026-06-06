Deployment and Analytics

GA4 setup
- Replace placeholder `G-XXXXXXX` in the HTML head sections with your Google Analytics Measurement ID (G-...).
- For server-side tagging or privacy-first analytics, consider using Google Tag Manager + server container.

Verify analytics
- After deploying, open a page and check Realtime in GA4.
- Use `gtag('event','page_view')` testing or Tag Assistant to validate.

Deployment notes
- Static host (Netlify, Vercel, GitHub Pages): push to repo and connect; ensure `sitemap.xml` is reachable and listed in `robots.txt`.
- For paywall/pro features: implement backend for auth and payments (recommend Stripe). The current repo includes a local test stub (`assets/paywall.js`) which uses `localStorage` for quick testing only.

Security & Privacy
- Do not rely on client-side flags for gating paid content in production.
- Add a privacy policy entry describing analytics and opt-outs.

Next steps
- Integrate server-side authentication + Stripe webhooks to enable secure pro access.
- Consider server-side rendering for key pages to improve crawlability if using heavy client-side rendering.
