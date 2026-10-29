import type { Reference, User } from '../shared/types.ts'

export class StaleError extends Error {}

async function check(res: Response): Promise<Response> {
  if (res.status === 412) throw new StaleError('Data was changed on another device.')
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
