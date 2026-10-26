/** Saves a stored attachment (data URL) with its original name. */
export function downloadDataUrl(filename: string, dataUrl: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}

/** Browser side effect kept out of `api.ts`: saves text as a file download. */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv') {
  const blob = new Blob([`\uFEFF${content}`], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
