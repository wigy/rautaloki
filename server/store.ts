// JSON file storage. Every file is rewritten whole via a temp file and rename, so a
// crash mid-write leaves the previous version intact. Single process only.

import { createHash } from 'node:crypto'
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

  private async write(path: string, data: unknown): Promise<void> {
    const file = join(this.dir, path)
    const tmp = `${file}.tmp`
    await writeFile(tmp, JSON.stringify(data, null, 2) + '\n')
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
    const users = await Promise.all((await this.userIds()).map((id) => this.user(id)))
    return { catalog, programs, weights, users: users.map(({ id, name }) => ({ id, name })) }
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

  /** Replace a user's data. `version` must match the stored one, or nothing is written. */
  async saveUser(id: string, user: User, version: string | undefined): Promise<string> {
    const current = await this.user(id)
    if (version !== undefined && version !== etag(current)) throw new Conflict()
    validateUser(user, id)
    await this.write(`users/${id}.json`, user)
    return etag(user)
  }
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
