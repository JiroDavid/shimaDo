import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')

const REQUIRED = [
  '.panel', '.card', '.card-label', '.card-count', '.btn', '.btn-primary', '.btn-active', '.btn-danger', '.field',
  '.check', '.task-title', '.task-row', '.tag', '.tag-chip', '.time-pill', '.meter', '.quick-add', '.bar', '.bar-btn',
  '.bar-avatar', '.bar-label', '.mini', '.switch', '.swatch', '.dropdown-trigger', '.dropdown-list', '.dropdown-option', '.win-body', '.dot-btn'
]

describe('styles.css', () => {
  it.each(REQUIRED)('defines a rule body for %s', (selector) => {
    const escaped = selector.replace(/[.]/g, '\\.')
    expect(css).toMatch(new RegExp(`(^|\\n)${escaped}\\s*\\{[^}]*:[^}]*\\}`))
  })
})
