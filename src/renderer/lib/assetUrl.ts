import { ASSET_SCHEME } from '../../shared/assets'

const base = (): string => (window as unknown as { __ASSET_BASE__?: string }).__ASSET_BASE__ ?? `${ASSET_SCHEME}://asset/`

export const assetUrl = (id: string): string => `${base()}${id}`
