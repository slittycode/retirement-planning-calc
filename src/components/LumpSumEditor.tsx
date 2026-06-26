import type { LumpSum, LumpSumKind } from '../calc/cashflows'

interface Props {
  lumpSums: LumpSum[]
  onChange: (next: LumpSum[]) => void
  defaultAge: number
}

/**
 * Editable list of one-off cashflows — windfalls (inheritance, downsizing the
 * home) and one-off costs (a big trip, a new car, a roof). Amounts are today's
 * dollars; the projection inflates them to the chosen age.
 */
export default function LumpSumEditor({ lumpSums, onChange, defaultAge }: Props) {
  function patch(index: number, change: Partial<LumpSum>) {
    onChange(lumpSums.map((ls, i) => (i === index ? { ...ls, ...change } : ls)))
  }
  function add() {
    onChange([...lumpSums, { age: defaultAge, amount: 10_000, kind: 'expense' }])
  }
  function remove(index: number) {
    onChange(lumpSums.filter((_, i) => i !== index))
  }

  return (
    <div className="mt-3 space-y-2">
      {lumpSums.length === 0 && (
        <p className="text-xs text-slate-500">
          No one-off events yet. Add a windfall (inheritance, downsizing) or a one-off cost (travel, a new car, home
          repairs).
        </p>
      )}

      {lumpSums.map((ls, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <label className="flex flex-col text-xs text-slate-500">
            <span className="mb-0.5">Kind</span>
            <select
              value={ls.kind}
              onChange={(e) => patch(i, { kind: e.target.value as LumpSumKind })}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
            >
              <option value="income">Money in</option>
              <option value="expense">Money out</option>
            </select>
          </label>
          <label className="flex flex-col text-xs text-slate-500">
            <span className="mb-0.5">At age</span>
            <input
              type="number"
              inputMode="numeric"
              value={ls.age}
              min={0}
              max={110}
              onChange={(e) => patch(i, { age: Math.round(Number(e.target.value) || 0) })}
              className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-sky-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          </label>
          <label className="flex flex-1 flex-col text-xs text-slate-500">
            <span className="mb-0.5">Amount (today&rsquo;s $)</span>
            <div className="flex items-center rounded-md border border-slate-300 bg-white focus-within:border-sky-500">
              <span className="pl-2 text-sm text-slate-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={ls.amount}
                min={0}
                step={1000}
                onChange={(e) => patch(i, { amount: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full min-w-[5rem] bg-transparent px-2 py-1 text-sm text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </label>
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label="Remove event"
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        + Add one-off event
      </button>
    </div>
  )
}
