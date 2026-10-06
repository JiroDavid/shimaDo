import { useState } from 'react'
import { EMOJI_GROUPS, isEmoji } from '../../../shared/emoji'

export function EmojiGrid({ onPlace }: { onPlace: (emoji: string) => void }) {
  const [group, setGroup] = useState(0)
  const [custom, setCustom] = useState('')
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {EMOJI_GROUPS.map((g, i) => (
          <button key={g.name} className={`btn !min-h-[26px] !px-2 !text-[0.75rem] ${i === group ? 'btn-active' : ''}`} onClick={() => setGroup(i)}>
            {g.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_GROUPS[group].emoji.map((e) => (
          <button key={e} className="rounded-lg py-1 text-[1.2rem] hover:bg-overlay" aria-label={`Place ${e}`} onClick={() => onPlace(e)}>
            {e}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input className="field !min-h-[32px] min-w-0 flex-1 !px-3" aria-label="Any emoji" placeholder="Paste any emoji" maxLength={16} value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button
          className="btn !min-h-[32px] shrink-0 whitespace-nowrap !px-3"
          disabled={!isEmoji(custom.trim())}
          onClick={() => {
            onPlace(custom.trim())
            setCustom('')
          }}
        >
          Add
        </button>
      </div>
    </div>
  )
}
