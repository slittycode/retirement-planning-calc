import type { Inputs } from '../types'
import { NUMERIC_INPUT_LIMITS, type NumericInputKey } from '../inputLimits'
import { RETURN_SCENARIOS } from '../calc/portfolio'
import { RELATIONSHIP_STATUSES } from '../calc/nzsuper'
import InputField, { SelectField } from './InputField'

interface Props {
  inputs: Inputs
  update: <K extends keyof Inputs>(key: K, value: Inputs[K]) => void
}

const cardClass = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'
const headingClass = 'text-sm font-semibold uppercase tracking-wide text-slate-500'

const ALLOCATION_PRESETS = Array.from({ length: 21 }, (_, i) => i * 5)

const SCENARIO_LABELS: Record<(typeof RETURN_SCENARIOS)[number], string> = {
  amazing: 'Amazing (top 10%)',
  great: 'Great (top 30%)',
  expected: 'Expected (average)',
  bad: 'Bad (bottom 30%)',
  terrible: 'Terrible (bottom 10%)',
}

export default function InputsPanel({ inputs, update }: Props) {
  function num(key: NumericInputKey, label: string, opts: { prefix?: string; suffix?: string; step?: number; tooltip?: string } = {}) {
    const limits = NUMERIC_INPUT_LIMITS[key]
    return (
      <InputField
        label={label}
        value={inputs[key]}
        onChange={(v) => update(key, v)}
        prefix={opts.prefix}
        suffix={opts.suffix}
        step={opts.step}
        min={limits.min}
        max={limits.max}
        tooltip={opts.tooltip}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className={cardClass}>
        <h3 className={`mb-3 ${headingClass}`}>About you</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {num('currentAge', 'Current age', { suffix: 'yrs' })}
          {num('retirementAge', 'Retirement age', { suffix: 'yrs', tooltip: 'The age you stop working and start drawing on savings.' })}
          {num('planningAge', 'Plan until age', { suffix: 'yrs', tooltip: 'How long the plan should last — roughly your life expectancy.' })}
          <SelectField
            label="Living situation"
            value={inputs.relationshipStatus}
            onChange={(v) => update('relationshipStatus', v)}
            tooltip="Sets the NZ Super rate. Single (living alone) gets more than each person in a couple."
            options={RELATIONSHIP_STATUSES.map((s) => ({ value: s, label: s === 'single' ? 'Single' : 'Couple' }))}
          />
          {num('currentIncome', 'Annual income', { prefix: '$', step: 1000, tooltip: 'Gross pay while still working. Drives KiwiSaver contributions and your tax rate.' })}
          {num('annualSpending', 'Yearly spending in retirement', { prefix: '$', step: 1000, tooltip: "What you'd like to spend each year once retired, in today's dollars." })}
        </div>
      </div>

      <details className={cardClass} open>
        <summary className={`cursor-pointer ${headingClass}`}>Savings &amp; KiwiSaver</summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {num('kiwiSaverBalance', 'KiwiSaver balance', { prefix: '$', step: 1000 })}
          {num('taxableBalance', 'Other investments', { prefix: '$', step: 1000, tooltip: 'Savings outside KiwiSaver — managed funds, shares, term deposits.' })}
          {num('kiwiSaverContribPct', 'Your KiwiSaver rate', { suffix: '%', step: 1, tooltip: 'Employee contribution as a % of gross pay (3, 4, 6, 8 or 10%).' })}
          {num('employerContribPct', 'Employer rate', { suffix: '%', step: 0.5, tooltip: 'Employer KiwiSaver contribution, usually 3%.' })}
        </div>
      </details>

      <details className={cardClass} open>
        <summary className={`cursor-pointer ${headingClass}`}>NZ Superannuation</summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 self-end pb-1.5">
            <input
              type="checkbox"
              checked={inputs.includeNZSuper}
              onChange={(e) => update('includeNZSuper', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm font-medium text-slate-700">Include NZ Super</span>
          </label>
          {num('nzSuperAge', 'NZ Super starts at', { suffix: 'yrs', tooltip: 'Eligibility age is currently 65.' })}
          {num('nzSuperAnnualGross', 'NZ Super (gross/yr)', { prefix: '$', step: 500, tooltip: 'Approximate gross annual NZ Super. Auto-set from your living situation, but editable. It is taxed as income.' })}
        </div>
      </details>

      <details className={cardClass} open>
        <summary className={`cursor-pointer ${headingClass}`}>Investment returns</summary>
        <p className="mt-3 text-xs text-slate-500">
          Returns come from your growth/income split. In NZ, capital-gains rows are not taxed; dividends and interest
          are (at your PIR inside KiwiSaver, or your marginal rate in a personal account).
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AllocationSelect value={inputs.assetAllocationPct} onChange={(v) => update('assetAllocationPct', v)} />
          <SelectField
            label="Market scenario"
            value={inputs.returnScenario}
            onChange={(v) => update('returnScenario', v)}
            tooltip="A constant return at a chosen percentile of outcomes — a quick stress test, not a full Monte Carlo."
            options={RETURN_SCENARIOS.map((s) => ({ value: s, label: SCENARIO_LABELS[s] }))}
          />
          {num('inflationPct', 'Inflation', { suffix: '%', step: 0.1, tooltip: 'Grows spending and NZ Super over time.' })}
          {num('wageGrowthPct', 'Wage growth', { suffix: '%', step: 0.1, tooltip: 'Grows your income (and KiwiSaver contributions) while working.' })}
          {num('prescribedInvestorRatePct', 'PIR (KiwiSaver)', { suffix: '%', step: 0.5, tooltip: 'Prescribed Investor Rate on KiwiSaver/PIE income, capped at 28%.' })}
          {num('eligibleDividendsPct', 'NZ dividends', { suffix: '%', step: 0.05, tooltip: 'Taxed at your PIR/marginal rate.' })}
          {num('foreignDividendsPct', 'Foreign dividends', { suffix: '%', step: 0.05, tooltip: 'Taxed, with foreign withholding tax applied.' })}
          {num('interestIncomePct', 'Interest income', { suffix: '%', step: 0.05, tooltip: 'Taxed at your PIR/marginal rate.' })}
          {num('realizedGainsPct', 'Realised capital gains', { suffix: '%', step: 0.05, tooltip: 'Not taxed in this simplified NZ model.' })}
          {num('unrealizedGainsPct', 'Unrealised capital gains', { suffix: '%', step: 0.05, tooltip: 'Not taxed in this simplified NZ model.' })}
          {num('foreignWithholdingTaxPct', 'Foreign withholding tax', { suffix: '%', step: 1, tooltip: 'Rate withheld at source on foreign dividends.' })}
        </div>
      </details>
    </div>
  )
}

function AllocationSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const options = ALLOCATION_PRESETS.includes(value) ? ALLOCATION_PRESETS : [...ALLOCATION_PRESETS, value].sort((a, b) => a - b)
  return (
    <label className="block">
      <span className="flex items-center gap-1 text-sm font-medium text-slate-700">
        Growth assets
        <span
          title="Share in growth assets (shares/property funds); the rest is income assets (bonds/cash). Changing this resets the return mix below."
          className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600"
        >
          ?
        </span>
      </span>
      <select
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      >
        {options.map((n) => (
          <option key={n} value={String(n)}>
            {n}% growth{!ALLOCATION_PRESETS.includes(n) ? ' (custom)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
