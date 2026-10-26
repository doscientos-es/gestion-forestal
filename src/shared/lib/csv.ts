/** Spreadsheet-friendly CSV: semicolon separated (Spanish Excel), quoted text, comma decimals. */
export function csvText(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export function csvDecimal(value: number, digits = 2) {
  return value.toFixed(digits).replace('.', ',')
}

export function toCsv(header: string[], rows: (string | number)[][]) {
  return [header, ...rows].map((row) => row.join(';')).join('\n')
}
