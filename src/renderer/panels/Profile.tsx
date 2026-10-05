import { useState } from 'react'
import type { AppData, ProfileInput } from '../../shared/types'
import { toDateKey } from '../../shared/dates'
import { latestWeight } from '../../shared/gym'
import { validateProfile } from '../../shared/profile'
import { ProfileIcon } from '../components/icons'
import { Section } from '../components/Section'
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
    <label className="block space-y-1">
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
    <div className="space-y-2 pb-2">
      <div className="flex items-center gap-4 pt-2">
        <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-accent text-muted">
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <ProfileIcon />}
        </div>
        <div className="min-w-0">
          <div className="heading truncate text-[2rem]">{form.firstName || form.username || 'Your profile'}</div>
          <button className="btn mt-2" onClick={pick}>
            {avatar ? 'Change picture' : 'Add picture'}
          </button>
        </div>
      </div>
      <Section label="About you">
        <div className="space-y-3 pb-2">
          <Field label="Username">
            <input className="field" value={form.username} onChange={(e) => set('username', e.target.value)} />
          </Field>
          <Field label="First name">
            <input className="field" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
          </Field>
          <Field label="Date of birth">
            <input className="field" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
          </Field>
          <Field label="Height (cm)">
            <input className="field" type="number" value={form.heightCm ?? ''} onChange={(e) => set('heightCm', toNumber(e.target.value))} />
          </Field>
          <div className="flex items-center justify-between rounded-2xl border-2 border-dark-border px-3 py-2.5">
            <span className="panel-label">Current weight</span>
            <span className="font-extrabold text-accent">{weight === null ? '--' : `${weight} kg`}</span>
          </div>
        </div>
      </Section>
      {message && <p className="font-bold text-urgent">{message}</p>}
      <div className="flex items-center justify-end gap-3 pt-2">
        {saved && <span className="font-extrabold text-sage">Saved</span>}
        <button className="btn btn-primary" onClick={save}>
          Save
        </button>
      </div>
    </div>
  )
}
