import { createContext } from 'react'
import type { PanelId } from '../../shared/types'

export const PanelContext = createContext<PanelId | null>(null)
