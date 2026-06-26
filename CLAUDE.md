# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A faithful **New Zealand localisation of PWL Capital's retirement-planning tool**
(research-tools.pwlcapital.com/research/retirement). Browser-only SPA, no backend — all maths
runs in the browser and a scenario is shareable as a URL. Deployed to GitHub Pages. Sibling
project to `rent-vs-buy-calc`, same stack and conventions.

**Only tax/benefits are localised from PWL.** Fields, methodology, layout and UX otherwise
mirror PWL. NZ Super replaces CPP/OAS; KiwiSaver + a personal taxable account replace
RRSP/TFSA; NZ income tax replaces provincial tax. There is no CGT and no tax on the withdrawal
event — which is why PWL's withdrawal-sequencing optimiser tab is intentionally omitted
(drawdown order has only a second-order effect in NZ).

> PWL fidelity is currently **unverified**: the default inputs and the return-composition
> constants in `portfolio.ts` were reverse-engineered from PWL's client-side code, and the live
> tool is geo/Cloudflare-blocked (403) from here. Treat "matches PWL exactly" as a claim to
> verify, not a fact. A feature-parity design note lives in `docs/superpowers/specs/`.

Stack: React 18 + TypeScript (strict) + Vite + Tailwind + Recharts. npm, ESM, Node ≥ 22.

## Commands

```bash
npm install                                    # first-time setup
npm run dev          # http://localhost:5173/retirement-planning-calc/  (note base path)
npm test             # vitest run — whole suite
npm run test:watch   # vitest watch mode
npm run build        # tsc --noEmit && vite build

# single test / file
npx vitest run src/calc/calc.test.ts           # one file
npx vitest run -t "sustainable spending"       # by describe/it name
```

There is **no ESLint/Prettier** — TypeScript strict (`tsc --noEmit`, the first half of
`npm run build`) is the only static check. Run `npm run build` before claiming type-safety;
`noUnusedLocals`/`noUnusedParameters` are on, so dead bindings fail the build.

## Architecture

`src/calc/` is a **pure** calculation engine (no React) unit-tested in `calc.test.ts` — keep it
that way. `src/components/` is thin UI on top; `src/App.tsx` wires them together.

1. **`src/calc/tax.ts`** — NZ income tax (`NZ_TAX_BRACKETS`), `marginalRate` / `incomeTax` /
   `averageTaxRate`, and after-tax-return helpers: `taxableAccountAfterTaxReturn` (marginal
   rate) vs `pieAfterTaxReturn` (PIR, capped 28%), their `*TaxDrag` parts, `grossReturn`.
   Capital gains untaxed.
2. **`src/calc/nzsuper.ts`** — `NZ_SUPER_GROSS_ANNUAL` (per-person gross by `single`/`couple`,
   1 Apr 2025), `NZ_SUPER_ELIGIBILITY_AGE` (65), `RELATIONSHIP_STATUSES`.
3. **`src/calc/portfolio.ts`** — `compositionForAllocation` (growth/income split → the five
   return-by-tax-character fields, calibrated so 100% growth reproduces PWL's defaults); scenario
   model `RETURN_SCENARIOS`/`SCENARIO_SIGMA`/`portfolioVolatility`/`scenarioReturnDelta`.
4. **`src/calc/spending.ts`** — `SpendingMode` (`fixed` | `percentOfIncome`),
   `finalPreRetirementIncome`, `baseRealSpending` (replacement ratio → today's-dollar spend),
   `realSpendingForYear` (applies the go-go/slow-go/no-go real decline).
5. **`src/calc/cashflows.ts`** — recurring other income (`otherIncomeGrossForAge`, age window +
   taxable/inflation flags) and one-off `LumpSum`s (`lumpSumNetForAge`); `sanitizeLumpSums`
   guards decoded URL input.
6. **`src/calc/project.ts`** — `project()` runs the year-by-year accumulation + decumulation
   (KiwiSaver govt contribution on post-2025 rules, fees, pre-retirement personal saving,
   household NZ Super, other income, lump sums). Returns `ProjectionResult`/`YearPoint[]`; each
   `YearPoint` carries an `inflationFactor` so charts can show today's dollars. Exports
   `accountReturns` (per-phase returns: working vs lower retirement taxable rate),
   `nzSuperNetForAge`, `kiwiSaverGovtContribution` for reuse.
7. **`src/calc/solve.ts`** — back-calculations via bisection over `project()`:
   `sustainableSpending`, `requiredAnnualSavings`, `feasibleRetirementAge`,
   `requiredPortfolioAtRetirement`, and `fundedRatio` (PV of resources ÷ PV of spending,
   discounted at the expected after-tax return).
8. **`src/types.ts`** — the `Inputs` interface (**37 fields**); re-exports `ReturnScenario`,
   `RelationshipStatus`, `SpendingMode`, `LumpSum`.
9. **`src/defaults.ts`** (`NZ_DEFAULTS`) and **`src/inputLimits.ts`** (`NUMERIC_INPUT_LIMITS`
   per-field clamps + `clampNumericInput`).
10. **`src/state/urlState.ts`** — `encodeInputs`/`decodeInputs`: every input ↔ the URL query
    string. Numbers/booleans are handled generically; `lumpSums` is JSON-encoded and only
    emitted when non-empty; the enum fields each need an explicit decode branch.
11. **`src/components/`** — `InputsPanel` (groups inputs; `InputField`/`SelectField` primitives,
    `LumpSumEditor` for one-offs), `ResultsSummary` (+ `ReturnsSummary`), `PlanningPanel`
    (funded ratio + the solvers), `ChartTabs` wrapping `GrowthOfWealthChart` +
    `RetirementIncomeChart` (nominal / today's-dollars toggle), and `AssumptionsNote` (the
    assumptions disclosure — keep it honest and in sync with the maths).
12. **`src/App.tsx`** — holds `inputs` state, the `update()` reducer (+ its resets), `reset()`,
    `copyLink()`; runs `project` + the solvers in `useMemo` and mirrors inputs to the URL.
    **`src/main.tsx`** is the entry point; **`src/test/setup.ts`** holds test polyfills.

## Conventions & gotchas

1. **Percentages are whole numbers** in `Inputs` (`5.5` = 5.5%); dollar amounts are NZD.
2. **Vitest defaults to the `node` environment** (set in `vite.config.ts`), because the engine
   tests are pure. DOM/component tests must opt in with a top-of-file
   `// @vitest-environment jsdom` pragma (see `App.smoke.test.tsx`); `calc.test.ts` stays node.
3. `src/test/setup.ts` polyfills **`ResizeObserver`** so Recharts' `ResponsiveContainer` renders
   under jsdom without throwing (wired via `test.setupFiles`).
4. **Reset coupling lives in `App.update`:** changing `assetAllocationPct` recomputes and resets
   the **five** return-composition fields (`eligibleDividendsPct`, `foreignDividendsPct`,
   `realizedGainsPct`, `unrealizedGainsPct`, `interestIncomePct`) via `compositionForAllocation`
   (`foreignWithholdingTaxPct` is independent and not reset); changing `relationshipStatus`
   resets `nzSuperAnnualGross` to the matching rate and toggles `partnerReceivesNZSuper`
   (on for `couple`, off for `single`).
5. **Adding an `Inputs` field — touch all of:** `types.ts` (the interface), `defaults.ts`
   (`NZ_DEFAULTS`), `inputLimits.ts` (`NUMERIC_INPUT_LIMITS` — every numeric key needs an entry),
   a control in `InputsPanel.tsx`, and — for non-number/non-boolean fields (the enums, and
   `lumpSums`) — an explicit branch in `urlState.ts`. Add an `App.update` branch if it should
   trigger a reset, and a `calc.test.ts` case if it changes the maths.
6. **Methodology is deterministic and stays that way.** Returns are fixed percentile scenarios
   (5 bands via sigma multipliers in `SCENARIO_SIGMA`), **not** Monte Carlo — there is no RNG. Do
   not add simulation / sequence-of-returns modelling. If the percentile labelling overstates
   tail risk, fix the wording, not the model.
7. **NZ tax/benefit scope is locked.** NZ Super is universal, not income-tested, taxed as income
   (paid even while working past 65). KiwiSaver + a personal taxable account are the only
   accounts (no CPP/OAS/RRSP/TFSA/RRIF). Portfolio tax drag uses the PIE PIR capped at 28%; no
   NZ CGT. **FIF/FDR is deliberately out of scope** — a PIE already captures foreign-equity tax
   at the right rate for the KiwiSaver/retail-fund majority, so modelling FIF separately would
   double-count; a one-line disclaimer in `AssumptionsNote.tsx` covers direct foreign holders
   over the $50k cost threshold. ESCT, ACC levies and imputation credits are also out of scope.
   A **couple** is a pooled household (combined balances/income) with NZ Super counted for both
   partners, each taxed separately, kept to the planning age (no separate mortality/survivor taper).
8. **NZ figures must be sourced and dated.** The hardcoded values — NZ Super gross rates
   (`nzsuper.ts`), tax brackets/date (`tax.ts`), KiwiSaver govt-contribution rate/cap/income
   limit (`project.ts`) — carry a source and year. Any change must cite the MSD/IRD source and
   year. **Never invent figures.**
9. **Additive discipline:** no change may alter existing outputs for an unchanged scenario; the
   test suite is the regression guard. Engine functions are pure — add a `calc.test.ts` case when
   you change the maths. Estate-comparison tests must use a scenario that actually leaves an
   estate (the default scenario can deplete to zero).
10. `AGENTS.md` is the Codex-facing copy of this guidance — keep the two in sync when you edit
    either.

## Deploy

The Vite **base path is `/retirement-planning-calc/`** (matches the GitHub Pages project path);
keep it in sync with the repo name. CI (`.github/workflows/ci.yml`) runs `npm test` +
`npm run build` on PRs and on pushes to any branch except `main`. Pushes to `main` trigger
`deploy.yml`, which re-tests, builds, and publishes `dist/` to GitHub Pages.
