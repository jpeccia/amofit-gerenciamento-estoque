import { TrendingUp, Package, Undo2 } from 'lucide-react'
import { formatBRL, type Summary } from '@/lib/constants'

/**
 * Renders the daily summary header showing overall sales faturamento,
 * stats cards for items and returns, and a proportional breakdown of payment methods.
 *
 * @param props The component properties containing user name and summary metrics.
 * @returns The rendered React element.
 */
export function SummaryHeader({
  userName,
  summary,
}: {
  userName: string
  summary: Summary
}) {
  const firstName = userName?.split(' ')[0] ?? ''
  const pixTotal = summary.paymentBreakdown?.Pix ?? 0
  const cardTotal = summary.paymentBreakdown?.['Cartão'] ?? 0
  const cashTotal = summary.paymentBreakdown?.Dinheiro ?? 0
  const grandTotal = pixTotal + cardTotal + cashTotal

  const pixPct = grandTotal > 0 ? (pixTotal / grandTotal) * 100 : 0
  const cardPct = grandTotal > 0 ? (cardTotal / grandTotal) * 100 : 0
  const cashPct = grandTotal > 0 ? (cashTotal / grandTotal) * 100 : 0

  return (
    <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
      <p className="text-sm text-muted-foreground">
        Olá{firstName ? `, ${firstName}` : ''} 👋
      </p>
      <div className="mt-1 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Vendas de hoje
          </p>
          <p className="font-heading text-4xl font-extrabold tracking-tight text-foreground">
            {formatBRL(summary.totalSales)}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <TrendingUp className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat
          icon={<TrendingUp className="h-4 w-4" />}
          label="Vendas"
          value={String(summary.countSales)}
        />
        <Stat
          icon={<Package className="h-4 w-4" />}
          label="Itens"
          value={String(summary.itemsSold)}
        />
        <Stat
          icon={<Undo2 className="h-4 w-4" />}
          label="Retornos"
          value={String(summary.countReturns)}
        />
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
          Divisão por Pagamento
        </p>

        {grandTotal > 0 ? (
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex mb-3">
            {pixPct > 0 && (
              <div
                style={{ width: `${pixPct}%` }}
                className="bg-primary h-full transition-all duration-300"
              />
            )}
            {cardPct > 0 && (
              <div
                style={{ width: `${cardPct}%` }}
                className="bg-indigo-500 h-full transition-all duration-300"
              />
            )}
            {cashPct > 0 && (
              <div
                style={{ width: `${cashPct}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
              />
            )}
          </div>
        ) : (
          <div className="h-2.5 w-full rounded-full bg-muted mb-3" />
        )}

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Pix: {formatBRL(pixTotal)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-1 font-semibold text-indigo-600 dark:text-indigo-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Cartão: {formatBRL(cardTotal)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Dinheiro: {formatBRL(cashTotal)}
          </span>
        </div>
      </div>
    </section>
  )
}

/**
 * Renders a small stats card metric.
 *
 * @param props The icon, label, and value to render.
 * @returns The rendered React element.
 */
function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/60 py-3">
      <span className="text-primary">{icon}</span>
      <span className="font-heading text-lg font-bold text-brand-purple">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
