import { useMemo } from 'react'
import { ShoppingBag, Undo2, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatBRL, type Movement } from '@/lib/constants'

/**
 * Format a Date object or timestamp to a readable date/time string.
 *
 * @param date The date to format.
 * @returns The formatted date/time string.
 */
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/**
 * Renders a full audit trail of recent movements (sales, returns, restocks).
 * Heading is styled in deep brand purple.
 *
 * @param props Component properties containing movements list.
 * @returns The rendered React element.
 */
export function RecentMovements({ movements }: { movements: Movement[] }) {
  const recentList = useMemo(() => movements.slice(0, 20), [movements])

  if (recentList.length === 0) {
    return null
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-heading text-lg font-bold text-brand-purple">
        Movimentações recentes
      </h2>
      <ul className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
        {recentList.map((m, i) => {
          const isSale = m.type === 'sale'
          const isReturn = m.type === 'return'
          const isRestock = m.type === 'restock'

          let iconElement = null
          let iconClass = ''

          if (isSale) {
            iconElement = <ShoppingBag className="h-4 w-4" />
            iconClass = 'bg-primary/10 text-primary'
          } else if (isReturn) {
            iconElement = <Undo2 className="h-4 w-4 text-brand-purple" />
            iconClass = 'bg-accent text-accent-foreground'
          } else if (isRestock) {
            iconElement = <Package className="h-4 w-4" />
            iconClass =
              'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
          }

          return (
            <li
              key={m.id}
              className={`flex items-center gap-3 p-4 ${
                i !== 0 ? 'border-t border-border' : ''
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
              >
                {iconElement}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {m.productName}
                  <span className="text-muted-foreground"> · {m.size}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(m.createdAt)} · {m.quantity} un.
                  {isSale ? ` · ${m.paymentMethod}` : ''}
                </p>
              </div>
              {isSale ? (
                <span className="shrink-0 font-heading text-sm font-bold text-foreground">
                  {formatBRL(Number(m.total))}
                </span>
              ) : isReturn ? (
                <Badge variant="secondary" className="shrink-0">
                  Retorno
                </Badge>
              ) : (
                <Badge
                  className="shrink-0 font-bold border text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/20"
                >
                  Entrada
                </Badge>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
