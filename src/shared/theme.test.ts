import { describe, it, expect } from 'vitest'
import {
  accentChoices, accentToCommit, colorToHex, contrastRatio, isLowContrast, normaliseAccentInput, onAccentFor, parseColor,
  flattenOver, resolveAccent, resolveColors, solidColors, SOLID_TOKENS, themeVars, validateTheme, type Theme
} from './theme'

const base = (): Theme => ({
  format: 1,
  id: 'test',
  name: 'Test',
  mode: 'dark',
  colors: { panel: '#181612', text: '#F3E9D6', muted: '#A9A08F', urgent: '#E5484D', must: '#F2541B', important: '#F5C542', danger: '#E5484D' },
  accents: {
    orange: { name: 'Orange', value: '#F2541B' },
    brick: { name: 'Brick', value: '#E5484D' },
    sage: { name: 'Sage', value: '#6E9A74' },
    cream: { name: 'Cream', value: '#E8D9BC' }
  },
  defaultAccent: 'orange',
  shape: { radiusPanel: 26, radiusCard: 18, radiusControl: 999, borderWidth: 2 },
  fonts: { body: 'M PLUS Rounded 1c', heading: 'Barlow Condensed' }
})

describe('parseColor', () => {
  it('parses hex forms', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(parseColor('#F2541B')).toEqual({ r: 242, g: 84, b: 27, a: 1 })
    expect(parseColor('#11223344')?.a).toBeCloseTo(0.267, 2)
  })
  it('parses rgb and rgba forms', () => {
    expect(parseColor('rgb(1 2 3 / 0.5)')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 })
    expect(parseColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 })
    expect(parseColor('rgba(1,2,3,.25)')).toEqual({ r: 1, g: 2, b: 3, a: 0.25 })
  })
  it.each(['red', 'url(x)', 'var(--x)', '#12', '#12345', 'rgb(300 0 0)', 'rgb(0 0 0 / 2)', '#fff; background: red', '', 'rgb(1 2 3) ; x'])('rejects %j', (v) => {
    expect(parseColor(v)).toBeNull()
  })
  it('rejects non-strings', () => {
    expect(parseColor(42)).toBeNull()
    expect(parseColor(undefined)).toBeNull()
  })
})

describe('contrast helpers', () => {
  it('computes ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrastRatio('#336699', '#336699')).toBe(1)
    expect(contrastRatio('nope', '#ffffff')).toBe(1)
  })
  it('picks readable text for an accent', () => {
    expect(onAccentFor('#F2541B')).toBe('#1a1410')
    expect(onAccentFor('#ffffff')).toBe('#1a1410')
    expect(onAccentFor('#1a1410')).toBe('#ffffff')
    expect(onAccentFor('#0000ff')).toBe('#ffffff')
  })
})

describe('accent helpers', () => {
  it('normalises slot ids and hex', () => {
    expect(normaliseAccentInput('orange')).toBe('orange')
    expect(normaliseAccentInput(' CREAM ')).toBe('cream')
    expect(normaliseAccentInput('#ABC')).toBe('#aabbcc')
    expect(normaliseAccentInput('#AbCdEf')).toBe('#abcdef')
    expect(normaliseAccentInput(' #abcdef ')).toBe('#abcdef')
  })
  it.each(['abc', '#12', '#12345', '#1234567', 'purple', '#abcdeg', '#fff; x', 42, undefined, null])('rejects %j', (v) => {
    expect(normaliseAccentInput(v)).toBeUndefined()
  })
  it('resolves slots, custom hex and garbage', () => {
    const t = base()
    expect(resolveAccent(t, 'sage')).toBe('#6E9A74')
    expect(resolveAccent(t, '#ABCDEF')).toBe('#abcdef')
    expect(resolveAccent(t, 'purple')).toBe('#F2541B')
  })
  it('flags an accent that blends into the panel', () => {
    const t = base()
    expect(isLowContrast(t, '#181612')).toBe(true)
    expect(isLowContrast(t, '#1a1713')).toBe(true)
    expect(isLowContrast(t, 'orange')).toBe(false)
  })
  it('lists accent choices and appends Custom for a hex accent', () => {
    const t = base()
    expect(accentChoices(t, 'brick').map((c) => [c.id, c.label, c.checked])).toEqual([
      ['orange', 'Orange', false], ['brick', 'Brick', true], ['sage', 'Sage', false], ['cream', 'Cream', false]
    ])
    const custom = accentChoices(t, '#abcdef')
    expect(custom).toHaveLength(5)
    expect(custom[4]).toEqual({ id: '#abcdef', label: 'Custom', checked: true, custom: true })
    expect(custom.slice(0, 4).every((c) => !c.checked)).toBe(true)
  })
})

describe('resolveColors', () => {
  it('derives dark tokens from the text colour', () => {
    const c = resolveColors(base())
    expect(c.line).toBe('rgb(243 233 214 / 0.14)')
    expect(c.lineStrong).toBe('rgb(243 233 214 / 0.3)')
    expect(c.overlay).toBe('rgb(255 255 255 / 0.08)')
    expect(c.field).toBe('rgb(0 0 0 / 0.28)')
  })
  it('flips overlays for light themes', () => {
    const light = { ...base(), mode: 'light' as const, colors: { ...base().colors, text: '#2A2420' } }
    const c = resolveColors(light)
    expect(c.overlay).toBe('rgb(0 0 0 / 0.08)')
    expect(c.field).toBe('rgb(255 255 255 / 0.55)')
    expect(c.line).toBe('rgb(42 36 32 / 0.14)')
  })
  it('lets a theme override a derived token', () => {
    const t = { ...base(), overrides: { shadow: 'rgb(1 2 3 / 0.5)' } }
    expect(resolveColors(t).shadow).toBe('rgb(1 2 3 / 0.5)')
  })
})

describe('solid fills', () => {
  it('flattens a translucent colour over the panel colour', () => {
    expect(flattenOver('rgb(255 255 255 / 0.5)', '#000000')).toBe('#808080')
    expect(flattenOver('rgb(0 0 0 / 0.25)', '#ffffff')).toBe('#bfbfbf')
  })

  it('leaves opaque colours alone', () => {
    expect(flattenOver('#123456', '#ffffff')).toBe('#123456')
  })

  it('makes every fill and line token opaque, keeping shadow and sheen translucent', () => {
    const c = solidColors(base())
    for (const token of SOLID_TOKENS) expect(c[token], token).toMatch(/^#[0-9a-f]{6}$/)
    expect(c.shadow).toContain('/')
    expect(c.sheen).toContain('/')
    expect(themeVars(base(), 'orange', 0.9)['--card']).toBe(c.card)
  })

  it('stays close to the original look: a 3% white card over the dark panel is a slightly lighter solid', () => {
    expect(solidColors(base()).card).toBe('#1f1d19')
  })
})

describe('themeVars', () => {
  it('writes the resolved tokens as strings', () => {
    const v = themeVars(base(), 'orange', 0.9)
    expect(v['--accent']).toBe('#F2541B')
    expect(v['--accent-rgb']).toBe('242 84 27')
    expect(v['--on-accent']).toBe('#1a1410')
    expect(v['--panel-rgb']).toBe('24 22 18')
    expect(v['--panel-solid']).toBe('#181612')
    expect(v['--panel-alpha']).toBe('0.9')
    expect(v['--radius-panel']).toBe('26px')
    expect(v['--radius-control']).toBe('999px')
    expect(v['--border-width']).toBe('2px')
    expect(v['--scheme']).toBe('dark')
    expect(v['--font-heading']).toContain('Barlow Condensed')
    expect(v['--sage']).toBe('#6E9A74')
  })
  it('uses a custom accent as-is', () => {
    const v = themeVars(base(), '#ABCDEF', 1)
    expect(v['--accent']).toBe('#abcdef')
    expect(v['--accent-rgb']).toBe('171 205 239')
  })
  it('never emits anything that could break out of a declaration', () => {
    for (const value of Object.values(themeVars(base(), 'orange', 0.9))) expect(value).not.toMatch(/[;{}]/)
  })
})

describe('validateTheme', () => {
  it('accepts a good theme unchanged', () => {
    expect(validateTheme(base())).toEqual(base())
  })
  it('trims colour strings', () => {
    const t = base()
    t.colors.text = ' #F3E9D6 '
    expect(validateTheme(t)?.colors.text).toBe('#F3E9D6')
  })
  it('drops unknown override keys but keeps known ones', () => {
    const raw = { ...base(), overrides: { shadow: '#000', bogus: '#fff' } }
    expect(validateTheme(raw)?.overrides).toEqual({ shadow: '#000' })
  })
  const bad: [string, (t: any) => void][] = [
    ['wrong format', (t) => { t.format = 2 }],
    ['bad id', (t) => { t.id = 'Bad Id' }],
    ['name with markup', (t) => { t.name = '<b>x</b>' }],
    ['unknown mode', (t) => { t.mode = 'blue' }],
    ['url colour', (t) => { t.colors.panel = 'url(http://x)' }],
    ['var colour', (t) => { t.colors.text = 'var(--x)' }],
    ['injected declaration', (t) => { t.colors.muted = '#fff; background: red' }],
    ['translucent accent', (t) => { t.accents.orange.value = '#11223344' }],
    ['missing slot', (t) => { delete t.accents.cream }],
    ['bad accent name', (t) => { t.accents.sage.name = 'x'.repeat(30) }],
    ['bad default accent', (t) => { t.defaultAccent = 'purple' }],
    ['panel radius too large', (t) => { t.shape.radiusPanel = 999 }],
    ['border too wide', (t) => { t.shape.borderWidth = 9 }],
    ['unknown font', (t) => { t.fonts.body = 'Comic Sans' }],
    ['bad override colour', (t) => { t.overrides = { shadow: 'nope' } }]
  ]
  it.each(bad)('rejects %s', (_name, mutate) => {
    const t: any = JSON.parse(JSON.stringify(base()))
    mutate(t)
    expect(validateTheme(t)).toBeNull()
  })
  it.each([null, undefined, 5, 'x', []])('rejects non-object %j', (v) => {
    expect(validateTheme(v)).toBeNull()
  })
})

describe('accentToCommit', () => {
  it('commits nothing when the field was never edited, even if it holds a valid hex', () => {
    expect(accentToCommit('#7b5cff', false, 'orange')).toBeUndefined()
  })
  it('commits a normalised hex once edited', () => {
    expect(accentToCommit('#ABCDEF', true, 'orange')).toBe('#abcdef')
    expect(accentToCommit(' #abc ', true, 'sage')).toBe('#aabbcc')
  })
  it('commits nothing when the edit equals the current accent', () => {
    expect(accentToCommit('#ABCDEF', true, '#abcdef')).toBeUndefined()
  })
  it.each(['ff8800', 'abc', '#12', 'sage', '#fff; x', ''])('commits nothing for %j', (typed) => {
    expect(accentToCommit(typed, true, 'orange')).toBeUndefined()
  })
})

describe('colorToHex', () => {
  it('converts computed-style colours to hex', () => {
    expect(colorToHex('rgb(243, 233, 214)')).toBe('#f3e9d6')
    expect(colorToHex('rgba(0, 0, 0, 0)')).toBe('#000000')
    expect(colorToHex('#ABC')).toBe('#aabbcc')
  })
  it('returns null for anything else', () => {
    expect(colorToHex('nope')).toBeNull()
    expect(colorToHex('')).toBeNull()
  })
})
