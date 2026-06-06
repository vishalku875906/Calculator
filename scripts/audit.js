const fs = require('fs');
const http = require('http');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith('.html')) htmlFiles.push(full);
  }
}
walk(root);

function rel(file) { return path.relative(root, file).replace(/\\/g, '/'); }

const issues = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const missing = [];
  if (!/<title>[^<]+<\/title>/i.test(html)) missing.push('title');
  if (!/<meta\s+name=["']description["'][^>]*>/i.test(html)) missing.push('meta description');
  if (!/<link\s+rel=["']canonical["'][^>]*>/i.test(html)) missing.push('canonical');
  if (!/<meta\s+property=["']og:title["'][^>]*>/i.test(html)) missing.push('og:title');
  if (!/<meta\s+property=["']og:description["'][^>]*>/i.test(html)) missing.push('og:description');
  if (missing.length) issues.push({ file: rel(file), type: 'metadata', detail: missing.join(', ') });

  const refs = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|javascript:|#)/i.test(ref)) continue;
    if (ref.startsWith('/#')) continue;
    const target = ref.startsWith('/') ? path.join(root, ref.slice(1)) : path.resolve(path.dirname(file), ref.split('#')[0].split('?')[0]);
    if (!fs.existsSync(target)) issues.push({ file: rel(file), type: 'broken-path', detail: ref });
  }
}

(async () => {
  const server = http.createServer((req, res) => {
    const requestPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const filePath = path.join(root, decodeURIComponent(requestPath));
    if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.js' ? 'text/javascript; charset=utf-8' : ext === '.css' ? 'text/css; charset=utf-8' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(fs.readFileSync(filePath));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = 'http://127.0.0.1:' + port + '/';

  const samples = ['index.html', 'finance-money/emi-calculator/index.html', 'printing-publishing/offset-vs-digital-break-even/index.html'];
  for (const sample of samples) {
    const file = path.join(root, sample);
    const dom = await JSDOM.fromFile(file, {
      url: baseUrl + sample,
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true,
      beforeParse(window) {
        const originalError = window.console.error.bind(window.console);
        window.console.error = (...args) => {
          issues.push({ file: sample, type: 'console-error', detail: args.join(' ') });
          originalError(...args);
        };
        window.addEventListener('error', (event) => {
          issues.push({ file: sample, type: 'runtime-error', detail: event.message || String(event.error) });
        });
      }
    });
    await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }));
    await new Promise((resolve) => setTimeout(resolve, 200));
    dom.window.close();
  }

  server.close();

  if (issues.length) {
    console.log(`AUDIT_ISSUES=${issues.length}`);
    for (const issue of issues.slice(0, 100)) console.log(`${issue.type}: ${issue.file} -> ${issue.detail}`);
    process.exitCode = 1;
  } else {
    console.log('AUDIT_ISSUES=0');
    console.log('All HTML pages passed metadata, path, and runtime checks.');
  }
})();
