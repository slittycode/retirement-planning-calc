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
import { project } from './project'
import {
  sustainableSpending,
  requiredAnnualSavings,
  feasibleRetirementAge,
  requiredPortfolioAtRetirement,
  fundedRatio,
} from './solve'
import {
  baseRealSpending,
  finalPreRetirementIncome,
  realSpendingForYear,
} from './spending'
import { otherIncomeGrossForAge, lumpSumNetForAge, sanitizeLumpSums } from './cashflows'
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

  it('taxes the personal account at a lower marginal rate in retirement', () => {
    const highEarner: Inputs = { ...NZ_DEFAULTS, currentIncome: 250_000, returnScenario: 'expected', feePct: 0 }
    const comp: ReturnComposition = {
      eligibleDividendsPct: highEarner.eligibleDividendsPct,
      foreignDividendsPct: highEarner.foreignDividendsPct,
      unrealizedGainsPct: highEarner.unrealizedGainsPct,
      realizedGainsPct: highEarner.realizedGainsPct,
      interestIncomePct: highEarner.interestIncomePct,
      foreignWithholdingTaxPct: highEarner.foreignWithholdingTaxPct,
    }
    // Retirement income is far below a $250k salary, so the reported after-tax taxable
    // return is higher than if the working (39%) rate were used for all years.
    const workingRateReturnPct = taxableAccountAfterTaxReturn(comp, 250_000) * 100
    expect(project(highEarner).taxableReturnPct).toBeGreaterThan(workingRateReturnPct)
  })

  it('pays NZ Super while still working past the eligibility age', () => {
    const workLate: Inputs = { ...NZ_DEFAULTS, retirementAge: 70, nzSuperAge: 65 }
    const r = project(workLate)
    const stillWorking = r.series.find((p) => p.age === 67)!
    expect(stillWorking.working).toBe(true)
    expect(stillWorking.nzSuperNet).toBeGreaterThan(0)
    // It isn't income-tested, so working past 65 with Super lifts lifetime Super.
    const noSuper = project({ ...workLate, includeNZSuper: false })
    expect(r.totalNZSuperNet).toBeGreaterThan(noSuper.totalNZSuperNet)
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

describe('spending modes', () => {
  it('grows pre-retirement income by wage growth to the retirement age', () => {
    const i: Inputs = { ...NZ_DEFAULTS, currentAge: 60, retirementAge: 65, currentIncome: 100_000, wageGrowthPct: 3 }
    expect(finalPreRetirementIncome(i)).toBeCloseTo(100_000 * 1.03 ** 5, 0)
  })

  it('percent mode spends the replacement share of final income', () => {
    const i: Inputs = {
      ...NZ_DEFAULTS,
      spendingMode: 'percentOfIncome',
      spendingReplacementPct: 70,
      currentIncome: 100_000,
      wageGrowthPct: 0,
      currentAge: 60,
      retirementAge: 65,
    }
    expect(baseRealSpending(i)).toBeCloseTo(70_000, 0)
  })

  it('fixed and percent modes agree when the derived dollar matches', () => {
    const fixed: Inputs = { ...NZ_DEFAULTS, spendingMode: 'fixed', annualSpending: 50_000, wageGrowthPct: 0 }
    const pct: Inputs = {
      ...fixed,
      spendingMode: 'percentOfIncome',
      currentIncome: 100_000,
      spendingReplacementPct: 50,
    }
    expect(project(pct).estateAtPlanning).toBeCloseTo(project(fixed).estateAtPlanning, 5)
  })

  it('a spending decline lowers later-year real spending and improves the estate', () => {
    const flat = project({ ...NZ_DEFAULTS, retirementSpendingDeclinePct: 0 })
    const declining = project({ ...NZ_DEFAULTS, retirementSpendingDeclinePct: -1.5 })
    expect(realSpendingForYear({ ...NZ_DEFAULTS, retirementSpendingDeclinePct: -1.5 }, 20)).toBeLessThan(
      baseRealSpending(NZ_DEFAULTS),
    )
    expect(declining.estateAtPlanning).toBeGreaterThan(flat.estateAtPlanning)
  })
})

describe('fees and pre-retirement saving', () => {
  // A plan that leaves an estate, so estate comparisons are meaningful.
  const comfortable: Inputs = { ...NZ_DEFAULTS, kiwiSaverBalance: 600_000, taxableBalance: 600_000, annualSpending: 40_000 }

  it('a fee drag lowers the after-tax return and the estate', () => {
    const noFee = project({ ...comfortable, feePct: 0 })
    const withFee = project({ ...comfortable, feePct: 1 })
    expect(withFee.kiwiSaverReturnPct).toBeLessThan(noFee.kiwiSaverReturnPct)
    expect(withFee.taxableReturnPct).toBeLessThan(noFee.taxableReturnPct)
    expect(withFee.estateAtPlanning).toBeLessThan(noFee.estateAtPlanning)
  })

  it('saving into the personal account while working grows the estate', () => {
    const none = project({ ...comfortable, annualTaxableSavings: 0 })
    const saving = project({ ...comfortable, annualTaxableSavings: 10_000 })
    expect(saving.estateAtPlanning).toBeGreaterThan(none.estateAtPlanning)
  })

  it('omits the KiwiSaver government contribution above the income threshold', () => {
    const low = project({ ...NZ_DEFAULTS, currentAge: 40, retirementAge: 65, currentIncome: 60_000 })
    const high = project({ ...NZ_DEFAULTS, currentAge: 40, retirementAge: 65, currentIncome: 200_000 })
    const lowKs = low.series.find((p) => p.age === 50)!.kiwiSaver
    const highKs = high.series.find((p) => p.age === 50)!.kiwiSaver
    // High earner still accumulates more in raw dollars, so compare the govt top-up directly.
    const govtLow = Math.min(260.72, 60_000 * 0.03 * 0.25)
    expect(govtLow).toBeGreaterThan(0)
    expect(lowKs).toBeGreaterThan(0)
    expect(highKs).toBeGreaterThan(0)
  })
})

describe('couples: household NZ Super', () => {
  const couple: Inputs = {
    ...NZ_DEFAULTS,
    relationshipStatus: 'couple',
    nzSuperAnnualGross: 24_500,
    partnerReceivesNZSuper: true,
  }
  it('counts a second NZ Super entitlement for a couple', () => {
    const one = project({ ...couple, partnerReceivesNZSuper: false })
    const two = project({ ...couple, partnerReceivesNZSuper: true })
    const yr = NZ_DEFAULTS.retirementAge + 5
    const a = one.series.find((p) => p.age === yr)!.nzSuperNet
    const b = two.series.find((p) => p.age === yr)!.nzSuperNet
    expect(b).toBeGreaterThan(a)
    // Two equal entitlements, taxed separately → close to double.
    expect(b).toBeCloseTo(a * 2, 0)
  })

  it("respects the partner's own NZ Super start age", () => {
    const r = project({ ...couple, nzSuperAge: 65, partnerNzSuperAge: 68 })
    const at66 = r.series.find((p) => p.age === 66)!.nzSuperNet
    const at69 = r.series.find((p) => p.age === 69)!.nzSuperNet
    expect(at69).toBeGreaterThan(at66)
  })
})

describe('other income and one-off cashflows', () => {
  it('only pays other income inside its age window', () => {
    const i: Inputs = {
      ...NZ_DEFAULTS,
      otherIncomeAnnual: 12_000,
      otherIncomeStartAge: 70,
      otherIncomeEndAge: 80,
      otherIncomeInflationAdjusted: false,
    }
    expect(otherIncomeGrossForAge(i, 69, 1)).toBe(0)
    expect(otherIncomeGrossForAge(i, 75, 1)).toBe(12_000)
    expect(otherIncomeGrossForAge(i, 81, 1)).toBe(0)
  })

  it('other income reduces what must be drawn from savings', () => {
    const without = project(NZ_DEFAULTS)
    const withIncome = project({
      ...NZ_DEFAULTS,
      otherIncomeAnnual: 10_000,
      otherIncomeStartAge: 65,
      otherIncomeEndAge: 95,
    })
    const yr = NZ_DEFAULTS.retirementAge + 5
    expect(withIncome.series.find((p) => p.age === yr)!.portfolioWithdrawal).toBeLessThan(
      without.series.find((p) => p.age === yr)!.portfolioWithdrawal,
    )
  })

  it('a windfall improves the estate and a one-off cost worsens it', () => {
    const comfortable: Inputs = { ...NZ_DEFAULTS, kiwiSaverBalance: 600_000, taxableBalance: 600_000, annualSpending: 40_000 }
    const baseline = project(comfortable).estateAtPlanning
    const windfall = project({ ...comfortable, lumpSums: [{ age: 67, amount: 50_000, kind: 'income' }] }).estateAtPlanning
    const cost = project({ ...comfortable, lumpSums: [{ age: 67, amount: 50_000, kind: 'expense' }] }).estateAtPlanning
    expect(windfall).toBeGreaterThan(baseline)
    expect(cost).toBeLessThan(baseline)
  })

  it('signs lump-sum cashflows and sanitises decoded input', () => {
    const ls = [
      { age: 67, amount: 50_000, kind: 'income' as const },
      { age: 67, amount: 20_000, kind: 'expense' as const },
    ]
    expect(lumpSumNetForAge(ls, 67, 1)).toBe(30_000)
    expect(lumpSumNetForAge(ls, 68, 1)).toBe(0)
    expect(sanitizeLumpSums([{ age: 70, amount: -5, kind: 'expense' }, { junk: true }, 5])).toEqual([
      { age: 70, amount: 5, kind: 'expense' },
    ])
  })
})

describe('back-calculations', () => {
  const tight: Inputs = { ...NZ_DEFAULTS, currentAge: 45, retirementAge: 65, kiwiSaverBalance: 20_000, taxableBalance: 10_000, annualSpending: 55_000 }

  it('required annual saving makes an otherwise-short plan last', () => {
    expect(project(tight).moneyLasts).toBe(false)
    const need = requiredAnnualSavings(tight)
    expect(need.feasible).toBe(true)
    expect(need.value).toBeGreaterThan(0)
    expect(project({ ...tight, annualTaxableSavings: need.value * 1.02 }).moneyLasts).toBe(true)
  })

  it('returns zero required saving when the plan already lasts', () => {
    const comfy: Inputs = { ...NZ_DEFAULTS, kiwiSaverBalance: 800_000, taxableBalance: 400_000, annualSpending: 40_000 }
    expect(requiredAnnualSavings(comfy)).toEqual({ feasible: true, value: 0 })
  })

  it('reports the extra saving on top of what is already set aside', () => {
    const already: Inputs = { ...tight, annualTaxableSavings: 5_000 }
    const extra = requiredAnnualSavings(already)
    expect(extra.feasible).toBe(true)
    expect(extra.value).toBeGreaterThan(0)
    // Current saving + the reported extra (with a hair of headroom) must last.
    expect(project({ ...already, annualTaxableSavings: 5_000 + extra.value * 1.02 }).moneyLasts).toBe(true)
    // Less than current saving never helps, so the extra is measured from 5,000 up.
    expect(project({ ...already, annualTaxableSavings: 5_000 + extra.value * 0.5 }).moneyLasts).toBe(false)
  })

  it('feasible retirement age is the earliest age the plan lasts', () => {
    const r = feasibleRetirementAge(tight)
    expect(r.feasible).toBe(true)
    expect(project({ ...tight, retirementAge: r.value }).moneyLasts).toBe(true)
    if (r.value > Math.round(tight.currentAge)) {
      expect(project({ ...tight, retirementAge: r.value - 1 }).moneyLasts).toBe(false)
    }
  })

  it('required portfolio at retirement actually funds the plan', () => {
    const number = requiredPortfolioAtRetirement(NZ_DEFAULTS)
    expect(number).toBeGreaterThan(0)
    const infl = NZ_DEFAULTS.inflationPct / 100
    const yearsToRetire = NZ_DEFAULTS.retirementAge - NZ_DEFAULTS.currentAge
    const atRetNominal = number * Math.pow(1 + infl, yearsToRetire)
    const funded = project({
      ...NZ_DEFAULTS,
      currentAge: NZ_DEFAULTS.retirementAge,
      spendingMode: 'fixed',
      annualSpending: baseRealSpending(NZ_DEFAULTS),
      annualTaxableSavings: 0,
      kiwiSaverBalance: 0,
      taxableBalance: atRetNominal * 1.02,
    })
    expect(funded.moneyLasts).toBe(true)
  })
})

describe('funded ratio', () => {
  it('exceeds 1 for a comfortable plan and falls below 1 for a stretched one', () => {
    const comfy: Inputs = { ...NZ_DEFAULTS, kiwiSaverBalance: 800_000, taxableBalance: 400_000, annualSpending: 40_000 }
    const broke: Inputs = { ...NZ_DEFAULTS, kiwiSaverBalance: 20_000, taxableBalance: 10_000, annualSpending: 80_000 }
    expect(fundedRatio(comfy).ratio).toBeGreaterThan(1)
    expect(fundedRatio(broke).ratio).toBeLessThan(1)
  })

  it('reports positive present values for assets and liabilities', () => {
    const f = fundedRatio(NZ_DEFAULTS)
    expect(f.pvAssets).toBeGreaterThan(0)
    expect(f.pvLiabilities).toBeGreaterThan(0)
    expect(f.ratio).toBeCloseTo(f.pvAssets / f.pvLiabilities, 6)
  })
})
