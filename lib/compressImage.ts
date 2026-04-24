// Client-side image compression targeting 50–200 KB output
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.size <= 200 * 1024) return file // already within target

  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')

  const maxDim = 2000
  let { width, height } = bitmap
  if (width > maxDim || height > maxDim) {
    const r = Math.min(maxDim / width, maxDim / height)
    width = Math.round(width * r)
    height = Math.round(height * r)
  }
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const toBlob = (q: number) =>
    new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', q))

  const outName = file.name.replace(/\.[^/.]+$/, '.jpg')

  // Binary search: find highest quality that fits in 200 KB
  let lo = 0.1, hi = 0.92, best: Blob | null = null
  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2
    const blob = await toBlob(mid)
    if (!blob) break
    if (blob.size <= 200 * 1024) {
      best = blob
      lo = mid // try higher quality
    } else {
      hi = mid // too big, lower quality
    }
  }

  if (!best) {
    // Fallback: lowest quality
    const blob = await toBlob(0.1)
    best = blob
  }

  return best
    ? new File([best], outName, { type: 'image/jpeg' })
    : file
}
