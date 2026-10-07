import { PANEL_TITLES, isEditablePanel } from '../../shared/elements'

export function panelLabel(panel: string): string {
  if (panel === 'bar') return 'Bar'
  if (panel === 'free') return 'Desktop'
  if (panel === 'all') return 'All windows'
  return isEditablePanel(panel) ? PANEL_TITLES[panel].replace(/^./, (c) => c.toUpperCase()) : panel
}
