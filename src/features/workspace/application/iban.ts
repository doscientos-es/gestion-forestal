/** Removes spaces and upper-cases: the form in which an IBAN is stored. */
export function normalizeIban(value: string) {
  return value.replace(/\s+/g, '').toUpperCase()
}

/** «ES91 2100 0418 4502 0005 1332» */
export function formatIban(value: string) {
  return normalizeIban(value)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

/** «ES91 •••• •••• •• ••••• 1332»: enough to recognise the account without exposing it. */
export function maskIban(value: string) {
  const iban = normalizeIban(value)
  if (iban.length < 8) return iban
  return `${iban.slice(0, 4)} •••• •••• •• ••••• ${iban.slice(-4)}`
}

/** Remainder of dividing the IBAN, rearranged and with letters turned into numbers, by 97. */
function mod97(iban: string) {
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder
}

/** Spanish IBANs have 24 characters; other countries are accepted when the checksum is right. */
export function isValidIban(value: string) {
  const iban = normalizeIban(value)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false
  if (iban.startsWith('ES') && iban.length !== 24) return false
  return mod97(iban) === 1
}

/** Builds a Spanish IBAN with correct check digits from the 20-digit account number. */
export function spanishIban(account: string) {
  const check = 98 - mod97(`ES00${account}`)
  return `ES${String(check).padStart(2, '0')}${account}`
}
