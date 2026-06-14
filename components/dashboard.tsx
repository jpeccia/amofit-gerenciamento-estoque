'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingBag,
  Undo2,
  LogOut,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { SummaryHeader } from '@/components/summary-header'
import { StockList } from '@/components/stock-list'
import { RecentMovements } from '@/components/recent-movements'
import { RecentHistory } from '@/components/recent-history'
import { SaleDialog } from '@/components/sale-dialog'
import { ReturnDialog } from '@/components/return-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  registerSale,
  registerReturn,
  undoMovement,
  clearTodaySales,
  markSaleAsPaid,
} from '@/app/actions/sales'
import { createProduct, adjustStock, deleteProduct, updateProduct } from '@/app/actions/products'
import type { Movement, Product, Summary } from '@/lib/constants'

/**
 * Recalculates today's summary metrics using the list of movements.
 *
 * @param movementsList The list of all movements.
 * @returns The recalculated Summary object.
 */
function recalculateSummary(movementsList: Movement[]): Summary {
  const today = new Date()
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime()
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000

  const todayMovements = movementsList.filter((m) => {
    const time = new Date(m.createdAt).getTime()
    return time >= startOfDay && time < endOfDay
  })

  const countSales = todayMovements.filter((m) => m.type === 'sale').length
  const countReturns = todayMovements.filter((m) => m.type === 'return').length

  let totalSales = 0
  let itemsSold = 0
  let totalPending = 0
  const paymentBreakdown = {
    Pix: 0,
    'Cartão': 0,
    Dinheiro: 0,
  }

  for (const m of todayMovements) {
    if (m.type === 'sale') {
      const val = Number(m.total)
      totalSales += val
      itemsSold += m.quantity
      if (m.paymentStatus === 'pending') {
        totalPending += val
      }
      if (m.paymentMethod === 'Pix') {
        paymentBreakdown.Pix += val
      } else if (m.paymentMethod === 'Cartão') {
        paymentBreakdown['Cartão'] += val
      } else if (m.paymentMethod === 'Dinheiro') {
        paymentBreakdown.Dinheiro += val
      }
    }
  }

  return {
    totalSales,
    countSales,
    countReturns,
    itemsSold,
    totalPending,
    paymentBreakdown,
  }
}

/**
 * Main dashboard component rendering summary headers, quick actions,
 * stock tables, daily history list, and resets. Uses localStorage simulation fallback.
 * Aligning with visual branding constraints (turquoise accent & deep purple).
 *
 * @param props Default initial data sent from the Next.js server component.
 * @returns The rendered React element.
 */
export function Dashboard({
  userName,
  products,
  summary,
  movements,
}: {
  userName: string
  products: Product[]
  summary: Summary
  movements: Movement[]
}) {
  const router = useRouter()
  const [saleOpen, setSaleOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [localProducts, setLocalProducts] = useState<Product[]>(products)
  const [localMovements, setLocalMovements] = useState<Movement[]>(movements)
  const [localSummary, setLocalSummary] = useState<Summary>(summary)

  useEffect(() => {
    setLocalProducts(products)
    localStorage.setItem('amofit_products', JSON.stringify(products))
  }, [products])

  useEffect(() => {
    setLocalMovements(movements)
    localStorage.setItem('amofit_movements', JSON.stringify(movements))
  }, [movements])

  useEffect(() => {
    setLocalSummary(summary)
    localStorage.setItem('amofit_summary', JSON.stringify(summary))
  }, [summary])

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const handleAddProduct = async (input: {
    name: string
    category: string
    size: string
    quantity: number
    price: number
    colors?: string
  }) => {
    try {
      await createProduct(input)
    } catch (err) {
      console.warn('Backend sync failed, running client simulation:', err)
    }

    const mockProduct: Product = {
      id: Date.now(),
      userId: userName,
      name: input.name.trim(),
      category: input.category,
      size: input.size,
      quantity: Math.max(0, Math.floor(input.quantity)),
      price: input.price.toFixed(2),
      colors: input.colors || null,
      createdAt: new Date(),
    }

    const updated = [...localProducts, mockProduct].sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    setLocalProducts(updated)
    localStorage.setItem('amofit_products', JSON.stringify(updated))
  }

  const handleAdjustStock = async (id: number, delta: number) => {
    try {
      await adjustStock(id, delta)
    } catch (err) {
      console.warn('Backend sync failed, running client simulation:', err)
    }

    const updated = localProducts.map((p) => {
      if (p.id === id) {
        return { ...p, quantity: Math.max(0, p.quantity + delta) }
      }
      return p
    })

    setLocalProducts(updated)
    localStorage.setItem('amofit_products', JSON.stringify(updated))
  }

  const handleDeleteProduct = async (id: number) => {
    try {
      await deleteProduct(id)
    } catch (err) {
      console.warn('Backend sync failed, running client simulation:', err)
    }

    const updated = localProducts.filter((p) => p.id !== id)
    setLocalProducts(updated)
    localStorage.setItem('amofit_products', JSON.stringify(updated))
  }

  /**
   * Updates a product's details both in the backend database and local state/storage.
   *
   * @param id The product database ID.
   * @param input The updated values including name, category, size, price, and optional colors.
   */
  const handleUpdateProduct = async (
    id: number,
    input: {
      name: string
      category: string
      size: string
      price: number
      colors?: string
    }
  ) => {
    try {
      await updateProduct(id, input)
    } catch (err) {
      console.warn('Backend sync failed, running client simulation:', err)
    }

    const updated = localProducts
      .map((p) => {
        if (p.id === id) {
          return {
            ...p,
            name: input.name.trim(),
            category: input.category,
            size: input.size,
            price: input.price.toFixed(2),
            colors: input.colors || null,
          }
        }
        return p
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    setLocalProducts(updated)
    localStorage.setItem('amofit_products', JSON.stringify(updated))
  }

  /**
   * Registers a sale with multiple products, both syncing to backend (if online)
   * and simulating locally for PWA/offline availability.
   *
   * @param items The array of selected items with their product IDs, quantities, and selected color.
   * @param paymentMethod The selected payment method string.
   * @param installments Optional number of installments for the sale.
   * @param paymentStatus Optional payment status ('paid' or 'pending').
   * @param customerName Optional name of the customer.
   */
  const handleRegisterSale = async (
    items: { productId: number; quantity: number; color?: string }[],
    paymentMethod: string,
    installments?: number,
    paymentStatus?: string,
    customerName?: string
  ) => {
    try {
      const response = await registerSale({
        items,
        paymentMethod,
        installments,
        paymentStatus,
        customerName,
      })
      if (response && !response.success && response.error) {
        throw new Error(response.error.message)
      }
    } catch (err) {
      console.warn('Backend sync failed, running client simulation:', err)
    }

    let updatedProducts = [...localProducts]
    const newMovements: Movement[] = []

    for (const item of items) {
      const targetProduct = updatedProducts.find((p) => p.id === item.productId)
      if (!targetProduct) {
        throw new Error('Produto não encontrado')
      }

      updatedProducts = updatedProducts.map((p) => {
        if (p.id === item.productId) {
          return { ...p, quantity: Math.max(0, p.quantity - item.quantity) }
        }
        return p
      })

      newMovements.push({
        id: Date.now() + Math.random(),
        userId: userName,
        productId: item.productId,
        productName: targetProduct.name,
        category: targetProduct.category,
        size: targetProduct.size,
        quantity: item.quantity,
        unitPrice: targetProduct.price,
        total: (Number(targetProduct.price) * item.quantity).toFixed(2),
        paymentMethod,
        color: item.color || null,
        installments: installments || 1,
        paymentStatus: paymentStatus || 'paid',
        customerName: customerName || null,
        type: 'sale',
        createdAt: new Date(),
      })
    }

    const updatedMovements = [...newMovements, ...localMovements]
    const updatedSummary = recalculateSummary(updatedMovements)

    setLocalProducts(updatedProducts)
    setLocalMovements(updatedMovements)
    setLocalSummary(updatedSummary)

    localStorage.setItem('amofit_products', JSON.stringify(updatedProducts))
    localStorage.setItem('amofit_movements', JSON.stringify(updatedMovements))
    localStorage.setItem('amofit_summary', JSON.stringify(updatedSummary))
  }

  /**
   * Marks a pending sale movement as paid in both the database and client-side storage.
   *
   * @param saleId The database ID of the sale to be marked as paid.
   */
  const handleMarkSaleAsPaid = async (saleId: number) => {
    try {
      const response = await markSaleAsPaid(saleId)
      if (response && !response.success && response.error) {
        throw new Error(response.error.message)
      }
    } catch (err) {
      console.warn('Backend sync failed, running client simulation:', err)
    }

    const updatedMovements = localMovements.map((m) => {
      if (m.id === saleId) {
        return { ...m, paymentStatus: 'paid' }
      }
      return m
    })

    const updatedSummary = recalculateSummary(updatedMovements)

    setLocalMovements(updatedMovements)
    setLocalSummary(updatedSummary)

    localStorage.setItem('amofit_movements', JSON.stringify(updatedMovements))
    localStorage.setItem('amofit_summary', JSON.stringify(updatedSummary))
  }

  const handleRegisterReturn = async (productId: number, qty: number) => {
    try {
      await registerReturn({ productId, quantity: qty })
    } catch (err) {
      console.warn('Backend sync failed, running client simulation:', err)
    }

    const targetProduct = localProducts.find((p) => p.id === productId)
    if (!targetProduct) {
      throw new Error('Produto não encontrado')
    }

    const updatedProducts = localProducts.map((p) => {
      if (p.id === productId) {
        return { ...p, quantity: p.quantity + qty }
      }
      return p
    })

    const newMovement: Movement = {
      id: Date.now(),
      userId: userName,
      productId,
      productName: targetProduct.name,
      category: targetProduct.category,
      size: targetProduct.size,
      quantity: qty,
      unitPrice: targetProduct.price,
      total: '0.00',
      paymentMethod: '—',
      type: 'return',
      createdAt: new Date(),
    }

    const updatedMovements = [newMovement, ...localMovements]
    const updatedSummary = recalculateSummary(updatedMovements)

    setLocalProducts(updatedProducts)
    setLocalMovements(updatedMovements)
    setLocalSummary(updatedSummary)

    localStorage.setItem('amofit_products', JSON.stringify(updatedProducts))
    localStorage.setItem('amofit_movements', JSON.stringify(updatedMovements))
    localStorage.setItem('amofit_summary', JSON.stringify(updatedSummary))
  }

  const handleUndoMovement = async (movementId: number) => {
    try {
      await undoMovement(movementId)
    } catch (err) {
      console.warn('Backend sync failed, running client simulation:', err)
    }

    const targetMovement = localMovements.find((m) => m.id === movementId)
    if (!targetMovement) {
      throw new Error('Movimentação não encontrada')
    }

    const updatedProducts = localProducts.map((p) => {
      if (p.id === targetMovement.productId) {
        const qtyDiff = targetMovement.quantity
        const newQty =
          targetMovement.type === 'sale'
            ? p.quantity + qtyDiff
            : Math.max(0, p.quantity - qtyDiff)
        return { ...p, quantity: newQty }
      }
      return p
    })

    const updatedMovements = localMovements.filter((m) => m.id !== movementId)
    const updatedSummary = recalculateSummary(updatedMovements)

    setLocalProducts(updatedProducts)
    setLocalMovements(updatedMovements)
    setLocalSummary(updatedSummary)

    localStorage.setItem('amofit_products', JSON.stringify(updatedProducts))
    localStorage.setItem('amofit_movements', JSON.stringify(updatedMovements))
    localStorage.setItem('amofit_summary', JSON.stringify(updatedSummary))
  }

  const handleClearTodaySales = () => {
    startTransition(async () => {
      try {
        await clearTodaySales()
      } catch (err) {
        console.warn('Backend sync failed, running client simulation:', err)
      }

      const today = new Date()
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ).getTime()

      const updatedMovements = localMovements.filter((m) => {
        const time = new Date(m.createdAt).getTime()
        return !(time >= startOfDay)
      })

      const updatedSummary = recalculateSummary(updatedMovements)

      setLocalMovements(updatedMovements)
      setLocalSummary(updatedSummary)

      localStorage.setItem('amofit_movements', JSON.stringify(updatedMovements))
      localStorage.setItem('amofit_summary', JSON.stringify(updatedSummary))

      toast.success('Caixa zerado para o novo dia!')
      setResetConfirmOpen(false)
    })
  }

  return (
    <div className="min-h-svh bg-background flex flex-col justify-between">
      <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-6 flex-1">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logoamofit.jpeg"
              alt="AMÔFIT"
              className="h-24 w-auto object-contain mix-blend-multiply"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Sair</span>
          </Button>
        </header>

        <SummaryHeader userName={userName} summary={localSummary} />

        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSaleOpen(true)}
            disabled={localProducts.length === 0}
            className="group flex items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-purple to-primary p-5 text-left text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
              <ShoppingBag className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight">
                Registrar Venda
              </span>
              <span className="block text-sm text-primary-foreground/80 font-medium">
                Dá baixa no estoque
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setReturnOpen(true)}
            disabled={localProducts.length === 0}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left text-card-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-muted/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Undo2 className="h-6 w-6 text-brand-purple" />
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight text-brand-purple">
                Registrar Retorno
              </span>
              <span className="block text-sm text-muted-foreground font-medium">
                Item voltou pra arara
              </span>
            </span>
          </button>
        </section>

        <RecentHistory
          movements={localMovements}
          onUndoMovement={handleUndoMovement}
          onMarkSaleAsPaid={handleMarkSaleAsPaid}
        />

        <StockList
          products={localProducts}
          onAdjustStock={handleAdjustStock}
          onDeleteProduct={handleDeleteProduct}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
        />

        <RecentMovements movements={localMovements} />

        <div className="mt-12 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2 rounded-2xl h-12 px-6 font-bold"
            onClick={() => setResetConfirmOpen(true)}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Zerar Caixa / Iniciar Novo Dia</span>
          </Button>
        </div>
      </div>

      <footer className="py-6 text-center border-t border-border bg-card/30">
        <p className="font-serif text-sm text-muted-foreground/60 font-extrabold tracking-widest">
          — SE AME. SE MOVA. —
        </p>
      </footer>

      <SaleDialog
        open={saleOpen}
        onOpenChange={setSaleOpen}
        products={localProducts}
        onRegisterSale={handleRegisterSale}
      />
      <ReturnDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        products={localProducts}
        onRegisterReturn={handleRegisterReturn}
      />

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle>Zerar Caixa do Dia?</DialogTitle>
            <DialogDescription>
              Isso limpará permanentemente o histórico de vendas de hoje e
              redefinirá o faturamento diário para R$ 0,00. O estoque dos seus
              produtos não será alterado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleClearTodaySales}
            >
              {isPending ? 'Zerando...' : 'Confirmar e Iniciar Novo Dia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
