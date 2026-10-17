'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Package, Undo2, Eye, EyeOff } from 'lucide-react'
import { formatBRL, type Summary } from '@/lib/constants'

const BALANCE_VISIBILITY_KEY = 'amofit_show_balance'

interface SummaryHeaderProps {
  userName: string
  summary: Summary
}

interface PaymentBreakdownProps {
  paymentBreakdown?: Record<string, number>
  isVisible: boolean
}

interface PendingDebtsBannerProps {
  totalPending: number
  isVisible: boolean
}

interface StatProps {
  icon: React.ReactNode
  label: string
  value: string
}

/**
 * Formats a monetary amount into BRL currency or a masked string.
 *
 * @param amount The numerical amount to format.
 * @param isVisible Flag indicating if the real value should be shown.
 * @returns The formatted BRL string or a masked representation.
 */
function formatOrMask(amount: number, isVisible: boolean): string {
  return isVisible ? formatBRL(amount) : '••••••'
}

/**
 * Hook to manage persistent visibility state for sensitive balance metrics.
 *
 * @returns An object containing the visibility boolean and a toggle function.
 */
function useBalanceVisibility() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem(BALANCE_VISIBILITY_KEY)
    if (saved !== null) {
      setIsVisible(saved === 'true')
    }
  }, [])

  const toggleVisibility = () => {
    setIsVisible((previousState) => {
      const nextState = !previousState
      try {
        localStorage.setItem(BALANCE_VISIBILITY_KEY, String(nextState))
      } catch {}
      return nextState
    })
  }

  return { isVisible, toggleVisibility }
}

/**
 * Renders an alert banner when there are pending receivables.
 *
 * @param props Contains the total pending amount and visibility state.
 * @returns The rendered React element or null.
 */
function PendingDebtsBanner({ totalPending, isVisible }: PendingDebtsBannerProps) {
  if (totalPending <= 0) return null

  return (
    <div className="mt-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
      <div className="flex items-center gap-2 font-semibold">
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
        <span>A receber (Fiados):</span>
      </div>
      <span className="font-heading font-extrabold text-sm text-amber-600 dark:text-amber-500">
        {formatOrMask(totalPending, isVisible)}
      </span>
    </div>
  )
}

/**
 * Renders a visual percentage bar and badge summary for payment methods.
 *
 * @param props Payment breakdown values and visibility flag.
 * @returns The rendered React element.
 */
function PaymentBreakdown({ paymentBreakdown, isVisible }: PaymentBreakdownProps) {
  const pixTotal = paymentBreakdown?.Pix ?? 0
  const cardTotal = paymentBreakdown?.['Cartão'] ?? 0
  const cashTotal = paymentBreakdown?.Dinheiro ?? 0
  const grandTotal = pixTotal + cardTotal + cashTotal

  const pixPct = grandTotal > 0 ? (pixTotal / grandTotal) * 100 : 0
  const cardPct = grandTotal > 0 ? (cardTotal / grandTotal) * 100 : 0
  const cashPct = grandTotal > 0 ? (cashTotal / grandTotal) * 100 : 0

  return (
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
          Pix: {formatOrMask(pixTotal, isVisible)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-1 font-semibold text-indigo-600 dark:text-indigo-400">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Cartão: {formatOrMask(cardTotal, isVisible)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Dinheiro: {formatOrMask(cashTotal, isVisible)}
        </span>
      </div>
    </div>
  )
}

/**
 * Renders a small stats card metric.
 *
 * @param props The icon, label, and value to render.
 * @returns The rendered React element.
 */
function Stat({ icon, label, value }: StatProps) {
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

/**
 * Renders the daily summary header showing overall sales faturamento,
 * stats cards for items and returns, and a proportional breakdown of payment methods.
 * Provides an interactive toggle to hide or reveal balance values.
 *
 * @param props The component properties containing user name and summary metrics.
 * @returns The rendered React element.
 */
export function SummaryHeader({ userName, summary }: SummaryHeaderProps) {
  const firstName = userName?.split(' ')[0] ?? ''
  const { isVisible, toggleVisibility } = useBalanceVisibility()

  return (
    <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
      <p className="text-sm text-muted-foreground">
        Olá{firstName ? `, ${firstName}` : ''} 👋
      </p>

      <div className="mt-1 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              Vendas Totais
            </p>
            <button
              type="button"
              onClick={toggleVisibility}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              title={isVisible ? 'Ocultar saldo' : 'Visualizar saldo'}
              aria-label={isVisible ? 'Ocultar saldo' : 'Visualizar saldo'}
            >
              {isVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="font-heading text-4xl font-extrabold tracking-tight text-foreground transition-all duration-200">
            {formatOrMask(summary.totalSales, isVisible)}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <TrendingUp className="h-6 w-6" />
        </div>
      </div>

      <PendingDebtsBanner
        totalPending={summary.totalPending}
        isVisible={isVisible}
      />

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

      <PaymentBreakdown
        paymentBreakdown={summary.paymentBreakdown}
        isVisible={isVisible}
      />
    </section>
  )
}
