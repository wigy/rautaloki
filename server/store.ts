// JSON file storage. Every file is rewritten whole via a temp file and rename, so a
// crash mid-write leaves the previous version intact. Single process only.

import { createHash, randomBytes } from 'node:crypto'
import { readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Cycle, Reference, User } from '../shared/types.ts'

export class Store {
  readonly dir: string

  constructor(dir: string) {
    this.dir = dir
  }

  private async read<T>(path: string): Promise<T> {
    return JSON.parse(await readFile(join(this.dir, path), 'utf8'))
  }

  private async write(path: string, data: unknown, mode = 0o644): Promise<void> {
    const file = join(this.dir, path)
    const tmp = `${file}.tmp`
    await writeFile(tmp, JSON.stringify(data, null, 2) + '\n', { mode })
    await rename(tmp, file)
  }

  async userIds(): Promise<string[]> {
    const files = await readdir(join(this.dir, 'users'))
    return files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort()
  }

  async reference(): Promise<Reference> {
    const [catalog, programs, weights] = await Promise.all([
      this.read<Reference['catalog']>('catalog.json'),
      this.read<Reference['programs']>('programs.json'),
      this.read<Reference['weights']>('weights.json'),
    ])
    return { catalog, programs, weights }
  }

  /** The user with this name, compared case- and whitespace-insensitively. */
  async findByName(name: string): Promise<User | null> {
    const key = normalizeName(name)
    for (const id of await this.userIds()) {
      const user = await this.user(id)
      if (normalizeName(user.name) === key) return user
    }
    return null
  }

  async createUser(name: string): Promise<User> {
    const clean = name.trim().replace(/\s+/g, ' ')
    if (!clean || clean.length > 40) throw new Invalid('name must be 1-40 characters')
    if (await this.findByName(clean)) throw new Conflict()
    const base =
      clean
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'user'
    const ids = new Set(await this.userIds())
    let id = base
    for (let n = 2; ids.has(id); n++) id = `${base}-${n}`
    const user: User = { id, name: clean, cycles: [] }
    await this.write(`users/${id}.json`, user)
    return user
  }

  async user(id: string): Promise<User> {
    if (!/^[a-z0-9-]+$/.test(id)) throw new NotFound()
    try {
      return await this.read<User>(`users/${id}.json`)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') throw new NotFound()
      throw err
    }
  }

  /** Password hashes by user id. A user missing here has no password and cannot log in. */
  async passwords(): Promise<Record<string, string>> {
    try {
      return await this.read<Record<string, string>>('passwords.json')
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {}
      throw err
    }
  }

  async setPassword(id: string, hash: string): Promise<void> {
    await this.user(id)
    await this.write('passwords.json', { ...(await this.passwords()), [id]: hash }, 0o600)
  }

  /** The key sessions are signed with, created on first use. Deleting it logs everyone out. */
  async secret(): Promise<Buffer> {
    const file = join(this.dir, 'secret')
    try {
      return Buffer.from(await readFile(file, 'utf8'), 'base64url')
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
    const key = randomBytes(32)
    await writeFile(file, key.toString('base64url'), { mode: 0o600, flag: 'wx' })
    return key
  }

  /** Replace a user's data. `version` must match the stored one, or nothing is written. */
  async saveUser(id: string, user: User, version: string | undefined): Promise<string> {
    const current = await this.user(id)
    if (version !== undefined && version !== etag(current)) throw new Conflict()
    validateUser(user, id)
    await this.write(`users/${id}.json`, user)
    return etag(user)
  }
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export function etag(data: unknown): string {
  return `"${createHash('sha1').update(JSON.stringify(data)).digest('hex').slice(0, 16)}"`
}

export class NotFound extends Error {}
export class Conflict extends Error {}
export class Invalid extends Error {}

const isScore = (s: unknown) => s === null || s === '-' || (typeof s === 'number' && s >= 0)
const isNum = (n: unknown) => n === null || typeof n === 'number'
const isDate = (d: unknown) => d === null || (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))

function validateUser(user: User, id: string): void {
  const fail = (msg: string) => {
    throw new Invalid(msg)
  }
  if (!user || user.id !== id || typeof user.name !== 'string') fail('bad user header')
  if (!Array.isArray(user.cycles)) fail('cycles must be an array')
  const ids = new Set<string>()
  user.cycles.forEach((c: Cycle, i) => {
    const at = `cycles[${i}]`
    if (typeof c.id !== 'string' || ids.has(c.id)) fail(`${at}: missing or duplicate id`)
    ids.add(c.id)
    if (typeof c.exercise !== 'string' || typeof c.program !== 'string') fail(`${at}: exercise/program`)
    if (!Array.isArray(c.scores) || !c.scores.every(isScore)) fail(`${at}: scores`)
    if (!isNum(c.oldBest) || !isNum(c.newBest) || typeof c.add !== 'number') fail(`${at}: numbers`)
    if (!isDate(c.started) || !isDate(c.finished)) fail(`${at}: dates`)
    if (typeof c.done !== 'boolean') fail(`${at}: done`)
  })
}
