import { describe, it, expect } from 'vitest'
import { ACCENT_SLOTS, contrastRatio, resolveColors, themeVars, validateTheme } from './theme'
import { DEFAULT_THEME_ID, THEMES, THEME_IDS, themeById } from './themes'

describe('built-in themes', () => {
  it('ships the five agreed themes in order', () => {
    expect(THEME_IDS).toEqual(['classic', 'paper', 'terminal', 'sakura', 'midnight'])
    expect(DEFAULT_THEME_ID).toBe('classic')
  })

  it.each(THEMES.map((t) => [t.id, t] as const))('%s validates unchanged', (_id, theme) => {
    expect(validateTheme(theme)).toEqual(theme)
  })

  it.each(THEMES.map((t) => [t.id, t] as const))('%s resolves a complete token set', (_id, theme) => {
    const vars = themeVars(theme, theme.defaultAccent, 0.9)
    for (const [name, value] of Object.entries(vars)) expect(value, name).toBeTruthy()
    expect(Object.keys(resolveColors(theme))).toHaveLength(12)
  })

  it.each(THEMES.map((t) => [t.id, t] as const))('%s meets the contrast floors', (_id, theme) => {
    const { panel, text, muted, urgent, must, important, danger } = theme.colors
    expect(contrastRatio(text, panel)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(muted, panel)).toBeGreaterThanOrEqual(3.5)
    for (const status of [urgent, must, important, danger]) expect(contrastRatio(status, panel)).toBeGreaterThanOrEqual(3.5)
    for (const slot of ACCENT_SLOTS) expect(contrastRatio(theme.accents[slot].value, panel), slot).toBeGreaterThanOrEqual(3)
  })

  it('keeps Classic identical to the pre-theme look', () => {
    const c = themeById('classic')
    expect(c.colors.panel).toBe('#181612')
    expect(c.colors.text).toBe('#F3E9D6')
    expect(c.colors.muted).toBe('#A9A08F')
    expect(ACCENT_SLOTS.map((s) => c.accents[s].value)).toEqual(['#F2541B', '#E5484D', '#6E9A74', '#E8D9BC'])
    expect(c.defaultAccent).toBe('orange')
    expect(c.shape).toEqual({ radiusPanel: 26, radiusCard: 18, radiusControl: 999, borderWidth: 2 })
  })

  it('mixes light and dark modes', () => {
    expect(THEMES.map((t) => t.mode)).toEqual(['dark', 'light', 'dark', 'light', 'dark'])
  })

  it('gives every theme distinct accent names', () => {
    for (const t of THEMES) expect(new Set(ACCENT_SLOTS.map((s) => t.accents[s].name)).size).toBe(4)
  })

  it('falls back to Classic for unknown ids', () => {
    expect(themeById('neon').id).toBe('classic')
    expect(themeById('').id).toBe('classic')
    expect(themeById('paper').id).toBe('paper')
  })
})
