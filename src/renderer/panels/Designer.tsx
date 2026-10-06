import { useEffect, useRef, useState } from 'react'
import type { AppData, PanelId } from '../../shared/types'
import { GROUP_PREFIX, elementById, groupById, isEditablePanel, isMovableKey, isSurfaceKey, type EditableProp } from '../../shared/elements'
import type { StickerPanel } from '../../shared/placement'
import { labelBoxValue, paletteFor, resolveOverride, type StyleOverride } from '../../shared/design'
import { colorToHex } from '../../shared/theme'
import { themeById } from '../../shared/themes'
import { useEditState } from '../hooks/useEditState'
import { ColorControl } from '../components/design/ColorControl'
import { SliderControl } from '../components/design/SliderControl'
import { AddSection } from '../components/design/AddSection'
import { BackgroundSection } from '../components/design/BackgroundSection'
import { StickerControls } from '../components/design/StickerControls'
import { Section } from '../components/Section'

const PANEL_BUTTONS: { id: PanelId; label: string }[] = [
  { id: 'checklist', label: 'Checklist' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'gym', label: 'Gym' },
  { id: 'progress', label: 'Progress' },
  { id: 'habits', label: 'Habits' },
  { id: 'focus', label: 'Focus' },
  { id: 'notepad', label: 'Notepad' },
  { id: 'settings', label: 'Settings' },
  { id: 'profile', label: 'Profile' }
]

type Scope = 'element' | 'group'

export function Designer({ data }: { data: AppData }) {
  const edit = useEditState()
  const sel = edit.selected
  const [scope, setScope] = useState<Scope>('element')
  const [confirmAll, setConfirmAll] = useState(false)
  const [text, setText] = useState('')
  const textTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const textBox = useRef<HTMLInputElement>(null)

  const isSticker = sel?.id.startsWith('sticker:') ?? false
  const def = sel && !isSticker && !sel.id.startsWith(GROUP_PREFIX) ? elementById(sel.id) : undefined
  const groupOnly = sel?.id.startsWith(GROUP_PREFIX) ?? false
  const group = groupOnly ? groupById(sel!.id.slice(GROUP_PREFIX.length)) : def?.group ? groupById(def.group) : undefined
  const effectiveScope: Scope = groupOnly ? 'group' : scope
  const key = !sel || isSticker ? null : effectiveScope === 'group' && group ? GROUP_PREFIX + group.id : (def?.id ?? sel.id)
  const props: EditableProp[] = effectiveScope === 'group' ? (group?.props ?? []) : (def?.props ?? group?.props ?? [])
  const has = (p: EditableProp) => props.includes(p)

  const theme = themeById(data.settings.theme)
  const palette = paletteFor(theme, data.settings.accent)

  const current: StyleOverride = !sel || !key ? {} : effectiveScope === 'group' ? (data.design.overrides[key] ?? {}) : resolveOverride(data.design, key)
  const computed = sel?.computed

  const colour = (field: 'color' | 'background' | 'borderColor') => current[field] ?? (computed?.[field] ? colorToHex(computed[field]) : null)
  const patch = (p: Record<string, unknown>) => key && window.shima.editPatch(key, p)

  useEffect(() => {
    setScope('element')
    setConfirmAll(false)
  }, [sel?.id])

  useEffect(() => {
    setText(current.text ?? def?.defaultText ?? '')
  }, [sel?.id, key])

  useEffect(() => {
    setText((typed) => labelBoxValue(typed, current.text, def?.defaultText, document.activeElement === textBox.current))
  }, [current.text])

  const commitText = (value: string) => {
    setText(value)
    clearTimeout(textTimer.current)
    textTimer.current = setTimeout(() => patch({ text: value.trim() === '' ? null : value }), 250)
  }

  const sticker = isSticker ? data.design.stickers.find((s) => `sticker:${s.id}` === sel!.id) : undefined
  const [lastWindow, setLastWindow] = useState<StickerPanel>('checklist')
  useEffect(() => {
    const p = sel?.panel
    if (p && (p === 'bar' || isEditablePanel(p))) setLastWindow(p as StickerPanel)
  }, [sel?.panel])
  const windowName = lastWindow === 'bar' ? 'the bar' : (PANEL_BUTTONS.find((b) => b.id === lastWindow)?.label ?? lastWindow)
  const surfaceKey = key && isSurfaceKey(key) ? key : null
  const backgroundTarget = surfaceKey ?? (lastWindow === 'bar' ? 'bar.surface' : `${lastWindow}.panel`)
  const setBackgroundFrom = (asset: string) => window.shima.editBackground(backgroundTarget, { asset, fit: 'cover', opacity: 1 })

  const resetAll = () => {
    if (!confirmAll) return setConfirmAll(true)
    window.shima.editResetAll()
    setConfirmAll(false)
  }

  return (
    <div className="space-y-2 pb-3 pt-1">
      <Section label="Open panels">
        <div className="flex flex-wrap gap-1.5 pb-2">
          {PANEL_BUTTONS.map((p) => (
            <button
              key={p.id}
              className={`btn !min-h-[28px] !px-2.5 !text-[0.8rem] ${data.settings.panels[p.id].visible ? 'btn-active' : ''}`}
              onClick={() => window.shima.togglePanel(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <AddSection data={data} target={lastWindow} targetName={windowName} canBackground onBackground={setBackgroundFrom} />
      {(isSticker || data.design.stickers.some((s) => s.panel === lastWindow)) && (
        <StickerControls sticker={sticker} onThisWindow={data.design.stickers.filter((s) => s.panel === lastWindow)} windowName={windowName} />
      )}
      {surfaceKey && <BackgroundSection surfaceKey={surfaceKey} bg={data.design.backgrounds[surfaceKey]} assets={data.assets} />}

      {!sel ? (
        <p className="py-6 text-center text-lg font-bold text-muted">Click anything in a panel</p>
      ) : isSticker || !key ? null : (
        <>
          <Section label={def?.name ?? group?.name ?? 'Element'} count={sel.panel}>
            {def?.group && group && (
              <div className="flex gap-1.5 pb-2" role="radiogroup" aria-label="Scope">
                <button
                  role="radio"
                  aria-checked={effectiveScope === 'element'}
                  className={`btn flex-1 !px-2 ${effectiveScope === 'element' ? 'btn-active' : ''}`}
                  onClick={() => setScope('element')}
                >
                  Just this
                </button>
                <button
                  role="radio"
                  aria-checked={effectiveScope === 'group'}
                  className={`btn flex-1 !px-2 ${effectiveScope === 'group' ? 'btn-active' : ''}`}
                  onClick={() => setScope('group')}
                >
                  All {group.name.toLowerCase()}
                </button>
              </div>
            )}
            {groupOnly && group && <p className="pb-2 text-[0.85rem] text-muted">Changes apply to all {group.name.toLowerCase()}.</p>}
          </Section>

          {(has('color') || has('background') || has('border')) && (
            <Section label="Colours">
              <div className="space-y-3 pb-2">
                {has('color') && <ColorControl label="Text" value={colour('color')} palette={palette} onPick={(hex) => patch({ color: hex })} onClear={() => patch({ color: null })} />}
                {has('background') && (
                  <ColorControl label="Background" value={colour('background')} palette={palette} onPick={(hex) => patch({ background: hex })} onClear={() => patch({ background: null })} />
                )}
                {has('border') && (
                  <ColorControl label="Border" value={colour('borderColor')} palette={palette} onPick={(hex) => patch({ borderColor: hex })} onClear={() => patch({ borderColor: null })} />
                )}
              </div>
            </Section>
          )}

          {(has('radius') || has('border')) && (
            <Section label="Shape">
              <div className="space-y-3 pb-2">
                {has('radius') && <SliderControl label="Corner radius" min={0} max={60} value={current.radius ?? computed?.radius ?? 0} onChange={(v) => patch({ radius: v })} />}
                {has('border') && <SliderControl label="Border width" min={0} max={8} value={current.borderWidth ?? computed?.borderWidth ?? 0} onChange={(v) => patch({ borderWidth: v })} />}
              </div>
            </Section>
          )}

          {(has('font') || (has('text') && effectiveScope === 'element')) && (
            <Section label="Text">
              <div className="space-y-3 pb-2">
                {has('font') && <SliderControl label="Size" min={8} max={72} value={current.fontSize ?? computed?.fontSize ?? 16} onChange={(v) => patch({ fontSize: v })} />}
                {has('font') && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Bold</span>
                    <button
                      role="switch"
                      aria-checked={current.bold ?? computed?.bold ?? false}
                      aria-label="Bold"
                      className="switch"
                      onClick={() => patch({ bold: !(current.bold ?? computed?.bold ?? false) })}
                    />
                  </div>
                )}
                {has('text') && effectiveScope === 'element' && (
                  <input ref={textBox} className="field" aria-label="Label text" maxLength={60} value={text} onChange={(e) => commitText(e.target.value)} />
                )}
              </div>
            </Section>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button className="btn" disabled={!edit.canUndo} onClick={() => window.shima.editUndo()}>
          Undo
        </button>
        <button className="btn" disabled={!edit.canRedo} onClick={() => window.shima.editRedo()}>
          Redo
        </button>
        <button className="btn" disabled={!key} onClick={() => key && window.shima.editReset(key)}>
          Reset element
        </button>
        <button className="btn" disabled={!key || !isMovableKey(key) || !data.design.moves[key]} onClick={() => key && window.shima.editResetPosition(key)}>
          Reset position
        </button>
        <button className={`btn ${confirmAll ? 'btn-danger' : ''}`} onClick={resetAll}>
          {confirmAll ? 'Really reset?' : 'Reset everything'}
        </button>
        <button className="btn btn-primary ml-auto" onClick={() => window.shima.setEditActive(false)}>
          Done
        </button>
      </div>
    </div>
  )
}
