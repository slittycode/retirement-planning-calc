import type { Inputs } from '../types'
import {
  incomeTax,
  taxableAccountAfterTaxReturn,
  pieAfterTaxReturn,
  type ReturnComposition,
} from './tax'
import { scenarioReturnDelta } from './portfolio'

/** Full KiwiSaver government contribution and the member contribution needed to earn it. */
export const KIWISAVER_GOVT_MAX = 521.43
export const KIWISAVER_GOVT_FULL_AT = 1_042.86
const KIWISAVER_GOVT_MAX_AGE = 65

/** One year of the projection. Balances are end-of-year, nominal dollars. */
export interface YearPoint {
  age: number
  year: number
  working: boolean
  kiwiSaver: number
  taxable: number
  portfolio: number // kiwiSaver + taxable
  nzSuperNet: number // after-tax NZ Super received this year
  portfolioWithdrawal: number // drawn from savings to fund spending
  spending: number // target spending this year (nominal)
  shortfall: number // unmet spending (> 0 means savings ran out)
}

export interface ProjectionResult {
  series: YearPoint[]
  peakPortfolio: number
  peakAge: number
  moneyLasts: boolean
  depletionAge: number | null // first age savings can't cover the spending gap
  estateAtPlanning: number // portfolio left at the planning age (nominal)
  estateAtPlanningReal: number // ...in today's dollars
  finalAge: number
  totalNZSuperNet: number // lifetime after-tax NZ Super received (nominal)
  kiwiSaverReturnPct: number // after-tax KiwiSaver/PIE return used (annual %)
  taxableReturnPct: number // after-tax taxable-account return used (annual %)
}

function compositionOf(inputs: Inputs): ReturnComposition {
  return {
    eligibleDividendsPct: inputs.eligibleDividendsPct,
    foreignDividendsPct: inputs.foreignDividendsPct,
    unrealizedGainsPct: inputs.unrealizedGainsPct,
    realizedGainsPct: inputs.realizedGainsPct,
    interestIncomePct: inputs.interestIncomePct,
    foreignWithholdingTaxPct: inputs.foreignWithholdingTaxPct,
  }
}

/**
 * Year-by-year projection of a NZ retirement.
 *
 * Accumulation (before the retirement age): employment income grows by wage
 * inflation and feeds KiwiSaver (employee + employer + government contributions).
 *
 * Decumulation (from the retirement age): NZ Super (net of tax) part-funds the
 * year's spending; the rest is withdrawn from savings — taxable account first,
 * then KiwiSaver. NZ has no tax on the withdrawal event, so the drawdown order
 * has only a second-order effect (via each account's annual tax drag), which is
 * why this tool omits PWL's Canadian withdrawal-sequencing optimiser.
 *
 * Returns are modelled as a constant annual after-tax rate per account, shifted
 * by the chosen scenario percentile.
 */
export function project(inputs: Inputs): ProjectionResult {
  const comp = compositionOf(inputs)
  const delta = scenarioReturnDelta(inputs.returnScenario, inputs.assetAllocationPct)
  const kiwiSaverReturn = pieAfterTaxReturn(comp, inputs.prescribedInvestorRatePct) + delta
  const taxableReturn = taxableAccountAfterTaxReturn(comp, inputs.currentIncome) + delta
  const infl = inputs.inflationPct / 100
  const wage = inputs.wageGrowthPct / 100

  const startAge = Math.round(inputs.currentAge)
  const endAge = Math.max(startAge, Math.round(inputs.planningAge))
  const retireAge = Math.round(inputs.retirementAge)
  const startYear = new Date().getFullYear()

  let kiwiSaver = Math.max(0, inputs.kiwiSaverBalance)
  let taxable = Math.max(0, inputs.taxableBalance)
  let depletionAge: number | null = null
  let peakPortfolio = kiwiSaver + taxable
  let peakAge = startAge
  let totalNZSuperNet = 0

  const series: YearPoint[] = []

  for (let age = startAge; age <= endAge; age++) {
    const t = age - startAge
    const working = age < retireAge
    const inflFactor = Math.pow(1 + infl, t)

    let nzSuperNet = 0
    let withdrawal = 0
    let shortfall = 0
    const spending = working ? 0 : inputs.annualSpending * inflFactor

    if (working) {
      // Accumulation: grow income and contribute to KiwiSaver.
      const income = inputs.currentIncome * Math.pow(1 + wage, t)
      const employee = income * (inputs.kiwiSaverContribPct / 100)
      const employer = income * (inputs.employerContribPct / 100)
      const govt =
        age < KIWISAVER_GOVT_MAX_AGE && employee > 0
          ? Math.min(KIWISAVER_GOVT_MAX, employee * 0.5)
          : 0
      kiwiSaver += employee + employer + govt
    } else {
      // Decumulation: NZ Super first, then draw the gap from savings.
      const nzSuperGross =
        inputs.includeNZSuper && age >= inputs.nzSuperAge
          ? inputs.nzSuperAnnualGross * inflFactor
          : 0
      nzSuperNet = nzSuperGross - incomeTax(nzSuperGross)
      totalNZSuperNet += nzSuperNet

      const need = Math.max(0, spending - nzSuperNet)
      const fromTaxable = Math.min(taxable, need)
      taxable -= fromTaxable
      let remaining = need - fromTaxable
      const fromKiwiSaver = Math.min(kiwiSaver, remaining)
      kiwiSaver -= fromKiwiSaver
      remaining -= fromKiwiSaver
      withdrawal = fromTaxable + fromKiwiSaver
      shortfall = remaining
      if (shortfall > 0.005 && depletionAge === null) depletionAge = age
    }

    // Grow the balances for the year.
    kiwiSaver = Math.max(0, kiwiSaver * (1 + kiwiSaverReturn))
    taxable = Math.max(0, taxable * (1 + taxableReturn))

    const portfolio = kiwiSaver + taxable
    if (portfolio > peakPortfolio) {
      peakPortfolio = portfolio
      peakAge = age
    }

    series.push({
      age,
      year: startYear + t,
      working,
      kiwiSaver,
      taxable,
      portfolio,
      nzSuperNet,
      portfolioWithdrawal: withdrawal,
      spending,
      shortfall,
    })
  }

  const final = series[series.length - 1]
  const realFactor = Math.pow(1 + infl, endAge - startAge)

  return {
    series,
    peakPortfolio,
    peakAge,
    moneyLasts: depletionAge === null,
    depletionAge,
    estateAtPlanning: final.portfolio,
    estateAtPlanningReal: final.portfolio / realFactor,
    finalAge: endAge,
    totalNZSuperNet,
    kiwiSaverReturnPct: kiwiSaverReturn * 100,
    taxableReturnPct: taxableReturn * 100,
  }
}

/**
 * Highest level, flat real (today's-dollar) spending the plan can sustain to the
 * planning age, found by binary search. Useful as a headline: "your savings
 * support about $X a year".
 */
export function sustainableSpending(inputs: Inputs): number {
  let lo = 0
  let hi = Math.max(inputs.annualSpending * 3, 200_000)

  // Expand the upper bound until it fails, so the search is well-bracketed.
  for (let i = 0; i < 8 && project({ ...inputs, annualSpending: hi }).moneyLasts; i++) {
    hi *= 2
  }

  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (project({ ...inputs, annualSpending: mid }).moneyLasts) lo = mid
    else hi = mid
  }
  return lo
}
