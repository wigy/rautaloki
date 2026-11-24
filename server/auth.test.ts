import { describe, expect, it } from 'vitest'
import { sessionToken, sessionUser } from './auth.ts'

const secret = Buffer.from('test secret')

describe('sessions', () => {
  const emails: Record<string, string> = { example: 'a@example.com', other: 'b@example.com' }
  const emailOf = (id: string) => emails[id]

  it('accepts its own token', () => {
    expect(sessionUser(secret, sessionToken(secret, 'example', 'a@example.com'), emailOf)).toBe('example')
  })

  it('rejects a bare id, another user, another secret and a relinked account', () => {
    const token = sessionToken(secret, 'example', 'a@example.com')
    expect(sessionUser(secret, 'example', emailOf)).toBeNull()
    expect(sessionUser(secret, token.replace('example', 'other'), emailOf)).toBeNull()
    expect(sessionUser(Buffer.from('other secret'), token, emailOf)).toBeNull()
    expect(sessionUser(secret, token, () => 'new@example.com')).toBeNull()
    expect(sessionUser(secret, token, () => undefined)).toBeNull()
  })
})
