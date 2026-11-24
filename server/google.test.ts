import { generateKeyPairSync, sign } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { BadToken, type JsonWebKey, verifyGoogleToken } from './google.ts'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const other = generateKeyPairSync('rsa', { modulusLength: 2048 })
const keys = async (kid: string): Promise<JsonWebKey | undefined> =>
  kid === 'k1' ? publicKey.export({ format: 'jwk' }) : undefined

const now = 1_800_000_000_000
const CLIENT = 'client.apps.googleusercontent.com'
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')

function token(claims: Record<string, unknown> = {}, { kid = 'k1', key = privateKey, alg = 'RS256' } = {}) {
  const body = {
    iss: 'https://accounts.google.com',
    aud: CLIENT,
    exp: now / 1000 + 3600,
    iat: now / 1000,
    email: 'Anna@Example.com',
    email_verified: true,
    name: 'Anna Example',
    ...claims,
  }
  const data = `${b64({ alg, kid, typ: 'JWT' })}.${b64(body)}`
  return `${data}.${sign('RSA-SHA256', Buffer.from(data), key).toString('base64url')}`
}

const check = (t: string) => verifyGoogleToken(t, CLIENT, keys, now)

describe('Google ID tokens', () => {
  it('accepts a valid token and lowercases the email', async () => {
    expect(await check(token())).toEqual({ email: 'anna@example.com', name: 'Anna Example' })
  })

  it('rejects forged, foreign, stale and unverified tokens', async () => {
    const bad = [
      token({}, { key: other.privateKey }),
      token({}, { kid: 'unknown' }),
      token({}, { alg: 'none' }),
      token({ aud: 'someone-else' }),
      token({ iss: 'https://evil.example' }),
      token({ exp: now / 1000 - 3600 }),
      token({ email_verified: false }),
      token({ email: undefined }),
      'not.a.token',
      '',
    ]
    for (const t of bad) await expect(check(t)).rejects.toBeInstanceOf(BadToken)
  })

  it('rejects a tampered payload', async () => {
    const [h, , s] = token().split('.')
    await expect(check(`${h}.${b64({ email: 'mallory@example.com', email_verified: true })}.${s}`)).rejects.toBeInstanceOf(BadToken)
  })
})
