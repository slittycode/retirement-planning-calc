interface Props {
  marginalRatePct: number
  prescribedInvestorRatePct: number
}

export default function AssumptionsNote({ marginalRatePct, prescribedInvestorRatePct }: Props) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <summary className="cursor-pointer font-semibold text-slate-700">How this works &amp; key assumptions</summary>
      <div className="mt-3 space-y-3 text-slate-600">
        <p>
          This adapts PWL Capital&rsquo;s retirement-planning approach for New&nbsp;Zealand. The Canadian building
          blocks are swapped for their NZ equivalents: <strong>CPP/OAS &rarr; NZ&nbsp;Superannuation</strong>,{' '}
          <strong>RRSP/TFSA &rarr; KiwiSaver and a personal investment account</strong>, and provincial tax becomes a
          single national income tax.
        </p>
        <p>
          <strong>The projection.</strong> Year by year, from your current age to your planning age. While you work,
          income grows with wages and feeds KiwiSaver (your contribution, your employer&rsquo;s, and the government
          contribution up to {`$521`}/yr). In retirement, after-tax NZ&nbsp;Super part-funds your spending and the rest
          is withdrawn from savings &mdash; the personal account first, then KiwiSaver.
        </p>
        <p>
          <strong>NZ&nbsp;Superannuation.</strong> A flat, universal pension from age&nbsp;65. Unlike Canada&rsquo;s
          OAS it is not income- or asset-tested, so other income doesn&rsquo;t claw it back. The amount depends on your
          living situation and is taxed as income. The default figure is an approximate gross 2025 rate &mdash; check
          the current MSD rate and edit it.
        </p>
        <p>
          <strong>NZ tax on investments.</strong> Capital gains (realised and unrealised) are{' '}
          <strong>not taxed</strong>, and there is no tax on the withdrawal event itself &mdash; unlike a Canadian RRSP.
          Dividends and interest are taxed annually as a drag: inside KiwiSaver (a PIE) at your PIR (
          {prescribedInvestorRatePct.toFixed(0)}%, capped at 28%); in a personal account at your marginal rate (
          {marginalRatePct.toFixed(1)}%). Because withdrawals aren&rsquo;t taxed, the order you draw accounts in barely
          matters in NZ &mdash; which is why PWL&rsquo;s Canadian &ldquo;compare withdrawal strategies&rdquo; tab is
          omitted here.
        </p>
        <p>
          <strong>Caveats.</strong> Chart dollars are nominal; the headline &ldquo;sustainable spending&rdquo; and
          &ldquo;estate&rdquo; figures are in today&rsquo;s dollars. Returns are a smooth average (or a single chosen
          percentile under &ldquo;market scenario&rdquo;), not a Monte&nbsp;Carlo simulation, so real sequence-of-returns
          risk isn&rsquo;t captured. FIF/FDR rules on foreign shares, ESCT on employer KiwiSaver contributions, ACC
          levies, partners modelled separately, and any private/defined-benefit pension are not included. This is an
          educational tool to aid thinking, not financial advice.
        </p>
        <p>
          <strong>Privacy.</strong> Everything runs in your browser &mdash; no backend, accounts, or stored data. The
          share link puts your inputs in the URL, so anyone with the link can see the values you entered.
        </p>
      </div>
    </details>
  )
}
