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
  it('deletes a user with their password', async () => {
    const store = await fresh()
    const a = await store.createUser('Anna')
    const b = await store.createUser('Bert')
    await store.setPassword(a.id, 'hash-a')
    await store.setPassword(b.id, 'hash-b')
    await store.deleteUser(a.id)
    await expect(store.user(a.id)).rejects.toBeInstanceOf(NotFound)
    expect(await store.passwords()).toEqual({ [b.id]: 'hash-b' })
    expect(await store.userIds()).toEqual([b.id])
    await expect(store.deleteUser(a.id)).rejects.toBeInstanceOf(NotFound)
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
  })
})
