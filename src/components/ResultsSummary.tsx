import type { ProjectionResult } from '../calc/project'
import { formatNZD, formatPct } from '../format'

interface Props {
  result: ProjectionResult
  sustainableSpending: number
  planningAge: number
}

export default function ResultsSummary({ result, sustainableSpending, planningAge }: Props) {
  const { moneyLasts, depletionAge, peakPortfolio, peakAge, estateAtPlanningReal, totalNZSuperNet } = result

  return (
    <div>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Headline result</p>
        <p className={`mt-1 text-2xl font-bold ${moneyLasts ? 'text-emerald-700' : 'text-amber-700'}`}>
          {moneyLasts
            ? `Your money lasts to age ${planningAge}`
            : `Your savings run out at age ${depletionAge}`}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {moneyLasts
            ? `On these assumptions your savings, plus NZ Super, cover your spending all the way to age ${planningAge}, leaving about ${formatNZD(estateAtPlanningReal)} (in today's dollars).`
            : `On these assumptions your savings are used up at age ${depletionAge}; after that you'd be living on NZ Super alone. Try spending a bit less, retiring later, or saving more.`}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Sustainable spending"
          value={`${formatNZD(sustainableSpending)}/yr`}
          detail="The most you could spend each year (today's dollars) and still reach your planning age."
          tone="emerald"
        />
        <KpiCard
          label="Savings peak"
          value={formatNZD(peakPortfolio)}
          detail={`Highest combined balance, at age ${peakAge}.`}
        />
        <KpiCard
          label={moneyLasts ? 'Estate at plan end' : 'Savings run out'}
          value={moneyLasts ? formatNZD(estateAtPlanningReal) : `Age ${depletionAge}`}
          detail={moneyLasts ? `Left at age ${planningAge}, in today's dollars.` : 'First year savings cannot cover the gap.'}
          tone={moneyLasts ? 'slate' : 'amber'}
        />
        <KpiCard
          label="Lifetime NZ Super"
          value={formatNZD(totalNZSuperNet)}
          detail="Total after-tax NZ Super received (nominal)."
        />
      </dl>
    </div>
  )
}

export function ReturnsSummary({ result }: { result: ProjectionResult }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Assumed returns</h3>
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Stat label="KiwiSaver return after tax" value={formatPct(result.kiwiSaverReturnPct)} />
        <Stat label="Other investments after tax" value={formatPct(result.taxableReturnPct)} />
      </dl>
      <p className="mt-3 text-xs text-slate-500">
        After-tax annual returns implied by your growth/income split and market scenario. KiwiSaver income is taxed at
        your PIR (max 28%); a personal account at your marginal rate. Capital gains are untaxed in NZ.
      </p>
    </div>
  )
}

function KpiCard({
  label,
  value,
  detail,
  tone = 'slate',
}: {
  label: string
  value: string
  detail?: string
  tone?: 'emerald' | 'sky' | 'amber' | 'slate'
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'sky'
        ? 'text-sky-700'
        : tone === 'amber'
          ? 'text-amber-700'
          : 'text-slate-900'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className={`mt-2 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</dd>
      {detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  )
}
