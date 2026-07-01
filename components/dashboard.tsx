'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingBag,
  Undo2,
  LogOut,
  RefreshCw,
  AlertTriangle,
  Package,
} from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { SummaryHeader } from '@/components/summary-header'
import { StockList } from '@/components/stock-list'
import { RecentMovements } from '@/components/recent-movements'
import { Insights } from '@/components/insights'
import { RecentHistory } from '@/components/recent-history'
import { SaleDialog } from '@/components/sale-dialog'
import { ReturnDialog } from '@/components/return-dialog'
import { SalesHistoryDialog } from '@/components/sales-history-dialog'
import { ProductsListDialog } from '@/components/products-list-dialog'
import { EditProductDialog } from '@/components/edit-product-dialog'
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
  const [salesHistoryOpen, setSalesHistoryOpen] = useState(false)
  const [productsListOpen, setProductsListOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()


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
      router.refresh()
    } catch (err) {
      console.error('Failed to create product:', err)
      throw err
    }
  }

  const handleAdjustStock = async (id: number, delta: number) => {
    try {
      await adjustStock(id, delta)
      router.refresh()
    } catch (err) {
      console.error('Failed to adjust stock:', err)
      throw err
    }
  }

  const handleDeleteProduct = async (id: number) => {
    try {
      await deleteProduct(id)
      router.refresh()
    } catch (err) {
      console.error('Failed to delete product:', err)
      throw err
    }
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
      router.refresh()
    } catch (err) {
      console.error('Failed to update product:', err)
      throw err
    }
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
      router.refresh()
    } catch (err) {
      console.error('Failed to register sale:', err)
      throw err
    }
  }

  /**
   * Marks a pending sale movement as paid in both the database and client-side storage.
   * Can accept optional partial amount paid.
   *
   * @param saleId The database ID of the sale to be marked as paid.
   * @param amount The optional amount received.
   */
  const handleMarkSaleAsPaid = async (saleId: number, amount?: number) => {
    try {
      const response = await markSaleAsPaid(saleId, amount)
      if (response && !response.success && response.error) {
        throw new Error(response.error.message)
      }
      router.refresh()
    } catch (err) {
      console.error('Failed to mark sale as paid:', err)
      throw err
    }
  }

  const handleRegisterReturn = async (productId: number, qty: number) => {
    try {
      await registerReturn({ productId, quantity: qty })
      router.refresh()
    } catch (err) {
      console.error('Failed to register return:', err)
      throw err
    }
  }

  const handleUndoMovement = async (movementId: number) => {
    try {
      const response = await undoMovement(movementId)
      if (response && !response.success && response.error) {
        throw new Error(response.error.message)
      }
      router.refresh()
    } catch (err) {
      console.error('Failed to undo movement:', err)
      throw err
    }
  }

  const handleClearTodaySales = () => {
    startTransition(async () => {
      try {
        const response = await clearTodaySales()
        if (response && !response.success && response.error) {
          throw new Error(response.error.message)
        }
        toast.success('Caixa zerado para o novo dia!')
        setResetConfirmOpen(false)
        router.refresh()
      } catch (err) {
        console.error('Failed to clear today sales:', err)
        toast.error('Não foi possível zerar o caixa. Verifique sua conexão.')
      }
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

        <SummaryHeader userName={userName} summary={summary} />

        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setSaleOpen(true)}
            disabled={products.length === 0}
            className="group flex items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-purple to-primary p-5 text-left text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
              <ShoppingBag className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight">
                Registrar Venda
              </span>
              <span className="block text-sm text-white/80 font-medium">
                Dá baixa no estoque
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setReturnOpen(true)}
            disabled={products.length === 0}
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

          <button
            type="button"
            onClick={() => setSalesHistoryOpen(true)}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left text-card-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-muted/40 active:scale-[0.99]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <ShoppingBag className="h-6 w-6 text-brand-purple" />
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight text-brand-purple">
                Ver Vendas
              </span>
              <span className="block text-sm text-muted-foreground font-medium">
                Histórico e fiados
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProductsListOpen(true)}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left text-card-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-muted/40 active:scale-[0.99]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Package className="h-6 w-6 text-brand-purple" />
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight text-brand-purple">
                Ver Produtos
              </span>
              <span className="block text-sm text-muted-foreground font-medium">
                Tabela e estoque
              </span>
            </span>
          </button>
        </section>

        <RecentHistory
          movements={movements}
          onUndoMovement={handleUndoMovement}
          onMarkSaleAsPaid={handleMarkSaleAsPaid}
        />

        <StockList
          products={products}
          onAdjustStock={handleAdjustStock}
          onDeleteProduct={handleDeleteProduct}
          onAddProduct={handleAddProduct}
          onEditProduct={(p) => {
            setEditProduct(p)
            setEditOpen(true)
          }}
        />

        <RecentMovements movements={movements} />

        <Insights products={products} movements={movements} />

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
        products={products}
        onRegisterSale={handleRegisterSale}
      />
      <ReturnDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        products={products}
        onRegisterReturn={handleRegisterReturn}
      />
      <SalesHistoryDialog
        open={salesHistoryOpen}
        onOpenChange={setSalesHistoryOpen}
        movements={movements}
        onMarkSaleAsPaid={handleMarkSaleAsPaid}
        onUndoMovement={handleUndoMovement}
      />
      <ProductsListDialog
        open={productsListOpen}
        onOpenChange={setProductsListOpen}
        products={products}
        onAdjustStock={handleAdjustStock}
        onDeleteProduct={handleDeleteProduct}
        onEditProduct={(p) => {
          setEditProduct(p)
          setEditOpen(true)
        }}
      />
      <EditProductDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        product={editProduct}
        onUpdateProduct={handleUpdateProduct}
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
