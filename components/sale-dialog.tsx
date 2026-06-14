'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Search, Trash2, ShoppingBag } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAYMENT_METHODS, formatBRL, type Product } from '@/lib/constants'

/**
 * Dialog component to register a new sale with one or multiple products, support for installments and pending status.
 *
 * @param props Component properties including products list, open state, and register callback.
 * @returns The rendered React element.
 */
export function SaleDialog({
  open,
  onOpenChange,
  products,
  onRegisterSale,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
  onRegisterSale: (
    items: { productId: number; quantity: number; color?: string }[],
    paymentMethod: string,
    installments?: number,
    paymentStatus?: string,
    customerName?: string
  ) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [selectedItems, setSelectedItems] = useState<{ productId: number; quantity: number; color?: string }[]>([])
  const [payment, setPayment] = useState<string>(PAYMENT_METHODS[0])
  const [isPendingPayment, setIsPendingPayment] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [installments, setInstallments] = useState(1)

  const availableProducts = useMemo(
    () => products.filter((p) => p.quantity > 0),
    [products]
  )

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) {
      return availableProducts.slice(0, 5)
    }
    return availableProducts.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term) ||
      p.size.toLowerCase().includes(term) ||
      (p.colors && p.colors.toLowerCase().includes(term))
    )
  }, [search, availableProducts])

  const cartDetails = useMemo(() => {
    return selectedItems.map((item) => {
      const product = products.find((p) => p.id === item.productId)
      return {
        ...item,
        product,
        totalItemPrice: product ? Number(product.price) * item.quantity : 0,
      }
    }).filter((d) => d.product !== undefined) as {
      productId: number
      quantity: number
      color?: string
      product: Product
      totalItemPrice: number
    }[]
  }, [selectedItems, products])

  const grandTotal = useMemo(() => {
    return cartDetails.reduce((sum, item) => sum + item.totalItemPrice, 0)
  }, [cartDetails])

  const totalItemsCount = useMemo(() => {
    return cartDetails.reduce((sum, item) => sum + item.quantity, 0)
  }, [cartDetails])

  const installmentValue = useMemo(() => {
    return grandTotal / installments
  }, [grandTotal, installments])

  function handleAddItem(product: Product) {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error(`Apenas ${product.quantity} unidades disponíveis em estoque.`)
          return prev
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      const colorOptions = product.colors
        ? product.colors.split(',').map((c) => c.trim()).filter(Boolean)
        : []
      const defaultColor = colorOptions.length > 0 ? colorOptions[0] : undefined
      return [...prev, { productId: product.id, quantity: 1, color: defaultColor }]
    })
    setSearch('')
  }

  function handleUpdateQuantity(productId: number, delta: number, maxStock: number) {
    setSelectedItems((prev) => {
      return prev.map((item) => {
        if (item.productId !== productId) return item
        const newQty = item.quantity + delta
        if (newQty <= 0) return null
        if (newQty > maxStock) {
          toast.error(`Apenas ${maxStock} unidades disponíveis em estoque.`)
          return item
        }
        return { ...item, quantity: newQty }
      }).filter((item): item is { productId: number; quantity: number; color?: string } => item !== null)
    })
  }

  function handleUpdateColor(productId: number, color: string) {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, color } : item
      )
    )
  }

  function handleRemoveItem(productId: number) {
    setSelectedItems((prev) => prev.filter((item) => item.productId !== productId))
  }

  function reset() {
    setSearch('')
    setSelectedItems([])
    setPayment(PAYMENT_METHODS[0])
    setIsPendingPayment(false)
    setCustomerName('')
    setInstallments(1)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedItems.length === 0) {
      return toast.error('Selecione pelo menos um produto')
    }
    if (isPendingPayment && !customerName.trim()) {
      return toast.error('Informe o nome do cliente para pagamentos pendentes')
    }

    startTransition(async () => {
      try {
        await onRegisterSale(
          selectedItems,
          payment,
          installments,
          isPendingPayment ? 'pending' : 'paid',
          isPendingPayment ? customerName.trim() : undefined
        )
        const paymentLabel = payment === 'Pix' ? 'no Pix' : payment === 'Cartão' ? 'no Cartão' : 'no Dinheiro'
        const pendingSuffix = isPendingPayment ? ' (Pendente)' : ''
        toast.success(`Venda registrada — ${formatBRL(grandTotal)} ${paymentLabel}${pendingSuffix}`)
        reset()
        onOpenChange(false)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Não foi possível registrar'
        )
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) reset()
      onOpenChange(v)
    }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Registrar Venda</DialogTitle>
              <DialogDescription>
                Monte a cesta de produtos, defina as quantidades, cores e o controle de recebimento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="search-product">Adicionar Produtos</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="search-product"
                type="text"
                placeholder="Pesquisar por nome, categoria, tamanho ou cor..."
                className="h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="mt-1 border border-border rounded-lg bg-card/50 overflow-hidden">
              <div className="max-h-[140px] overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <p className="p-3 text-xs text-center text-muted-foreground">
                    Nenhum produto em estoque encontrado
                  </p>
                ) : (
                  filteredProducts.map((p) => {
                    const alreadyInCart = selectedItems.find((item) => item.productId === p.id)
                    const countInCart = alreadyInCart?.quantity ?? 0
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddItem(p)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-muted/80 border-b border-border last:border-b-0 cursor-pointer"
                      >
                        <span className="font-semibold text-foreground flex flex-col items-start">
                          <span>{p.name} · {p.size}</span>
                          {p.colors && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              Cores: {p.colors}
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-2">
                          <span>{formatBRL(Number(p.price))}</span>
                          <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                            {p.quantity - countInCart} un. rest.
                          </span>
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Itens Selecionados ({totalItemsCount})</Label>
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="max-h-[200px] overflow-y-auto p-2 flex flex-col gap-2">
                {cartDetails.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Pesquise e clique nos produtos acima para adicioná-los
                  </div>
                ) : (
                  cartDetails.map((item) => {
                    const colorOptions = item.product.colors
                      ? item.product.colors.split(',').map((c) => c.trim()).filter(Boolean)
                      : []
                    return (
                      <div
                        key={item.productId}
                        className="flex flex-col gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/20"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">
                              {item.product.name} ({item.product.size})
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatBRL(Number(item.product.price))} / un.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1.5 border border-border rounded-lg bg-background p-0.5">
                              <button
                                type="button"
                                className="h-6 w-6 flex items-center justify-center rounded text-sm hover:bg-muted font-bold cursor-pointer"
                                onClick={() => handleUpdateQuantity(item.productId, -1, item.product.quantity)}
                              >
                                –
                              </button>
                              <span className="w-5 text-center font-heading text-xs font-bold tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                className="h-6 w-6 flex items-center justify-center rounded text-sm hover:bg-muted font-bold cursor-pointer"
                                onClick={() => handleUpdateQuantity(item.productId, 1, item.product.quantity)}
                              >
                                +
                              </button>
                            </div>

                            <span className="text-xs font-heading font-extrabold text-foreground w-16 text-right tabular-nums">
                              {formatBRL(item.totalItemPrice)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.productId)}
                              className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                              aria-label={`Remover ${item.product.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {colorOptions.length > 0 && (
                          <div className="flex flex-col gap-1 border-t border-border/40 pt-1.5">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                              Cor vendida:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {colorOptions.map((c) => {
                                const isSelected = item.color === c
                                return (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => handleUpdateColor(item.productId, c)}
                                    className={`px-2.5 py-0.5 rounded text-[10px] border font-bold transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-brand-purple text-brand-purple-foreground border-brand-purple shadow-sm'
                                        : 'bg-background text-muted-foreground border-border hover:bg-muted/40'
                                    }`}
                                  >
                                    {c}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Forma de Pagamento</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {PAYMENT_METHODS.map((m) => {
                  const isSelected = payment === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayment(m)}
                      className={`h-10 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-purple text-brand-purple-foreground border-brand-purple shadow-sm'
                          : 'bg-transparent text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Status de Pagamento</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPendingPayment(false)}
                  className={`h-10 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                    !isPendingPayment
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-transparent text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  Pago
                </button>
                <button
                  type="button"
                  onClick={() => setIsPendingPayment(true)}
                  className={`h-10 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                    isPendingPayment
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm dark:bg-amber-600'
                      : 'bg-transparent text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  Pendente
                </button>
              </div>
            </div>
          </div>

          {isPendingPayment && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl border border-border/80 bg-muted/10">
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="customer-name">Nome do Cliente *</Label>
                <Input
                  id="customer-name"
                  type="text"
                  placeholder="Nome do comprador"
                  className="h-10 text-xs"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="installments-select">Parcelas</Label>
                <Select
                  value={String(installments)}
                  onValueChange={(v) => setInstallments(Number(v) || 1)}
                >
                  <SelectTrigger id="installments-select" className="h-10 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                      <SelectItem key={num} value={String(num)}>
                        {num}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary/10 to-brand-purple/10 border border-primary/20 px-4 py-3 mt-1 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                {isPendingPayment ? 'Valor a Receber' : 'Valor Total da Venda'}
              </span>
              <span className="text-xs font-semibold text-brand-purple/80 dark:text-primary-foreground/85">
                {payment} {isPendingPayment ? 'Pendente' : 'Pago'}
                {installments > 1 && ` em ${installments}x de ${formatBRL(installmentValue)}`}
              </span>
            </div>
            <span className="font-heading text-2xl font-black text-brand-purple dark:text-primary">
              {formatBRL(grandTotal)}
            </span>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || selectedItems.length === 0}
              className="bg-gradient-to-r from-brand-purple to-primary text-primary-foreground font-bold cursor-pointer"
            >
              {isPending ? 'Registrando...' : 'Confirmar venda'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
