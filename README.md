# Retirement Planning Calculator — New Zealand

A retirement projection inspired by [PWL Capital's retirement planning tool](https://research-tools.pwlcapital.com/research/retirement), **localised for New Zealand**. It projects your savings year by year from today through retirement, so you can see whether your money lasts, how much you can sustainably spend, and where your retirement income comes from.

It is the sibling of the [rent-vs-buy-calc](https://github.com/slittycode/rent-vs-buy-calc) fork, built the same way: a faithful reimplementation of PWL's methodology with the Canadian tax and benefits machinery swapped for NZ's.

**Live:** https://slittycode.github.io/retirement-planning-calc/

> Educational tool — not financial advice. NZ Super rates and tax rules are simplified and change every year; check current figures and talk to a professional before deciding.

## Canada → New Zealand

PWL's tool is built around Canadian retirement plumbing. This fork replaces each piece with its NZ equivalent:

| PWL (Canada) | This fork (New Zealand) |
| --- | --- |
| CPP + OAS government pensions | **NZ Superannuation** — flat, universal, from age 65, not income- or asset-tested |
| RRSP (taxed on withdrawal) + TFSA (tax-free) | **KiwiSaver** (a PIE) + a **personal investment account** |
| Provincial + federal income tax | Single **NZ income tax** schedule (1 April 2025 brackets) |
| Capital gains tax on withdrawal | **No CGT**, and no tax on the withdrawal event |
| FP Canada mortality tables | A simple "plan until age" (your life expectancy) |
| "Compare withdrawal strategies" optimiser | **Omitted** — see below |

**Why the withdrawal-strategy optimiser is gone.** In Canada, the order you draw down RRSP vs TFSA vs taxable accounts matters a lot because RRSP withdrawals are fully taxed and TFSA withdrawals are tax-free. In NZ, both KiwiSaver (a PIE) and a personal account are taxed on the income *within* the fund each year, and the withdrawal itself is not a taxable event — so drawdown order has only a second-order effect. The tool draws the personal account first, then KiwiSaver, and notes the simplification rather than shipping a Canadian-shaped optimiser that wouldn't earn its keep here.

## What it models

- **Accumulation** (before your retirement age): income grows with wages and feeds KiwiSaver — your contribution, your employer's, and the government contribution (25c per $1, up to $260.72/yr on the post-July-2025 rules, income-tested). Anything you set aside as "other saving" builds your personal account.
- **Decumulation** (from your retirement age): after-tax NZ Super and any other income part-fund your spending; the rest is withdrawn from savings. Investment fees come straight off the return.
- **Spending, two ways:** a fixed today's-dollar amount, or a percentage of your final pre-retirement income (a replacement ratio). Real spending can also drift with age (the go-go / slow-go / no-go pattern), and one-off events — windfalls (inheritance, downsizing) and costs (travel, a car, the roof) — land at the age you choose.
- **Couples:** modelled as a pooled household with combined balances and income, but NZ Super counted for **both** partners (each taxed separately).
- **Other income:** a recurring private/defined-benefit pension, part-time work, rental, or annuity, with its own age window and tax treatment.
- **Your home:** not counted as a spendable asset (you live in it) — only the equity you free up by **downsizing** enters the plan, tax-free, at the age you choose. Running costs and reverse mortgages aren't modelled.
- **Investment returns:** pick your **KiwiSaver fund type** (Defensive → Aggressive); the exact growth/income split and the return's tax breakdown sit behind an Advanced toggle. NZ tax: capital gains untaxed; dividends and interest taxed annually as a drag — at your PIR (capped 28%) inside KiwiSaver, or your marginal rate in a personal account; foreign withholding tax on foreign dividends.
- **Market scenarios:** a constant return at a chosen percentile (Amazing → Terrible) as a quick stress test — not a Monte Carlo simulation.

**Headline outputs:** whether your money lasts (or the age it runs out), your sustainable yearly spending, your savings peak, and the estate left at your planning age.

**Back-calculations ("what do I need?"):** the extra you'd need to save each year, the earliest age you could retire, the nest egg ("your number") needed at retirement, and a **funded ratio** — the present value of everything that can pay for retirement over everything it must pay for, discounted at your expected after-tax return; 1.00× or more means on track.

Two charts (toggle nominal / today's dollars): savings over time, and where retirement income comes from each year.

## Tech

React 18 + TypeScript + Vite + Tailwind + Recharts. Browser-only — no backend, accounts, or stored data. Inputs are encoded in the URL, so a scenario is a shareable link.

The calculation engine lives in `src/calc/` as pure, separately tested functions:

- `tax.ts` — NZ income tax, and after-tax returns for taxable vs PIE/KiwiSaver accounts
- `nzsuper.ts` — NZ Super rates and eligibility
- `portfolio.ts` — allocation → return composition, plus the scenario/volatility model
- `spending.ts` — the spending model: fixed vs % of income, and the age-related decline
- `cashflows.ts` — other income and one-off lump sums (windfalls / costs)
- `project.ts` — the year-by-year accumulation + decumulation projection
- `solve.ts` — the back-calculations (sustainable spend, required saving, retirement age, "your number") and the funded ratio

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/retirement-planning-calc/
npm test           # vitest
npm run build      # tsc --noEmit && vite build
npm run preview
```

## Deploy

Pushes to `main` build and publish to GitHub Pages via `.github/workflows/deploy.yml` (one-time setup: Settings → Pages → Source: GitHub Actions). The Vite `base` is `/retirement-planning-calc/`.

## Attribution

Methodology inspired by PWL Capital's retirement tool (Ben Felix & Braden Warwick). This is an independent reimplementation localised for New Zealand; it is not affiliated with or endorsed by PWL Capital.
