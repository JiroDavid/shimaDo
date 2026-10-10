import type { NotePage } from './types'

export const MAX_NOTES_LENGTH = 50_000
export const MAX_PAGES = 20
export const MAX_TITLE_LENGTH = 30

export const defaultPage = (id = 'page-1', n = 1): NotePage => ({ id, title: `Page ${n}`, text: '' })

export function sanitizePages(rawPages: unknown, rawActive: unknown, legacyNotes: unknown): { pages: NotePage[]; activePage: string } {
  const pages: NotePage[] = []
  const seen = new Set<string>()
  if (Array.isArray(rawPages)) {
    for (const raw of rawPages) {
      if (pages.length >= MAX_PAGES) break
      if (typeof raw !== 'object' || raw === null) continue
      const r = raw as Record<string, unknown>
      if (typeof r.id !== 'string' || r.id === '' || seen.has(r.id)) continue
      seen.add(r.id)
      const title = typeof r.title === 'string' ? r.title.trim().slice(0, MAX_TITLE_LENGTH) : ''
      pages.push({
        id: r.id,
        title: title || `Page ${pages.length + 1}`,
        text: typeof r.text === 'string' ? r.text.slice(0, MAX_NOTES_LENGTH) : ''
      })
    }
  }
  if (pages.length === 0) {
    const page = defaultPage()
    if (typeof legacyNotes === 'string') page.text = legacyNotes.slice(0, MAX_NOTES_LENGTH)
    pages.push(page)
  }
  const activePage = typeof rawActive === 'string' && pages.some((p) => p.id === rawActive) ? rawActive : pages[0].id
  return { pages, activePage }
}
