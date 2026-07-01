'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import { toast } from 'sonner'
import { ShoppingBag } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAYMENT_METHODS, formatBRL, type Movement, type Product } from '@/lib/constants'

/**
 * Dialog component to edit properties of an existing sale.
 *
 * @param props Component properties containing dialog open state, sale info, product list, and update callback.
 * @returns The rendered React element.
 */
export function EditSaleDialog({
  open,
  onOpenChange,
  sale,
  products,
  onUpdateSale,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: Movement | null
  products: Product[]
  onUpdateSale: (
    id: number,
    input: {
      customerName?: string | null
      quantity: number
      unitPrice: number
      color?: string | null
      paymentMethod: string
      paymentStatus: string
      installments?: number
      amountPaid?: number
    }
  ) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [customerName, setCustomerName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState('')
  const [color, setColor] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Pix')
  const [paymentStatus, setPaymentStatus] = useState('paid')
  const [installments, setInstallments] = useState(1)
  const [amountPaid, setAmountPaid] = useState('')

  // Find associated product if any
  const associatedProduct = useMemo(() => {
    if (!sale || !sale.productId) return null
    return products.find((p) => p.id === sale.productId) || null
  }, [sale, products])

  // Get available colors for the product
  const colorOptions = useMemo(() => {
    if (!associatedProduct?.colors) return []
    return associatedProduct.colors
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
  }, [associatedProduct])

  // Calculate maximum allowed stock: current stock + already sold quantity
  const maxStock = useMemo(() => {
    if (!associatedProduct) return 999999
    return associatedProduct.quantity + (sale?.quantity || 0)
  }, [associatedProduct, sale])

  useEffect(() => {
    if (sale && open) {
      setCustomerName(sale.customerName || '')
      setQuantity(sale.quantity)
      setUnitPrice(Number(sale.unitPrice).toString().replace('.', ','))
      setColor(sale.color || '')
      setPaymentMethod(sale.paymentMethod)
      setPaymentStatus(sale.paymentStatus || 'paid')
      setInstallments(sale.installments || 1)
      setAmountPaid(Number(sale.amountPaid || sale.total).toString().replace('.', ','))
    }
  }, [sale, open])

  // Recalculate total dynamically
  const parsedUnitPrice = useMemo(() => {
    const p = Number(unitPrice.replace(',', '.'))
    return Number.isNaN(p) ? 0 : p
  }, [unitPrice])

  const totalCalculated = useMemo(() => {
    return parsedUnitPrice * quantity
  }, [parsedUnitPrice, quantity])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sale) return

    const priceNum = parsedUnitPrice
    const amtPaidNum = Number(amountPaid.replace(',', '.'))

    if (quantity < 1 || !Number.isInteger(quantity)) {
      return toast.error('A quantidade deve ser um número inteiro maior ou igual a 1')
    }

    if (quantity > maxStock) {
      return toast.error(`Apenas ${maxStock} unidades disponíveis em estoque.`)
    }

    if (Number.isNaN(priceNum) || priceNum < 0) {
      return toast.error('Informe um preço unitário válido')
    }

    if (paymentStatus === 'pending' && !customerName.trim()) {
      return toast.error('Informe o nome do cliente para pagamentos pendentes')
    }

    const finalAmountPaid = paymentStatus === 'paid' ? totalCalculated : Number.isNaN(amtPaidNum) ? 0 : amtPaidNum

    startTransition(async () => {
      try {
        await onUpdateSale(sale.id, {
          customerName: customerName.trim() || null,
          quantity,
          unitPrice: priceNum,
          color: color.trim() || null,
          paymentMethod,
          paymentStatus,
          installments: paymentStatus === 'pending' || paymentMethod === 'Cartão' ? installments : 1,
          amountPaid: finalAmountPaid,
        })
        toast.success('Venda atualizada com sucesso')
        onOpenChange(false)
      } catch (err) {
        let msg = 'Não foi possível atualizar a venda.'
        if (err instanceof Error) {
          if (err.message === 'SALES_UPDATE_409' || err.message === 'INSUFFICIENT_STOCK') {
            msg = 'Estoque insuficiente para a quantidade selecionada.'
          } else if (err.message === 'SALES_UPDATE_404' || err.message === 'SALE_NOT_FOUND') {
            msg = 'Venda não encontrada.'
          } else {
            msg = `Erro: ${err.message}`
          }
        }
        toast.error(msg)
      }
    })
  }

  const isPendingPayment = paymentStatus === 'pending'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Editar Venda</DialogTitle>
              <DialogDescription>
                Altere as informações desta venda e os dados de recebimento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* PRODUCT NAME DISPLAY ONLY */}
          <div className="p-3 bg-muted/30 border border-border/60 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
              Produto Vendido
            </p>
            <p className="text-xs font-bold text-foreground">
              {sale?.productName} ({sale?.size})
              {sale?.productId === null && (
                <span className="ml-1 text-[8px] bg-primary/10 text-primary border border-primary/20 px-1 rounded">
                  Avulso
                </span>
              )}
            </p>
            {sale?.sku && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Ref: {sale.sku}
              </p>
            )}
          </div>

          {/* QUANTITY & UNIT PRICE */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-sale-qty">Quantidade</Label>
              <div className="flex items-center gap-1.5 border border-border rounded-lg bg-background p-0.5">
                <button
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded text-sm hover:bg-muted font-bold cursor-pointer"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  –
                </button>
                <span className="flex-1 text-center font-heading text-xs font-bold tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded text-sm hover:bg-muted font-bold cursor-pointer"
                  onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                >
                  +
                </button>
              </div>
              {associatedProduct && (
                <span className="text-[10px] text-muted-foreground text-center">
                  Máximo: {maxStock} un.
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-sale-price">Valor Unitário (R$)</Label>
              <Input
                id="edit-sale-price"
                placeholder="0,00"
                className="h-9 text-xs"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>

          {/* COLOR */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-sale-color">Cor Vendida</Label>
            {colorOptions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {colorOptions.map((c) => {
                  const isSelected = color === c
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`px-3 py-1 rounded-lg text-xs border font-bold transition-all cursor-pointer ${
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
            ) : (
              <Input
                id="edit-sale-color"
                placeholder="Ex: Preto"
                className="h-9 text-xs"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            )}
          </div>

          {/* PAYMENT DETAILS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Forma de Pagamento</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {PAYMENT_METHODS.map((m) => {
                  const isSelected = paymentMethod === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`h-9 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
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
                  onClick={() => setPaymentStatus('paid')}
                  className={`h-9 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                    paymentStatus === 'paid'
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-transparent text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  Pago
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('pending')}
                  className={`h-9 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                    paymentStatus === 'pending'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm dark:bg-amber-600'
                      : 'bg-transparent text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  Pendente
                </button>
              </div>
            </div>
          </div>

          {/* CONDITIONAL PENDING DETS */}
          {(isPendingPayment || paymentMethod === 'Cartão') && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl border border-border/80 bg-muted/10">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="edit-customer-name">Nome do Cliente *</Label>
                <Input
                  id="edit-customer-name"
                  type="text"
                  placeholder="Nome do comprador"
                  className="h-9 text-xs"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-installments">Parcelas</Label>
                <Select
                  value={String(installments)}
                  onValueChange={(v) => setInstallments(Number(v) || 1)}
                >
                  <SelectTrigger id="edit-installments" className="h-9 text-xs bg-background">
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

          {/* DYNAMIC AMOUNT PAID IN PENDING SALES */}
          {isPendingPayment && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-amount-paid">Valor Pago até Agora (R$)</Label>
              <Input
                id="edit-amount-paid"
                placeholder="0,00"
                className="h-9 text-xs"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>
          )}

          {/* TOTAL BANNER */}
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary/10 to-brand-purple/10 border border-primary/20 px-4 py-3 mt-1 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                {isPendingPayment ? 'Valor Pago / Total' : 'Valor Total Atualizado'}
              </span>
              <span className="text-xs font-semibold text-brand-purple/80 dark:text-primary-foreground/85">
                {paymentMethod} {isPendingPayment ? 'Pendente' : 'Pago'}
                {installments > 1 && ` em ${installments}x`}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-heading text-xl font-black text-brand-purple dark:text-primary">
                {formatBRL(totalCalculated)}
              </span>
              {isPendingPayment && (
                <span className="text-[10px] text-emerald-600 font-bold">
                  Amortizado: {formatBRL(Number(amountPaid.replace(',', '.')) || 0)}
                </span>
              )}
            </div>
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
              disabled={isPending}
              className="bg-gradient-to-r from-brand-purple to-primary text-white font-bold cursor-pointer hover:scale-[1.01] transition-transform"
            >
              {isPending ? 'Salvando...' : 'Confirmar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
