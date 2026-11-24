// Link a Google account to an existing user: node server/link.ts <email> <name>
// With no arguments, lists the links.
//
// Writes logins.json in RAUTALOKI_DATA (./data). The user's sessions made with a
// previously linked email stop working. Safe to run beside the server: it rereads the
// file on every request and only writes it when a new user signs up or one is deleted.

import { join, resolve } from 'node:path'
import { Store } from './store.ts'

const root = resolve(import.meta.dirname, '..')
const store = new Store(resolve(process.env.RAUTALOKI_DATA ?? join(root, 'data')))

const [email, ...rest] = process.argv.slice(2)
const name = rest.join(' ')
if (!email) {
  for (const [e, id] of Object.entries(await store.logins())) console.log(`${e}\t${id}`)
  process.exit(0)
}
if (!name.trim()) {
  console.error('usage: node server/link.ts <email> <name>')
  process.exit(2)
}
const user = await store.findByName(name)
if (!user) {
  console.error(`no user named "${name}"`)
  process.exit(1)
}
await store.link(email, user.id)
console.log(`${email.trim().toLowerCase()} now logs in as ${user.name} (${user.id})`)
