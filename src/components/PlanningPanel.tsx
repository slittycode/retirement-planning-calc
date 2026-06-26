import type { FundedRatio, SolveResult } from '../calc/solve'
import { formatNZD } from '../format'

interface Props {
  funded: FundedRatio
  requiredSavings: SolveResult
  retireAge: SolveResult
  requiredNumber: number
  currentRetirementAge: number
  planningAge: number
}

/**
 * "What do I need?" — the back-calculations a planner actually asks: am I on
 * track (funded ratio), how much must I save, when can I retire, and what nest
 * egg do I need.
 */
export default function PlanningPanel({
  funded,
  requiredSavings,
  retireAge,
  requiredNumber,
  currentRetirementAge,
  planningAge,
}: Props) {
  const onTrack = funded.ratio >= 1
  const ratioText = funded.ratio === Infinity ? '∞' : `${funded.ratio.toFixed(2)}×`

  const savingText = !requiredSavings.feasible
    ? 'Not enough on its own'
    : requiredSavings.value <= 0
      ? 'None needed'
      : `${formatNZD(requiredSavings.value)}/yr`
  const savingDetail = !requiredSavings.feasible
    ? 'Saving alone can’t close the gap — also consider spending less or retiring later.'
    : requiredSavings.value <= 0
      ? 'Your plan already lasts without extra saving.'
      : 'Extra into your personal account each year (today’s dollars) to make the money last.'

  const ageText = !retireAge.feasible ? `After ${planningAge}` : `Age ${retireAge.value}`
  const ageDetail = !retireAge.feasible
    ? 'Even working longer isn’t enough on these settings — revisit spending or savings.'
    : retireAge.value <= currentRetirementAge
      ? `You could retire as early as ${retireAge.value} and still reach ${planningAge}.`
      : `Earliest age the plan lasts to ${planningAge}; you’ve set ${currentRetirementAge}.`

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">What do I need?</h3>
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-slate-500">Funded ratio</p>
          <p className={`text-2xl font-bold tabular-nums ${onTrack ? 'text-emerald-700' : 'text-amber-700'}`}>{ratioText}</p>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {onTrack
            ? `You're on track — your resources cover about ${ratioText} of what retirement will cost.`
            : `There's a gap — your resources cover about ${ratioText} of what retirement will cost.`}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Present value of assets {formatNZD(funded.pvAssets)} vs spending needs {formatNZD(funded.pvLiabilities)} (today&rsquo;s
          dollars, discounted at your expected after-tax return). 1.00× or more means fully funded.
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PlanCard label="Extra saving needed" value={savingText} detail={savingDetail} tone={requiredSavings.value > 0 ? 'amber' : 'emerald'} />
        <PlanCard label="Earliest retirement" value={ageText} detail={ageDetail} />
        <PlanCard
          label="Your number"
          value={formatNZD(requiredNumber)}
          detail="Nest egg needed at retirement (today’s dollars) to fund this spending."
        />
      </dl>
    </div>
  )
}

function PlanCard({
  label,
  value,
  detail,
  tone = 'slate',
}: {
  label: string
  value: string
  detail: string
  tone?: 'emerald' | 'amber' | 'slate'
}) {
  const toneClass = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-900'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className={`mt-2 text-xl font-bold tabular-nums ${toneClass}`}>{value}</dd>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  )
}
