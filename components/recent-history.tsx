'use client'

import { useTransition } from 'react'
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
 * Renders the daily history of actions (sales, returns, and restocks) with an option to undo them.
 * Shows only the last 5 actions recorded on the current day.
 * Headings are styled in deep brand purple.
 *
 * @param props The component properties containing the recent movements list and undo callback.
 * @returns The rendered React element.
 */
export function RecentHistory({
  movements,
  onUndoMovement,
}: {
  movements: Movement[]
  onUndoMovement: (movementId: number) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()

  const today = new Date()
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime()
  const todayEnd = todayStart + 24 * 60 * 60 * 1000

  const dailyMovements = movements
    .filter((m) => {
      const time = new Date(m.createdAt).getTime()
      return time >= todayStart && time < todayEnd
    })
    .slice(0, 5)

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

          let messageText = ''
          let iconElement = null
          let iconClass = ''

          if (m.type === 'sale') {
            messageText = `Venda: ${m.quantity}x ${m.productName} ${m.size} - ${formatBRL(
              Number(m.total)
            )} (${m.paymentMethod}) às ${formattedTime}`
            iconElement = <ShoppingBag className="h-4 w-4" />
            iconClass = 'bg-primary/10 text-primary'
          } else if (m.type === 'return') {
            messageText = `Retorno: ${m.quantity}x ${m.productName} ${m.size} às ${formattedTime}`
            iconElement = <Undo2 className="h-4 w-4 text-brand-purple" />
            iconClass = 'bg-accent text-accent-foreground'
          } else if (m.type === 'restock') {
            messageText = `Entrada: +${m.quantity} un. em ${m.productName} ${m.size} às ${formattedTime}`
            iconElement = <Package className="h-4 w-4" />
            iconClass =
              'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
          }

          return (
            <li
              key={m.id}
              className={`flex items-center justify-between gap-3 p-4 ${
                i !== 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
                >
                  {iconElement}
                </span>
                <p className="text-sm font-medium text-foreground truncate">
                  {messageText}
                </p>
              </div>

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
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-50 shrink-0 p-1 rounded-md transition-colors"
                aria-label={`Desfazer ação de ${m.productName}`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Desfazer</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
