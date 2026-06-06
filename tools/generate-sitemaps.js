#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const rootDir = path.join(__dirname, '..')
const dataPath = path.join(rootDir, 'data', 'pages.json')
const sitemapPath = path.join(rootDir, 'sitemap-pro-pages.xml')
const sitemapAllPath = path.join(rootDir, 'sitemap.xml')
const siteUrl = process.env.SITE_URL || 'https://calculatorproai.com'

const skipDirs = new Set(['.git', 'node_modules', '.github', 'admin', 'admin-server', 'tools', 'data', 'scripts', 'test'])
const skipFiles = new Set(['sitemap.xml', 'sitemap-pro-pages.xml', 'sitemap.html'])

function normalizeLoc(loc) {
  if (!loc) return ''
  const trimmed = String(loc).trim()
  if (!trimmed) return ''

  if (trimmed.startsWith(siteUrl)) {
    loc = trimmed.slice(siteUrl.length)
  } else if (/^https?:\/\//.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      loc = parsed.pathname
    } catch (err) {
      loc = trimmed
    }
  } else {
    loc = trimmed
  }

  if (!loc.startsWith('/')) {
    loc = '/' + loc
  }
  if (loc !== '/' && loc.endsWith('/index.html')) {
    loc = loc.replace(/\/index\.html$/, '/')
  }
  return loc
}

function loadPageMetadata() {
  if (!fs.existsSync(dataPath)) {
    return {}
  }

  const raw = fs.readFileSync(dataPath, 'utf8')
  const pages = JSON.parse(raw)
  const map = {}

  pages.forEach(page => {
    const loc = normalizeLoc(page.loc || '')
    if (!loc) return
    map[loc] = {
      changefreq: page.changefreq,
      priority: page.priority
    }
  })

  return map
}

function collectHtmlPages(dir) {
  const pages = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue
      pages.push(...collectHtmlPages(fullPath))
      continue
    }

    if (!entry.name.endsWith('.html')) continue
    if (skipFiles.has(entry.name)) continue

    const relPath = path.relative(rootDir, fullPath).split(path.sep).join('/')
    pages.push({ file: fullPath, relPath })
  }

  return pages
}

function toUrl(relPath) {
  if (relPath === 'index.html') return '/'
  if (relPath.endsWith('/index.html')) {
    return '/' + relPath.slice(0, -'index.html'.length)
  }
  return '/' + relPath
}

function defaultPriority(loc) {
  if (loc === '/') return 1.0
  if (loc.endsWith('/')) return 0.8
  if (loc.includes('-pro') || loc.includes('index-')) return 0.7
  return 0.6
}

function buildPageList() {
  const metadata = loadPageMetadata()
  const foundPages = collectHtmlPages(rootDir).map(({ file, relPath }) => {
    const loc = toUrl(relPath)
    const stat = fs.statSync(file)
    return {
      loc,
      lastmod: stat.mtime.toISOString().split('T')[0],
      changefreq: metadata[loc]?.changefreq || 'weekly',
      priority: metadata[loc]?.priority != null ? metadata[loc].priority : defaultPriority(loc)
    }
  })

  const customLocs = Object.keys(metadata).filter(loc => !foundPages.some(page => page.loc === loc))
  customLocs.forEach(loc => {
    foundPages.push({
      loc,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: metadata[loc].changefreq || 'weekly',
      priority: metadata[loc].priority != null ? metadata[loc].priority : defaultPriority(loc)
    })
  })

  return foundPages.sort((a, b) => a.loc.localeCompare(b.loc))
}

function buildSitemap(pages, outPath) {
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  const body = pages.map(page => `  <url>\n    <loc>${siteUrl}${page.loc}</loc>\n    <lastmod>${page.lastmod}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`).join('\n')
  fs.writeFileSync(outPath, header + body + '\n</urlset>\n', 'utf8')
  console.log(`Generated ${outPath} with ${pages.length} URLs`)
}

function main() {
  const pages = buildPageList()
  buildSitemap(pages, sitemapPath)
  buildSitemap(pages, sitemapAllPath)
}

main()
