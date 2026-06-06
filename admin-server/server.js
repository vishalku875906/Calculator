const express = require('express')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const fs = require('fs')
const path = require('path')
const { Octokit } = require('@octokit/rest')
const redis = require('redis')
const RedisStore = require('connect-redis').default

// Initialize Redis client for session storage
let sessionStore
const redisUrl = process.env.REDIS_URL
if (redisUrl) {
  const redisClient = redis.createClient({ url: redisUrl })
  redisClient.connect().catch(console.error)
  sessionStore = new RedisStore({ client: redisClient, prefix: 'calculator:' })
} else {
  // Use MemoryStore only in development
  const MemoryStore = require('express-session').MemoryStore
  sessionStore = new MemoryStore()
  console.warn('Using MemoryStore for sessions - not recommended for production. Set REDIS_URL environment variable for production use.')
}

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json({ limit: '2mb' }))
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'calculator-admin-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }
}))
app.use(passport.initialize())
app.use(passport.session())

const ROOT_DIR = path.join(__dirname, '..')
const DATA_DIR = path.join(ROOT_DIR, 'data')
const ADMIN_DIR = path.join(ROOT_DIR, 'admin')
const ASSETS_DIR = path.join(ROOT_DIR, 'assets')
const PAGES_FILE = path.join(DATA_DIR, 'pages.json')
const CONFIG_FILE = path.join(DATA_DIR, 'site-config.json')

const SITE_BASE_URL = process.env.SITE_URL || 'https://calculatorproai.com'
const ADMIN_USER = process.env.ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null
const REPO_OWNER = process.env.REPO_OWNER || null
const REPO_NAME = process.env.REPO_NAME || null

passport.use(new LocalStrategy({ usernameField: 'username', passwordField: 'password' }, (username, password, done) => {
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    return done(null, { username: ADMIN_USER })
  }
  return done(null, false, { message: 'Invalid username or password' })
}))

passport.serializeUser((user, done) => done(null, user.username))
passport.deserializeUser((username, done) => done(null, { username }))

let octokit = null
if (GITHUB_TOKEN && REPO_OWNER && REPO_NAME) {
  octokit = new Octokit({ auth: GITHUB_TOKEN })
}

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw)
}

function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2) + '\n'
  fs.writeFileSync(filePath, content, 'utf8')
  return content
}

function isAuthorized(req) {
  if (req.isAuthenticated && req.isAuthenticated()) return true
  const token = req.headers['x-admin-pass'] || req.body.password
  return token === ADMIN_PASSWORD
}

function requireAuth(req, res, next) {
  if (isAuthorized(req)) return next()
  res.status(401).json({ error: 'Unauthorized' })
}

app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ ok: true, user: req.user })
})

app.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err)
    req.session.destroy(() => res.json({ ok: true }))
  })
})

app.get('/me', (req, res) => {
  res.json({ authenticated: req.isAuthenticated && req.isAuthenticated(), user: req.user || null })
})

function buildSitemap(pages) {
  const now = new Date().toISOString().split('T')[0]
  const body = pages.map(page => {
    const loc = page.loc.startsWith('http') ? page.loc : `${SITE_BASE_URL}${page.loc}`
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${page.changefreq || 'weekly'}</changefreq>\n    <priority>${page.priority || 0.5}</priority>\n  </url>`
  }).join('\n') + '\n'
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}</urlset>\n`
}

function generateSitemaps() {
  const pages = loadJson(PAGES_FILE)
  const xml = buildSitemap(pages)
  fs.writeFileSync(path.join(ROOT_DIR, 'sitemap-pro-pages.xml'), xml, 'utf8')
  fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), xml, 'utf8')
  return { ok: true, count: pages.length }
}

app.get('/status', (req, res) => {
  res.json({ ok: true, github: !!octokit, repo: { owner: REPO_OWNER, name: REPO_NAME }, siteUrl: SITE_BASE_URL })
})

app.get('/pages', requireAuth, (req, res) => {
  try {
    res.json(loadJson(PAGES_FILE))
  } catch (err) {
    res.status(500).json({ error: 'Unable to read pages.json', detail: err.message })
  }
})

app.get('/config', requireAuth, (req, res) => {
  try {
    res.json(loadJson(CONFIG_FILE))
  } catch (err) {
    res.status(500).json({ error: 'Unable to read site-config.json', detail: err.message })
  }
})

app.post('/update-pages', requireAuth, async (req, res) => {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })
  const pages = req.body.pages
  if (!pages || !Array.isArray(pages)) return res.status(400).json({ error: 'Missing pages array' })

  const content = writeJson(PAGES_FILE, pages)
  if (octokit) {
    try {
      const pathInRepo = 'data/pages.json'
      const { data: refData } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: pathInRepo })
      await octokit.repos.createOrUpdateFileContents({ owner: REPO_OWNER, repo: REPO_NAME, path: pathInRepo, message: req.body.commitMessage || 'Update pages.json via admin server', content: Buffer.from(content).toString('base64'), sha: refData.sha })
    } catch (error) {
      console.error('GitHub commit failed:', error.message)
    }
  }
  res.json({ ok: true })
})

app.post('/update-config', requireAuth, async (req, res) => {
  const config = req.body.config
  if (!config || typeof config !== 'object') return res.status(400).json({ error: 'Missing config object' })

  const content = writeJson(CONFIG_FILE, config)
  if (octokit) {
    try {
      const pathInRepo = 'data/site-config.json'
      const { data: refData } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: pathInRepo })
      await octokit.repos.createOrUpdateFileContents({ owner: REPO_OWNER, repo: REPO_NAME, path: pathInRepo, message: req.body.commitMessage || 'Update site-config via admin server', content: Buffer.from(content).toString('base64'), sha: refData.sha })
    } catch (error) {
      console.error('GitHub commit failed:', error.message)
    }
  }
  res.json({ ok: true })
})

app.post('/regen-sitemaps', requireAuth, (req, res) => {
  try {
    const result = generateSitemaps()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Unable to regenerate sitemaps', detail: err.message })
  }
})

app.use('/assets', express.static(ASSETS_DIR))
app.use('/data', express.static(DATA_DIR))
app.use('/', express.static(ADMIN_DIR))

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`Admin server listening on http://localhost:${port}`))
