const nzd0 = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  maximumFractionDigits: 0,
})

const nzd0Compact = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** "$1,234" — whole dollars. */
export function formatNZD(value: number): string {
  return nzd0.format(Math.round(value))
}

/** "$1.2M" — compact, for chart axes. */
export function formatNZDCompact(value: number): string {
  return nzd0Compact.format(value)
}

/** "5.5%" with up to one decimal. */
export function formatPct(fraction: number, decimals = 1): string {
  return `${fraction.toFixed(decimals)}%`
}
