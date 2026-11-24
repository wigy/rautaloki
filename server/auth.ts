// Session tokens.
//
// A session token is `<user id>.<hmac>`, the HMAC taken over the id and the Google
// account email linked to that user, with the server secret. So a token cannot be
// forged without the secret, and unlinking the account (or deleting the user) ends
// every session made for it.

import { createHmac, timingSafeEqual } from 'node:crypto'

function mac(secret: Buffer, id: string, email: string): string {
  return createHmac('sha256', secret).update(`${id}\n${email}`).digest('base64url')
}

export function sessionToken(secret: Buffer, id: string, email: string): string {
  return `${id}.${mac(secret, id, email)}`
}

/** The user id in a token, or null unless it was signed for that user's current email. */
export function sessionUser(secret: Buffer, token: string, emailOf: (id: string) => string | undefined): string | null {
  const dot = token.indexOf('.')
  if (dot < 1) return null
  const id = token.slice(0, dot)
  const email = emailOf(id)
  if (!email) return null
  const given = Buffer.from(token.slice(dot + 1))
  const expected = Buffer.from(mac(secret, id, email))
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null
}
