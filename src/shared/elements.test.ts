import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BAR_BUTTONS, CARD_IDS, CARD_LABELS, ELEMENTS, GROUPS, GROUP_PREFIX, isMovableKey, isSurfaceKey, labelFor, slug, ID_PATTERN, EDITABLE_PANELS, PANEL_TITLES, elementById, groupById, isEditablePanel, isKnownKey } from './elements'

describe('element registry', () => {
  it('has unique element ids that are safe to put in a selector', () => {
    const ids = ELEMENTS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(ID_PATTERN)
  })

  it('has unique group ids with simple single-class selectors', () => {
    const ids = GROUPS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const g of GROUPS) {
      expect(g.id).toMatch(ID_PATTERN)
      expect(g.selector).toMatch(/^\.[a-z][a-z0-9-]*$/)
    }
  })

  it('only allows safe zero-specificity resting-state selectors', () => {
    for (const g of GROUPS) {
      if (g.rest === undefined) continue
      expect(g.rest, g.id).toMatch(/^:where\(:not\([a-z0-9.,:\[\]='\- ]+\)\)$/)
    }
    expect(GROUPS.filter((g) => g.rest !== undefined).map((g) => g.id).sort()).toEqual(['button', 'check', 'switch', 'task-title'])
  })

  it('only references groups that exist', () => {
    for (const e of ELEMENTS) if (e.group) expect(groupById(e.group), e.id).toBeDefined()
  })

  it('gives editable text elements a default label and nobody else', () => {
    for (const e of ELEMENTS) expect(e.props.includes('text'), e.id).toBe(e.defaultText !== undefined)
  })

  it('generates a window and a title element for every editable panel', () => {
    for (const p of EDITABLE_PANELS) {
      expect(elementById(`${p}.panel`)?.group).toBe('panel')
      expect(elementById(`${p}.title`)?.defaultText).toBe(PANEL_TITLES[p])
    }
  })

  it('looks things up by id and key', () => {
    expect(elementById('bar.label')?.defaultText).toBe('To-do')
    expect(elementById('nope')).toBeUndefined()
    expect(groupById('button')?.selector).toBe('.btn')
    expect(isKnownKey('bar.label')).toBe(true)
    expect(isKnownKey(`${GROUP_PREFIX}button`)).toBe(true)
    for (const bad of ['', 'nope', 'group:nope', '__proto__', 'group:', 'constructor', 'group:__proto__']) expect(isKnownKey(bad), bad).toBe(false)
  })

  it('knows which panels are editable', () => {
    expect(isEditablePanel('checklist')).toBe(true)
    for (const id of ['bar', 'mini', 'designer', 'nope']) expect(isEditablePanel(id), id).toBe(false)
  })

  it('gives every bar button its own element in the bar-button group', () => {
    for (const id of [...BAR_BUTTONS, 'edit', 'minimize']) {
      const def = elementById(`bar.btn.${id}`)
      expect(def, id).toBeDefined()
      expect(def?.group).toBe('bar-button')
      expect(def?.panel).toBe('bar')
    }
  })

  it('names what is selected for the on-screen tag', () => {
    expect(labelFor('bar.label')).toBe('Bar label')
    expect(labelFor('checklist.panel')).toBe('Checklist window')
    expect(labelFor('bar.btn.checklist')).toBe('Bar button: Checklist')
    expect(labelFor('group:card')).toBe('Cards (all)')
    expect(labelFor('nope')).toBe('')
  })

  it('recognises window surface keys', () => {
    for (const key of ['group:panel', 'bar.surface', 'checklist.panel', 'settings.panel']) expect(isSurfaceKey(key), key).toBe(true)
    for (const key of ['group:card', 'bar.label', 'checklist.title', 'notepad.text', 'group:panel-title']) expect(isSurfaceKey(key), key).toBe(false)
  })

  it('orders button-primary after button so it wins', () => {
    const order = GROUPS.map((g) => g.id)
    expect(order.indexOf('button-primary')).toBeGreaterThan(order.indexOf('button'))
  })
})

const renderer = fileURLToPath(new URL('../renderer', import.meta.url))
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]))
const files = walk(renderer)
const tsx = files.filter((f) => f.endsWith('.tsx')).map((f) => readFileSync(f, 'utf8')).join('\n')
const css = readFileSync(join(renderer, 'styles.css'), 'utf8')

describe('registry against the markup', () => {
  const generated = new Set([
    ...EDITABLE_PANELS.flatMap((p) => [`${p}.panel`, `${p}.title`]),
    ...BAR_BUTTONS.map((id) => `bar.btn.${id}`),
    ...CARD_IDS
  ])

  it('uses only registered ids in static data-el attributes', () => {
    const used = [...tsx.matchAll(/data-el="([a-z0-9.-]+)"/g)].map((m) => m[1])
    for (const id of used) expect(elementById(id), id).toBeDefined()
  })

  it('puts every non-generated registry id in the markup', () => {
    const used = new Set([...tsx.matchAll(/data-el="([a-z0-9.-]+)"/g)].map((m) => m[1]))
    for (const e of ELEMENTS) if (!generated.has(e.id)) expect(used.has(e.id), e.id).toBe(true)
  })

  it('generates the window and title ids in PanelFrame', () => {
    const frame = readFileSync(join(renderer, 'components', 'PanelFrame.tsx'), 'utf8')
    expect(frame).toMatch(/data-el=\{editable \? `\$\{id\}\.panel` : undefined\}/)
    expect(frame).toMatch(/data-el=\{editable \? `\$\{id\}\.title` : undefined\}/)
    expect(frame).toContain('panel-title')
  })

  it('generates the bar button ids in Bar', () => {
    const bar = readFileSync(join(renderer, 'panels', 'Bar.tsx'), 'utf8')
    expect(bar).toContain('data-el={`bar.btn.${b.id}`}')
    expect(bar).toContain('data-el="bar.btn.edit"')
    expect(bar).toContain('data-el="bar.btn.minimize"')
  })

  it('has every group selector class defined in the css or used in the markup', () => {
    for (const g of GROUPS) {
      const cls = g.selector.slice(1)
      expect(css.includes(g.selector) || tsx.includes(cls), g.id).toBe(true)
    }
  })
})

describe('edit mode exits stay reachable', () => {
  it('marks the bar edit button as exempt from click blocking', () => {
    const bar = readFileSync(join(renderer, 'panels', 'Bar.tsx'), 'utf8')
    expect(bar).toMatch(/data-edit-exempt[^>]*aria-label="Edit mode"|aria-label="Edit mode"[^>]*data-edit-exempt/)
  })

  it('exempts the panel dot and resize handles in the edit layer', () => {
    const layer = readFileSync(join(renderer, 'components', 'EditLayer.tsx'), 'utf8')
    for (const needle of ['[data-edit-exempt]', '.resize-handle', '.dot-btn']) expect(layer).toContain(needle)
  })
})

describe('designer window', () => {
  it('renders the designer panel from App', () => {
    const app = readFileSync(join(renderer, 'App.tsx'), 'utf8')
    expect(app).toContain("id === 'designer' && <Designer data={data} />")
  })

  it('never marks up its own controls as editable elements', () => {
    const designer = readFileSync(join(renderer, 'panels', 'Designer.tsx'), 'utf8')
    expect(designer).not.toContain('data-el')
  })

  it('turns an emptied text box into a clear, not a blank label', () => {
    const designer = readFileSync(join(renderer, 'panels', 'Designer.tsx'), 'utf8')
    expect(designer).toMatch(/text: value\.trim\(\) === '' \? null : value/)
  })
})

describe('movable elements', () => {
  it('lets every element move except window surfaces', () => {
    expect(isMovableKey('bar.label')).toBe(true)
    expect(isMovableKey('bar.btn.checklist')).toBe(true)
    expect(isMovableKey('checklist.heading')).toBe(true)
    for (const key of ['checklist.panel', 'bar.surface', 'group:button', 'nope', '__proto__', 'constructor', '']) expect(isMovableKey(key), key).toBe(false)
  })
})

describe('card and button elements', () => {
  it('slugs labels', () => {
    expect(slug('To do')).toBe('to-do')
    expect(slug('Tick off each day')).toBe('tick-off-each-day')
    expect(slug(' About you! ')).toBe('about-you')
  })

  it('registers a card element for every listed label', () => {
    for (const [panel, labels] of Object.entries(CARD_LABELS)) {
      for (const label of labels ?? []) {
        const def = elementById(`${panel}.card.${slug(label)}`)
        expect(def, `${panel} ${label}`).toBeDefined()
        expect(def?.group).toBe('card')
      }
    }
    expect(CARD_IDS).toContain('checklist.card.overdue')
    expect(CARD_IDS).toContain('settings.card.backup')
  })

  it('registers the main buttons as movable elements', () => {
    for (const id of ['checklist.add', 'schedule.add-task', 'gym.split', 'focus.start', 'habits.edit', 'profile.save', 'welcome.next', 'settings.export', 'settings.import', 'settings.reset-layout']) {
      expect(elementById(id), id).toBeDefined()
      expect(isMovableKey(id), id).toBe(true)
    }
  })
})

describe('section and panel context', () => {
  it('builds card ids from the panel and label', () => {
    const section = readFileSync(join(renderer, 'components', 'Section.tsx'), 'utf8')
    expect(section).toContain('PanelContext')
    expect(section).toContain('slug(label)')
    const frame = readFileSync(join(renderer, 'components', 'PanelFrame.tsx'), 'utf8')
    expect(frame).toContain('PanelContext.Provider')
  })
})

describe('content security policy', () => {
  it('allows the private asset scheme for images only', () => {
    const html = readFileSync(join(renderer, 'index.html'), 'utf8')
    const csp = /Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1] ?? ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).toMatch(/img-src[^;]*shimado-asset:/)
    expect(csp.replace(/img-src[^;]*;?/, '')).not.toContain('shimado-asset:')
  })
})
