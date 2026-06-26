import type { Inputs } from '../types'
import {
  incomeTax,
  taxableAccountAfterTaxReturn,
  pieAfterTaxReturn,
  type ReturnComposition,
} from './tax'
import { scenarioReturnDelta } from './portfolio'
import { realSpendingForYear } from './spending'
import { otherIncomeGrossForAge, lumpSumNetForAge, downsizeNetForAge } from './cashflows'

/**
 * KiwiSaver government contribution, on the post-1-July-2025 rules: 25c per $1 of
 * member contributions (was 50c), capped at $260.72/yr (was $521.43), and not
 * paid to members whose income exceeds the threshold. Approximate and editable —
 * update each year. https://www.ird.govt.nz/kiwisaver
 */
export const KIWISAVER_GOVT_RATE = 0.25
export const KIWISAVER_GOVT_MAX = 260.72
export const KIWISAVER_GOVT_FULL_AT = 1_042.86
export const KIWISAVER_GOVT_INCOME_LIMIT = 180_000
const KIWISAVER_GOVT_MAX_AGE = 65

/** One year of the projection. Balances are end-of-year, nominal dollars. */
export interface YearPoint {
  age: number
  year: number
  working: boolean
  kiwiSaver: number
  taxable: number
  portfolio: number // kiwiSaver + taxable
  nzSuperNet: number // after-tax NZ Super received this year (household)
  otherIncomeNet: number // after-tax other income received this year
  portfolioWithdrawal: number // drawn from savings to fund spending + one-off costs
  spending: number // target spending this year (nominal)
  shortfall: number // unmet spending (> 0 means savings ran out)
  inflationFactor: number // (1 + inflation)^t — divide a nominal figure to get today's dollars
}

export interface ProjectionResult {
  series: YearPoint[]
  peakPortfolio: number
  peakAge: number
  moneyLasts: boolean
  depletionAge: number | null // first age savings can't cover a required outflow
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
 * After-tax annual return for each account, including the scenario shift and fee drag.
 * The taxable account carries two rates: `taxable` uses the working-income marginal
 * rate, while `taxableRetired` uses the lower rate that applies once salary stops —
 * a NZ retiree's only taxable income is NZ Super, taxable other income, and the
 * account's own dividends/interest (withdrawals and capital gains aren't taxed).
 */
export function accountReturns(inputs: Inputs): { kiwiSaver: number; taxable: number; taxableRetired: number } {
  const comp = compositionOf(inputs)
  const delta = scenarioReturnDelta(inputs.returnScenario, inputs.assetAllocationPct)
  const fee = Math.max(0, inputs.feePct) / 100
  const incomeYieldPct = comp.eligibleDividendsPct + comp.foreignDividendsPct + comp.interestIncomePct
  const retirementTaxableIncome =
    (inputs.includeNZSuper ? inputs.nzSuperAnnualGross : 0) +
    (inputs.otherIncomeTaxable ? Math.max(0, inputs.otherIncomeAnnual) : 0) +
    Math.max(0, inputs.taxableBalance) * (incomeYieldPct / 100)
  return {
    kiwiSaver: pieAfterTaxReturn(comp, inputs.prescribedInvestorRatePct) + delta - fee,
    taxable: taxableAccountAfterTaxReturn(comp, inputs.currentIncome) + delta - fee,
    taxableRetired: taxableAccountAfterTaxReturn(comp, retirementTaxableIncome) + delta - fee,
  }
}

/** KiwiSaver government contribution for a working year, on the post-2025 rules. */
export function kiwiSaverGovtContribution(employeeContrib: number, income: number, age: number): number {
  if (age >= KIWISAVER_GOVT_MAX_AGE || employeeContrib <= 0 || income > KIWISAVER_GOVT_INCOME_LIMIT) return 0
  return Math.min(KIWISAVER_GOVT_MAX, employeeContrib * KIWISAVER_GOVT_RATE)
}

/** After-tax NZ Super for the household at a given age (nominal), taxed per person. */
export function nzSuperNetForAge(inputs: Inputs, age: number, inflFactor: number): number {
  if (!inputs.includeNZSuper) return 0
  const perPersonGross = inputs.nzSuperAnnualGross * inflFactor
  let net = 0
  if (age >= inputs.nzSuperAge) net += perPersonGross - incomeTax(perPersonGross)
  const partnerCounts = inputs.relationshipStatus === 'couple' && inputs.partnerReceivesNZSuper
  if (partnerCounts && age >= inputs.partnerNzSuperAge) net += perPersonGross - incomeTax(perPersonGross)
  return net
}

/**
 * Year-by-year projection of a NZ retirement.
 *
 * Accumulation (before the retirement age): employment income grows by wage
 * inflation and feeds KiwiSaver (employee + employer + government contributions);
 * any `annualTaxableSavings` flow into the personal account.
 *
 * Decumulation (from the retirement age): after-tax NZ Super and other income
 * part-fund the year's spending; the rest is withdrawn from savings — taxable
 * account first, then KiwiSaver. NZ has no tax on the withdrawal event, so the
 * drawdown order has only a second-order effect (via each account's annual tax
 * drag), which is why this tool omits PWL's Canadian withdrawal-sequencing
 * optimiser.
 *
 * NZ Super isn't income-tested, so it is also paid while still working past the
 * eligibility age; with no spending drawn in those years its after-tax amount is
 * saved into the taxable account.
 *
 * One-off lump sums (windfalls / costs) are applied at their age in either phase.
 * Returns are a constant annual after-tax rate per account, shifted by the chosen
 * scenario percentile and reduced by the investment fee. The taxable account uses a
 * lower rate in retirement, since the investor's marginal rate falls once salary stops.
 */
export function project(inputs: Inputs): ProjectionResult {
  const { kiwiSaver: kiwiSaverReturn, taxable: taxableReturn, taxableRetired: taxableRetiredReturn } =
    accountReturns(inputs)
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

  /** Draw an amount from savings (taxable first, then KiwiSaver); return what couldn't be met. */
  function drawFromSavings(amount: number): { drawn: number; unmet: number } {
    const fromTaxable = Math.min(taxable, amount)
    taxable -= fromTaxable
    let remaining = amount - fromTaxable
    const fromKiwiSaver = Math.min(kiwiSaver, remaining)
    kiwiSaver -= fromKiwiSaver
    remaining -= fromKiwiSaver
    return { drawn: fromTaxable + fromKiwiSaver, unmet: remaining }
  }

  for (let age = startAge; age <= endAge; age++) {
    const t = age - startAge
    const working = age < retireAge
    const inflFactor = Math.pow(1 + infl, t)

    let nzSuperNet = 0
    let otherIncomeNet = 0
    let withdrawal = 0
    let shortfall = 0
    let spending = 0

    if (working) {
      // Accumulation: grow income and contribute to KiwiSaver + personal savings.
      const income = inputs.currentIncome * Math.pow(1 + wage, t)
      const employee = income * (inputs.kiwiSaverContribPct / 100)
      const employer = income * (inputs.employerContribPct / 100)
      const govt = kiwiSaverGovtContribution(employee, income, age)
      kiwiSaver += employee + employer + govt
      taxable += inputs.annualTaxableSavings * Math.pow(1 + wage, t)

      // NZ Super isn't income-tested, so it's paid even while still working past the
      // eligibility age. With no spending drawn this year, the after-tax amount is saved.
      nzSuperNet = nzSuperNetForAge(inputs, age, inflFactor)
      if (nzSuperNet > 0) {
        totalNZSuperNet += nzSuperNet
        taxable += nzSuperNet
      }
    } else {
      // Decumulation: guaranteed/other income first, then draw the gap from savings.
      const yearsIntoRetirement = age - retireAge
      spending = realSpendingForYear(inputs, yearsIntoRetirement) * inflFactor

      nzSuperNet = nzSuperNetForAge(inputs, age, inflFactor)
      totalNZSuperNet += nzSuperNet

      const otherGross = otherIncomeGrossForAge(inputs, age, inflFactor)
      otherIncomeNet = inputs.otherIncomeTaxable ? otherGross - incomeTax(otherGross) : otherGross

      const need = Math.max(0, spending - nzSuperNet - otherIncomeNet)
      const { drawn, unmet } = drawFromSavings(need)
      withdrawal = drawn
      shortfall = unmet
    }

    // Downsizing the home at this age releases equity (tax-free) into the personal account.
    taxable += downsizeNetForAge(inputs, age, inflFactor)

    // One-off lump sums at this age: income tops up the personal account; an
    // expense is drawn from savings like any other outflow.
    const lumpNet = lumpSumNetForAge(inputs.lumpSums, age, inflFactor)
    if (lumpNet > 0) {
      taxable += lumpNet
    } else if (lumpNet < 0) {
      const { drawn, unmet } = drawFromSavings(-lumpNet)
      withdrawal += drawn
      shortfall += unmet
    }

    if (shortfall > 0.005 && depletionAge === null) depletionAge = age

    // Grow the balances for the year (taxable at the rate for this life phase).
    kiwiSaver = Math.max(0, kiwiSaver * (1 + kiwiSaverReturn))
    taxable = Math.max(0, taxable * (1 + (working ? taxableReturn : taxableRetiredReturn)))

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
      otherIncomeNet,
      portfolioWithdrawal: withdrawal,
      spending,
      shortfall,
      inflationFactor: inflFactor,
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
    taxableReturnPct: taxableRetiredReturn * 100,
  }
}
