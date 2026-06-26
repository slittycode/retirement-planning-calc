# AGENTS.md

Guidance for Codex when working in this repository.

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

`CLAUDE.md` is a verbatim copy of this file for Claude Code — keep the two in sync when you edit either.

## Architecture

- `src/calc/` — **pure** calculation engine, no React. Keep it that way; it's unit-tested in `src/calc/calc.test.ts`.
  - `tax.ts` — NZ income tax brackets (1 April 2025), and after-tax returns for taxable (marginal rate) vs PIE/KiwiSaver (PIR, capped 28%) accounts. Capital gains untaxed.
  - `nzsuper.ts` — NZ Super gross rates by living situation + eligibility age. Rates are approximate and editable; update each April.
  - `portfolio.ts` — `compositionForAllocation` (growth/income split → return-by-tax-character, calibrated so 100% growth reproduces PWL's defaults) and the scenario/volatility model.
  - `project.ts` — `project()` runs the year-by-year accumulation + decumulation; `sustainableSpending()` binary-searches the max flat real spend that lasts to the planning age.
- `src/components/` — thin React UI. `InputsPanel` groups the inputs; `ResultsSummary` shows KPIs; `GrowthOfWealthChart` + `RetirementIncomeChart` behind `ChartTabs`.
- `src/state/urlState.ts` — encode/decode every input to/from the URL (shareable links).
- `src/types.ts`, `src/defaults.ts`, `src/inputLimits.ts` — input schema, NZ defaults, per-field clamps.

## Conventions

- Percentages are whole numbers in `Inputs` (5.5 = 5.5%); dollars are NZD.
- Changing `assetAllocationPct` resets the return-composition fields; changing `relationshipStatus` resets `nzSuperAnnualGross`. Both live in `App.update`.
- Engine functions are pure and tested; add a test in `calc.test.ts` when you change the maths.
- Keep the NZ simplifications honest and documented in `AssumptionsNote.tsx` (no CGT, withdrawals untaxed, no FIF/ESCT/ACC, returns are smooth or single-percentile not Monte Carlo).

## NZ vs Canada

This is the crux of the fork. NZ Super replaces CPP/OAS (flat, universal, not clawed back); KiwiSaver + a personal account replace RRSP/TFSA; there's no CGT and no tax on withdrawals — which is why PWL's withdrawal-sequencing optimiser is intentionally omitted.
