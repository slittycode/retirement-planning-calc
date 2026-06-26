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

- **Accumulation** (before your retirement age): income grows with wages and feeds KiwiSaver — your contribution, your employer's, and the government contribution (up to $260.72/yr from the 1 July 2025 year, income-tested).
- **Decumulation** (from your retirement age): after-tax NZ Super part-funds your spending; the rest is withdrawn from savings.
- **NZ tax:** capital gains untaxed; dividends and interest taxed annually as a drag — at your PIR (capped 28%) inside KiwiSaver, or your marginal rate in a personal account; foreign withholding tax on foreign dividends.
- **Market scenarios:** a constant return at a chosen percentile (Amazing → Terrible) as a quick stress test — not a Monte Carlo simulation.

**Headline outputs:** whether your money lasts (or the age it runs out), your sustainable yearly spending in today's dollars, your savings peak, and the estate left at your planning age. Two charts: savings over time, and where retirement income comes from each year.

## Tech

React 18 + TypeScript + Vite + Tailwind + Recharts. Browser-only — no backend, accounts, or stored data. Inputs are encoded in the URL, so a scenario is a shareable link.

The calculation engine lives in `src/calc/` as pure, separately tested functions:

- `tax.ts` — NZ income tax, and after-tax returns for taxable vs PIE/KiwiSaver accounts
- `nzsuper.ts` — NZ Super rates and eligibility
- `portfolio.ts` — allocation → return composition, plus the scenario/volatility model
- `project.ts` — the year-by-year accumulation + decumulation projection, and the sustainable-spending search

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
