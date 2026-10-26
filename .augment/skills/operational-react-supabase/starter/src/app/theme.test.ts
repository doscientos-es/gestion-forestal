import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

function luminance(token: string) {
  const hex = css.match(new RegExp(`--${token}:\\s*#([0-9a-f]{6});`, 'i'))?.[1]
  if (!hex) throw new Error(`Missing solid theme token: ${token}`)
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return (channels[0] ?? 0) * 0.2126 + (channels[1] ?? 0) * 0.7152 + (channels[2] ?? 0) * 0.0722
}

describe('starter theme contrast', () => {
  it.each([
    ['foreground', 'background'],
    ['foreground', 'card'],
    ['muted-foreground', 'background'],
    ['muted-foreground', 'card'],
    ['primary-foreground', 'primary'],
    ['primary', 'accent'],
    ['success', 'card'],
    ['destructive', 'card'],
  ])('keeps %s on %s above the AA normal-text threshold', (foreground, background) => {
    const values = [luminance(foreground), luminance(background)]
    const contrast = (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)
    expect(contrast).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the keyboard focus ring distinguishable from the page', () => {
    const values = [luminance('ring'), luminance('background')]
    expect((Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)).toBeGreaterThanOrEqual(3)
  })
})
