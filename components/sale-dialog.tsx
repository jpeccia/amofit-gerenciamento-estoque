'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAYMENT_METHODS, formatBRL, type Product } from '@/lib/constants'

/**
 * Dialog component to register a new sale.
 *
 * @param props Component properties containing products, dialog open state, and sale callback.
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
    productId: number,
    quantity: number,
    paymentMethod: string
  ) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [productId, setProductId] = useState<string>('')
  const [quantity, setQuantity] = useState('1')
  const [payment, setPayment] = useState<string>(PAYMENT_METHODS[0])

  const available = useMemo(
    () => products.filter((p) => p.quantity > 0),
    [products]
  )
  const selected = products.find((p) => String(p.id) === productId)
  const qtyNum = Number(quantity) || 0
  const total = selected ? Number(selected.price) * qtyNum : 0

  function reset() {
    setProductId('')
    setQuantity('1')
    setPayment(PAYMENT_METHODS[0])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) {
      return toast.error('Escolha um produto')
    }
    if (qtyNum < 1) {
      return toast.error('Quantidade inválida')
    }
    if (qtyNum > selected.quantity) {
      return toast.error('Estoque insuficiente')
    }

    startTransition(async () => {
      try {
        await onRegisterSale(selected.id, qtyNum, payment)
        toast.success(`Venda registrada — ${formatBRL(total)}`)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar venda</DialogTitle>
          <DialogDescription>
            Selecione o produto e a forma de pagamento. O estoque é baixado
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Produto</Label>
            <Select
              value={productId}
              onValueChange={(v) => setProductId(v ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha um produto" />
              </SelectTrigger>
              <SelectContent>
                {available.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} · {p.size} · {formatBRL(Number(p.price))} (
                    {p.quantity} un.)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sale-qty">Quantidade</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 shrink-0 rounded-full"
                  onClick={() =>
                    setQuantity((q) =>
                      String(Math.max(1, (Number(q) || 1) - 1))
                    )
                  }
                  aria-label="Diminuir quantidade"
                >
                  –
                </Button>
                <input
                  id="sale-qty"
                  inputMode="numeric"
                  className="h-10 w-full rounded-md border border-input bg-transparent text-center font-heading text-lg font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value.replace(/\D/g, '') || '')
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 shrink-0 rounded-full"
                  onClick={() =>
                    setQuantity((q) => String((Number(q) || 0) + 1))
                  }
                  aria-label="Aumentar quantidade"
                >
                  +
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Pagamento</Label>
              <Select
                value={payment}
                onValueChange={(v) => setPayment(v ?? PAYMENT_METHODS[0])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="font-heading text-2xl font-extrabold text-primary">
              {formatBRL(total)}
            </span>
          </div>

          <DialogFooter className="mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !selected}>
              {isPending ? 'Registrando...' : 'Confirmar venda'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
