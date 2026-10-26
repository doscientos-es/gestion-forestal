import { DomainError } from './errors'

export type StoredFile = { name: string; mime: string; dataUrl: string }

const MAX_SIDE = 1280
const MAX_PDF_BYTES = 300_000

function readAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new DomainError('No se ha podido leer el archivo.'))
    reader.readAsDataURL(file)
  })
}

/** Shrinks a phone photo (several MB) to a ~100 KB JPEG so the demo database can keep it. */
async function shrinkImage(file: File): Promise<string> {
  const source = await readAsDataUrl(file)
  const image = new Image()
  image.src = source
  await image.decode()
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.7)
}

/**
 * Turns a picked file into something storable: photos are resized, PDFs are kept as they are
 * (small ones only). Production uploads to file storage and keeps just the path.
 */
export async function readAttachment(file: File): Promise<StoredFile> {
  if (file.type.startsWith('image/')) {
    return { name: file.name, mime: 'image/jpeg', dataUrl: await shrinkImage(file) }
  }
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES)
      throw new DomainError('El PDF pesa demasiado para la demo (máximo 300 KB).')
    return { name: file.name, mime: file.type, dataUrl: await readAsDataUrl(file) }
  }
  throw new DomainError('Adjunta una foto o un PDF.')
}
