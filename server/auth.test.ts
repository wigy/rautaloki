import { describe, expect, it } from 'vitest'
import { hashPassword, sessionToken, sessionUser, verifyPassword } from './auth.ts'

const secret = Buffer.from('test secret')

describe('passwords', () => {
  it('verifies the right password only', async () => {
    const hash = await hashPassword('correct horse')
    expect(await verifyPassword('correct horse', hash)).toBe(true)
    expect(await verifyPassword('correct hors', hash)).toBe(false)
    expect(await verifyPassword('correct horse', 'garbage')).toBe(false)
  })

  it('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'))
  })
})

describe('sessions', () => {
  const hashes: Record<string, string> = { example: 'hash-a', other: 'hash-b' }
  const hashOf = (id: string) => hashes[id]

  it('accepts its own token', () => {
    expect(sessionUser(secret, sessionToken(secret, 'example', 'hash-a'), hashOf)).toBe('example')
  })

  it('rejects a bare id, another user, another secret and an old password', () => {
    const token = sessionToken(secret, 'example', 'hash-a')
    expect(sessionUser(secret, 'example', hashOf)).toBeNull()
    expect(sessionUser(secret, token.replace('example', 'other'), hashOf)).toBeNull()
    expect(sessionUser(Buffer.from('other secret'), token, hashOf)).toBeNull()
    expect(sessionUser(secret, token, () => 'hash-new')).toBeNull()
    expect(sessionUser(secret, token, () => undefined)).toBeNull()
  })
})
