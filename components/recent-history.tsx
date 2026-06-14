'use client'

import { useTransition, useMemo } from 'react'
import { RotateCcw, ShoppingBag, Undo2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { formatBRL, type Movement } from '@/lib/constants'

/**
 * Format a Date object or timestamp to a time string (HH:MM).
 *
 * @param date The date to format.
 * @returns The formatted time string.
 */
function formatTimeOnly(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/**
 * Renders the daily history of actions (sales, returns, and restocks) with option to undo or collect payments.
 * Shows only the last 5 actions recorded on the current day.
 *
 * @param props The component properties containing movements, undo callbacks, and payment collection callbacks.
 * @returns The rendered React element.
 */
export function RecentHistory({
  movements,
  onUndoMovement,
  onMarkSaleAsPaid,
}: {
  movements: Movement[]
  onUndoMovement: (movementId: number) => Promise<void>
  onMarkSaleAsPaid: (movementId: number) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()

  const dailyMovements = useMemo(() => {
    const today = new Date()
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime()
    const todayEnd = todayStart + 24 * 60 * 60 * 1000

    return movements
      .filter((m) => {
        const time = new Date(m.createdAt).getTime()
        return time >= todayStart && time < todayEnd
      })
      .slice(0, 5)
  }, [movements])

  if (dailyMovements.length === 0) {
    return (
      <section className="mt-6">
        <h2 className="mb-3 font-heading text-lg font-bold text-brand-purple">
          Histórico Recente do Dia
        </h2>
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma ação realizada hoje
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-6">
      <h2 className="mb-3 font-heading text-lg font-bold text-brand-purple">
        Histórico Recente do Dia
      </h2>
      <ul className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
        {dailyMovements.map((m, i) => {
          const formattedTime = formatTimeOnly(m.createdAt)

          let iconElement = null
          let iconClass = ''

          if (m.type === 'sale') {
            iconElement = <ShoppingBag className="h-4 w-4" />
            iconClass = 'bg-primary/10 text-primary'
          } else if (m.type === 'return') {
            iconElement = <Undo2 className="h-4 w-4 text-brand-purple" />
            iconClass = 'bg-accent text-accent-foreground'
          } else if (m.type === 'restock') {
            iconElement = <Package className="h-4 w-4" />
            iconClass =
              'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
          }

          return (
            <li
              key={m.id}
              className={`flex items-center justify-between gap-4 p-4 ${
                i !== 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
                >
                  {iconElement}
                </span>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-foreground min-w-0">
                  <span className="truncate">
                    {m.type === 'sale'
                      ? 'Venda:'
                      : m.type === 'return'
                      ? 'Retorno:'
                      : 'Entrada:'}{' '}
                    {m.quantity}x {m.productName} {m.size}
                  </span>
                  {m.color && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-semibold">
                      {m.color}
                    </span>
                  )}
                  {m.type === 'sale' && m.installments && m.installments > 1 && (
                    <span className="text-xs text-muted-foreground font-normal">
                      ({m.installments}x)
                    </span>
                  )}
                  {m.type === 'sale' && m.customerName && (
                    <span className="text-xs text-brand-purple font-extrabold dark:text-indigo-400">
                      [{m.customerName}]
                    </span>
                  )}
                  <span className="text-primary font-black shrink-0">
                    {m.type === 'sale'
                      ? formatBRL(Number(m.total))
                      : m.type === 'return'
                      ? 'Retorno'
                      : `+${m.quantity} un.`}
                  </span>
                  {m.type === 'sale' && (
                    <span className="text-xs text-muted-foreground font-normal">
                      ({m.paymentMethod})
                    </span>
                  )}
                  {m.type === 'sale' && m.paymentStatus === 'pending' && (
                    <span className="text-[9px] uppercase tracking-wider font-black bg-amber-500/15 text-amber-600 border border-amber-500/25 px-1.5 py-0.5 rounded-full animate-pulse dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-500/10">
                      Pendente
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground font-normal shrink-0">
                    às {formattedTime}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {m.type === 'sale' && m.paymentStatus === 'pending' && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          await onMarkSaleAsPaid(m.id)
                          toast.success('Pagamento recebido com sucesso!')
                        } catch {
                          toast.error('Erro ao registrar recebimento')
                        }
                      })
                    }}
                    className="flex items-center text-xs font-extrabold bg-amber-500 text-white hover:bg-amber-600 px-3 py-1.5 rounded-xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer dark:bg-amber-600 dark:hover:bg-amber-700"
                    aria-label={`Marcar venda de ${m.productName} como paga`}
                  >
                    Receber
                  </button>
                )}

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await onUndoMovement(m.id)
                        toast.success('Ação desfeita com sucesso')
                      } catch {
                        toast.error('Erro de conexão ao desfazer ação')
                      }
                    })
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-50 shrink-0 p-1.5 rounded-md transition-colors cursor-pointer"
                  aria-label={`Desfazer ação de ${m.productName}`}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Desfazer</span>
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
