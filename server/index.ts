// HTTP server: a small JSON API over data/ plus the built UI from dist/.
//
//   POST /api/login         {name, password, create?} -> sets the session cookie;
//                           404 for an unknown name unless create is true, 401 for a
//                           wrong password, 403 if the user has no password yet,
//                           429 after too many wrong passwords in a row
//   POST /api/logout        clears the cookie
//   GET  /api/me            the logged-in user's id and name, 401 if none
//   GET  /api/reference     catalog, programs, weight tables
//   GET  /api/users/:id     own cycles only (ETag header = version)
//   PUT  /api/users/:id     replace them; send If-Match with the ETag, 412 if stale
//
// Passwords are in data/passwords.json, never sent to the client, and set for an
// existing user with `node server/passwd.ts <name>`. The cookie is a signed token
// (see auth.ts), not the bare user id.

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { hashPassword, MIN_PASSWORD, sessionToken, sessionUser, verifyPassword } from './auth.ts'
import { Conflict, etag, Invalid, NotFound, Store } from './store.ts'

class Unauthorized extends Error {}
class Forbidden extends Error {}
class WrongPassword extends Error {}
class Locked extends Error {}

const root = resolve(import.meta.dirname, '..')
const store = new Store(resolve(process.env.RAUTALOKI_DATA ?? join(root, 'data')))
const dist = join(root, 'dist')
const port = Number(process.env.PORT ?? 8910)
const host = process.env.HOST ?? '0.0.0.0'
const MAX_BODY = 5 * 1024 * 1024
const COOKIE = 'rautaloki_user'
const COOKIE_AGE = 365 * 24 * 3600
const secret = await store.secret()

// Wrong passwords per user id, in memory. After MAX_FAILS in a row each further
// attempt has to wait LOCK_MS, which caps guessing at about one try a minute.
const MAX_FAILS = 5
const LOCK_MS = 60_000
const failures = new Map<string, { count: number; at: number }>()

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
}

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers })
  res.end(JSON.stringify(body))
}

async function body(req: IncomingMessage): Promise<unknown> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) throw new Invalid('body too large')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
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
  const passwords = token ? await store.passwords() : {}
  const id = token && sessionUser(secret, token, (id) => passwords[id])
  if (!id) throw new Unauthorized()
  try {
    return await store.user(id)
  } catch (err) {
    if (err instanceof NotFound) throw new Unauthorized()
    throw err
  }
}

async function api(req: IncomingMessage, res: ServerResponse, path: string) {
  if (path === '/api/login' && req.method === 'POST') {
    const { name, password, create } = (await body(req)) as { name?: unknown; password?: unknown; create?: unknown }
    if (typeof name !== 'string' || !name.trim()) throw new Invalid('name required')
    if (typeof password !== 'string' || !password) throw new Invalid('password required')
    let user = await store.findByName(name)
    let hash: string | undefined
    if (!user && create !== true) throw new NotFound()
    if (!user) {
      if (password.length < MIN_PASSWORD) throw new Invalid(`password must be at least ${MIN_PASSWORD} characters`)
      user = await store.createUser(name)
      hash = await hashPassword(password)
      await store.setPassword(user.id, hash)
      console.log(new Date().toISOString(), 'created user', user.id)
    } else {
      hash = (await store.passwords())[user.id]
      if (!hash) throw new Forbidden('no password set for this user yet')
      const failed = failures.get(user.id)
      if (failed && failed.count >= MAX_FAILS && Date.now() - failed.at < LOCK_MS) throw new Locked()
      if (!(await verifyPassword(password, hash))) {
        failures.set(user.id, { count: (failed?.count ?? 0) + 1, at: Date.now() })
        console.log(new Date().toISOString(), 'wrong password for', user.id)
        throw new WrongPassword()
      }
      failures.delete(user.id)
    }
    const token = sessionToken(secret, user.id, hash)
    return json(res, 200, { id: user.id, name: user.name }, { 'set-cookie': session(req, token, COOKIE_AGE) })
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
    const version = req.headers['if-match']
    const tag = await store.saveUser(m[1], (await body(req)) as never, version)
    console.log(new Date().toISOString(), 'saved', m[1])
    return json(res, 200, { ok: true }, { etag: tag })
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
    else if (err instanceof WrongPassword) json(res, 401, { error: 'wrong password' })
    else if (err instanceof Locked) json(res, 429, { error: 'too many wrong passwords, wait a minute' })
    else if (err instanceof Conflict) json(res, 412, { error: 'changed elsewhere, reload' })
    else if (err instanceof Invalid) json(res, 400, { error: err.message })
    else {
      console.error(err)
      json(res, 500, { error: 'internal error' })
    }
  }
}).listen(port, host, () => console.log(`rautaloki on http://${host}:${port}, data in ${store.dir}`))
