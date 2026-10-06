import type { HabitInput } from './types'

export const HABIT_ICONS = ['check', 'ban', 'heart', 'book', 'drop', 'moon', 'bolt', 'leaf', 'star', 'coffee', 'flame'] as const
export type HabitIconId = (typeof HABIT_ICONS)[number]

export const MAX_HABITS = 12
export const MAX_HABIT_NAME = 28

export const isHabitIcon = (v: unknown): v is HabitIconId => HABIT_ICONS.includes(v as HabitIconId)

export function validateHabitInput(input: HabitInput): string | null {
  if (typeof input?.name !== 'string' || !input.name.trim()) return 'Give the habit a name'
  if (input.name.trim().length > MAX_HABIT_NAME) return `Habit names can be up to ${MAX_HABIT_NAME} characters`
  if (!isHabitIcon(input.icon)) return 'Pick an icon for the habit'
  return null
}
