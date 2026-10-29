// HTTP server: a small JSON API over data/ plus the built UI from dist/.
//
//   GET /api/reference      catalog, programs, weight tables, user list
//   GET /api/users/:id      one user's cycles (ETag header = version)
//   PUT /api/users/:id      replace them; send If-Match with the ETag, 412 if stale

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { Conflict, etag, Invalid, NotFound, Store } from './store.ts'

const root = resolve(import.meta.dirname, '..')
const store = new Store(resolve(process.env.RAUTALOKI_DATA ?? join(root, 'data')))
const dist = join(root, 'dist')
const port = Number(process.env.PORT ?? 8910)
const host = process.env.HOST ?? '0.0.0.0'
const MAX_BODY = 5 * 1024 * 1024

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

async function api(req: IncomingMessage, res: ServerResponse, path: string) {
  if (path === '/api/reference' && req.method === 'GET') {
    return json(res, 200, await store.reference())
  }
  const m = path.match(/^\/api\/users\/([^/]+)$/)
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
    else if (err instanceof Conflict) json(res, 412, { error: 'changed elsewhere, reload' })
    else if (err instanceof Invalid) json(res, 400, { error: err.message })
    else {
      console.error(err)
      json(res, 500, { error: 'internal error' })
    }
  }
}).listen(port, host, () => console.log(`rautaloki on http://${host}:${port}, data in ${store.dir}`))
