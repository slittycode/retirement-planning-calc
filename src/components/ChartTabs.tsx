import { useState } from 'react'
import type { ProjectionResult } from '../calc/project'
import GrowthOfWealthChart from './GrowthOfWealthChart'
import RetirementIncomeChart from './RetirementIncomeChart'

type ChartTab = 'growth' | 'income'

const TABS: { id: ChartTab; label: string }[] = [
  { id: 'growth', label: 'Savings over time' },
  { id: 'income', label: 'Retirement income' },
]

export default function ChartTabs({ result, retirementAge }: { result: ProjectionResult; retirementAge: number }) {
  const [activeTab, setActiveTab] = useState<ChartTab>('growth')

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Projection charts">
        {TABS.map((tab) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                selected
                  ? 'border-sky-600 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'growth' && <GrowthOfWealthChart result={result} retirementAge={retirementAge} />}
      {activeTab === 'income' && <RetirementIncomeChart result={result} retirementAge={retirementAge} />}
    </section>
  )
}
