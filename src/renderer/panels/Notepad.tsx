import { useEffect, useRef, useState } from 'react'
import type { AppData, NotePage } from '../../shared/types'
import { MAX_NOTES_LENGTH, MAX_PAGES, MAX_TITLE_LENGTH } from '../../shared/notes'

const SAVE_DELAY_MS = 500

function PageEditor({ page }: { page: NotePage }) {
  const [text, setText] = useState(page.text)
  const [saved, setSaved] = useState(true)
  const area = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef({ text: page.text, saved: true })

  const flush = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (latest.current.saved) return
    latest.current.saved = true
    window.shima.setPageText(page.id, latest.current.text).then(() => {
      if (latest.current.saved) setSaved(true)
    })
  }

  useEffect(() => {
    if (document.activeElement === area.current || !latest.current.saved) return
    latest.current.text = page.text
    setText(page.text)
  }, [page.text])

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
    <>
      <textarea
        ref={area}
        data-el="notepad.text"
        className="field min-h-0 flex-1 resize-none overflow-y-auto !rounded-2xl py-3 leading-relaxed"
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
        <span className={saved ? '' : 'text-accent'} data-el="notepad.status">{saved ? 'Saved' : 'Saving...'}</span>
      </div>
    </>
  )
}

function Tab({ page, active, onlyPage, onClose }: { page: NotePage; active: boolean; onlyPage: boolean; onClose: () => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(page.title)
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])

  const commit = () => {
    setEditing(false)
    const title = draft.trim()
    if (title && title !== page.title) window.shima.renamePage(page.id, title)
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="field !min-h-[30px] !w-28 shrink-0 !px-2 !py-0 !text-[0.85rem]"
        aria-label="Page name"
        maxLength={MAX_TITLE_LENGTH}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <span className={`btn flex shrink-0 items-center gap-1 !min-h-[30px] !px-2 !py-0 !text-[0.85rem] ${active ? 'btn-active' : ''}`}>
      <button
        ref={ref}
        className="max-w-[9rem] truncate"
        role="tab"
        aria-selected={active}
        title="Double-click to rename"
        onClick={() => window.shima.setActivePage(page.id)}
        onDoubleClick={() => {
          setDraft(page.title)
          setEditing(true)
        }}
      >
        {page.title}
      </button>
      <button className="opacity-60 hover:opacity-100" aria-label={`Close ${page.title}`} disabled={onlyPage && !page.text} onClick={onClose}>
        ×
      </button>
    </span>
  )
}

export function Notepad({ data }: { data: AppData }) {
  const active = data.pages.find((p) => p.id === data.activePage) ?? data.pages[0]

  const close = (page: NotePage) => {
    if (page.text.trim() && !window.confirm(`Close "${page.title}"? Its text will be deleted.`)) return
    window.shima.deletePage(page.id)
  }

  return (
    <div className="flex flex-col gap-2 pb-2 pt-2" style={{ minHeight: 'inherit' }}>
      <div className="flex items-center gap-1">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1" role="tablist">
          {data.pages.map((p) => (
            <Tab key={p.id} page={p} active={p.id === active.id} onlyPage={data.pages.length === 1} onClose={() => close(p)} />
          ))}
        </div>
        <button className="btn !min-h-[30px] shrink-0 !px-2.5 !py-0" aria-label="New page" title="New page" disabled={data.pages.length >= MAX_PAGES} onClick={() => window.shima.addPage()}>
          +
        </button>
      </div>
      <PageEditor key={active.id} page={active} />
    </div>
  )
}
