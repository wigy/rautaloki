// Pictures for the exercise picker: src/assets/icons/muscle-<slug>.webp and ex-<exercise id>.webp.
// Catalog entries without a picture get a plain tile instead.

const files = import.meta.glob<string>('./assets/icons/*.webp', {
  eager: true,
  import: 'default',
})
const byName = new Map(Object.entries(files).map(([path, url]) => [path.replace(/^.*\/|\.webp$/g, ''), url]))

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const muscleIcon = (muscle: string) => byName.get(`muscle-${slug(muscle)}`)
export const exerciseIcon = (id: string) => byName.get(`ex-${id}`)
