import { useState } from 'react'
import type { Design } from '../../../shared/design'
import { captureRoles } from '../../../shared/presets'
import { Section } from '../Section'

interface Props {
  design: Design
  target: string
  targetName: string
}

export function WindowStyles({ design, target, targetName }: Props) {
  const [name, setName] = useState('')
  const canSave = name.trim().length > 0 && Object.keys(captureRoles(design, target)).length > 0

  const save = () => {
    if (!canSave) return
    window.shima.editPresetSave(target, name.trim())
    setName('')
  }

  return (
    <Section label="Window styles" count="copy colours">
      <div className="space-y-2 pb-2">
        <div className="flex gap-1.5">
          <input
            className="field min-w-0 flex-1"
            aria-label="Style name"
            placeholder={`Name this ${targetName} style`}
            maxLength={24}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <button className="btn" disabled={!canSave} onClick={save}>
            Save
          </button>
        </div>
        {!canSave && name.trim().length > 0 && <p className="text-[0.78rem] text-muted">Change some colours on {targetName} first, then save them.</p>}
        {design.presets.length === 0 ? (
          <p className="text-[0.78rem] text-muted">Save a window&apos;s colours and accent, then apply them to any other window.</p>
        ) : (
          <ul className="space-y-1.5">
            {design.presets.map((p) => (
              <li key={p.id} className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                <button className="btn !min-h-[26px] !px-2.5 !text-[0.78rem]" onClick={() => window.shima.editPresetApply(p.id, target)}>
                  Apply to {targetName}
                </button>
                <button className="btn !min-h-[26px] !px-2 !text-[0.78rem]" aria-label={`Delete ${p.name}`} onClick={() => window.shima.editPresetDelete(p.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}
