/** Spreadsheet-friendly CSV: semicolon separated (Spanish Excel), quoted text, comma decimals. */
export function csvText(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export function csvDecimal(value: number, digits = 2) {
  return value.toFixed(digits).replace('.', ',')
}

/**
 * Reads CSV text from a spreadsheet: the delimiter (`;`, `,` or tab) is detected from the first
 * line, quoted cells may hold delimiters, quotes and line breaks, and blank rows are skipped.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '')
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const count = (char: string) => firstLine.split(char).length - 1
  const delimiter = [';', '\t', ','].reduce((best, char) =>
    count(char) > count(best) ? char : best,
  )
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const endCell = () => {
    row.push(cell.trim())
    cell = ''
  }
  const endRow = () => {
    endCell()
    if (row.some((value) => value !== '')) rows.push(row)
    row = []
  }
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? ''
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === delimiter) endCell()
    else if (char === '\n') endRow()
    else if (char !== '\r') cell += char
  }
  endRow()
  return rows
}

export function toCsv(header: string[], rows: (string | number)[][]) {
  return [header, ...rows].map((row) => row.join(';')).join('\n')
}
