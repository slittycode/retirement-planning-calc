import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ProjectionResult } from '../calc/project'
import { formatNZD, formatNZDCompact } from '../format'

export default function RetirementIncomeChart({ result, retirementAge }: { result: ProjectionResult; retirementAge: number }) {
  const data = result.series
    .filter((p) => p.age >= retirementAge)
    .map((p) => ({
      age: p.age,
      'NZ Super': Math.round(p.nzSuperNet),
      'From savings': Math.round(p.portfolioWithdrawal),
      Spending: Math.round(p.spending),
    }))

  return (
    <>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Where retirement income comes from</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="age" tickFormatter={(a) => `${a}`} stroke="#94a3b8" fontSize={12} />
            <YAxis tickFormatter={(v) => formatNZDCompact(Number(v))} stroke="#94a3b8" fontSize={12} width={64} />
            <Tooltip
              formatter={(v) => formatNZD(Number(v))}
              labelFormatter={(a) => `Age ${a}`}
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Legend />
            <Bar dataKey="NZ Super" stackId="income" fill="#34d399" />
            <Bar dataKey="From savings" stackId="income" fill="#38bdf8" />
            <Line type="monotone" dataKey="Spending" stroke="#475569" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Each retirement year, after-tax NZ Super plus withdrawals from savings fund your spending (the line). When the
        bars fall short of the line, savings have run out.
      </p>
    </>
  )
}
