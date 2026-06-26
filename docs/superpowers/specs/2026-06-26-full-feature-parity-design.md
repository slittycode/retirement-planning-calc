# Full feature parity & richness — design

Date: 2026-06-26
Goal: bring the NZ retirement calculator up to the functionality and richness of
PWL Capital's original retirement tool, with first-class **expense entry-mode
toggles (percentage vs fixed sum)** and **back-calculations (solve-for)**, while
keeping the maths correct in every scenario the tool can express.

## Where we are

The engine (`src/calc/`) is pure and tested (21 tests green). Today it models a
single person: KiwiSaver accumulation (employee + employer + govt contribution),
then decumulation where net NZ Super part-funds a flat real spend and the rest is
drawn from the taxable account then KiwiSaver. One headline back-calc exists:
`sustainableSpending()`.

### Gaps vs the original (and vs real retiree questions)

1. **Spending is only a flat fixed real dollar amount.** No "% of pre-retirement
   income" (replacement ratio) mode; no spending decline with age (the
   go-go / slow-go / no-go reality); no one-off costs (travel, car, home).
2. **No back-calculations beyond sustainable spend.** Real users ask: *how much
   must I save?*, *when can I afford to retire?*, *what's my number (nest egg) at
   retirement?*, *am I on track (funded ratio)?*
3. **No pre-retirement saving into the personal account** — surplus income
   vanishes; only KiwiSaver accumulates.
4. **No investment fees (MER).** Fees are central to PWL's thesis.
5. **No other income streams** (private/DB pension, part-time work, rental,
   annuity) and **no windfalls** (inheritance, downsizing the home — a classic NZ
   question).
6. **Couples are only a NZ Super *rate* swap, and only ONE person's NZ Super is
   counted.** A couple household receives NZ Super for *both* partners — current
   maths understates a couple's guaranteed income.
7. **Charts are nominal only**; no real-dollar view, no scenario comparison.

## Design

Keep the engine pure and TDD-driven. Extend the flat `Inputs` shape so URL-state,
defaults, and limits keep working; the one non-scalar (one-off cashflows) is
special-cased in `urlState`.

### A. Spending model (`src/calc/spending.ts`, new)
- `spendingMode: 'fixed' | 'percentOfIncome'`.
- `spendingReplacementPct` — % of final pre-retirement **gross** income, used in
  percent mode to derive the year-one real spend.
- `retirementSpendingDeclinePct` — annual **real** change to spending through
  retirement (0 = flat; negative = the empirical decline as people age). Applied
  on top of inflation.
- `effectiveBaseSpending(inputs)` returns the year-one real retirement spend for
  either mode; `spendingForYear(inputs, yearsIntoRetirement)` applies decline.

### B. Cashflows (`src/calc/cashflows.ts`, new)
- `otherIncomeAnnual`, `otherIncomeStartAge`, `otherIncomeEndAge`,
  `otherIncomeTaxable`, `otherIncomeInflationAdjusted` — one recurring stream
  (DB pension / part-time / rental / annuity).
- `lumpSums: LumpSum[]` where `LumpSum = { age, amount, kind: 'income' | 'expense' }`
  — windfalls and one-offs. Encoded compactly in the URL as JSON.

### C. Accumulation & fees (extend `project.ts`)
- `annualTaxableSavings` — saved into the personal account each working year
  (grown by wage growth).
- `feePct` — annual fee drag applied to both accounts' returns (kept separate
  from the PWL-calibrated composition so that calibration is undisturbed when
  fee = 0).
- KiwiSaver government contribution updated to the post-1-July-2025 rule
  (25%, max $260.72, abated above the income threshold), documented & editable.

### D. Couples → household (extend `nzsuper.ts` + `project.ts`)
- Treat `couple` as a pooled household with combined balances and **two** NZ
  Super entitlements. `partnerReceivesNZSuper` + `partnerNzSuperAge` (default =
  `nzSuperAge`). Each partner's NZ Super starts at its own age; both taxed
  individually (NZ Super is taxed per person). Accounts remain pooled — documented.
- Retirement taxation: NZ Super (per person) + taxable other income are taxed to
  fund spending; capital withdrawals stay untaxed.

### E. Back-solvers & funded ratio (`src/calc/solve.ts`, new)
A generic monotonic bisection `solve(predicate)` plus:
- `sustainableSpending` (moved here; unchanged behaviour).
- `requiredAnnualSavings` — least `annualTaxableSavings` so money lasts.
- `feasibleRetirementAge` — earliest integer retirement age that lasts.
- `requiredPortfolioAtRetirement` — the "number": least at-retirement balance
  that funds the plan (bisection over starting balance, decumulation only).
- `fundedRatio` — PV(assets + future savings + NZ Super + other income) ÷
  PV(retirement spending), discounted at the after-tax expected return. >1 = on
  track. Reported with the PV of assets and liabilities.

### F. UI
- Spending: segmented **Fixed $ / % of income** control; conditional replacement
  field; spending-decline field.
- New inputs grouped in collapsible cards: pre-retirement saving, fees, other
  income, one-off cashflows (add/remove rows), partner (when couple).
- New **"What do I need?"** results panel: sustainable spend, required saving,
  feasible retirement age, your number, funded ratio.
- Charts: **today's-dollars / nominal** toggle; a compact five-scenario outcome
  table.

### Correctness discipline
Every engine change lands with a `calc.test.ts` case. Invariants to assert:
more savings/fees/age move outcomes monotonically; couple ≥ single NZ Super;
percent- and fixed-mode agree when the derived dollar equals the fixed dollar;
funded ratio crosses 1 exactly where sustainable spend crosses target; one-off
income strictly improves the estate, one-off expense strictly worsens it.

## Phasing (each phase: tests → impl → `npm run build` + `npm test` → commit)
1. Data-model expansion (types, defaults, limits, urlState incl. lump-sum array).
2. Engine foundations: fees, pre-retirement saving, post-2025 govt contribution,
   household NZ Super, combined retirement taxation, real-dollar series.
3. Spending modes + decline.
4. Other income + one-off cashflows.
5. Back-solvers + funded ratio.
6. UI wiring for all of the above.
7. Docs (AssumptionsNote, README, CLAUDE.md/AGENTS.md) + final verification.

## Out of scope (documented honestly)
Monte-Carlo sequence risk; FIF/FDR, ESCT, ACC, imputation credits; separate
mortality for each partner / survivor-year NZ Super taper; means-tested
residential-care subsidies. These stay listed in `AssumptionsNote`.
