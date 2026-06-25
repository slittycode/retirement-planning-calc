/**
 * Inputs for the NZ retirement projection. Adapted from PWL Capital's retirement
 * planning tool, localised for New Zealand: CPP/OAS become NZ Superannuation,
 * RRSP/TFSA become KiwiSaver + a personal taxable account, and Canadian
 * provincial tax becomes NZ income tax (no CGT, no tax on withdrawals).
 *
 * Percentages are whole numbers (5.5 = 5.5%); dollar amounts are NZD.
 */

import type { ReturnScenario } from './calc/portfolio'
import type { RelationshipStatus } from './calc/nzsuper'

export type { ReturnScenario, RelationshipStatus }

export interface Inputs {
  // Profile
  currentAge: number
  retirementAge: number
  planningAge: number // age the plan should last to (life expectancy)
  relationshipStatus: RelationshipStatus
  currentIncome: number // gross annual employment income while still working
  annualSpending: number // desired yearly spending in retirement, in today's dollars

  // Accounts — current balances
  kiwiSaverBalance: number
  kiwiSaverContribPct: number // employee KiwiSaver contribution, % of gross pay
  employerContribPct: number // employer KiwiSaver contribution, % of gross pay
  taxableBalance: number // investments outside KiwiSaver

  // NZ Superannuation
  includeNZSuper: boolean
  nzSuperAge: number // age NZ Super starts (eligibility is 65)
  nzSuperAnnualGross: number // approximate gross annual NZ Super (editable)

  // Portfolio / returns
  assetAllocationPct: number // % growth assets; remainder income assets
  inflationPct: number
  wageGrowthPct: number
  returnScenario: ReturnScenario
  prescribedInvestorRatePct: number // PIR for KiwiSaver/PIE income (capped at 28)

  // Expected annual return split by tax character (% of portfolio value)
  eligibleDividendsPct: number
  foreignDividendsPct: number
  unrealizedGainsPct: number
  realizedGainsPct: number
  interestIncomePct: number
  foreignWithholdingTaxPct: number
}
