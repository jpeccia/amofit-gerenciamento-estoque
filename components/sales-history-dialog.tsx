'use client'

import { useState, useMemo, useTransition } from 'react'
import { Search, RotateCcw, Download } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
 * Dialog component displaying a complete tabular representation of sales.
 * Allows filtering, searching, exporting to CSV, and quick collection of pending payments.
 *
 * @param props Component properties including dialog state, sales history, and actions.
 * @returns The rendered React element.
 */
export function SalesHistoryDialog({
  open,
  onOpenChange,
  movements,
  onMarkSaleAsPaid,
  onUndoMovement,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  movements: Movement[]
  onMarkSaleAsPaid: (id: number) => Promise<void>
  onUndoMovement: (id: number) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')

  const salesOnly = useMemo(() => {
    return movements.filter((m) => m.type === 'sale')
  }, [movements])

  const filteredSales = useMemo(() => {
    return salesOnly.filter((m) => {
      const productNameMatches = m.productName
        .toLowerCase()
        .includes(search.toLowerCase())
      const customerNameMatches = m.customerName
        ? m.customerName.toLowerCase().includes(search.toLowerCase())
        : false
      const matchesSearch = productNameMatches || customerNameMatches || !search.trim()

      const matchesStatus =
        statusFilter === 'all' || m.paymentStatus === statusFilter

      const matchesMethod =
        methodFilter === 'all' || m.paymentMethod === methodFilter

      return matchesSearch && matchesStatus && matchesMethod
    })
  }, [salesOnly, search, statusFilter, methodFilter])

  function handleReceive(id: number, name: string) {
    startTransition(async () => {
      try {
        await onMarkSaleAsPaid(id)
        toast.success(`Pagamento de ${name} recebido!`)
      } catch {
        toast.error('Erro ao marcar venda como paga')
      }
    })
  }

  function handleUndo(id: number) {
    startTransition(async () => {
      try {
        await onUndoMovement(id)
        toast.success('Venda desfeita!')
      } catch {
        toast.error('Erro ao desfazer venda')
      }
    })
  }

  function handleExportCSV() {
    const headers = [
      'Data',
      'Cliente',
      'Produto',
      'Tamanho',
      'Cor',
      'Quantidade',
      'Valor Unitário (R$)',
      'Total (R$)',
      'Método de Pagamento',
      'Parcelas',
      'Status de Pagamento'
    ]

    const rows = filteredSales.map((m) => [
      formatTime(m.createdAt),
      m.customerName || '—',
      m.productName,
      m.size,
      m.color || '—',
      m.quantity,
      Number(m.unitPrice).toFixed(2),
      Number(m.total).toFixed(2),
      m.paymentMethod,
      m.installments || 1,
      m.paymentStatus === 'pending' ? 'Pendente' : 'Pago'
    ])

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) =>
        row
          .map((val) => {
            const str = String(val).replace(/"/g, '""')
            return `"${str}"`
          })
          .join(';')
      )
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `vendas_amofit_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV de vendas exportado!')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <DialogTitle className="text-brand-purple">Histórico de Vendas</DialogTitle>
            <DialogDescription>
              Consulte todas as vendas realizadas, filtre por método de pagamento ou status pendente (fiado).
            </DialogDescription>
          </div>
          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-brand-purple text-brand-purple-foreground hover:bg-brand-purple/90 gap-1.5 h-9 rounded-xl shrink-0 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Exportar CSV</span>
          </Button>
        </DialogHeader>

        <div className="flex flex-col gap-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Status
              </span>
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter((val ?? 'all') as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente (Fiado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Método
              </span>
              <Select
                value={methodFilter}
                onValueChange={(val) => setMethodFilter(val ?? 'all')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Métodos</SelectItem>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 rounded-xl border border-border bg-card">
          <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider font-bold">
                <th className="py-3 px-4 w-[16%]">Data</th>
                <th className="py-3 px-3 w-[18%]">Cliente</th>
                <th className="py-3 px-4 w-[32%]">Produto</th>
                <th className="py-3 px-2 w-[10%] text-center">Tam</th>
                <th className="py-3 px-3 w-[14%]">Total</th>
                <th className="py-3 px-3 w-[15%]">Método</th>
                <th className="py-3 px-3 w-[14%] text-center">Status</th>
                <th className="py-3 px-4 w-[15%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    Nenhuma venda localizada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredSales.map((m) => {
                  const isPendingPayment = m.paymentStatus === 'pending'
                  return (
                    <tr key={m.id} className="hover:bg-muted/15 transition-colors">
                      <td className="py-3 px-4 text-xs text-muted-foreground truncate">
                        {formatTime(m.createdAt)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-brand-purple truncate">
                        {m.customerName || '—'}
                      </td>
                      <td className="py-3 px-4 truncate">
                        <span className="font-medium text-foreground">{m.productName}</span>
                        {m.color && (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            ({m.color})
                          </span>
                        )}
                        <span className="ml-1 text-xs text-muted-foreground font-semibold">
                          x{m.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant="outline" className="font-bold">
                          {m.size}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-bold text-foreground">
                        {formatBRL(Number(m.total))}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground truncate">
                        {m.paymentMethod}
                        {m.installments && m.installments > 1 && ` (${m.installments}x)`}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isPendingPayment ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse font-bold text-[10px]"
                          >
                            Pendente
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[10px]"
                          >
                            Pago
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPendingPayment && (
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleReceive(m.id, m.customerName || m.productName)}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-7 px-2 text-xs rounded-lg cursor-pointer shrink-0"
                            >
                              Receber
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => handleUndo(m.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                            aria-label="Desfazer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
