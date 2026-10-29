// Set a user's password: node server/passwd.ts <name>
//
// Reads the password from the terminal without echoing it (or one line from a pipe)
// and writes its hash to passwords.json in RAUTALOKI_DATA (./data). Sessions made
// with the old password stop working. Safe to run beside the server: it rereads the
// file on every request and only writes it when a new user signs up.

import { join, resolve } from 'node:path'
import { hashPassword, MIN_PASSWORD } from './auth.ts'
import { Store } from './store.ts'

const root = resolve(import.meta.dirname, '..')
const store = new Store(resolve(process.env.RAUTALOKI_DATA ?? join(root, 'data')))

function ask(prompt: string): Promise<string> {
  const input = process.stdin
  process.stderr.write(prompt)
  return new Promise((ok) => {
    let text = ''
    if (input.isTTY) input.setRawMode(true)
    input.setEncoding('utf8')
    const done = () => {
      if (input.isTTY) input.setRawMode(false)
      input.off('data', onData).pause()
      process.stderr.write('\n')
      ok(text)
    }
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') return done()
        if (ch === '\u0003') process.exit(130)
        if (ch === '\u007f' || ch === '\b') text = text.slice(0, -1)
        else text += ch
      }
    }
    input.on('data', onData).on('end', done).resume()
  })
}

const name = process.argv.slice(2).join(' ')
if (!name.trim()) {
  console.error('usage: node server/passwd.ts <name>')
  process.exit(2)
}
const user = await store.findByName(name)
if (!user) {
  console.error(`no user named "${name}"`)
  process.exit(1)
}
const password = await ask(`New password for ${user.name}: `)
if (password.length < MIN_PASSWORD) {
  console.error(`password must be at least ${MIN_PASSWORD} characters`)
  process.exit(1)
}
if (process.stdin.isTTY && (await ask('Again: ')) !== password) {
  console.error('passwords differ')
  process.exit(1)
}
await store.setPassword(user.id, await hashPassword(password))
console.log(`password set for ${user.name} (${user.id})`)
