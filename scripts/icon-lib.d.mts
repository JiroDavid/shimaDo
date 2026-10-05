export const ICON_SIZES: number[]
export function renderIcon(size: number, supersample?: number): Uint8Array
export function encodePng(size: number, rgba: Uint8Array): Uint8Array
export function buildIco(entries: { size: number; png: Uint8Array }[]): Uint8Array
