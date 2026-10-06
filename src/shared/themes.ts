import type { Theme } from './theme'

const classic: Theme = {
  format: 1,
  id: 'classic',
  name: 'Classic',
  mode: 'dark',
  colors: { panel: '#181612', text: '#F3E9D6', muted: '#A9A08F', urgent: '#E5484D', must: '#F2541B', important: '#F5C542', danger: '#E5484D' },
  accents: {
    orange: { name: 'Orange', value: '#F2541B' },
    brick: { name: 'Brick', value: '#E5484D' },
    sage: { name: 'Sage', value: '#6E9A74' },
    cream: { name: 'Cream', value: '#E8D9BC' }
  },
  defaultAccent: 'orange',
  shape: { radiusPanel: 26, radiusCard: 18, radiusControl: 999, borderWidth: 2 },
  fonts: { body: 'M PLUS Rounded 1c', heading: 'Barlow Condensed' }
}

const paper: Theme = {
  format: 1,
  id: 'paper',
  name: 'Paper',
  mode: 'light',
  colors: { panel: '#F6EFE0', text: '#2A2420', muted: '#7A6F60', urgent: '#C92A2A', must: '#C2410C', important: '#A16207', danger: '#C92A2A' },
  accents: {
    orange: { name: 'Orange', value: '#D9480F' },
    brick: { name: 'Brick', value: '#C92A2A' },
    sage: { name: 'Sage', value: '#3F7D58' },
    cream: { name: 'Tan', value: '#8F6D3E' }
  },
  defaultAccent: 'orange',
  shape: { radiusPanel: 26, radiusCard: 18, radiusControl: 999, borderWidth: 2 },
  fonts: { body: 'M PLUS Rounded 1c', heading: 'Barlow Condensed' }
}

const terminal: Theme = {
  format: 1,
  id: 'terminal',
  name: 'Terminal',
  mode: 'dark',
  colors: { panel: '#0B100C', text: '#B6F5B0', muted: '#5E8F5A', urgent: '#FF5C57', must: '#FFB000', important: '#F5E642', danger: '#FF5C57' },
  accents: {
    orange: { name: 'Amber', value: '#FFB000' },
    brick: { name: 'Red', value: '#FF5C57' },
    sage: { name: 'Phosphor', value: '#39FF14' },
    cream: { name: 'Mint', value: '#CFE8C8' }
  },
  defaultAccent: 'sage',
  shape: { radiusPanel: 8, radiusCard: 6, radiusControl: 8, borderWidth: 1 },
  fonts: { body: 'IBM Plex Mono', heading: 'IBM Plex Mono' }
}

const sakura: Theme = {
  format: 1,
  id: 'sakura',
  name: 'Sakura',
  mode: 'light',
  colors: { panel: '#FBE9EF', text: '#4A2A3A', muted: '#9A6B80', urgent: '#C0243F', must: '#C2410C', important: '#A16207', danger: '#C0243F' },
  accents: {
    orange: { name: 'Coral', value: '#D9531E' },
    brick: { name: 'Rose', value: '#C0304F' },
    sage: { name: 'Matcha', value: '#4F8A63' },
    cream: { name: 'Mocha', value: '#9C6B4B' }
  },
  defaultAccent: 'brick',
  shape: { radiusPanel: 30, radiusCard: 22, radiusControl: 999, borderWidth: 2 },
  fonts: { body: 'M PLUS Rounded 1c', heading: 'M PLUS Rounded 1c' }
}

const midnight: Theme = {
  format: 1,
  id: 'midnight',
  name: 'Midnight',
  mode: 'dark',
  colors: { panel: '#0E1424', text: '#E3ECFA', muted: '#8A9AB8', urgent: '#FF6B7A', must: '#FF8A4C', important: '#F5C542', danger: '#FF6B7A' },
  accents: {
    orange: { name: 'Ember', value: '#FF8A4C' },
    brick: { name: 'Coral', value: '#FF6B7A' },
    sage: { name: 'Mint', value: '#5FD0A3' },
    cream: { name: 'Ice', value: '#A8D4FF' }
  },
  defaultAccent: 'cream',
  shape: { radiusPanel: 22, radiusCard: 16, radiusControl: 999, borderWidth: 2 },
  fonts: { body: 'M PLUS Rounded 1c', heading: 'Barlow Condensed' }
}

export const THEMES: Theme[] = [classic, paper, terminal, sakura, midnight]
export const THEME_IDS: string[] = THEMES.map((t) => t.id)
export const DEFAULT_THEME_ID = 'classic'

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? classic
}
