export const isImageFile = (file: File): boolean => /^image\//.test(file.type) || /\.(png|jpe?g|gif|svg|webp)$/i.test(file.name)

export async function fileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer())
}
