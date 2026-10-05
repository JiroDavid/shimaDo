import { dialog, nativeImage } from 'electron'
import fs from 'node:fs'
import { join } from 'node:path'
import { centerSquare } from '../shared/profile'

const AVATAR_SIZE = 128

export type PickResult = 'picked' | 'cancelled' | 'invalid'

const avatarPath = (dir: string) => join(dir, 'avatar.png')

export async function chooseAvatar(dir: string): Promise<PickResult> {
  const options = {
    title: 'Choose a profile picture',
    properties: ['openFile' as const],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }]
  }
  const result = await dialog.showOpenDialog(options)
  if (result.canceled || result.filePaths.length === 0) return 'cancelled'
  const image = nativeImage.createFromPath(result.filePaths[0])
  if (image.isEmpty()) return 'invalid'
  const { width, height } = image.getSize()
  const { x, y, size } = centerSquare(width, height)
  const png = image
    .crop({ x, y, width: size, height: size })
    .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE, quality: 'best' })
    .toPNG()
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(avatarPath(dir), png)
  return 'picked'
}

export function readAvatarDataUrl(dir: string): string | null {
  try {
    return `data:image/png;base64,${fs.readFileSync(avatarPath(dir)).toString('base64')}`
  } catch {
    return null
  }
}

export function writeAvatar(dir: string, png: Buffer): void {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(avatarPath(dir), png)
}

export function removeAvatar(dir: string): void {
  fs.rmSync(avatarPath(dir), { force: true })
}
