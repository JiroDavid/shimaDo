import { mkdirSync, writeFileSync } from 'node:fs'
import { buildIco, encodePng, ICON_SIZES, renderIcon } from './icon-lib.mjs'

const entries = ICON_SIZES.map((size) => ({ size, png: encodePng(size, renderIcon(size)) }))

mkdirSync('resources', { recursive: true })
writeFileSync('resources/icon.ico', buildIco(entries))
writeFileSync('resources/icon.png', encodePng(512, renderIcon(512, 4)))
