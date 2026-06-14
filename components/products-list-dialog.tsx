'use client'

import { useState, useMemo, useTransition } from 'react'
import { Search, Plus, Minus, Pencil, Trash2, Download } from 'lucide-react'
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
import { formatBRL, CATEGORIES, SIZES, type Product } from '@/lib/constants'

/**
 * Dialog component displaying a complete tabular representation of products in stock.
 * Allows quick inline adjustments, edits, deletion, and CSV exports.
 *
 * @param props Component properties containing products, dialog toggles, and callbacks.
 * @returns The rendered React element.
 */
export function ProductsListDialog({
  open,
  onOpenChange,
  products,
  onAdjustStock,
  onDeleteProduct,
  onEditProduct,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
  onAdjustStock: (id: number, delta: number) => Promise<void>
  onDeleteProduct: (id: number) => Promise<void>
  onEditProduct: (product: Product) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sizeFilter, setSizeFilter] = useState<string>('all')

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesCategory =
        categoryFilter === 'all' || p.category === categoryFilter
      const matchesSize = sizeFilter === 'all' || p.size === sizeFilter
      return matchesSearch && matchesCategory && matchesSize
    })
  }, [products, search, categoryFilter, sizeFilter])

  function handleAdjust(id: number, delta: number, name: string) {
    startTransition(async () => {
      try {
        await onAdjustStock(id, delta)
        toast.success(`Estoque de ${name} ajustado!`)
      } catch {
        toast.error('Erro ao ajustar estoque')
      }
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      try {
        await onDeleteProduct(id)
        toast.success('Produto removido do estoque')
      } catch {
        toast.error('Erro ao remover produto')
      }
    })
  }

  function handleExportCSV() {
    const headers = [
      'Referência / SKU',
      'Nome do Produto',
      'Categoria',
      'Tamanho',
      'Cores',
      'Estoque',
      'Preço (R$)',
      'Valor Total em Estoque (R$)'
    ]

    const rows = filteredProducts.map((p) => [
      p.sku || '—',
      p.name,
      p.category,
      p.size,
      p.colors || '—',
      p.quantity,
      Number(p.price).toFixed(2),
      (Number(p.price) * p.quantity).toFixed(2)
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
    link.setAttribute('download', `produtos_amofit_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV de produtos exportado!')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <DialogTitle className="text-brand-purple">Tabela de Produtos</DialogTitle>
            <DialogDescription>
              Visualize e gerencie a lista completa de peças cadastradas no estoque da Amo Fit.
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
              placeholder="Buscar por nome ou SKU do produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Categoria
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Todas as Categorias</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Tamanho
              </span>
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Todos os Tamanhos</option>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 rounded-xl border border-border bg-card">
          <table className="w-full text-left border-collapse min-w-[600px] table-fixed">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider font-bold">
                <th className="py-3 px-4 w-[35%]">Produto</th>
                <th className="py-3 px-2 w-[12%]">Categoria</th>
                <th className="py-3 px-2 w-[10%] text-center">Tam</th>
                <th className="py-3 px-3 w-[15%]">Cores</th>
                <th className="py-3 px-3 w-[13%]">Preço</th>
                <th className="py-3 px-4 w-[25%] text-center">Ajuste Estoque</th>
                <th className="py-3 px-4 w-[15%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum produto localizado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.quantity < 3
                  return (
                    <tr key={p.id} className="hover:bg-muted/15 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-foreground truncate">
                        <div className="flex flex-col">
                          <span>{p.name}</span>
                          {p.sku && (
                            <span className="text-[10px] text-muted-foreground font-mono font-normal">
                              Ref: {p.sku}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-muted-foreground text-xs truncate">
                        {p.category}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <Badge variant="outline" className="font-semibold">
                          {p.size}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-muted-foreground truncate">
                        {p.colors || '—'}
                      </td>
                      <td className="py-3.5 px-3 font-medium text-foreground">
                        {formatBRL(Number(p.price))}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 rounded-full hover:bg-muted"
                            onClick={() => handleAdjust(p.id, -1, p.name)}
                            disabled={isPending || p.quantity === 0}
                            aria-label="Diminuir"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className={`w-8 text-center font-bold text-sm ${isLow ? 'text-destructive font-black' : 'text-foreground'}`}>
                            {p.quantity}
                          </span>
                          <Button
                            size="icon"
                            className="h-7 w-7 rounded-full bg-brand-purple text-brand-purple-foreground hover:bg-brand-purple/90"
                            onClick={() => handleAdjust(p.id, 1, p.name)}
                            disabled={isPending}
                            aria-label="Aumentar"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-brand-purple hover:bg-brand-purple/10 rounded-lg"
                            onClick={() => {
                              onEditProduct(p)
                              onOpenChange(false)
                            }}
                            disabled={isPending}
                            aria-label="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            onClick={() => handleDelete(p.id)}
                            disabled={isPending}
                            aria-label="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
