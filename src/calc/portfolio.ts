/**
 * Couples the asset-allocation input to the return-composition fields the same
 * way PWL's tool does: the growth/income split determines how the expected
 * return breaks down by tax character. The per-asset yields below are calibrated
 * so a 100% growth allocation reproduces PWL's retirement-tool default
 * composition exactly: eligible 0.74, foreign 0.94, realized 0.52,
 * unrealized 4.67, interest 0.00.
 */

export const EQUITY_YIELDS = {
  eligibleDividends: 0.74,
  foreignDividends: 0.94,
  realizedGains: 0.52,
  unrealizedGains: 4.67,
} as const

export const BOND_INTEREST_YIELD = 3.35

export interface Composition {
  eligibleDividendsPct: number
  foreignDividendsPct: number
  realizedGainsPct: number
  unrealizedGainsPct: number
  interestIncomePct: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Return composition implied by a growth-asset allocation (rounded for display). */
export function compositionForAllocation(allocationPct: number): Composition {
  const a = Math.min(100, Math.max(0, allocationPct)) / 100
  const income = 1 - a
  return {
    eligibleDividendsPct: round2(a * EQUITY_YIELDS.eligibleDividends),
    foreignDividendsPct: round2(a * EQUITY_YIELDS.foreignDividends),
    realizedGainsPct: round2(a * EQUITY_YIELDS.realizedGains),
    unrealizedGainsPct: round2(a * EQUITY_YIELDS.unrealizedGains),
    interestIncomePct: round2(income * BOND_INTEREST_YIELD),
  }
}

/**
 * Scenario modelling. Rather than a full Monte Carlo, we follow PWL's lighter
 * approach: pick a single constant return at a chosen percentile of the
 * one-year return distribution. "Expected" is the mean; the others shift the
 * return up/down by a number of standard deviations. Volatility is derived from
 * the growth/income split.
 */
export const EQUITY_VOL = 0.16
export const BOND_VOL = 0.05

/** Approximate portfolio volatility (fraction) for an allocation, ignoring correlation. */
export function portfolioVolatility(allocationPct: number): number {
  const a = Math.min(100, Math.max(0, allocationPct)) / 100
  const income = 1 - a
  return Math.sqrt((a * EQUITY_VOL) ** 2 + (income * BOND_VOL) ** 2)
}

export const RETURN_SCENARIOS = ['amazing', 'great', 'expected', 'bad', 'terrible'] as const
export type ReturnScenario = (typeof RETURN_SCENARIOS)[number]

/** Standard-deviation multiple applied to the expected return for each scenario. */
export const SCENARIO_SIGMA: Record<ReturnScenario, number> = {
  amazing: 1.28, // ~90th percentile
  great: 0.52, // ~70th percentile
  expected: 0,
  bad: -0.52, // ~30th percentile
  terrible: -1.28, // ~10th percentile
}

/** Return adjustment (fraction) for a scenario, given the allocation's volatility. */
export function scenarioReturnDelta(scenario: ReturnScenario, allocationPct: number): number {
  return SCENARIO_SIGMA[scenario] * portfolioVolatility(allocationPct)
}
