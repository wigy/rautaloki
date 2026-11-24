// Google Sign-In: verifying the ID token (a JWT) that Google's button hands back.
//
// The token is RS256-signed with one of Google's published keys. It is accepted only
// for our client id, from Google's issuer, unexpired, and for a verified email address.
// See https://developers.google.com/identity/gsi/web/guides/verify-google-id-token

import { createPublicKey, type JsonWebKeyInput, verify } from 'node:crypto'

type JsonWebKey = JsonWebKeyInput['key']

export interface GoogleIdentity {
  /** Lowercased email address, verified by Google. */
  email: string
  /** The display name on the Google account, if it has one. */
  name?: string
}

export type { JsonWebKey }
export type Keys = (kid: string) => Promise<JsonWebKey | undefined>

const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])
const CERTS = 'https://www.googleapis.com/oauth2/v3/certs'
/** Clock skew tolerated on exp and iat. */
const LEEWAY_S = 60

export class BadToken extends Error {}

/** Google's signing keys, fetched on demand and cached for as long as Google says. */
export function googleKeys(): Keys {
  let keys: Record<string, JsonWebKey> = {}
  let until = 0
  let fetched = 0
  return async (kid) => {
    const now = Date.now()
    // An unknown key id may mean Google rotated its keys: refetch, but at most once a minute.
    if (now >= until || (!keys[kid] && now - fetched > 60_000)) {
      fetched = now
      const res = await fetch(CERTS)
      if (!res.ok) throw new Error(`Google certs: HTTP ${res.status}`)
      const body = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] }
      keys = Object.fromEntries(body.keys.map((k) => [k.kid, k]))
      const age = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? 3600)
      until = now + age * 1000
    }
    return keys[kid]
  }
}

function part<T>(text: string | undefined): T {
  try {
    return JSON.parse(Buffer.from(text ?? '', 'base64url').toString('utf8'))
  } catch {
    throw new BadToken('malformed token')
  }
}

export async function verifyGoogleToken(
  token: string,
  clientId: string,
  keys: Keys,
  now = Date.now(),
): Promise<GoogleIdentity> {
  const [head, body, sig] = token.split('.')
  if (!head || !body || !sig) throw new BadToken('malformed token')
  const header = part<{ alg?: string; kid?: string }>(head)
  if (header.alg !== 'RS256' || !header.kid) throw new BadToken('unexpected token algorithm')
  const jwk = await keys(header.kid)
  if (!jwk) throw new BadToken('unknown signing key')
  const ok = verify('RSA-SHA256', Buffer.from(`${head}.${body}`), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(sig, 'base64url'))
  if (!ok) throw new BadToken('bad signature')

  const claims = part<Record<string, unknown>>(body)
  const s = now / 1000
  if (!ISSUERS.has(claims.iss as string)) throw new BadToken('wrong issuer')
  if (claims.aud !== clientId) throw new BadToken('token is for another app')
  if (typeof claims.exp !== 'number' || claims.exp + LEEWAY_S < s) throw new BadToken('token expired')
  if (typeof claims.iat === 'number' && claims.iat - LEEWAY_S > s) throw new BadToken('token from the future')
  if (typeof claims.email !== 'string' || claims.email_verified !== true) throw new BadToken('email not verified')
  const name = typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim() : undefined
  return { email: claims.email.toLowerCase(), name }
}
