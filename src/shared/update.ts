export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'current' }
  | { kind: 'available'; version: string; notes: string }
  | { kind: 'downloading'; version: string; percent: number }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; during: 'check' | 'download'; message: string; version?: string }

const MAX_NOTES = 600

const stripTags = (s: string): string => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export function plainNotes(raw: unknown): string {
  let text = ''
  if (typeof raw === 'string') text = stripTags(raw)
  else if (Array.isArray(raw)) {
    text = raw
      .map((n) => (typeof n === 'object' && n !== null && typeof (n as { note?: unknown }).note === 'string' ? stripTags((n as { note: string }).note) : ''))
      .filter(Boolean)
      .join('\n\n')
  }
  return text.length > MAX_NOTES ? `${text.slice(0, MAX_NOTES)}…` : text
}
