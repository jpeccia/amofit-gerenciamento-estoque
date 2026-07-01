'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Search, Trash2, ShoppingBag, Plus, Sparkles } from 'lucide-react'
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
import { PAYMENT_METHODS, formatBRL, CATEGORIES, SIZES, type Product } from '@/lib/constants'

/**
 * Dialog component to register a new sale with one or multiple products.
 * Includes support for installments, pending status, custom items (avulsos), and quick filters.
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
    items: {
      productId?: number | null
      quantity: number
      color?: string
      name?: string
      category?: string
      size?: string
      price?: number
      sku?: string
    }[],
    paymentMethod: string,
    installments?: number,
    paymentStatus?: string,
    customerName?: string
  ) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todos')
  const [sizeFilter, setSizeFilter] = useState('Todos')

  // Selected items in cart
  const [selectedItems, setSelectedItems] = useState<{
    id: string
    productId?: number | null
    quantity: number
    color?: string
    name?: string
    category?: string
    size?: string
    price?: number
    sku?: string
  }[]>([])

  const [payment, setPayment] = useState<string>(PAYMENT_METHODS[0])
  const [isPendingPayment, setIsPendingPayment] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [installments, setInstallments] = useState(1)

  // Custom item quick-create states
  const [isAddingCustom, setIsAddingCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState<string>(CATEGORIES[0])
  const [customSize, setCustomSize] = useState<string>('M')
  const [customPrice, setCustomPrice] = useState('')
  const [customColor, setCustomColor] = useState('')
  const [customSku, setCustomSku] = useState('')

  const availableProducts = useMemo(
    () => products.filter((p) => p.quantity > 0),
    [products]
  )

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim()
    return availableProducts.filter((p) => {
      const nameMatches = p.name.toLowerCase().includes(term)
      const skuMatches = p.sku ? p.sku.toLowerCase().includes(term) : false
      const matchesSearch = nameMatches || skuMatches || !term

      const matchesCategory =
        categoryFilter === 'Todos' || p.category === categoryFilter
      const matchesSize = sizeFilter === 'Todos' || p.size === sizeFilter

      return matchesSearch && matchesCategory && matchesSize
    })
  }, [search, availableProducts, categoryFilter, sizeFilter])

  const cartDetails = useMemo(() => {
    return selectedItems.map((item) => {
      if (item.productId === null || item.productId === undefined) {
        // Create a fake product struct for rendering custom items in the list
        const fakeProduct: Product = {
          id: -1,
          userId: '',
          name: item.name || '',
          category: item.category || '',
          size: item.size || 'M',
          quantity: 999,
          price: (item.price || 0).toFixed(2),
          colors: item.color || null,
          sku: item.sku || null,
          createdAt: new Date(),
        }
        return {
          ...item,
          product: fakeProduct,
          totalItemPrice: (item.price || 0) * item.quantity,
        }
      }

      const product = products.find((p) => p.id === item.productId)
      return {
        ...item,
        product,
        totalItemPrice: product ? Number(product.price) * item.quantity : 0,
      }
    }).filter((d) => d.product !== undefined) as {
      id: string
      productId?: number | null
      quantity: number
      color?: string
      name?: string
      category?: string
      size?: string
      price?: number
      sku?: string
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
    return installments > 0 ? grandTotal / installments : grandTotal
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
      return [
        ...prev,
        {
          id: `item-${product.id}-${Date.now()}`,
          productId: product.id,
          quantity: 1,
          color: defaultColor,
        },
      ]
    })
    setSearch('')
  }

  function handleAddCustomItem() {
    const priceNum = Number(customPrice.replace(',', '.'))
    if (!customName.trim()) {
      return toast.error('Informe o nome do item avulso')
    }
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      return toast.error('Informe um preço avulso válido')
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        productId: null,
        quantity: 1,
        name: customName.trim(),
        category: customCategory,
        size: customSize,
        price: priceNum,
        color: customColor.trim() || undefined,
        sku: customSku.trim() || undefined,
      },
    ])

    // Reset fields
    setCustomName('')
    setCustomPrice('')
    setCustomColor('')
    setCustomSku('')
    setIsAddingCustom(false)
    toast.success('Item avulso adicionado ao carrinho!')
  }

  function handleUpdateQuantity(id: string, delta: number, maxStock: number) {
    setSelectedItems((prev) => {
      return prev
        .map((item) => {
          if (item.id !== id) return item
          const newQty = item.quantity + delta
          if (newQty <= 0) return null
          if (newQty > maxStock) {
            toast.error(`Apenas ${maxStock} unidades disponíveis em estoque.`)
            return item
          }
          return { ...item, quantity: newQty }
        })
        .filter((item): item is typeof selectedItems[0] => item !== null)
    })
  }

  function handleUpdateColor(id: string, color: string) {
    setSelectedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, color } : item))
    )
  }

  function handleRemoveItem(id: string) {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id))
  }

  function reset() {
    setSearch('')
    setCategoryFilter('Todos')
    setSizeFilter('Todos')
    setSelectedItems([])
    setPayment(PAYMENT_METHODS[0])
    setIsPendingPayment(false)
    setCustomerName('')
    setInstallments(1)
    setIsAddingCustom(false)
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
        const payload = selectedItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          color: item.color,
          name: item.name,
          category: item.category,
          size: item.size,
          price: item.price,
          sku: item.sku,
        }))

        await onRegisterSale(
          payload,
          payment,
          installments,
          isPendingPayment ? 'pending' : 'paid',
          customerName.trim() || undefined
        )
        const paymentLabel = payment === 'Pix' ? 'no Pix' : payment === 'Cartão' ? 'no Cartão' : 'no Dinheiro'
        const pendingSuffix = isPendingPayment ? ' (Pendente)' : ''
        toast.success(`Venda registrada — ${formatBRL(grandTotal)} ${paymentLabel}${pendingSuffix}`)
        reset()
        onOpenChange(false)
      } catch (err) {
        let msg = 'Não foi possível registrar a venda.'
        if (err instanceof Error) {
          if (err.message === 'SALES_REGISTER_409' || err.message === 'INSUFFICIENT_STOCK') {
            msg = 'Estoque insuficiente para um ou mais produtos selecionados.'
          } else if (err.message === 'SALES_REGISTER_404' || err.message === 'PRODUCT_NOT_FOUND') {
            msg = 'Um ou mais produtos não foram encontrados no estoque.'
          } else if (err.message === 'AUTH_003' || err.message === 'Unauthorized') {
            msg = 'Sessão expirada. Por favor, faça login novamente.'
          } else if (err.message === 'SALES_REGISTER_400') {
            msg = 'Dados da venda inválidos. Verifique as quantidades e preços.'
          } else {
            msg = `Erro: ${err.message}`
          }
        }
        toast.error(msg)
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
          {/* SEARCH AREA WITH QUICK FILTERS */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="search-product">Adicionar Produtos</Label>
              <button
                type="button"
                onClick={() => setIsAddingCustom(!isAddingCustom)}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                {isAddingCustom ? 'Ver Lista de Produtos' : 'Item Avulso (sem estoque)'}
              </button>
            </div>

            {isAddingCustom ? (
              /* QUICK CUSTOM ITEM FORM */
              <div className="p-3 border border-dashed border-primary/40 rounded-xl bg-primary/5 flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
                  <Sparkles className="h-4 w-4" />
                  <span>Configurar Venda Avulsa Rápida</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="c-name" className="text-[10px]">Nome do Item *</Label>
                    <Input
                      id="c-name"
                      placeholder="Ex: Top Fitness Promo"
                      className="h-8 text-xs bg-background"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="c-price" className="text-[10px]">Preço (R$) *</Label>
                    <Input
                      id="c-price"
                      placeholder="0,00"
                      className="h-8 text-xs bg-background"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px]">Categoria</Label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px]">Tamanho</Label>
                    <select
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {SIZES.map((sz) => (
                        <option key={sz} value={sz}>{sz}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="c-sku" className="text-[10px]">Referência</Label>
                    <Input
                      id="c-sku"
                      placeholder="Ex: SKU-99"
                      className="h-8 text-xs bg-background"
                      value={customSku}
                      onChange={(e) => setCustomSku(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-end justify-between gap-3 mt-1">
                  <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor="c-color" className="text-[10px]">Cor vendida</Label>
                    <Input
                      id="c-color"
                      placeholder="Ex: Preto"
                      className="h-8 text-xs bg-background"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="h-8 bg-primary text-primary-foreground font-bold text-xs px-4"
                  >
                    Adicionar Item
                  </Button>
                </div>
              </div>
            ) : (
              /* PRODUCT SEARCH AND LISTING */
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="search-product"
                    type="text"
                    placeholder="Pesquisar por nome ou SKU..."
                    className="h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* FAST FILTER CHIPS */}
                <div className="flex flex-col gap-1.5 py-1">
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mr-1 shrink-0">Cat:</span>
                    {['Todos', ...CATEGORIES.slice(0, 5), 'Jaqueta', 'Conjunto'].map((cat) => {
                      const isSel = categoryFilter === cat
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-2 py-0.5 rounded-full text-[9px] border font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-transparent text-muted-foreground border-border hover:bg-muted/40'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mr-1 shrink-0">Tam:</span>
                    {['Todos', ...SIZES].map((sz) => {
                      const isSel = sizeFilter === sz
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSizeFilter(sz)}
                          className={`px-2 py-0.5 rounded-full text-[9px] border font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-transparent text-muted-foreground border-border hover:bg-muted/40'
                          }`}
                        >
                          {sz}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-1 border border-border rounded-lg bg-card/50 overflow-hidden">
                  <div className="max-h-[140px] overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="p-3 text-xs text-center text-muted-foreground">
                        Nenhum produto correspondente em estoque
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
                              <span>
                                {p.name} · {p.size}
                                {p.sku && <span className="ml-1 text-[9px] text-primary bg-primary/10 px-1 rounded font-mono">Ref: {p.sku}</span>}
                              </span>
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
              </>
            )}
          </div>

          {/* SELECTED ITEMS IN CART */}
          <div className="flex flex-col gap-2">
            <Label>Itens Selecionados ({totalItemsCount})</Label>
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="max-h-[200px] overflow-y-auto p-2 flex flex-col gap-2">
                {cartDetails.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Pesquise e adicione os produtos acima para montar a venda
                  </div>
                ) : (
                  cartDetails.map((item) => {
                    const isCustom = item.productId === null
                    const maxQty = isCustom ? 999 : item.product.quantity
                    const colorOptions = item.product.colors
                      ? item.product.colors.split(',').map((c) => c.trim()).filter(Boolean)
                      : []
                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col gap-2 p-2.5 rounded-lg border ${
                          isCustom ? 'border-dashed border-primary/30 bg-primary/5' : 'border-border/60 bg-muted/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                              {item.product.name} ({item.product.size})
                              {isCustom && <span className="text-[8px] bg-primary/10 text-primary border border-primary/20 px-1 rounded">Avulso</span>}
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
                                onClick={() => handleUpdateQuantity(item.id, -1, maxQty)}
                              >
                                –
                              </button>
                              <span className="w-5 text-center font-heading text-xs font-bold tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                className="h-6 w-6 flex items-center justify-center rounded text-sm hover:bg-muted font-bold cursor-pointer"
                                onClick={() => handleUpdateQuantity(item.id, 1, maxQty)}
                              >
                                +
                              </button>
                            </div>

                            <span className="text-xs font-heading font-extrabold text-foreground w-16 text-right tabular-nums">
                              {formatBRL(item.totalItemPrice)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                              aria-label={`Remover ${item.product.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* SELECT COLOR SPECIFIC TO CART ITEM */}
                        {isCustom ? (
                          item.color && (
                            <div className="text-[10px] text-muted-foreground">
                              Cor: <span className="font-semibold text-foreground">{item.color}</span>
                            </div>
                          )
                        ) : (
                          colorOptions.length > 0 && (
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
                                      onClick={() => handleUpdateColor(item.id, c)}
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
                          )
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* PAYMENT DETAILS */}
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

          {/* CLIENT NAME - ALWAYS VISIBLE */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="customer-name">
              Nome do Cliente {isPendingPayment ? '*' : '(Opcional)'}
            </Label>
            <Input
              id="customer-name"
              type="text"
              placeholder="Nome do comprador"
              className="h-10 text-xs"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* CONDITIONAL INSTALLMENTS */}
          {(isPendingPayment || payment === 'Cartão') && (
            <div className="flex flex-col gap-2 p-3 rounded-xl border border-border/80 bg-muted/10">
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
          )}

          {/* TOTAL BANNER */}
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
            {/* FIXED CONTRAST BUTTON: text-white instead of text-primary-foreground */}
            <Button
              type="submit"
              disabled={isPending || selectedItems.length === 0}
              className="bg-gradient-to-r from-brand-purple to-primary text-white font-bold cursor-pointer hover:scale-[1.01] transition-transform"
            >
              {isPending ? 'Registrando...' : 'Confirmar venda'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
