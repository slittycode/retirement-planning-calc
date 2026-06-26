import type { Inputs } from '../types'
import { NUMERIC_INPUT_LIMITS, type NumericInputKey } from '../inputLimits'
import { RETURN_SCENARIOS, FUND_TYPES, FUND_TYPE_ORDER, nearestFundType, type FundType } from '../calc/portfolio'
import { RELATIONSHIP_STATUSES } from '../calc/nzsuper'
import { SPENDING_MODES, baseRealSpending } from '../calc/spending'
import { formatNZD } from '../format'
import InputField, { SelectField } from './InputField'
import LumpSumEditor from './LumpSumEditor'

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

const SPENDING_MODE_LABELS: Record<(typeof SPENDING_MODES)[number], string> = {
  fixed: 'A fixed dollar amount',
  percentOfIncome: '% of pre-retirement income',
}

const FUND_TYPE_LABELS: Record<FundType, string> = {
  defensive: 'Defensive',
  conservative: 'Conservative',
  balanced: 'Balanced',
  growth: 'Growth',
  aggressive: 'Aggressive',
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

  const isCouple = inputs.relationshipStatus === 'couple'

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
            tooltip="Sets the NZ Super rate and whether a second entitlement is counted. A couple is modelled as a pooled household."
            options={RELATIONSHIP_STATUSES.map((s) => ({ value: s, label: s === 'single' ? 'Single' : 'Couple' }))}
          />
          {num('currentIncome', isCouple ? 'Household income' : 'Annual income', { prefix: '$', step: 1000, tooltip: 'Gross pay while still working. Drives KiwiSaver contributions and your tax rate.' })}
        </div>
      </div>

      <div className={cardClass}>
        <h3 className={`mb-3 ${headingClass}`}>Spending in retirement</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="Enter spending as"
            value={inputs.spendingMode}
            onChange={(v) => update('spendingMode', v)}
            tooltip="Toggle between a flat dollar amount and a percentage of your final pre-retirement income (a replacement ratio)."
            options={SPENDING_MODES.map((m) => ({ value: m, label: SPENDING_MODE_LABELS[m] }))}
          />
          {inputs.spendingMode === 'fixed' ? (
            num('annualSpending', 'Yearly spending', { prefix: '$', step: 1000, tooltip: "What you'd like to spend each year once retired, in today's dollars." })
          ) : (
            <InputField
              label="Replacement ratio"
              value={inputs.spendingReplacementPct}
              onChange={(v) => update('spendingReplacementPct', v)}
              suffix="%"
              step={5}
              min={NUMERIC_INPUT_LIMITS.spendingReplacementPct.min}
              max={NUMERIC_INPUT_LIMITS.spendingReplacementPct.max}
              tooltip="Spending as a % of your final pre-retirement gross income. Many planners use 60–80%."
            />
          )}
          {num('retirementSpendingDeclinePct', 'Spending changes', { suffix: '%/yr', step: 0.5, tooltip: 'Real change in spending each retirement year. Negative reflects the typical fall in activity with age (the go-go / slow-go / no-go pattern).' })}
        </div>
        {inputs.spendingMode === 'percentOfIncome' && (
          <p className="mt-2 text-xs text-slate-500">≈ {formatNZD(baseRealSpending(inputs))}/yr in today&rsquo;s dollars.</p>
        )}
      </div>

      <details className={cardClass} open>
        <summary className={`cursor-pointer ${headingClass}`}>Savings &amp; KiwiSaver</summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {num('kiwiSaverBalance', isCouple ? 'KiwiSaver (combined)' : 'KiwiSaver balance', { prefix: '$', step: 1000 })}
          {num('taxableBalance', 'Other investments', { prefix: '$', step: 1000, tooltip: 'Savings outside KiwiSaver — managed funds, shares, term deposits.' })}
          {num('kiwiSaverContribPct', 'Your KiwiSaver rate', { suffix: '%', step: 1, tooltip: 'Employee contribution as a % of gross pay (3, 4, 6, 8 or 10%).' })}
          {num('employerContribPct', 'Employer rate', { suffix: '%', step: 0.5, tooltip: 'Employer KiwiSaver contribution, usually 3%.' })}
          {num('annualTaxableSavings', 'Other saving / yr', { prefix: '$', step: 1000, tooltip: 'Amount you add to your non-KiwiSaver investments each working year, in today’s dollars.' })}
        </div>
      </details>

      <details className={cardClass} open>
        <summary className={`cursor-pointer ${headingClass}`}>NZ Superannuation</summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CheckboxField
            label="Include NZ Super"
            checked={inputs.includeNZSuper}
            onChange={(v) => update('includeNZSuper', v)}
          />
          {num('nzSuperAge', 'NZ Super starts at', { suffix: 'yrs', tooltip: 'Eligibility age is currently 65.' })}
          {num('nzSuperAnnualGross', isCouple ? 'NZ Super each (gross/yr)' : 'NZ Super (gross/yr)', { prefix: '$', step: 500, tooltip: 'Approximate gross annual NZ Super per person. Auto-set from your living situation, but editable. It is taxed as income.' })}
          {isCouple && (
            <CheckboxField
              label="Partner also gets NZ Super"
              checked={inputs.partnerReceivesNZSuper}
              onChange={(v) => update('partnerReceivesNZSuper', v)}
              tooltip="Count a second NZ Super entitlement for your partner (taxed separately)."
            />
          )}
          {isCouple && inputs.partnerReceivesNZSuper && num('partnerNzSuperAge', 'Partner NZ Super at', { suffix: 'yrs', tooltip: "The age your partner's NZ Super starts." })}
        </div>
      </details>

      <details className={cardClass}>
        <summary className={`cursor-pointer ${headingClass}`}>Other income</summary>
        <p className="mt-3 text-xs text-slate-500">
          A recurring income on top of NZ Super — a private or defined-benefit pension, part-time work, rental, or an
          annuity.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {num('otherIncomeAnnual', 'Amount / yr', { prefix: '$', step: 1000, tooltip: 'Gross annual amount in today’s dollars. Set to 0 if none.' })}
          {num('otherIncomeStartAge', 'From age', { suffix: 'yrs' })}
          {num('otherIncomeEndAge', 'Until age', { suffix: 'yrs' })}
          <CheckboxField
            label="Taxed as income"
            checked={inputs.otherIncomeTaxable}
            onChange={(v) => update('otherIncomeTaxable', v)}
            tooltip="Tick for a pension or wages; untick for income that reaches you tax-paid."
          />
          <CheckboxField
            label="Rises with inflation"
            checked={inputs.otherIncomeInflationAdjusted}
            onChange={(v) => update('otherIncomeInflationAdjusted', v)}
            tooltip="Tick if the amount keeps pace with inflation; untick for a flat nominal figure."
          />
        </div>
      </details>

      <details className={cardClass}>
        <summary className={`cursor-pointer ${headingClass}`}>One-off events</summary>
        <p className="mt-3 text-xs text-slate-500">
          Windfalls and one-off costs at a particular age — an inheritance, downsizing the home, a big trip, a new car.
        </p>
        <LumpSumEditor
          lumpSums={inputs.lumpSums}
          onChange={(next) => update('lumpSums', next)}
          defaultAge={Math.round(inputs.retirementAge)}
        />
      </details>

      <details className={cardClass}>
        <summary className={`cursor-pointer ${headingClass}`}>Your home</summary>
        <p className="mt-3 text-xs text-slate-500">
          For most retirees the home is the biggest asset. It isn&rsquo;t counted as savings here (you live in it) &mdash;
          only equity you free up by <strong>downsizing</strong> enters the plan, tax-free, at the age you choose. Set the
          amount to 0 if you don&rsquo;t plan to downsize. Rates, insurance and upkeep belong in your spending figure.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {num('homeValue', 'Home value', { prefix: '$', step: 10000, tooltip: 'Roughly what your home is worth today. Used for context and to cap the equity you can release.' })}
          {num('downsizeReleaseAmount', 'Equity released by downsizing', { prefix: '$', step: 10000, tooltip: 'Cash freed up by moving to a cheaper home, in today’s dollars. 0 = not downsizing.' })}
          {num('downsizeAge', 'Downsize at age', { suffix: 'yrs', tooltip: 'The age you plan to downsize and release that equity.' })}
        </div>
        {inputs.downsizeReleaseAmount > inputs.homeValue && (
          <p className="mt-2 text-xs text-amber-700">Equity released is capped at your home value.</p>
        )}
      </details>

      <details className={cardClass} open>
        <summary className={`cursor-pointer ${headingClass}`}>Investment returns</summary>
        <p className="mt-3 text-xs text-slate-500">
          Pick the KiwiSaver fund type that matches yours. It sets the growth/income mix behind the scenes; fine-tune the
          exact split and tax treatment under Advanced if you want.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="Fund type"
            value={nearestFundType(inputs.assetAllocationPct)}
            onChange={(v) => update('assetAllocationPct', FUND_TYPES[v])}
            tooltip="Defensive → Aggressive. Higher growth means higher expected return and more ups and downs."
            options={FUND_TYPE_ORDER.map((t) => ({ value: t, label: `${FUND_TYPE_LABELS[t]} (${FUND_TYPES[t]}% growth)` }))}
          />
          <SelectField
            label="Market scenario"
            value={inputs.returnScenario}
            onChange={(v) => update('returnScenario', v)}
            tooltip="A constant return at a chosen percentile of outcomes — a quick stress test, not a full Monte Carlo."
            options={RETURN_SCENARIOS.map((s) => ({ value: s, label: SCENARIO_LABELS[s] }))}
          />
          {num('feePct', 'Investment fees', { suffix: '%', step: 0.05, tooltip: 'Annual fund fee (MER) as a % of your balance. Comes straight off your return — small differences compound.' })}
          {num('inflationPct', 'Inflation', { suffix: '%', step: 0.1, tooltip: 'Grows spending and NZ Super over time.' })}
          {num('wageGrowthPct', 'Wage growth', { suffix: '%', step: 0.1, tooltip: 'Grows your income (and KiwiSaver contributions) while working.' })}
        </div>

        <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
            Advanced — fine-tune returns &amp; tax
          </summary>
          <p className="mt-3 text-xs text-slate-500">
            Set the exact growth share and the return&rsquo;s tax breakdown. In NZ, capital-gains rows are not taxed;
            dividends and interest are (at your PIR inside KiwiSaver, or your marginal rate in a personal account).
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AllocationSelect value={inputs.assetAllocationPct} onChange={(v) => update('assetAllocationPct', v)} />
            {num('prescribedInvestorRatePct', 'PIR (KiwiSaver)', { suffix: '%', step: 0.5, tooltip: 'Prescribed Investor Rate on KiwiSaver/PIE income, capped at 28%.' })}
            {num('eligibleDividendsPct', 'NZ dividends', { suffix: '%', step: 0.05, tooltip: 'Taxed at your PIR/marginal rate.' })}
            {num('foreignDividendsPct', 'Foreign dividends', { suffix: '%', step: 0.05, tooltip: 'Taxed, with foreign withholding tax applied.' })}
            {num('interestIncomePct', 'Interest income', { suffix: '%', step: 0.05, tooltip: 'Taxed at your PIR/marginal rate.' })}
            {num('realizedGainsPct', 'Realised capital gains', { suffix: '%', step: 0.05, tooltip: 'Not taxed in this simplified NZ model.' })}
            {num('unrealizedGainsPct', 'Unrealised capital gains', { suffix: '%', step: 0.05, tooltip: 'Not taxed in this simplified NZ model.' })}
            {num('foreignWithholdingTaxPct', 'Foreign withholding tax', { suffix: '%', step: 1, tooltip: 'Rate withheld at source on foreign dividends.' })}
          </div>
        </details>
      </details>
    </div>
  )
}

function CheckboxField({
  label,
  checked,
  onChange,
  tooltip,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  tooltip?: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 self-end pb-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
      />
      <span className="flex items-center gap-1 text-sm font-medium text-slate-700">
        {label}
        {tooltip && (
          <span
            title={tooltip}
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600"
          >
            ?
          </span>
        )}
      </span>
    </label>
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
