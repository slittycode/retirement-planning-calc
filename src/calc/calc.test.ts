import { describe, it, expect } from 'vitest'
import {
  marginalRate,
  incomeTax,
  averageTaxRate,
  grossReturn,
  taxableAccountAfterTaxReturn,
  pieAfterTaxReturn,
  type ReturnComposition,
} from './tax'
import {
  compositionForAllocation,
  portfolioVolatility,
  scenarioReturnDelta,
  EQUITY_YIELDS,
} from './portfolio'
import { project, sustainableSpending } from './project'
import { NZ_DEFAULTS } from '../defaults'
import type { Inputs } from '../types'

describe('NZ income tax', () => {
  it('returns the marginal rate for each band boundary', () => {
    expect(marginalRate(10_000)).toBe(0.105)
    expect(marginalRate(40_000)).toBe(0.175)
    expect(marginalRate(70_000)).toBe(0.3)
    expect(marginalRate(120_000)).toBe(0.33)
    expect(marginalRate(250_000)).toBe(0.39)
  })

  it('accumulates progressive tax across bands', () => {
    // First band only: 10.5% of 15,600.
    expect(incomeTax(15_600)).toBeCloseTo(1_638, 0)
    // Two bands: 1,638 + 17.5% of (53,500 - 15,600) = 1,638 + 6,632.5
    expect(incomeTax(53_500)).toBeCloseTo(8_270.5, 1)
  })

  it('average rate is below the marginal rate', () => {
    expect(averageTaxRate(70_000)).toBeLessThan(marginalRate(70_000))
    expect(averageTaxRate(0)).toBe(0)
  })
})

describe('return composition', () => {
  it('reproduces PWL retirement defaults at 100% growth', () => {
    const c = compositionForAllocation(100)
    expect(c.eligibleDividendsPct).toBeCloseTo(EQUITY_YIELDS.eligibleDividends, 2)
    expect(c.foreignDividendsPct).toBeCloseTo(EQUITY_YIELDS.foreignDividends, 2)
    expect(c.realizedGainsPct).toBeCloseTo(EQUITY_YIELDS.realizedGains, 2)
    expect(c.unrealizedGainsPct).toBeCloseTo(EQUITY_YIELDS.unrealizedGains, 2)
    expect(c.interestIncomePct).toBeCloseTo(0, 2)
  })

  it('moves return into interest as the allocation shifts to income assets', () => {
    const growth = compositionForAllocation(100)
    const income = compositionForAllocation(0)
    expect(income.interestIncomePct).toBeGreaterThan(growth.interestIncomePct)
    expect(income.unrealizedGainsPct).toBe(0)
  })
})

describe('portfolio tax treatment', () => {
  const comp: ReturnComposition = {
    ...compositionForAllocation(60),
    foreignWithholdingTaxPct: 15,
  }

  it('PIE (capped 28%) beats a taxable account for a top-rate earner', () => {
    const taxableR = taxableAccountAfterTaxReturn(comp, 250_000) // 39% marginal
    const pieR = pieAfterTaxReturn(comp, 28)
    expect(pieR).toBeGreaterThan(taxableR)
  })

  it('capital gains are untaxed: drag never exceeds the income components', () => {
    const gross = grossReturn(comp)
    const after = taxableAccountAfterTaxReturn(comp, 100_000)
    expect(after).toBeLessThan(gross)
    // Untaxed gains dominate, so well over half the gross return survives.
    expect(after).toBeGreaterThan(gross * 0.7)
  })
})

describe('scenarios', () => {
  it('volatility rises with the growth allocation', () => {
    expect(portfolioVolatility(100)).toBeGreaterThan(portfolioVolatility(20))
  })

  it('good scenarios add return and bad ones subtract', () => {
    expect(scenarioReturnDelta('amazing', 60)).toBeGreaterThan(0)
    expect(scenarioReturnDelta('expected', 60)).toBe(0)
    expect(scenarioReturnDelta('terrible', 60)).toBeLessThan(0)
  })
})

describe('projection', () => {
  it('spans current age through the planning age', () => {
    const r = project(NZ_DEFAULTS)
    expect(r.series[0].age).toBe(NZ_DEFAULTS.currentAge)
    expect(r.series[r.series.length - 1].age).toBe(NZ_DEFAULTS.planningAge)
  })

  it('accumulates KiwiSaver while still working', () => {
    const r = project(NZ_DEFAULTS)
    const atRetirement = r.series.find((p) => p.age === NZ_DEFAULTS.retirementAge - 1)!
    expect(atRetirement.kiwiSaver).toBeGreaterThan(NZ_DEFAULTS.kiwiSaverBalance)
  })

  it('pays NZ Super only from the eligibility age in retirement', () => {
    const r = project(NZ_DEFAULTS)
    const beforeSuper = r.series.find((p) => p.age === NZ_DEFAULTS.nzSuperAge - 1)!
    const afterSuper = r.series.find((p) => p.age === NZ_DEFAULTS.nzSuperAge + 1)!
    expect(beforeSuper.nzSuperNet).toBe(0)
    expect(afterSuper.nzSuperNet).toBeGreaterThan(0)
  })

  it('a thin portfolio with high spending runs out', () => {
    const broke: Inputs = {
      ...NZ_DEFAULTS,
      kiwiSaverBalance: 20_000,
      taxableBalance: 10_000,
      annualSpending: 90_000,
    }
    const r = project(broke)
    expect(r.moneyLasts).toBe(false)
    expect(r.depletionAge).not.toBeNull()
  })

  it('a fat portfolio with modest spending lasts and leaves an estate', () => {
    const comfortable: Inputs = {
      ...NZ_DEFAULTS,
      kiwiSaverBalance: 600_000,
      taxableBalance: 600_000,
      annualSpending: 40_000,
    }
    const r = project(comfortable)
    expect(r.moneyLasts).toBe(true)
    expect(r.depletionAge).toBeNull()
    expect(r.estateAtPlanning).toBeGreaterThan(0)
  })

  it('NZ Super reduces how much is drawn from savings', () => {
    const withSuper = project(NZ_DEFAULTS)
    const withoutSuper = project({ ...NZ_DEFAULTS, includeNZSuper: false })
    const yr = NZ_DEFAULTS.retirementAge + 5
    const a = withSuper.series.find((p) => p.age === yr)!
    const b = withoutSuper.series.find((p) => p.age === yr)!
    expect(a.portfolioWithdrawal).toBeLessThan(b.portfolioWithdrawal)
  })

  it('a worse return scenario never improves the estate', () => {
    const expected = project({ ...NZ_DEFAULTS, returnScenario: 'expected' })
    const bad = project({ ...NZ_DEFAULTS, returnScenario: 'terrible' })
    expect(bad.estateAtPlanning).toBeLessThanOrEqual(expected.estateAtPlanning)
  })
})

describe('sustainable spending', () => {
  it('is a spend level the plan can actually sustain', () => {
    const s = sustainableSpending(NZ_DEFAULTS)
    expect(s).toBeGreaterThan(0)
    expect(project({ ...NZ_DEFAULTS, annualSpending: s * 0.98 }).moneyLasts).toBe(true)
  })

  it('spending meaningfully above the sustainable level fails', () => {
    const s = sustainableSpending(NZ_DEFAULTS)
    expect(project({ ...NZ_DEFAULTS, annualSpending: s * 1.2 }).moneyLasts).toBe(false)
  })
})
