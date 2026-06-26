import type { Inputs } from './types'

export type NumericInputKey = { [K in keyof Inputs]: Inputs[K] extends number ? K : never }[keyof Inputs]
export type BooleanInputKey = { [K in keyof Inputs]: Inputs[K] extends boolean ? K : never }[keyof Inputs]

export interface NumericInputLimit {
  min?: number
  max?: number
}

export const NUMERIC_INPUT_LIMITS: Record<NumericInputKey, NumericInputLimit> = {
  currentAge: { min: 18, max: 100 },
  retirementAge: { min: 18, max: 100 },
  planningAge: { min: 19, max: 110 },
  currentIncome: { min: 0 },

  annualSpending: { min: 0 },
  spendingReplacementPct: { min: 0, max: 200 },
  retirementSpendingDeclinePct: { min: -10, max: 10 },

  kiwiSaverBalance: { min: 0 },
  kiwiSaverContribPct: { min: 0, max: 100 },
  employerContribPct: { min: 0, max: 100 },
  taxableBalance: { min: 0 },
  annualTaxableSavings: { min: 0 },

  nzSuperAge: { min: 60, max: 75 },
  nzSuperAnnualGross: { min: 0 },
  partnerNzSuperAge: { min: 60, max: 75 },

  otherIncomeAnnual: { min: 0 },
  otherIncomeStartAge: { min: 50, max: 110 },
  otherIncomeEndAge: { min: 50, max: 110 },

  homeValue: { min: 0 },
  downsizeAge: { min: 50, max: 110 },
  downsizeReleaseAmount: { min: 0 },

  assetAllocationPct: { min: 0, max: 100 },
  inflationPct: {},
  wageGrowthPct: {},
  prescribedInvestorRatePct: { min: 0, max: 28 },
  feePct: { min: 0, max: 5 },

  eligibleDividendsPct: { min: 0 },
  foreignDividendsPct: { min: 0 },
  unrealizedGainsPct: { min: 0 },
  realizedGainsPct: { min: 0 },
  interestIncomePct: { min: 0 },
  foreignWithholdingTaxPct: { min: 0, max: 100 },
}

export function clampNumericInput<K extends NumericInputKey>(key: K, value: number): number {
  const { min, max } = NUMERIC_INPUT_LIMITS[key]
  if (min !== undefined && value < min) return min
  if (max !== undefined && value > max) return max
  return value
}
