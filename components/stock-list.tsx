'use client'

import { useState, useTransition } from 'react'
import {
  Minus,
  Plus,
  Trash2,
  PackagePlus,
  Package,
  Search,
  Share2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddProductDialog } from '@/components/add-product-dialog'
import { formatBRL, CATEGORIES, SIZES, type Product } from '@/lib/constants'

/**
 * Renders the product stock list with search inputs, category/size filter chips,
 * and handles empty state and product addition dialog.
 * Incorporates brand styles: deep purple headers, turquoise filter chips,
 * total capital value, and a WhatsApp restock share utility.
 *
 * @param props The component properties containing products list and state callbacks.
 * @returns The rendered React element.
 */
export function StockList({
  products,
  onAdjustStock,
  onDeleteProduct,
  onAddProduct,
}: {
  products: Product[]
  onAdjustStock: (id: number, delta: number) => Promise<void>
  onDeleteProduct: (id: number) => Promise<void>
  onAddProduct: (product: {
    name: string
    category: string
    size: string
    quantity: number
    price: number
  }) => Promise<void>
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [selectedSize, setSelectedSize] = useState<string>('Todos')

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === 'Todos' || product.category === selectedCategory
    const matchesSize = selectedSize === 'Todos' || product.size === selectedSize
    return matchesSearch && matchesCategory && matchesSize
  })

  const totalStockValue = products.reduce(
    (acc, p) => acc + Number(p.price) * p.quantity,
    0
  )

  function handleClearFilters() {
    setSearchQuery('')
    setSelectedCategory('Todos')
    setSelectedSize('Todos')
  }

  function handleShareWhatsApp() {
    const lowStockItems = products.filter((p) => p.quantity < 3)
    if (lowStockItems.length === 0) {
      toast.info('Nenhum item com estoque baixo no momento.')
      return
    }

    let text = '*Amo Fit - Lista de Reposição* 🛍️\n\nPrecisa repor:\n'
    for (const p of lowStockItems) {
      text += `• *${p.name}* (${p.size}) - ${p.quantity} un. em estoque\n`
    }

    navigator.clipboard.writeText(text)
    toast.success('Lista de reposição copiada!')
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      '_blank'
    )
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-heading text-lg font-bold text-brand-purple flex items-center flex-wrap gap-x-2 gap-y-1">
          <span>Estoque</span>
          <span className="text-xs font-semibold text-muted-foreground">
            {filteredProducts.length} de {products.length}{' '}
            {products.length === 1 ? 'item' : 'itens'}
          </span>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full shrink-0">
            Total: {formatBRL(totalStockValue)}
          </span>
        </h2>
        <div className="flex items-center gap-1.5">
          {products.some((p) => p.quantity < 3) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleShareWhatsApp}
              className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5 h-8 rounded-lg"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Lista WhatsApp</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="bg-brand-purple text-brand-purple-foreground hover:bg-brand-purple/90 h-8 rounded-lg"
          >
            <PackagePlus className="h-4 w-4" />
            <span className="ml-1.5">Adicionar</span>
          </Button>
        </div>
      </div>

      {products.length > 0 && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar produto por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm font-medium text-foreground outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="mb-6 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-brand-purple/70 uppercase tracking-wider">
                Categoria
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                <Button
                  size="sm"
                  variant={selectedCategory === 'Todos' ? 'default' : 'outline'}
                  className={`rounded-full h-8 px-3.5 text-xs font-semibold shrink-0 transition-all ${
                    selectedCategory === 'Todos'
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                  onClick={() => setSelectedCategory('Todos')}
                >
                  Todos
                </Button>
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    className={`rounded-full h-8 px-3.5 text-xs font-semibold shrink-0 transition-all ${
                      selectedCategory === cat
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-brand-purple/70 uppercase tracking-wider">
                Tamanho
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                <Button
                  size="sm"
                  variant={selectedSize === 'Todos' ? 'default' : 'outline'}
                  className={`rounded-full h-8 px-3.5 text-xs font-semibold shrink-0 transition-all ${
                    selectedSize === 'Todos'
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                  onClick={() => setSelectedSize('Todos')}
                >
                  Todos
                </Button>
                {SIZES.map((size) => (
                  <Button
                    key={size}
                    size="sm"
                    variant={selectedSize === size ? 'default' : 'outline'}
                    className={`rounded-full h-8 px-3.5 text-xs font-semibold shrink-0 transition-all ${
                      selectedSize === size
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {products.length === 0 ? (
        <EmptyStock onAdd={() => setAddOpen(true)} />
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
          <p className="font-semibold text-foreground">
            Nenhum produto encontrado
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Tente ajustar a busca ou os filtros de categoria e tamanho.
          </p>
          <Button
            variant="outline"
            className="mt-4 border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleClearFilters}
          >
            Limpar Filtros
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdjustStock={onAdjustStock}
              onDeleteProduct={onDeleteProduct}
            />
          ))}
        </ul>
      )}

      <AddProductDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAddProduct={onAddProduct}
      />
    </section>
  )
}

/**
 * Renders an individual product card item showing details, stock adjustments,
 * deletion capability, and low stock warnings.
 *
 * @param props The product item to render along with callbacks.
 * @returns The rendered React element.
 */
function ProductCard({
  product,
  onAdjustStock,
  onDeleteProduct,
}: {
  product: Product
  onAdjustStock: (id: number, delta: number) => Promise<void>
  onDeleteProduct: (id: number) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const lowStock = product.quantity < 3

  function handleAdjust(delta: number) {
    startTransition(async () => {
      try {
        await onAdjustStock(product.id, delta)
      } catch {
        toast.error('Não foi possível ajustar o estoque')
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await onDeleteProduct(product.id)
        toast.success('Produto removido')
      } catch {
        toast.error('Não foi possível remover o produto')
      }
    })
  }

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-foreground">
            {product.name}
          </p>
          <Badge variant="secondary" className="shrink-0">
            {product.size}
          </Badge>
          {lowStock && (
            <Badge
              className={`shrink-0 font-bold border text-[10px] px-1.5 py-0.5 ${
                product.quantity === 0
                  ? 'bg-red-500/15 text-red-600 border-red-500/30 dark:bg-red-950/40 dark:text-red-400 dark:border-red-500/20'
                  : 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-500/20'
              }`}
            >
              Estoque Baixo
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>{product.category}</span>
          <span aria-hidden>•</span>
          <span className="font-medium text-foreground">
            {formatBRL(Number(product.price))}
          </span>
        </div>
        <p className="mt-1 text-xs">
          {lowStock ? (
            <span className="font-medium text-destructive">
              Estoque baixo: {product.quantity} un.
            </span>
          ) : (
            <span className="text-muted-foreground">
              {product.quantity} em estoque
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 rounded-full hover:bg-muted"
          onClick={() => handleAdjust(-1)}
          disabled={isPending || product.quantity === 0}
          aria-label={`Diminuir estoque de ${product.name}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center font-heading text-lg font-bold tabular-nums text-foreground">
          {product.quantity}
        </span>
        <Button
          size="icon"
          className="h-9 w-9 rounded-full bg-brand-purple text-brand-purple-foreground hover:bg-brand-purple/90"
          onClick={() => handleAdjust(1)}
          disabled={isPending}
          aria-label={`Aumentar estoque de ${product.name}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Remover ${product.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  )
}

/**
 * Renders the visual UI when the product stock list is completely empty.
 *
 * @param props The trigger actions when adding a product.
 * @returns The rendered React element.
 */
function EmptyStock({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Package className="h-7 w-7 text-brand-purple" />
      </div>
      <p className="mt-4 font-semibold text-foreground">
        Seu estoque está vazio
      </p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Adicione seus produtos fitness para começar a registrar vendas.
      </p>
      <Button
        className="mt-4 bg-brand-purple text-brand-purple-foreground hover:bg-brand-purple/90"
        onClick={onAdd}
      >
        <PackagePlus className="h-4 w-4" />
        <span className="ml-1.5">Adicionar primeiro produto</span>
      </Button>
    </div>
  )
}
