import type { ShimaApi } from '../shared/types'

declare global {
  interface Window {
    shima: ShimaApi
  }
}

export {}
