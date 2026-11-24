// HTTP server: a small JSON API over data/ plus the built UI from dist/.
//
//   GET  /api/config        {googleClientId} for the login screen
//   POST /api/login/google  form post from Google's sign-in button (redirect mode):
//                           credential, g_csrf_token -> sets the session cookie and
//                           redirects to /, or to /?login=<error>. An email not yet
//                           linked to anyone gets a new user, named after the account
//   POST /api/logout        clears the cookie
//   GET  /api/me            the logged-in user's id and name, 401 if none
//   GET  /api/reference     catalog, programs, weight tables
//   GET  /api/users/:id     own cycles only (ETag header = version)
//   PUT  /api/users/:id     replace them; send If-Match with the ETag, 412 if stale
//   DELETE /api/users/:id   deletes the user and all their data, logs out
//   GET  /api/feed?email=&from=&to=  the user's training as calendar events (shared/feed.ts),
//                           for planner. Server to server: needs Authorization: Bearer
//                           with EXERCISE_FEED_KEY; 404 if the key is unset or the email unknown
//
// Users log in with a Google account. The email -> user id links are in
// data/logins.json, and an existing user is linked with `node server/link.ts`.
// The cookie is a signed token (see auth.ts), not the bare user id.

import { timingSafeEqual } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { sessionToken, sessionUser } from './auth.ts'
import { BadToken, googleKeys, verifyGoogleToken } from './google.ts'
import { exerciseFeed } from '../shared/feed.ts'
import { today } from '../shared/training.ts'
import { Conflict, etag, Invalid, NotFound, Store } from './store.ts'

class Unauthorized extends Error {}
class Forbidden extends Error {}

const root = resolve(import.meta.dirname, '..')
const store = new Store(resolve(process.env.RAUTALOKI_DATA ?? join(root, 'data')))
const dist = join(root, 'dist')
const port = Number(process.env.PORT ?? 8910)
const host = process.env.HOST ?? '0.0.0.0'
const MAX_BODY = 5 * 1024 * 1024
const COOKIE = 'rautaloki_user'
const COOKIE_AGE = 365 * 24 * 3600
const secret = await store.secret()
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? ''
const keys = googleKeys()
const feedKey = process.env.EXERCISE_FEED_KEY ?? ''
if (!googleClientId) console.warn('GOOGLE_CLIENT_ID is not set: nobody can log in')

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
}

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers })
  res.end(JSON.stringify(body))
}

async function text(req: IncomingMessage): Promise<string> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) throw new Invalid('body too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function body(req: IncomingMessage): Promise<unknown> {
  const raw = await text(req)
  try {
    return JSON.parse(raw)
  } catch {
    throw new Invalid('body is not JSON')
  }
}

function cookie(req: IncomingMessage, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return undefined
}

/** Behind the HTTPS proxy the cookie is marked Secure; on plain LAN HTTP it cannot be. */
function session(req: IncomingMessage, token: string, maxAge: number): string {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

/** The logged-in user, or Unauthorized if there is no valid session. */
async function me(req: IncomingMessage) {
  const token = cookie(req, COOKIE)
  const logins = token ? await store.logins() : {}
  const emails = Object.fromEntries(Object.entries(logins).map(([email, id]) => [id, email]))
  const id = token && sessionUser(secret, token, (id) => emails[id])
  if (!id) throw new Unauthorized()
  try {
    return await store.user(id)
  } catch (err) {
    if (err instanceof NotFound) throw new Unauthorized()
    throw err
  }
}

/**
 * A new user for a Google account no one has linked yet, named after the account. A name
 * already taken gets a number, so a namesake never lands in someone else's data.
 */
async function signUp(email: string, name: string | undefined) {
  const base = (name ?? email.split('@')[0]).replace(/\s+/g, ' ').slice(0, 36).trim() || 'User'
  let clean = base
  for (let n = 2; await store.findByName(clean); n++) clean = `${base} ${n}`
  const user = await store.createUser(clean)
  await store.link(email, user.id)
  console.log(new Date().toISOString(), 'created user', user.id)
  return user
}

async function api(req: IncomingMessage, res: ServerResponse, path: string) {
  if (path === '/api/feed' && req.method === 'GET') {
    // Without a key configured the feed does not exist, so it cannot be probed.
    const given = Buffer.from(req.headers.authorization ?? '')
    const expected = Buffer.from(`Bearer ${feedKey}`)
    if (!feedKey || given.length !== expected.length || !timingSafeEqual(given, expected)) throw new NotFound()
    const q = new URL(req.url ?? '', 'http://x').searchParams
    const date = (name: string) => {
      const v = q.get(name)
      if (v !== null && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Invalid(`${name} must be YYYY-MM-DD`)
      return v ?? undefined
    }
    const id = (await store.logins())[(q.get('email') ?? '').trim().toLowerCase()]
    if (!id) throw new NotFound()
    return json(res, 200, exerciseFeed(await store.user(id), await store.reference(), today(), date('from'), date('to')))
  }
  if (path === '/api/config' && req.method === 'GET') {
    return json(res, 200, { googleClientId })
  }
  if (path === '/api/login/google' && req.method === 'POST') {
    // Google posts the form here after the user picks an account. Errors go back to the
    // login screen as ?login=..., since this is a page load, not a fetch.
    const back = (to: string, headers: Record<string, string> = {}) => {
      res.writeHead(303, { location: to, 'cache-control': 'no-store', ...headers })
      res.end()
    }
    try {
      const form = new URLSearchParams(await text(req))
      const csrf = cookie(req, 'g_csrf_token')
      if (!csrf || csrf !== form.get('g_csrf_token')) throw new BadToken('sign-in check failed, try again')
      if (!googleClientId) throw new BadToken('Google sign-in is not configured on the server')
      const google = await verifyGoogleToken(form.get('credential') ?? '', googleClientId, keys)
      const id = (await store.logins())[google.email]
      const user = id ? await store.user(id) : await signUp(google.email, google.name)
      console.log(new Date().toISOString(), 'login', user.id)
      return back('/', { 'set-cookie': session(req, sessionToken(secret, user.id, google.email), COOKIE_AGE) })
    } catch (err) {
      const message = err instanceof BadToken || err instanceof Invalid ? err.message : 'login failed'
      if (!(err instanceof BadToken)) console.error(err)
      else console.log(new Date().toISOString(), 'login refused:', message)
      return back(`/?login=${encodeURIComponent(message)}`)
    }
  }
  if (path === '/api/logout' && req.method === 'POST') {
    return json(res, 200, { ok: true }, { 'set-cookie': session(req, '', 0) })
  }
  if (path === '/api/me' && req.method === 'GET') {
    const user = await me(req)
    return json(res, 200, { id: user.id, name: user.name })
  }
  if (path === '/api/reference' && req.method === 'GET') {
    await me(req)
    return json(res, 200, await store.reference())
  }
  const m = path.match(/^\/api\/users\/([^/]+)$/)
  if (m) {
    const user = await me(req)
    if (user.id !== m[1]) throw new Forbidden()
  }
  if (m && req.method === 'GET') {
    const user = await store.user(m[1])
    return json(res, 200, user, { etag: etag(user) })
  }
  if (m && req.method === 'PUT') {
    // A compressing proxy alters the ETag of the gzipped GET: nginx weakens it to W/"...",
    // caddy appends the encoding, "...-gzip". The content is the same, so undo both.
    const version = req.headers['if-match']?.replace(/^W\//, '').replace(/-(gzip|zstd|br|deflate)"$/, '"')
    const tag = await store.saveUser(m[1], (await body(req)) as never, version)
    console.log(new Date().toISOString(), 'saved', m[1])
    return json(res, 200, { ok: true }, { etag: tag })
  }
  if (m && req.method === 'DELETE') {
    await store.deleteUser(m[1])
    console.log(new Date().toISOString(), 'deleted user', m[1])
    return json(res, 200, { ok: true }, { 'set-cookie': session(req, '', 0) })
  }
  throw new NotFound()
}

async function file(res: ServerResponse, path: string) {
  let file = normalize(join(dist, path))
  if (!file.startsWith(dist)) throw new NotFound()
  const info = await stat(file).catch(() => null)
  if (!info?.isFile()) {
    // A missing file (has an extension) is a 404; any other path gets the app shell,
    // so a reload on any view still works.
    if (extname(path)) throw new NotFound()
    file = join(dist, 'index.html')
  }
  const cache = file.includes(`${dist}/assets/`) ? 'public, max-age=31536000, immutable' : 'no-cache'
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': cache })
  createReadStream(file).on('error', () => res.destroy()).pipe(res)
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  try {
    if (path.startsWith('/api/')) await api(req, res, path)
    else await file(res, path)
  } catch (err) {
    if (err instanceof NotFound) json(res, 404, { error: 'not found' })
    else if (err instanceof Unauthorized) json(res, 401, { error: 'not logged in' })
    else if (err instanceof Forbidden) json(res, 403, { error: err.message || 'not your data' })
    else if (err instanceof Conflict) json(res, 412, { error: 'changed elsewhere, reload' })
    else if (err instanceof Invalid) json(res, 400, { error: err.message })
    else {
      console.error(err)
      json(res, 500, { error: 'internal error' })
    }
  }
}).listen(port, host, () => console.log(`rautaloki on http://${host}:${port}, data in ${store.dir}`))
