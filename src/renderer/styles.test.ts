import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { THEME_FONTS } from '../shared/theme'

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

const renderer = fileURLToPath(new URL('.', import.meta.url))
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]))

describe('colour audit', () => {
  it('styles.css has no hardcoded colour literals except white on danger buttons', () => {
    const found = css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) ?? []
    const stray = found.filter((f) => f !== '#fff' && !f.includes('var('))
    expect(stray).toEqual([])
  })

  it('components have no hardcoded colour literals', () => {
    const offenders = walk(renderer)
      .filter((f) => f.endsWith('.tsx'))
      .filter((f) => /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\(\s*\d/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('tailwind colours are all driven by variables', () => {
    const config = readFileSync(fileURLToPath(new URL('../../tailwind.config.cjs', import.meta.url)), 'utf8')
    expect(config).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('main.tsx applies the default theme before React mounts', () => {
    const main = readFileSync(join(renderer, 'main.tsx'), 'utf8')
    expect(main.indexOf('applyTheme(')).toBeGreaterThan(-1)
    expect(main.indexOf('applyTheme(')).toBeLessThan(main.indexOf('createRoot('))
  })

  it('App applies the saved theme and design in a layout effect', () => {
    const app = readFileSync(join(renderer, 'App.tsx'), 'utf8')
    expect(app).toMatch(/useLayoutEffect\(\(\) => \{\s*if \(data\) \{\s*applyTheme\(data\.settings\)/)
    expect(app).toContain('applyDesign(')
    expect(app).not.toMatch(/dataset\.accent/)
  })

  it('App never applies overrides to the designer window', () => {
    const app = readFileSync(join(renderer, 'App.tsx'), 'utf8')
    expect(app).toMatch(/applyDesign\(id === 'designer' \|\| id === 'layers' \? emptyDesign\(\) : data\.design/)
  })
})

describe('bundled fonts', () => {
  it.each([...THEME_FONTS])('imports %s in main.tsx', (font) => {
    const main = readFileSync(join(renderer, 'main.tsx'), 'utf8')
    expect(main).toContain(`@fontsource/${font.toLowerCase().replace(/ /g, '-')}/`)
  })
})

describe('edit mode visuals', () => {
  it('marks an open bar button with an underline that overrides cannot hide', () => {
    expect(css).toMatch(/\.bar-btn\[data-active='true'\]\s*\{[^}]*box-shadow/)
  })

  it('draws window and bar selections inside the window edge', () => {
    expect(css).toMatch(/html\[data-edit\] \.panel\[data-edit-selected\][^{]*\{[^}]*outline-offset: -/)
  })

  it('has a name tag style for the hovered and selected element', () => {
    expect(css).toMatch(/\.edit-tag\s*\{[^}]*position: fixed/)
  })
})

describe('placed layers', () => {
  it('keeps placed items out of the way outside edit mode', () => {
    expect(css).toMatch(/\.placed-front\s*\{[^}]*pointer-events: none/)
    expect(css).toMatch(/html\[data-edit\] \.sticker\s*\{[^}]*pointer-events: auto/)
  })

  it('stacks background, content and front stickers in that order', () => {
    expect(css).toMatch(/\.placed-back\s*\{[^}]*z-index: 0/)
    expect(css).toMatch(/\.panel > \.titlebar[^{]*\{[^}]*z-index: 1/)
    expect(css).toMatch(/\.placed-front\s*\{[^}]*z-index: auto/)
    expect(css).toMatch(/\.panel,\s*\.bar\s*\{[^}]*isolation: isolate/)
  })

  it('shows the resize handle only on the selected sticker', () => {
    expect(css).toMatch(/\.sticker-handle\s*\{[^}]*display: none/)
    expect(css).toMatch(/\.sticker\[data-edit-selected\] \.sticker-handle\s*\{[^}]*display: block/)
  })
})

describe('fit measuring', () => {
  it('ignores moved elements while the panel measures its content height', () => {
    expect(css).toMatch(/\.fit-measure \[data-el\]\s*\{[^}]*translate: none !important/)
    const fit = readFileSync(join(renderer, 'components', 'Fit.tsx'), 'utf8')
    expect(fit).toContain('fit-measure')
  })
})

describe('behind stickers in edit mode', () => {
  it('keeps the real stacking order and outlines the selected sticker on top instead', () => {
    expect(css).not.toMatch(/placed-(back|mid):has\(\.sticker\[data-edit-selected\]\)/)
    expect(css).toMatch(/\.edit-box\s*\{[^}]*pointer-events: none/)
  })

  it('picks a sticker under the pointer when the click lands on the window surface', () => {
    const layer = readFileSync(join(renderer, 'components', 'EditLayer.tsx'), 'utf8')
    expect(layer).toContain('elementsFromPoint')
    expect(layer).toContain('placeBox(')
  })
})

describe('layered panels', () => {
  it('frees the window body from its own stacking context so listed elements can interleave with stickers', () => {
    expect(css).toMatch(/\.panel\.has-layers > \.win-body[^{]*\{[^}]*z-index: auto/)
  })

  it('flags windows that have layered content', () => {
    expect(readFileSync(join(renderer, 'components', 'PanelFrame.tsx'), 'utf8')).toContain('has-layers')
    expect(readFileSync(join(renderer, 'panels', 'Bar.tsx'), 'utf8')).toContain('has-layers')
  })
})

describe('background gestures', () => {
  it('moves and scales with Alt only, in Edit mode', () => {
    const g = readFileSync(join(renderer, 'components', 'BackgroundGestures.tsx'), 'utf8')
    for (const needle of ['e.altKey', 'edit.active', "'wheel'", 'editBackground']) expect(g, needle).toContain(needle)
  })
})
