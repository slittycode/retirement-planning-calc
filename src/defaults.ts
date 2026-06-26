import type { Inputs } from './types'
import { compositionForAllocation } from './calc/portfolio'
import { NZ_SUPER_GROSS_ANNUAL, NZ_SUPER_ELIGIBILITY_AGE } from './calc/nzsuper'

const DEFAULT_ALLOCATION = 50 // growth assets; matches the "Balanced" fund preset

// Composition implied by the default allocation (drives the tax treatment).
const composition = compositionForAllocation(DEFAULT_ALLOCATION)

/**
 * Sensible New Zealand starting scenario — someone in their early 60s with a
 * KiwiSaver balance and some other savings, a few years from retiring. Every
 * value is editable in the UI.
 */
export const NZ_DEFAULTS: Inputs = {
  currentAge: 60,
  retirementAge: 65,
  planningAge: 92,
  relationshipStatus: 'single',
  currentIncome: 65_000,

  spendingMode: 'fixed',
  annualSpending: 45_000,
  spendingReplacementPct: 70,
  retirementSpendingDeclinePct: 0,

  kiwiSaverBalance: 80_000,
  kiwiSaverContribPct: 3,
  employerContribPct: 3,
  taxableBalance: 150_000,
  annualTaxableSavings: 0,

  includeNZSuper: true,
  nzSuperAge: NZ_SUPER_ELIGIBILITY_AGE,
  nzSuperAnnualGross: NZ_SUPER_GROSS_ANNUAL.single,
  partnerReceivesNZSuper: false,
  partnerNzSuperAge: NZ_SUPER_ELIGIBILITY_AGE,

  otherIncomeAnnual: 0,
  otherIncomeStartAge: 65,
  otherIncomeEndAge: 92,
  otherIncomeTaxable: true,
  otherIncomeInflationAdjusted: true,
  lumpSums: [],

  // Most Kiwi retirees own their home; default a modest value but release nothing,
  // so the home shows as context without silently changing the projection.
  homeValue: 800_000,
  downsizeAge: 75,
  downsizeReleaseAmount: 0,

  assetAllocationPct: DEFAULT_ALLOCATION,
  inflationPct: 2.5,
  wageGrowthPct: 3.0,
  returnScenario: 'expected',
  prescribedInvestorRatePct: 28,
  feePct: 0,

  ...composition,
  foreignWithholdingTaxPct: 15,
}
