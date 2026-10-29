// HTTP server: a small JSON API over data/ plus the built UI from dist/.
//
//   POST /api/login         {name, create?} -> log in by name, sets the session cookie;
//                           404 for an unknown name unless create is true
//   POST /api/logout        clears the cookie
//   GET  /api/me            the logged-in user's id and name, 401 if none
//   GET  /api/reference     catalog, programs, weight tables
//   GET  /api/users/:id     own cycles only (ETag header = version)
//   PUT  /api/users/:id     replace them; send If-Match with the ETag, 412 if stale
//
// Login is by name alone, with no password: it keeps users from mixing up each
// other's logs, not out of them. Anyone who can reach the server can log in as anyone.

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
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

function session(id: string, maxAge: number): string {
  return `${COOKIE}=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
}

/** The logged-in user, or Unauthorized if there is no valid session. */
async function me(req: IncomingMessage) {
  const id = cookie(req, COOKIE)
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
    const { name, create } = (await body(req)) as { name?: unknown; create?: unknown }
    if (typeof name !== 'string' || !name.trim()) throw new Invalid('name required')
    let user = await store.findByName(name)
    if (!user && create !== true) throw new NotFound()
    if (!user) {
      user = await store.createUser(name)
      console.log(new Date().toISOString(), 'created user', user.id)
    }
    return json(res, 200, { id: user.id, name: user.name }, { 'set-cookie': session(user.id, COOKIE_AGE) })
  }
  if (path === '/api/logout' && req.method === 'POST') {
    return json(res, 200, { ok: true }, { 'set-cookie': session('', 0) })
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
  // Unknown paths get the app shell, so a reload on any view still works.
  if (!info?.isFile()) file = join(dist, 'index.html')
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
    else if (err instanceof Forbidden) json(res, 403, { error: 'not your data' })
    else if (err instanceof Conflict) json(res, 412, { error: 'changed elsewhere, reload' })
    else if (err instanceof Invalid) json(res, 400, { error: err.message })
    else {
      console.error(err)
      json(res, 500, { error: 'internal error' })
    }
  }
}).listen(port, host, () => console.log(`rautaloki on http://${host}:${port}, data in ${store.dir}`))
