import { useEffect, useRef, useState } from 'react'
import type { AppData } from '../../shared/types'
import { GROUP_PREFIX, elementById, groupById, isMovableKey, isSurfaceKey, type EditableProp } from '../../shared/elements'
import { labelBoxValue, paletteFor, resolveOverride, type StyleOverride } from '../../shared/design'
import { colorToHex } from '../../shared/theme'
import { themeById } from '../../shared/themes'
import { useEditState } from '../hooks/useEditState'
import { ColorControl } from '../components/design/ColorControl'
import { SliderControl } from '../components/design/SliderControl'
import { BackgroundSection } from '../components/design/BackgroundSection'
import { StickerControls } from '../components/design/StickerControls'
import { Section } from '../components/Section'

type Scope = 'element' | 'group'

export function Designer({ data }: { data: AppData }) {
  const edit = useEditState()
  const styleSels = edit.selected.filter((x) => !x.id.startsWith('sticker:'))
  const sel = styleSels[styleSels.length - 1]
  const multi = styleSels.length > 1
  const stickers = edit.selected.flatMap((x) => (x.id.startsWith('sticker:') ? data.design.stickers.filter((s) => `sticker:${s.id}` === x.id) : []))
  const [scope, setScope] = useState<Scope>('element')
  const [confirmAll, setConfirmAll] = useState(false)
  const [text, setText] = useState('')
  const textTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const textBox = useRef<HTMLInputElement>(null)

  const def = sel && !sel.id.startsWith(GROUP_PREFIX) ? elementById(sel.id) : undefined
  const groupOnly = sel?.id.startsWith(GROUP_PREFIX) ?? false
  const group = groupOnly ? groupById(sel!.id.slice(GROUP_PREFIX.length)) : def?.group ? groupById(def.group) : undefined
  const effectiveScope: Scope = groupOnly || (multi ? false : scope === 'group') ? 'group' : 'element'
  const ownKey = (id: string) => id
  const key = !sel ? null : effectiveScope === 'group' && group ? GROUP_PREFIX + group.id : (def?.id ?? sel.id)
  const keys = !sel ? [] : multi ? styleSels.map((x) => ownKey(x.id)) : key ? [key] : []
  const props: EditableProp[] = effectiveScope === 'group' ? (group?.props ?? []) : (def?.props ?? group?.props ?? [])
  const has = (p: EditableProp) => props.includes(p)

  const theme = themeById(data.settings.theme)
  const palette = paletteFor(theme, data.settings.accent)

  const current: StyleOverride = !sel || !key ? {} : effectiveScope === 'group' ? (data.design.overrides[key] ?? {}) : resolveOverride(data.design, key)
  const computed = sel?.computed

  const colour = (field: 'color' | 'background' | 'borderColor') => current[field] ?? (computed?.[field] ? colorToHex(computed[field]) : null)
  const patch = (p: Record<string, unknown>) => {
    if (keys.length > 1) window.shima.editPatchMany(keys, p)
    else if (key) window.shima.editPatch(key, p)
  }

  useEffect(() => {
    setScope('element')
    setConfirmAll(false)
  }, [sel?.id, multi])

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

  const surfaceKey = key && !multi && isSurfaceKey(key) ? key : null

  const resetAll = () => {
    if (!confirmAll) return setConfirmAll(true)
    window.shima.editResetAll()
    setConfirmAll(false)
  }

  return (
    <div className="space-y-2 pb-3 pt-1">
      <StickerControls stickers={stickers} />
      {surfaceKey && <BackgroundSection surfaceKey={surfaceKey} bg={data.design.backgrounds[surfaceKey]} assets={data.assets} />}

      {!sel && stickers.length === 0 ? (
        <p className="py-6 text-center text-lg font-bold text-muted">Click anything in a panel, or pick a layer</p>
      ) : !sel || !key ? null : (
        <>
          <Section label={multi ? `${styleSels.length} elements` : (def?.name ?? group?.name ?? 'Element')} count={sel.panel}>
            {!multi && def?.group && group && (
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

          {(has('color') || has('background') || has('border') || has('shadow') || has('accent')) && (
            <Section label="Colours">
              <div className="space-y-3 pb-2">
                {has('color') && <ColorControl label="Text" value={colour('color')} palette={palette} recent={data.design.recentColors} onPick={(hex) => patch({ color: hex })} onClear={() => patch({ color: null })} />}
                {has('background') && (
                  <ColorControl label="Background" value={colour('background')} palette={palette} recent={data.design.recentColors} onPick={(hex) => patch({ background: hex })} onClear={() => patch({ background: null })} />
                )}
                {has('border') && (
                  <ColorControl label="Border" value={colour('borderColor')} palette={palette} recent={data.design.recentColors} onPick={(hex) => patch({ borderColor: hex })} onClear={() => patch({ borderColor: null })} />
                )}
                {has('shadow') && (
                  <ColorControl label="Shadow" value={current.shadow ?? null} palette={palette} recent={data.design.recentColors} onPick={(hex) => patch({ shadow: hex })} onClear={() => patch({ shadow: null })} />
                )}
                {has('accent') && (
                  <ColorControl label="Accent here" value={current.accent ?? null} palette={palette} recent={data.design.recentColors} onPick={(hex) => patch({ accent: hex })} onClear={() => patch({ accent: null })} />
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

          {(has('font') || (has('text') && effectiveScope === 'element' && !multi)) && (
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
                {has('text') && effectiveScope === 'element' && !multi && (
                  <input ref={textBox} className="field" aria-label="Label text" maxLength={60} value={text} onChange={(e) => commitText(e.target.value)} />
                )}
              </div>
            </Section>
          )}
        </>
      )}

      {sel && key && has('size') && !multi && (
        <Section label="Size" count={current.width || current.height ? `${current.width ?? 'auto'} x ${current.height ?? 'auto'}` : 'auto'}>
          <div className="space-y-2 pb-2">
            <p className="text-[0.78rem] text-muted">Drag the handles on the selected element to resize it. Its text wraps to fit.</p>
            <button className="btn" disabled={!current.width && !current.height} onClick={() => patch({ width: null, height: null })}>
              Auto size
            </button>
          </div>
        </Section>
      )}

      {sel && key && has('hide') && (
        <Section label="Visibility">
          <div className="flex items-center justify-between pb-2">
            <span className="font-bold">Hide</span>
            <button role="switch" aria-checked={current.hidden ?? false} aria-label="Hide" className="switch" onClick={() => patch({ hidden: !(current.hidden ?? false) })} />
          </div>
        </Section>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button className="btn" disabled={!edit.canUndo} onClick={() => window.shima.editUndo()}>
          Undo
        </button>
        <button className="btn" disabled={!edit.canRedo} onClick={() => window.shima.editRedo()}>
          Redo
        </button>
        <button className="btn" disabled={keys.length === 0} onClick={() => window.shima.editResetMany(keys)}>
          Reset element
        </button>
        <button
          className="btn"
          disabled={!keys.some((k) => isMovableKey(k) && data.design.moves[k])}
          onClick={() => keys.filter((k) => isMovableKey(k) && data.design.moves[k]).forEach((k) => window.shima.editResetPosition(k))}
        >
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
