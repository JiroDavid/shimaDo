import { useEffect, useRef, useState } from 'react'
import type { AppData } from '../../shared/types'
import { MAX_NOTES_LENGTH } from '../../shared/notes'

const SAVE_DELAY_MS = 500

export function Notepad({ data }: { data: AppData }) {
  const [text, setText] = useState(data.notes)
  const [saved, setSaved] = useState(true)
  const area = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef({ text: data.notes, saved: true })

  const flush = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (latest.current.saved) return
    latest.current.saved = true
    window.shima.setNotes(latest.current.text).then(() => {
      if (latest.current.saved) setSaved(true)
    })
  }

  useEffect(() => {
    if (document.activeElement === area.current || !latest.current.saved) return
    latest.current.text = data.notes
    setText(data.notes)
  }, [data.notes])

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [])

  const change = (value: string) => {
    latest.current = { text: value, saved: false }
    setText(value)
    setSaved(false)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY_MS)
  }

  return (
    <div className="flex flex-col gap-2 pb-2 pt-2">
      <textarea
        ref={area}
        className="field min-h-[260px] resize-none !rounded-2xl py-3 leading-relaxed [field-sizing:content]"
        placeholder="Jot something down..."
        aria-label="Notepad"
        maxLength={MAX_NOTES_LENGTH}
        spellCheck={false}
        value={text}
        onChange={(e) => change(e.target.value)}
        onBlur={flush}
      />
      <div className="flex items-center justify-between px-1 text-[0.8rem] font-bold text-muted">
        <span>{text.length.toLocaleString()} characters</span>
        <span className={saved ? '' : 'text-accent'}>{saved ? 'Saved' : 'Saving...'}</span>
      </div>
    </div>
  )
}
