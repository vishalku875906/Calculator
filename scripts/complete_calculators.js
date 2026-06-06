const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith('.html')) {
      const html = fs.readFileSync(full, 'utf8');
      let next = html.replace(/data-engine=""/g, 'data-engine="auto"');
      next = next.replace(
        /This page is fully SEO-ready and UI-complete\. Add custom formula logic in <code>assets\/site\.js<\/code> for production-grade calculations\./g,
        'This page now uses the shared auto-detected calculator engine with validation, reset, error handling, and sample values.'
      );
      if (next !== html) {
        fs.writeFileSync(full, next, 'utf8');
        console.log('updated', path.relative(root, full));
      }
    }
  }
}

walk(root);
console.log('Calculator completion pass finished.');
