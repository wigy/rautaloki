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

/** The Google OAuth client id the login button needs; empty if the server has none. */
export async function getGoogleClientId(): Promise<string> {
  return (await (await check(await fetch('/api/config'))).json()).googleClientId ?? ''
}

/** Log in as the demo user, reset to its made-up data. */
export async function loginDemo(): Promise<Me> {
  return (await check(await fetch('/api/login/demo', { method: 'POST' }))).json()
}

export async function logout(): Promise<void> {
  await check(await fetch('/api/logout', { method: 'POST' }))
}

/** Delete the logged-in user and all their data. */
export async function deleteAccount(id: string): Promise<void> {
  await check(await fetch(`/api/users/${id}`, { method: 'DELETE' }))
}
