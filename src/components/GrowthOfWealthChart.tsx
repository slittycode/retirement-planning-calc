import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ProjectionResult } from '../calc/project'
import { formatNZD, formatNZDCompact } from '../format'

export default function GrowthOfWealthChart({
  result,
  retirementAge,
  real = false,
}: {
  result: ProjectionResult
  retirementAge: number
  real?: boolean
}) {
  const data = result.series.map((p) => {
    const f = real ? p.inflationFactor : 1
    return {
      age: p.age,
      KiwiSaver: Math.round(p.kiwiSaver / f),
      'Other investments': Math.round(p.taxable / f),
    }
  })

  return (
    <>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Savings over time</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="age" tickFormatter={(a) => `${a}`} stroke="#94a3b8" fontSize={12} />
            <YAxis tickFormatter={(v) => formatNZDCompact(Number(v))} stroke="#94a3b8" fontSize={12} width={64} />
            <Tooltip
              formatter={(v) => formatNZD(Number(v))}
              labelFormatter={(a) => `Age ${a}`}
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Legend />
            <ReferenceLine
              x={retirementAge}
              stroke="#a3a3a3"
              strokeDasharray="4 4"
              label={{ value: 'Retire', fontSize: 11, fill: '#737373', position: 'insideTopLeft' }}
            />
            <Area type="monotone" dataKey="KiwiSaver" stackId="1" stroke="#059669" fill="#a7f3d0" strokeWidth={2} />
            <Area type="monotone" dataKey="Other investments" stackId="1" stroke="#0284c7" fill="#bae6fd" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Total savings (KiwiSaver + other investments) by age, in {real ? "today’s dollars" : 'nominal dollars'}. Balances
        build while you work, then are drawn down in retirement to top up NZ Super and any other income.
      </p>
    </>
  )
}
