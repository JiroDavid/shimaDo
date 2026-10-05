import { useEffect, useState } from 'react'
import type { AppData, Profile } from '../../shared/types'
import { toDateKey } from '../../shared/dates'

export function useData(): AppData | null {
  const [data, setData] = useState<AppData | null>(null)
  useEffect(() => {
    let alive = true
    window.shima.getData().then((d) => {
      if (alive) setData(d)
    })
    const off = window.shima.onChange(setData)
    return () => {
      alive = false
      off()
    }
  }, [])
  return data
}

export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function useToday(): string {
  const now = useNow(15_000)
  return toDateKey(new Date(now))
}

export function useAvatar(profile: Profile): string | null {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (profile.avatarUpdatedAt === null) {
      setSrc(null)
      return
    }
    let alive = true
    window.shima.getAvatar().then((url) => {
      if (alive) setSrc(url)
    })
    return () => {
      alive = false
    }
  }, [profile.avatarUpdatedAt])
  return src
}
