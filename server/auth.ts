// Passwords and session tokens.
//
// A password is stored as `scrypt$<salt>$<key>` (base64url). A session token is
// `<user id>.<hmac>`, the HMAC taken over the id and that user's stored password
// hash with the server secret, so a token cannot be forged without the secret and
// changing a password ends every session made with the old one.

import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

export const MIN_PASSWORD = 8

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((ok, fail) =>
    scrypt(password.normalize('NFC'), salt, 32, (err, key) => (err ? fail(err) : ok(key))),
  )
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  return `scrypt$${salt.toString('base64url')}$${(await derive(password, salt)).toString('base64url')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, salt, key] = stored.split('$')
  if (kind !== 'scrypt' || !salt || !key) return false
  const expected = Buffer.from(key, 'base64url')
  const actual = await derive(password, Buffer.from(salt, 'base64url'))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function mac(secret: Buffer, id: string, hash: string): string {
  return createHmac('sha256', secret).update(`${id}\n${hash}`).digest('base64url')
}

export function sessionToken(secret: Buffer, id: string, hash: string): string {
  return `${id}.${mac(secret, id, hash)}`
}

/** The user id in a token, or null unless it was signed for that user's current hash. */
export function sessionUser(secret: Buffer, token: string, hashOf: (id: string) => string | undefined): string | null {
  const dot = token.indexOf('.')
  if (dot < 1) return null
  const id = token.slice(0, dot)
  const hash = hashOf(id)
  if (!hash) return null
  const given = Buffer.from(token.slice(dot + 1))
  const expected = Buffer.from(mac(secret, id, hash))
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null
}
