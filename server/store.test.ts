import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Invalid, NotFound, Store } from './store.ts'

let dir: string | undefined
const fresh = async () => {
  dir = await mkdtemp(join(tmpdir(), 'rautaloki-'))
  await mkdir(join(dir, 'users'))
  return new Store(dir)
}
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true })
})

describe('store', () => {
  it('links one email per user and deletes a user with their login', async () => {
    const store = await fresh()
    const a = await store.createUser('Anna')
    const b = await store.createUser('Bert')
    await store.link('Anna@Example.com', a.id)
    await store.link('bert@example.com', b.id)
    expect(await store.emailOf(a.id)).toBe('anna@example.com')
    await store.link('anna@other.com', a.id)
    expect(await store.logins()).toEqual({ 'bert@example.com': b.id, 'anna@other.com': a.id })
    await expect(store.link('x@example.com', 'nobody')).rejects.toBeInstanceOf(NotFound)
    await expect(store.link('not-an-email', a.id)).rejects.toBeInstanceOf(Invalid)
    await store.deleteUser(a.id)
    await expect(store.user(a.id)).rejects.toBeInstanceOf(NotFound)
    expect(await store.logins()).toEqual({ 'bert@example.com': b.id })
    expect(await store.userIds()).toEqual([b.id])
    await expect(store.deleteUser(a.id)).rejects.toBeInstanceOf(NotFound)
  })

  it('never gives a new user the demo id', async () => {
    const store = await fresh()
    expect((await store.createUser('Demo')).id).toBe('demo-2')
  })

  it('accepts sessions and rejects bad ones', async () => {
    const store = await fresh()
    const u = await store.createUser('Anna')
    const session = { id: 's1', kind: 'bodyweight' as const, plan: 'bw-day-1', date: '2026-11-24', seconds: 40, exercises: [{ id: 'bw-push-up', reps: 20 }] }
    await store.saveUser(u.id, { ...u, sessions: [session] }, undefined)
    await expect(
      store.saveUser(u.id, { ...u, sessions: [{ ...session, exercises: [{ id: 'x', reps: 1.5 }] }] }, undefined),
    ).rejects.toBeInstanceOf(Invalid)
    await expect(store.saveUser(u.id, { ...u, sessions: [session, session] }, undefined)).rejects.toBeInstanceOf(Invalid)
    const span = { start: '2026-11-24T15:00:00.000Z', end: '2026-11-24T15:25:00.000Z' }
    await store.saveUser(u.id, { ...u, sessions: [{ ...session, span }] }, undefined)
    for (const bad of [{ start: '2026-11-24', end: '2026-11-24' }, { start: span.end, end: span.start }, { start: span.start }])
      await expect(store.saveUser(u.id, { ...u, sessions: [{ ...session, span: bad as never }] }, undefined)).rejects.toBeInstanceOf(Invalid)
  })
})
