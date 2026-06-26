/**
 * Back-calculations ("solve for") and the funded ratio.
 *
 * These answer the questions a real planner asks that a single forward
 * projection doesn't: how much must I save, when can I afford to retire, what
 * nest egg do I need, and am I on track? Each solver bisects a forward
 * `project()` over one monotonic input; the funded ratio is a present-value
 * identity discounted at the portfolio's expected after-tax return.
 */

import type { Inputs } from '../types'
import {
  project,
  accountReturns,
  nzSuperNetForAge,
  kiwiSaverGovtContribution,
} from './project'
import { incomeTax } from './tax'
import { baseRealSpending, realSpendingForYear } from './spending'
import { otherIncomeGrossForAge, lumpSumNetForAge, downsizeNetForAge } from './cashflows'

const moneyLasts = (inputs: Inputs): boolean => project(inputs).moneyLasts

/**
 * Highest level, flat real (today's-dollar) spending the plan can sustain to the
 * planning age, found by binary search. Solves for the year-one fixed spend
 * (any retirement-spending decline the user set is preserved on top).
 */
export function sustainableSpending(inputs: Inputs): number {
  const base: Inputs = { ...inputs, spendingMode: 'fixed' }
  const lasts = (spend: number) => moneyLasts({ ...base, annualSpending: spend })

  let lo = 0
  let hi = Math.max(baseRealSpending(inputs) * 3, 200_000)
  // Expand the upper bound until it fails, so the search is well-bracketed.
  for (let i = 0; i < 8 && lasts(hi); i++) hi *= 2

  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (lasts(mid)) lo = mid
    else hi = mid
  }
  return lo
}

export interface SolveResult {
  feasible: boolean
  value: number
}

/**
 * Extra annual saving into the personal account (today's dollars), on top of what
 * you already set aside, that makes the money last to the planning age.
 * `feasible: false` if no amount within reach works (e.g. there are no working
 * years left, or spending is unsustainable regardless of savings).
 */
export function requiredAnnualSavings(inputs: Inputs): SolveResult {
  if (moneyLasts(inputs)) return { feasible: true, value: 0 }
  const lasts = (save: number) => moneyLasts({ ...inputs, annualTaxableSavings: save })

  const cap = Math.max(baseRealSpending(inputs) * 5, 500_000) + inputs.annualTaxableSavings
  let hi = Math.max(10_000, baseRealSpending(inputs)) + inputs.annualTaxableSavings
  let bracketed = false
  for (let i = 0; i < 12 && hi <= cap; i++) {
    if (lasts(hi)) {
      bracketed = true
      break
    }
    hi *= 1.8
  }
  if (!bracketed) return { feasible: false, value: Infinity }

  // Bisect for the least absolute saving level that works, never below what's
  // already being saved (that can only make things worse).
  let lo = inputs.annualTaxableSavings
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (lasts(mid)) hi = mid
    else lo = mid
  }
  return { feasible: true, value: Math.max(0, hi - inputs.annualTaxableSavings) }
}

/**
 * Earliest whole-year retirement age (≥ current age, ≤ planning age) at which the
 * plan lasts. `feasible: false` if even working to the planning age isn't enough.
 */
export function feasibleRetirementAge(inputs: Inputs): SolveResult {
  const start = Math.round(inputs.currentAge)
  const end = Math.round(inputs.planningAge)
  for (let age = start; age <= end; age++) {
    if (moneyLasts({ ...inputs, retirementAge: age })) return { feasible: true, value: age }
  }
  return { feasible: false, value: Infinity }
}

/**
 * The "number": least total portfolio at the retirement age that funds the plan,
 * expressed in today's dollars. Approximate — it runs the decumulation phase from
 * a single starting balance split in the same KiwiSaver:personal ratio as the
 * current accounts, and ignores pre-retirement one-offs.
 */
export function requiredPortfolioAtRetirement(inputs: Inputs): number {
  const infl = inputs.inflationPct / 100
  const yearsToRetire = Math.max(0, Math.round(inputs.retirementAge) - Math.round(inputs.currentAge))
  const totalNow = Math.max(0, inputs.kiwiSaverBalance) + Math.max(0, inputs.taxableBalance)
  const ksShare = totalNow > 0 ? Math.max(0, inputs.kiwiSaverBalance) / totalNow : 0

  // Hold the real spending target fixed and start the projection at retirement.
  const baseSpend = baseRealSpending(inputs)
  const lastsWith = (balance: number) =>
    moneyLasts({
      ...inputs,
      currentAge: inputs.retirementAge,
      spendingMode: 'fixed',
      annualSpending: baseSpend,
      annualTaxableSavings: 0,
      kiwiSaverBalance: balance * ksShare,
      taxableBalance: balance * (1 - ksShare),
    })

  let lo = 0
  let hi = Math.max(baseSpend * 30, 1_000_000)
  for (let i = 0; i < 8 && !lastsWith(hi); i++) hi *= 2

  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (lastsWith(mid)) hi = mid
    else lo = mid
  }
  // `hi` is in dollars at the retirement age; convert to today's dollars.
  return hi / Math.pow(1 + infl, yearsToRetire)
}

export interface FundedRatio {
  ratio: number // PV(assets) / PV(liabilities); ≥ 1 means fully funded
  pvAssets: number // today's dollars
  pvLiabilities: number // today's dollars
}

/**
 * Funded ratio — PWL's headline of "on track-ness". The present value of
 * everything that can pay for retirement (current savings, future contributions,
 * NZ Super, other income, windfalls) over the present value of everything it must
 * pay for (retirement spending, one-off costs), discounted at the portfolio's
 * expected after-tax nominal return.
 */
export function fundedRatio(inputs: Inputs): FundedRatio {
  const returns = accountReturns(inputs)
  const totalNow = Math.max(0, inputs.kiwiSaverBalance) + Math.max(0, inputs.taxableBalance)
  const ksShare = totalNow > 0 ? Math.max(0, inputs.kiwiSaverBalance) / totalNow : 0.5
  const blended = returns.kiwiSaver * ksShare + returns.taxable * (1 - ksShare)
  const r = Math.max(-0.5, blended) // guard the discount factor
  const infl = inputs.inflationPct / 100
  const wage = inputs.wageGrowthPct / 100

  const startAge = Math.round(inputs.currentAge)
  const endAge = Math.max(startAge, Math.round(inputs.planningAge))
  const retireAge = Math.round(inputs.retirementAge)

  let pvAssets = totalNow
  let pvLiabilities = 0

  for (let age = startAge; age <= endAge; age++) {
    const t = age - startAge
    const disc = 1 / Math.pow(1 + r, t)
    const inflFactor = Math.pow(1 + infl, t)

    if (age < retireAge) {
      const income = inputs.currentIncome * Math.pow(1 + wage, t)
      const employee = income * (inputs.kiwiSaverContribPct / 100)
      const employer = income * (inputs.employerContribPct / 100)
      const govt = kiwiSaverGovtContribution(employee, income, age)
      const contributions = employee + employer + govt + inputs.annualTaxableSavings * Math.pow(1 + wage, t)
      pvAssets += contributions * disc
    } else {
      const spending = realSpendingForYear(inputs, age - retireAge) * inflFactor
      pvLiabilities += spending * disc
      pvAssets += nzSuperNetForAge(inputs, age, inflFactor) * disc
      const otherGross = otherIncomeGrossForAge(inputs, age, inflFactor)
      const otherNet = inputs.otherIncomeTaxable ? otherGross - incomeTax(otherGross) : otherGross
      pvAssets += otherNet * disc
    }

    pvAssets += downsizeNetForAge(inputs, age, inflFactor) * disc

    const lumpNet = lumpSumNetForAge(inputs.lumpSums, age, inflFactor)
    if (lumpNet > 0) pvAssets += lumpNet * disc
    else if (lumpNet < 0) pvLiabilities += -lumpNet * disc
  }

  // PVs are discounted to t = 0, i.e. already in today's dollars.
  const ratio = pvLiabilities > 0 ? pvAssets / pvLiabilities : Infinity
  return { ratio, pvAssets, pvLiabilities }
}
