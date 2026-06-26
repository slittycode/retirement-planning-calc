/**
 * Retirement spending model.
 *
 * Spending can be entered two ways (PWL lets you toggle these):
 *   - 'fixed'           — a flat real (today's-dollar) amount you choose.
 *   - 'percentOfIncome' — a replacement ratio: a percentage of your final
 *                         pre-retirement GROSS income (income grown by wage
 *                         growth to the retirement age).
 *
 * On top of the year-one amount, real spending can drift each year by
 * `retirementSpendingDeclinePct` — the empirical "go-go / slow-go / no-go"
 * pattern where discretionary spending eases as people age (0 = flat real).
 */

export const SPENDING_MODES = ['fixed', 'percentOfIncome'] as const
export type SpendingMode = (typeof SPENDING_MODES)[number]

export interface SpendingInputs {
  spendingMode: SpendingMode
  annualSpending: number // fixed mode: today's-dollar retirement spend
  spendingReplacementPct: number // percent mode: % of final pre-retirement gross income
  retirementSpendingDeclinePct: number // annual real % change through retirement
  currentIncome: number
  wageGrowthPct: number
  currentAge: number
  retirementAge: number
}

/**
 * Final pre-retirement gross income: today's income grown by wage growth to the
 * retirement age. Used to translate a replacement ratio into a dollar spend.
 */
export function finalPreRetirementIncome(i: SpendingInputs): number {
  const years = Math.max(0, Math.round(i.retirementAge) - Math.round(i.currentAge))
  return i.currentIncome * Math.pow(1 + i.wageGrowthPct / 100, years)
}

/**
 * Year-one real (today's-dollar) retirement spend implied by the chosen mode.
 * In percent mode this is replacementPct × final pre-retirement income.
 */
export function baseRealSpending(i: SpendingInputs): number {
  if (i.spendingMode === 'percentOfIncome') {
    return Math.max(0, finalPreRetirementIncome(i) * (i.spendingReplacementPct / 100))
  }
  return Math.max(0, i.annualSpending)
}

/**
 * Real (today's-dollar) spend in a given retirement year, applying the annual
 * real decline/increase. `yearsIntoRetirement` is 0 in the first retired year.
 */
export function realSpendingForYear(i: SpendingInputs, yearsIntoRetirement: number): number {
  const base = baseRealSpending(i)
  const drift = Math.pow(1 + i.retirementSpendingDeclinePct / 100, Math.max(0, yearsIntoRetirement))
  return Math.max(0, base * drift)
}
