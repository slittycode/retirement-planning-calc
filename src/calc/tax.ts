/**
 * New Zealand tax helpers.
 *
 * The portfolio inputs are PWL-style (dividends / capital gains / interest
 * split), taxed under NZ rules:
 *   - Capital gains (realized + unrealized): NOT taxed (NZ has no general CGT on
 *     a diversified portfolio held long-term, and no tax on the withdrawal event
 *     itself — unlike a Canadian RRSP).
 *   - Dividends and interest: taxed annually as a "drag" on the return.
 *       · In a personal taxable account, at the investor's NZ marginal rate.
 *       · In a PIE (which is how KiwiSaver and most NZ funds are taxed), at the
 *         investor's Prescribed Investor Rate (PIR), capped at 28%.
 *   - Foreign dividends bear foreign withholding tax (FWT); modelled as
 *     max(domestic rate, FWT) so any non-creditable excess still leaks.
 *   - FIF/FDR, imputation credits, ESCT and ACC levies are out of scope for this
 *     educational version.
 */

export interface TaxBracket {
  upTo: number
  rate: number
}

/** NZ personal income tax brackets from 1 April 2025. */
export const NZ_TAX_BRACKETS: TaxBracket[] = [
  { upTo: 15_600, rate: 0.105 },
  { upTo: 53_500, rate: 0.175 },
  { upTo: 78_100, rate: 0.3 },
  { upTo: 180_000, rate: 0.33 },
  { upTo: Infinity, rate: 0.39 },
]

/** Marginal income tax rate (fraction) for a given gross income. */
export function marginalRate(income: number): number {
  for (const b of NZ_TAX_BRACKETS) {
    if (income <= b.upTo) return b.rate
  }
  return NZ_TAX_BRACKETS[NZ_TAX_BRACKETS.length - 1].rate
}

/** Total annual income tax payable across all bands. */
export function incomeTax(income: number): number {
  let tax = 0
  let lower = 0
  for (const b of NZ_TAX_BRACKETS) {
    if (income <= lower) break
    tax += (Math.min(income, b.upTo) - lower) * b.rate
    lower = b.upTo
  }
  return tax
}

/** Average (effective) income tax rate on a gross income. */
export function averageTaxRate(income: number): number {
  if (income <= 0) return 0
  return incomeTax(income) / income
}

/**
 * Expected annual return split by tax character (% of portfolio value). The sum
 * is the total expected nominal return; the split sets how it is taxed.
 */
export interface ReturnComposition {
  eligibleDividendsPct: number
  foreignDividendsPct: number
  unrealizedGainsPct: number
  realizedGainsPct: number
  interestIncomePct: number
  foreignWithholdingTaxPct: number
}

/** Total expected nominal return (fraction) = sum of the composition fields. */
export function grossReturn(c: ReturnComposition): number {
  return (
    (c.eligibleDividendsPct +
      c.foreignDividendsPct +
      c.unrealizedGainsPct +
      c.realizedGainsPct +
      c.interestIncomePct) /
    100
  )
}

/** Annual tax drag (fraction) in a personal taxable account at the NZ marginal rate. */
export function taxableAccountTaxDrag(c: ReturnComposition, annualIncome: number): number {
  const m = marginalRate(annualIncome)
  const f = c.foreignWithholdingTaxPct / 100
  const domestic = c.eligibleDividendsPct * m
  const interest = c.interestIncomePct * m
  const foreign = c.foreignDividendsPct * Math.max(m, f)
  return (domestic + interest + foreign) / 100
}

/** Annual tax drag (fraction) in a PIE / KiwiSaver account at the PIR (capped 28%). */
export function pieAccountTaxDrag(c: ReturnComposition, pirPct: number): number {
  const r = Math.min(pirPct, 28) / 100
  const f = c.foreignWithholdingTaxPct / 100
  const domestic = c.eligibleDividendsPct * r
  const interest = c.interestIncomePct * r
  const foreign = c.foreignDividendsPct * Math.max(r, f)
  return (domestic + interest + foreign) / 100
}

/** Expected after-tax annual return (fraction) in a personal taxable account. */
export function taxableAccountAfterTaxReturn(c: ReturnComposition, annualIncome: number): number {
  return grossReturn(c) - taxableAccountTaxDrag(c, annualIncome)
}

/** Expected after-tax annual return (fraction) in a PIE / KiwiSaver account. */
export function pieAfterTaxReturn(c: ReturnComposition, pirPct: number): number {
  return grossReturn(c) - pieAccountTaxDrag(c, pirPct)
}
