/**
 * Inputs for the NZ retirement projection. Adapted from PWL Capital's retirement
 * planning tool, localised for New Zealand: CPP/OAS become NZ Superannuation,
 * RRSP/TFSA become KiwiSaver + a personal taxable account, and Canadian
 * provincial tax becomes NZ income tax (no CGT, no tax on withdrawals).
 *
 * A `couple` is modelled as a pooled household: one combined income and one set
 * of balances, but NZ Super for both partners (see `nzsuper.ts`).
 *
 * Percentages are whole numbers (5.5 = 5.5%); dollar amounts are NZD.
 */

import type { ReturnScenario } from './calc/portfolio'
import type { RelationshipStatus } from './calc/nzsuper'
import type { SpendingMode } from './calc/spending'
import type { LumpSum } from './calc/cashflows'

export type { ReturnScenario, RelationshipStatus, SpendingMode, LumpSum }

export interface Inputs {
  // Profile
  currentAge: number
  retirementAge: number
  planningAge: number // age the plan should last to (life expectancy)
  relationshipStatus: RelationshipStatus
  currentIncome: number // gross annual employment income while still working (household)

  // Spending in retirement
  spendingMode: SpendingMode // 'fixed' dollar amount or 'percentOfIncome'
  annualSpending: number // fixed mode: desired yearly spend in today's dollars
  spendingReplacementPct: number // percent mode: % of final pre-retirement gross income
  retirementSpendingDeclinePct: number // annual real % drift in spending through retirement

  // Accounts — current balances
  kiwiSaverBalance: number
  kiwiSaverContribPct: number // employee KiwiSaver contribution, % of gross pay
  employerContribPct: number // employer KiwiSaver contribution, % of gross pay
  taxableBalance: number // investments outside KiwiSaver
  annualTaxableSavings: number // saved into the personal account each working year (today's $)

  // NZ Superannuation
  includeNZSuper: boolean
  nzSuperAge: number // age NZ Super starts (eligibility is 65)
  nzSuperAnnualGross: number // approximate gross annual NZ Super per person (editable)
  partnerReceivesNZSuper: boolean // couple: count a second NZ Super entitlement
  partnerNzSuperAge: number // age the partner's NZ Super starts

  // Other income & one-off cashflows
  otherIncomeAnnual: number // recurring pension/part-time/rental/annuity (today's $)
  otherIncomeStartAge: number
  otherIncomeEndAge: number
  otherIncomeTaxable: boolean
  otherIncomeInflationAdjusted: boolean
  lumpSums: LumpSum[] // one-off windfalls / expenses

  // Portfolio / returns
  assetAllocationPct: number // % growth assets; remainder income assets
  inflationPct: number
  wageGrowthPct: number
  returnScenario: ReturnScenario
  prescribedInvestorRatePct: number // PIR for KiwiSaver/PIE income (capped at 28)
  feePct: number // annual investment fee (MER) drag on returns

  // Expected annual return split by tax character (% of portfolio value)
  eligibleDividendsPct: number
  foreignDividendsPct: number
  unrealizedGainsPct: number
  realizedGainsPct: number
  interestIncomePct: number
  foreignWithholdingTaxPct: number
}
