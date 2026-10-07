import { useEffect, useState } from 'react'
import { isEditablePanel } from '../../shared/elements'
import type { StickerPanel } from '../../shared/placement'
import type { AppData, PanelId } from '../../shared/types'
import { useEditState } from '../hooks/useEditState'
import { AddSection } from '../components/design/AddSection'
import { WindowStyles } from '../components/design/WindowStyles'
import { FreeList, LayerList } from '../components/design/LayerList'
import { panelLabel } from '../lib/panelLabel'
import { Section } from '../components/Section'

const TARGETS: StickerPanel[] = ['free', 'bar', 'checklist', 'schedule', 'gym', 'progress', 'habits', 'focus', 'notepad', 'settings', 'profile']
const nameOf = (p: StickerPanel) => panelLabel(p)

export function Layers({ data }: { data: AppData }) {
  const edit = useEditState()
  const [pinned, setPinned] = useState<StickerPanel | null>(null)
  const picked = edit.selected[0]?.panel
  const fromSelection = picked && (picked === 'bar' || picked === 'free' || isEditablePanel(picked)) ? (picked as StickerPanel) : null
  const target: StickerPanel = pinned ?? fromSelection ?? 'free'
  const selectionKey = edit.selected.map((s) => s.id).join('|')

  useEffect(() => {
    if (selectionKey !== '') setPinned(null)
  }, [selectionKey])

  useEffect(() => {
    setPinned(null)
  }, [edit.spaceClicks])

  const visible = (p: StickerPanel) => p === 'bar' || p === 'free' || data.settings.panels[p as PanelId].visible
  const choose = (p: StickerPanel) => {
    if (!visible(p)) window.shima.togglePanel(p as PanelId)
    setPinned(p)
  }
  const selected = new Set(edit.selected.filter((s) => s.panel === target).map((s) => s.id))
  const surface = target === 'bar' ? 'bar.surface' : `${target}.panel`

  return (
    <div className="space-y-2 pb-3 pt-1">
      <Section label="Where to edit" count="pick one">
        <div className="flex flex-wrap gap-1.5 pb-2">
          {TARGETS.map((p) => (
            <button
              key={p}
              className={`btn !min-h-[28px] !px-2.5 !text-[0.8rem] ${target === p ? 'btn-active' : visible(p) ? '' : 'opacity-60'}`}
              onClick={() => choose(p)}
            >
              {nameOf(p)}
            </button>
          ))}
        </div>
      </Section>
      <Section label="Layers" count={nameOf(target)}>
        <div className="pb-2">
          {target === 'free' ? (
            <FreeList design={data.design} selected={selected} />
          ) : (
            <>
              <LayerList design={data.design} panel={target} dom={edit.dom[target]} selected={selected} />
              <p className="pt-2 text-[0.78rem] text-muted">Click to select, Ctrl or Shift+click to select several. Drag a row onto another to put it in front of that one. The top is the front.</p>
            </>
          )}
        </div>
      </Section>
      {target !== 'free' && <WindowStyles design={data.design} target={target} targetName={nameOf(target)} />}
      <AddSection data={data} target={target} targetName={nameOf(target)} canBackground onBackground={(asset) => window.shima.editBackground(surface, { asset, fit: 'cover', opacity: 1 })} />
    </div>
  )
}
