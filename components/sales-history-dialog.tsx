'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { Search, RotateCcw, Download, Pencil, FileText, Share2 } from 'lucide-react'
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
import { formatBRL, type Movement, type Product } from '@/lib/constants'
import { generateFullCSV, generateReportPDF } from '@/components/report-generator'

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
 * Dialog component displaying a complete tabular representation of sales with pagination.
 * Allows filtering, searching, exporting to CSV, and quick collection of pending payments.
 *
 * @param props Component properties including dialog state, sales history, and actions.
 * @returns The rendered React element.
 */
export function SalesHistoryDialog({
  open,
  onOpenChange,
  movements,
  products = [],
  onMarkSaleAsPaid,
  onUndoMovement,
  onEditSale,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  movements: Movement[]
  products?: Product[]
  onMarkSaleAsPaid: (id: number, amount?: number) => Promise<void>
  onUndoMovement: (id: number) => Promise<void>
  onEditSale: (sale: Movement) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, methodFilter])

  const salesOnly = useMemo(() => {
    const rawSales = movements.filter((m) => m.type === 'sale')
    const groups: Record<string, Movement & { items?: Movement[] }> = {}

    for (const m of rawSales) {
      const key = m.saleGroupId || `single-${m.id}`
      if (!groups[key]) {
        groups[key] = {
          ...m,
          items: [],
        }
      }
      groups[key].items?.push(m)
    }

    return Object.values(groups).map((group) => {
      const items = group.items || []
      if (items.length <= 1) {
        return group
      }

      const totalVal = items.reduce((sum, item) => sum + Number(item.total), 0)
      const paidVal = items.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0)
      const qty = items.reduce((sum, item) => sum + item.quantity, 0)
      const isPending = items.some((item) => item.paymentStatus === 'pending')

      const productNames = items.map((item) => `${item.quantity}x ${item.productName}`).join(' + ')
      const sizes = Array.from(new Set(items.map((item) => item.size))).join(', ')
      const colors = Array.from(new Set(items.map((item) => item.color).filter(Boolean))).join(', ')
      const skus = Array.from(new Set(items.map((item) => item.sku).filter(Boolean))).join(', ')

      return {
        ...group,
        total: totalVal.toFixed(2),
        amountPaid: paidVal.toFixed(2),
        quantity: qty,
        productName: productNames,
        size: sizes,
        color: colors || null,
        sku: skus || null,
        paymentStatus: isPending ? 'pending' : 'paid',
      }
    })
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

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage)

  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredSales.slice(start, start + itemsPerPage)
  }, [filteredSales, currentPage])

  function handleReceive(id: number, name: string, total: number, amountPaid: number) {
    const remaining = total - amountPaid
    const input = window.prompt(
      `Registrar recebimento de ${name || 'Cliente'}:\n\n` +
      `Valor total: ${formatBRL(total)}\n` +
      `Já amortizado: ${formatBRL(amountPaid)}\n` +
      `Restante: ${formatBRL(remaining)}\n\n` +
      `Digite o valor pago agora:`,
      remaining.toFixed(2)
    )

    if (input === null) return

    const receivedAmt = Number(input.replace(',', '.'))
    if (Number.isNaN(receivedAmt) || receivedAmt <= 0) {
      return toast.error('Valor informado inválido')
    }

    startTransition(async () => {
      try {
        await onMarkSaleAsPaid(id, receivedAmt)
        toast.success(`Recebimento registrado!`)
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
    try {
      generateFullCSV(movements, products)
      toast.success('Relatório CSV exportado com sucesso!')
    } catch (err) {
      console.error('Erro ao exportar CSV:', err)
      toast.error('Erro ao gerar relatório CSV.')
    }
  }

  function handleExportPDF() {
    try {
      generateReportPDF(movements, products)
      toast.success('Relatório PDF baixado com sucesso!')
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      toast.error('Erro ao gerar relatório PDF.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <DialogTitle className="text-brand-purple">Histórico de Vendas</DialogTitle>
            <DialogDescription>
              Consulte todas as vendas realizadas, filtre por método de pagamento ou status pendente (fiado).
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleExportCSV}
              variant="outline"
              className="border-brand-purple text-brand-purple hover:bg-brand-purple/10 gap-1.5 h-9 rounded-xl font-bold cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Exportar CSV</span>
            </Button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              className="bg-brand-purple text-brand-purple-foreground hover:bg-brand-purple/90 gap-1.5 h-9 rounded-xl font-bold cursor-pointer shadow-sm"
            >
              <FileText className="h-4 w-4" />
              <span>Baixar PDF</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, produto ou SKU..."
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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Todos os Status</option>
                <option value="paid">Pago</option>
                <option value="pending">Pendente (Fiado)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Método
              </span>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Todos os Métodos</option>
                <option value="Pix">Pix</option>
                <option value="Cartão">Cartão</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 rounded-xl border border-border bg-card">
          <table className="w-full text-left border-collapse min-w-[1060px]">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider font-bold">
                <th className="py-3 px-4 w-[120px] shrink-0">Data</th>
                <th className="py-3 px-3 w-[150px] shrink-0">Cliente</th>
                <th className="py-3 px-4 min-w-[200px]">Produto / Itens</th>
                <th className="py-3 px-2 w-[70px] text-center shrink-0">Tam</th>
                <th className="py-3 px-3 w-[130px] shrink-0">Total</th>
                <th className="py-3 px-3 w-[110px] shrink-0">Método</th>
                <th className="py-3 px-3 w-[100px] text-center shrink-0">Status</th>
                <th className="py-3 px-4 w-[240px] text-right shrink-0">Ações</th>
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
                paginatedSales.map((m) => {
                  const isPendingPayment = m.paymentStatus === 'pending'
                  const totalNum = Number(m.total)
                  const paidNum = Number(m.amountPaid || 0)
                  return (
                    <tr key={m.id} className="hover:bg-muted/15 transition-colors">
                      <td className="py-3 px-4 text-xs w-[120px] shrink-0">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(m.createdAt))}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            às {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(m.createdAt))}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-brand-purple truncate w-[150px] max-w-[150px]">
                        {m.customerName || '—'}
                      </td>
                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="flex flex-col gap-0.5 max-w-full overflow-hidden">
                          {(m as any).items && (m as any).items.length > 1 ? (
                            ((m as any).items as Movement[]).map((item) => (
                              <div key={item.id} className="text-xs text-foreground font-medium truncate">
                                {item.quantity}x {item.productName}
                                <span className="text-[10px] text-muted-foreground font-normal ml-1">
                                  ({item.size}){item.color ? ` · ${item.color}` : ''}
                                </span>
                              </div>
                            ))
                          ) : (
                            <>
                              <span className="font-medium text-foreground truncate">{m.productName}</span>
                              <span className="text-[10px] text-muted-foreground font-normal truncate">
                                {m.color && `Cor: ${m.color}`}
                                {m.sku && ` · Ref: ${m.sku}`}
                                {` · Qtd: ${m.quantity}`}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center w-[70px] shrink-0">
                        <Badge variant="outline" className="font-bold">
                          {m.size}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 w-[130px] shrink-0">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">
                            {formatBRL(totalNum)}
                          </span>
                          {paidNum > 0 && (
                            <div className="flex flex-col text-[10px] leading-tight mt-0.5">
                              {isPendingPayment && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Amortizado: {formatBRL(paidNum)}
                                </span>
                              )}
                              {m.paidAt && (
                                <span className="text-[9px] text-muted-foreground font-normal">
                                  Pagto em: {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(m.paidAt))}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground truncate w-[110px] shrink-0">
                        {m.paymentMethod}
                        {m.installments && m.installments > 1 && ` (${m.installments}x)`}
                      </td>
                      <td className="py-3 px-3 text-center w-[100px] shrink-0 whitespace-nowrap">
                        {isPendingPayment ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse font-bold text-[10px] px-2 py-0.5"
                          >
                            Pendente
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[10px] px-2 py-0.5"
                          >
                            Pago
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right w-[240px] shrink-0 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          {isPendingPayment && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const remaining = totalNum - paidNum
                                  const name = m.customerName ? m.customerName.trim().split(' ')[0] : 'Cliente'
                                  const text = `Olá, ${name}! Tudo bem? 💜\n\nPassando para enviar o lembrete da sua compra na *Amo Fit*:\n• *Item:* ${m.productName}\n• *Valor pendente:* ${formatBRL(remaining)}\n\nChave Pix da loja disponível para pagamento. Se já efetuou, por favor desconsidere!`
                                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
                                }}
                                className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 h-7 px-2 text-xs rounded-lg cursor-pointer shrink-0 gap-1 font-semibold dark:text-emerald-400"
                                title="Cobrar via WhatsApp"
                              >
                                <Share2 className="h-3 w-3" />
                                <span>Cobrar</span>
                              </Button>
                              <Button
                                size="sm"
                                disabled={isPending}
                                onClick={() => handleReceive(m.id, m.customerName || m.productName, totalNum, paidNum)}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-7 px-2.5 text-xs rounded-lg cursor-pointer shrink-0 shadow-sm"
                              >
                                Receber
                              </Button>
                            </>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => onEditSale(m)}
                            className="h-7 w-7 text-muted-foreground hover:text-brand-purple hover:bg-brand-purple/10 rounded-lg shrink-0"
                            aria-label="Editar"
                            title="Editar venda"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => handleUndo(m.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                            aria-label="Desfazer"
                            title="Desfazer venda"
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/65 pt-3 shrink-0">
            <p className="text-xs text-muted-foreground font-semibold">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="h-8 text-xs font-bold rounded-lg border-border"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="h-8 text-xs font-bold rounded-lg border-border"
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
