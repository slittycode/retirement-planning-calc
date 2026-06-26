# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

An NZ-localised retirement planning calculator, reimplementing the methodology of PWL Capital's Canadian retirement tool. Sibling project to `rent-vs-buy-calc`, built with the same stack and conventions. Browser-only SPA, deployed to GitHub Pages.

## Stack & commands

React 18 + TypeScript (strict) + Vite + Tailwind + Recharts. npm, ESM, Node ≥ 22.

```bash
npm run dev        # http://localhost:5173/retirement-planning-calc/
npm test           # vitest run (whole suite)
npm run test:watch
npm run build      # tsc --noEmit && vite build

# single test / file
npx vitest run src/calc/calc.test.ts
npx vitest run -t "sustainable spending"
```

There is no ESLint/Prettier — `npm run build` (the `tsc --noEmit` half) is the only static check, so run it before claiming type-safety. CI (`.github/workflows/ci.yml`) runs build + test; pushes to `main` deploy to GitHub Pages via `deploy.yml`.

`AGENTS.md` is a verbatim copy of this file for Codex — keep the two in sync when you edit either.

## Architecture

- `src/calc/` — **pure** calculation engine, no React. Keep it that way; it's unit-tested in `src/calc/calc.test.ts`.
  - `tax.ts` — NZ income tax brackets (1 April 2025), and after-tax returns for taxable (marginal rate) vs PIE/KiwiSaver (PIR, capped 28%) accounts. Capital gains untaxed.
  - `nzsuper.ts` — NZ Super gross rates by living situation + eligibility age. Rates are approximate and editable; update each April. A `couple` is a pooled household with NZ Super for both partners.
  - `portfolio.ts` — `compositionForAllocation` (growth/income split → return-by-tax-character, calibrated so 100% growth reproduces PWL's defaults), the scenario/volatility model, and `FUND_TYPES` / `nearestFundType` (the friendly KiwiSaver fund-type front door to `assetAllocationPct`).
  - `spending.ts` — `SpendingMode` ('fixed' | 'percentOfIncome'), `baseRealSpending` (replacement ratio → today's-dollar spend) and `realSpendingForYear` (applies the age-related real decline).
  - `cashflows.ts` — recurring `otherIncome` (age window, taxable/inflation flags), one-off `LumpSum`s (windfalls / costs), and `downsizeNetForAge` (tax-free home-equity release at the downsizing age); `sanitizeLumpSums` guards decoded URL input.
  - `project.ts` — `project()` runs the year-by-year accumulation + decumulation, with KiwiSaver govt contribution (post-2025 rules), fees, pre-retirement personal saving, household NZ Super (paid even while working past eligibility), other income, lump sums and home downsizing. Exports `accountReturns` (working + lower `taxableRetired` rate), `nzSuperNetForAge`, `kiwiSaverGovtContribution` for reuse. Each `YearPoint` carries an `inflationFactor` so charts can show today's dollars.
  - `solve.ts` — back-calculations via bisection over `project()`: `sustainableSpending`, `requiredAnnualSavings`, `feasibleRetirementAge`, `requiredPortfolioAtRetirement`, and `fundedRatio` (PV of resources ÷ PV of spending, discounted at the expected after-tax return).
- `src/components/` — thin React UI. `InputsPanel` groups the inputs (with `LumpSumEditor` for one-offs); `ResultsSummary` shows projection KPIs; `PlanningPanel` shows the funded ratio + back-calcs; `GrowthOfWealthChart` + `RetirementIncomeChart` behind `ChartTabs` (with a nominal / today's-dollars toggle).
- `src/state/urlState.ts` — encode/decode every input to/from the URL (shareable links). `lumpSums` is JSON-encoded and only emitted when non-empty; `spendingMode` is validated like `returnScenario`.
- `src/types.ts`, `src/defaults.ts`, `src/inputLimits.ts` — input schema, NZ defaults, per-field clamps. Includes the home fields (`homeValue`, `downsizeAge`, `downsizeReleaseAmount`). Every numeric `Inputs` key needs an entry in `NUMERIC_INPUT_LIMITS`.

## Conventions

- Percentages are whole numbers in `Inputs` (5.5 = 5.5%); dollars are NZD.
- Changing `assetAllocationPct` resets the return-composition fields; changing `relationshipStatus` resets `nzSuperAnnualGross` and toggles `partnerReceivesNZSuper`. Both live in `App.update`.
- Engine functions are pure and tested; add a test in `calc.test.ts` when you change the maths. Estate-comparison tests must use a scenario that actually leaves an estate (the default scenario depletes to zero).
- Keep the NZ simplifications honest and documented in `AssumptionsNote.tsx` (no CGT, withdrawals untaxed, no FIF/ESCT/ACC, returns smooth or single-percentile not Monte Carlo, couples keep two NZ Supers to the planning age with no separate mortality).

## NZ vs Canada

This is the crux of the fork. NZ Super replaces CPP/OAS (flat, universal, not clawed back); KiwiSaver + a personal account replace RRSP/TFSA; there's no CGT and no tax on withdrawals — which is why PWL's withdrawal-sequencing optimiser is intentionally omitted.
