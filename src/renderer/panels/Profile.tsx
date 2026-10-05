import { useState } from 'react'
import type { AppData, ProfileInput } from '../../shared/types'
import { toDateKey } from '../../shared/dates'
import { latestWeight } from '../../shared/gym'
import { validateProfile } from '../../shared/profile'
import { ProfileIcon } from '../components/icons'
import { useAvatar } from '../hooks/useData'

const toInput = (p: AppData['profile']): ProfileInput => ({
  username: p.username,
  firstName: p.firstName,
  dateOfBirth: p.dateOfBirth,
  heightCm: p.heightCm
})
const toNumber = (v: string): number | null => (v.trim() === '' ? null : Number(v))

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="panel-label">{label}</span>
      {children}
    </label>
  )
}

export function Profile({ data }: { data: AppData }) {
  const avatar = useAvatar(data.profile)
  const [form, setForm] = useState<ProfileInput>(() => toInput(data.profile))
  const [message, setMessage] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const weight = latestWeight(data.gym.weighIns)

  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const save = async () => {
    const problem = validateProfile(form, toDateKey(new Date()))
    if (problem) {
      setMessage(problem)
      return
    }
    await window.shima.setProfile(form)
    setMessage(null)
    setSaved(true)
  }

  const pick = async () => setMessage(await window.shima.pickAvatar())

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-dim text-muted">
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <ProfileIcon />}
        </div>
        <button className="btn" onClick={pick}>
          {avatar ? 'change picture' : 'add picture'}
        </button>
      </div>
      <Field label="username">
        <input className="field" value={form.username} onChange={(e) => set('username', e.target.value)} />
      </Field>
      <Field label="first name">
        <input className="field" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
      </Field>
      <Field label="date of birth">
        <input className="field" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
      </Field>
      <Field label="height (cm)">
        <input className="field" type="number" value={form.heightCm ?? ''} onChange={(e) => set('heightCm', toNumber(e.target.value))} />
      </Field>
      <div className="border border-dark-border p-2">
        <span className="panel-label">current weight</span>
        <span className="text-accent ml-2 font-bold">{weight === null ? '--' : `${weight} kg`}</span>
        <span className="ml-2 text-[0.75rem] text-muted">from your latest weigh-in</span>
      </div>
      {message && <p className="text-brick">{message}</p>}
      <div className="flex items-center justify-end gap-2">
        {saved && <span className="text-sage">saved</span>}
        <button className="btn" onClick={save}>
          save
        </button>
      </div>
    </div>
  )
}
