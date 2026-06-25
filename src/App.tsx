import { useEffect, useMemo, useState } from 'react'
import type { Inputs } from './types'
import { NZ_DEFAULTS } from './defaults'
import { project, sustainableSpending } from './calc/project'
import { marginalRate } from './calc/tax'
import { compositionForAllocation } from './calc/portfolio'
import { NZ_SUPER_GROSS_ANNUAL } from './calc/nzsuper'
import { decodeInputs, encodeInputs } from './state/urlState'
import InputsPanel from './components/InputsPanel'
import ResultsSummary, { ReturnsSummary } from './components/ResultsSummary'
import ChartTabs from './components/ChartTabs'
import AssumptionsNote from './components/AssumptionsNote'

export default function App() {
  const [inputs, setInputs] = useState<Inputs>(() => decodeInputs(window.location.search))
  const [copied, setCopied] = useState(false)

  // Mirror inputs into the URL so a scenario is a shareable link.
  useEffect(() => {
    const id = setTimeout(() => {
      const qs = encodeInputs(inputs)
      window.history.replaceState(null, '', `${window.location.pathname}?${qs}`)
    }, 250)
    return () => clearTimeout(id)
  }, [inputs])

  const result = useMemo(() => project(inputs), [inputs])
  const sustainable = useMemo(() => sustainableSpending(inputs), [inputs])

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((prev) => {
      // Changing the allocation resets the return-composition fields to match.
      if (key === 'assetAllocationPct') {
        return { ...prev, assetAllocationPct: value as number, ...compositionForAllocation(value as number) }
      }
      // Changing living situation resets NZ Super to the matching default rate.
      if (key === 'relationshipStatus') {
        const status = value as Inputs['relationshipStatus']
        return { ...prev, relationshipStatus: status, nzSuperAnnualGross: NZ_SUPER_GROSS_ANNUAL[status] }
      }
      return { ...prev, [key]: value }
    })
  }

  function reset() {
    setInputs(NZ_DEFAULTS)
  }

  async function copyLink() {
    const qs = encodeInputs(inputs)
    const shareUrl = `${window.location.origin}${window.location.pathname}?${qs}`
    window.history.replaceState(null, '', `${window.location.pathname}?${qs}`)
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <h1 className="text-xl font-bold sm:text-2xl">Retirement Planning — New Zealand</h1>
          <p className="mt-1 text-sm text-slate-600">
            Project your savings through retirement with NZ Super, KiwiSaver and NZ tax. See whether your money lasts and
            how much you can comfortably spend.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="order-1 lg:order-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your details</h2>
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <button
                onClick={reset}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>
          <InputsPanel inputs={inputs} update={update} />
        </section>

        <section className="order-2 space-y-5 lg:order-1">
          <ResultsSummary result={result} sustainableSpending={sustainable} planningAge={Math.round(inputs.planningAge)} />
          <ChartTabs result={result} retirementAge={Math.round(inputs.retirementAge)} />
          <div className="space-y-5 pt-1">
            <ReturnsSummary result={result} />
            <AssumptionsNote
              marginalRatePct={marginalRate(inputs.currentIncome) * 100}
              prescribedInvestorRatePct={inputs.prescribedInvestorRatePct}
            />
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-slate-400">
        Educational tool — not financial advice. NZ Super rates and tax rules are simplified and change yearly; check
        current figures and talk to a professional before deciding.
      </footer>
    </div>
  )
}
