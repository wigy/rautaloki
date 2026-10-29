import type { Me, Reference, User } from '../shared/types.ts'

export class StaleError extends Error {}
export class LoggedOutError extends Error {}

async function check(res: Response): Promise<Response> {
  if (res.status === 412) throw new StaleError('Data was changed on another device.')
  if (res.status === 401) throw new LoggedOutError('Not logged in.')
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res
}

export async function getReference(): Promise<Reference> {
  return (await check(await fetch('/api/reference'))).json()
}

export async function getUser(id: string): Promise<{ user: User; version: string }> {
  const res = await check(await fetch(`/api/users/${id}`))
  return { user: await res.json(), version: res.headers.get('etag') ?? '' }
}

/** Save and return the new version. Fails with StaleError if `version` is outdated. */
export async function putUser(user: User, version: string): Promise<string> {
  const res = await check(
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'if-match': version },
      body: JSON.stringify(user),
    }),
  )
  return res.headers.get('etag') ?? ''
}

export async function getMe(): Promise<Me | null> {
  try {
    return await (await check(await fetch('/api/me'))).json()
  } catch (e) {
    if (e instanceof LoggedOutError) return null
    throw e
  }
}

/** Log in, or sign up with `create`. Returns null for an unknown name unless `create` is set. */
export async function login(name: string, password: string, create = false): Promise<Me | null> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, password, create }),
  })
  if (res.status === 404) return null
  // A 401 here is a wrong password, not a lost session.
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`)
  return res.json()
}

export async function logout(): Promise<void> {
  await check(await fetch('/api/logout', { method: 'POST' }))
}
