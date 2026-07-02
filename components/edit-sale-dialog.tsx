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
export interface EditSaleMovement extends Movement {
  items?: Movement[]
}

interface SaleItemState {
  id: number
  productId: number | null
  productName: string
  size: string
  sku: string | null
  quantity: number
  unitPrice: string
  color: string
  maxStock: number
}

export function EditSaleDialog({
  open,
  onOpenChange,
  sale,
  products,
  onUpdateSale,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: EditSaleMovement | null
  products: Product[]
  onUpdateSale: (
    id: number,
    input: {
      customerName?: string | null
      paymentMethod: string
      paymentStatus: string
      installments?: number
      amountPaid?: number
      items: {
        id: number
        quantity: number
        unitPrice: number
        color?: string | null
      }[]
    }
  ) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Pix')
  const [paymentStatus, setPaymentStatus] = useState('paid')
  const [installments, setInstallments] = useState(1)
  const [amountPaid, setAmountPaid] = useState('')
  const [itemsState, setItemsState] = useState<SaleItemState[]>([])

  useEffect(() => {
    if (sale && open) {
      setCustomerName(sale.customerName || '')
      setPaymentMethod(sale.paymentMethod)
      setPaymentStatus(sale.paymentStatus || 'paid')
      setInstallments(sale.installments || 1)
      setAmountPaid(
        Number(sale.amountPaid !== null && sale.amountPaid !== undefined ? sale.amountPaid : 0)
          .toString()
          .replace('.', ',')
      )

      const rawItems = sale.items && sale.items.length > 0 ? sale.items : [sale]
      const initialized = rawItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId) || null
        const mStock = prod ? prod.quantity + item.quantity : 999999
        return {
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          size: item.size,
          sku: item.sku || null,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice).toString().replace('.', ','),
          color: item.color || '',
          maxStock: mStock,
        }
      })
      setItemsState(initialized)
    }
  }, [sale, open, products])

  const totalCalculated = useMemo(() => {
    return itemsState.reduce((sum, item) => {
      const p = Number(item.unitPrice.replace(',', '.'))
      const price = Number.isNaN(p) ? 0 : p
      return sum + price * item.quantity
    }, 0)
  }, [itemsState])

  const getProductColorOptions = (productId: number | null) => {
    if (!productId) return []
    const prod = products.find((p) => p.id === productId)
    if (!prod?.colors) return []
    return prod.colors
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sale) return

    for (const item of itemsState) {
      const priceNum = Number(item.unitPrice.replace(',', '.'))

      if (item.quantity < 1 || !Number.isInteger(item.quantity)) {
        return toast.error(`A quantidade do item "${item.productName}" deve ser um número inteiro maior ou igual a 1`)
      }

      if (item.quantity > item.maxStock) {
        return toast.error(`Apenas ${item.maxStock} unidades disponíveis em estoque para "${item.productName}".`)
      }

      if (Number.isNaN(priceNum) || priceNum < 0) {
        return toast.error(`Informe um preço unitário válido para "${item.productName}"`)
      }
    }

    if (paymentStatus === 'pending' && !customerName.trim()) {
      return toast.error('Informe o nome do cliente para pagamentos pendentes')
    }

    const amtPaidNum = Number(amountPaid.replace(',', '.'))
    const finalAmountPaid =
      paymentStatus === 'paid' ? totalCalculated : Number.isNaN(amtPaidNum) ? 0 : amtPaidNum

    startTransition(async () => {
      try {
        await onUpdateSale(sale.id, {
          customerName: customerName.trim() || null,
          paymentMethod,
          paymentStatus,
          installments: paymentStatus === 'pending' || paymentMethod === 'Cartão' ? installments : 1,
          amountPaid: finalAmountPaid,
          items: itemsState.map((it) => ({
            id: it.id,
            quantity: it.quantity,
            unitPrice: Number(it.unitPrice.replace(',', '.')),
            color: it.color.trim() || null,
          })),
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
          {/* ITEMS LIST */}
          <div className="flex flex-col gap-4">
            {itemsState.map((item, index) => {
              const colors = getProductColorOptions(item.productId)
              return (
                <div key={item.id} className="p-3 border border-border bg-muted/20 rounded-xl flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {item.productName} ({item.size})
                        {item.productId === null && (
                          <span className="ml-1 text-[8px] bg-primary/10 text-primary border border-primary/20 px-1 rounded font-bold">
                            Avulso
                          </span>
                        )}
                      </p>
                      {item.sku && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Ref: {item.sku}
                        </p>
                      )}
                    </div>
                    {itemsState.length > 1 && (
                      <span className="text-[10px] bg-brand-purple/10 text-brand-purple px-2 py-0.5 rounded-full font-bold">
                        Item {index + 1}
                      </span>
                    )}
                  </div>

                  {/* QUANTITY & UNIT PRICE */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Quantidade</Label>
                      <div className="flex items-center gap-1.5 border border-border rounded-lg bg-background p-0.5">
                        <button
                          type="button"
                          className="h-8 w-8 flex items-center justify-center rounded text-sm hover:bg-muted font-bold cursor-pointer"
                          onClick={() => {
                            setItemsState((prev) =>
                              prev.map((it) =>
                                it.id === item.id
                                  ? { ...it, quantity: Math.max(1, it.quantity - 1) }
                                  : it
                              )
                            )
                          }}
                        >
                          –
                        </button>
                        <span className="flex-1 text-center font-heading text-xs font-bold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="h-8 w-8 flex items-center justify-center rounded text-sm hover:bg-muted font-bold cursor-pointer"
                          onClick={() => {
                            setItemsState((prev) =>
                              prev.map((it) =>
                                it.id === item.id
                                  ? { ...it, quantity: Math.min(it.maxStock, it.quantity + 1) }
                                  : it
                              )
                            )
                          }}
                        >
                          +
                        </button>
                      </div>
                      {item.productId && (
                        <span className="text-[9px] text-muted-foreground text-center">
                          Máximo: {item.maxStock} un.
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Valor Unitário (R$)</Label>
                      <Input
                        placeholder="0,00"
                        className="h-9 text-xs"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const val = e.target.value
                          setItemsState((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, unitPrice: val } : it))
                          )
                        }}
                      />
                    </div>
                  </div>

                  {/* COLOR */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Cor Vendida</Label>
                    {colors.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {colors.map((c) => {
                          const isSelected = item.color === c
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setItemsState((prev) =>
                                  prev.map((it) => (it.id === item.id ? { ...it, color: c } : it))
                                )
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] border font-bold transition-all cursor-pointer ${
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
                        placeholder="Ex: Preto"
                        className="h-9 text-xs"
                        value={item.color}
                        onChange={(e) => {
                          const val = e.target.value
                          setItemsState((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, color: val } : it))
                          )
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
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

          {/* CLIENT NAME - ALWAYS VISIBLE */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-customer-name">
              Nome do Cliente {isPendingPayment ? '*' : '(Opcional)'}
            </Label>
            <Input
              id="edit-customer-name"
              type="text"
              placeholder="Nome do comprador"
              className="h-9 text-xs"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* CONDITIONAL INSTALLMENTS */}
          {(isPendingPayment || paymentMethod === 'Cartão') && (
            <div className="flex flex-col gap-2 p-3 rounded-xl border border-border/80 bg-muted/10">
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
