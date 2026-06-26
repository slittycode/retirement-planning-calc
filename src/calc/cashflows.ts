/**
 * Non-portfolio retirement cashflows: a recurring "other income" stream and
 * one-off lump sums.
 *
 *   - Other income: a private/defined-benefit pension, part-time work, rental,
 *     or an annuity. Runs between two ages, optionally inflation-adjusted, and
 *     optionally taxable as income.
 *   - Lump sums: windfalls (inheritance, downsizing the home) as `income`, and
 *     one-off costs (a big trip, a new car, home repairs) as `expense`.
 *
 * Amounts are entered in today's dollars; the projection inflates them.
 */

export const LUMP_SUM_KINDS = ['income', 'expense'] as const
export type LumpSumKind = (typeof LUMP_SUM_KINDS)[number]

export interface LumpSum {
  age: number
  amount: number // today's dollars
  kind: LumpSumKind
}

export interface OtherIncomeInputs {
  otherIncomeAnnual: number // today's dollars
  otherIncomeStartAge: number
  otherIncomeEndAge: number
  otherIncomeTaxable: boolean
  otherIncomeInflationAdjusted: boolean
}

/**
 * Gross other income for an age, in nominal dollars. `inflFactor` is
 * (1 + inflation)^(years from today) for that age; applied only when the stream
 * is inflation-adjusted (otherwise the entered amount is a flat nominal figure).
 */
export function otherIncomeGrossForAge(i: OtherIncomeInputs, age: number, inflFactor: number): number {
  if (i.otherIncomeAnnual <= 0) return 0
  if (age < i.otherIncomeStartAge || age > i.otherIncomeEndAge) return 0
  return i.otherIncomeInflationAdjusted ? i.otherIncomeAnnual * inflFactor : i.otherIncomeAnnual
}

export interface DownsizeInputs {
  downsizeAge: number
  downsizeReleaseAmount: number // today's $ equity freed (0 = no downsizing)
  homeValue: number // caps the release
}

/**
 * Equity released by downsizing at a given age, in nominal dollars (else 0). The
 * release is capped at the home value and is tax-free — selling the family home
 * isn't a taxable event in NZ. The home itself never enters the projection as a
 * spendable asset; only this released amount does.
 */
export function downsizeNetForAge(i: DownsizeInputs, age: number, inflFactor: number): number {
  if (i.downsizeReleaseAmount <= 0) return 0
  if (Math.round(i.downsizeAge) !== age) return 0
  const release = Math.min(Math.max(0, i.downsizeReleaseAmount), Math.max(0, i.homeValue))
  return release * inflFactor
}

/** Net lump-sum cashflow at an age (income positive, expense negative), nominal. */
export function lumpSumNetForAge(lumpSums: LumpSum[], age: number, inflFactor: number): number {
  let net = 0
  for (const ls of lumpSums) {
    if (Math.round(ls.age) !== age) continue
    const nominal = ls.amount * inflFactor
    net += ls.kind === 'income' ? nominal : -nominal
  }
  return net
}

/** Validate/normalise a decoded lump-sum list (drops malformed entries). */
export function sanitizeLumpSums(value: unknown): LumpSum[] {
  if (!Array.isArray(value)) return []
  const out: LumpSum[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const age = Number(r.age)
    const amount = Number(r.amount)
    const kind = r.kind === 'expense' ? 'expense' : 'income'
    if (Number.isFinite(age) && Number.isFinite(amount) && amount !== 0) {
      out.push({ age: Math.round(age), amount: Math.abs(amount), kind })
    }
  }
  return out
}
