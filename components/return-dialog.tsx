'use client'

import { useState, useTransition } from 'react'
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
import { formatBRL, type Product } from '@/lib/constants'

/**
 * Dialog component to register a return or unsold item.
 *
 * @param props Component properties containing products, dialog open status, and return callback.
 * @returns The rendered React element.
 */
export function ReturnDialog({
  open,
  onOpenChange,
  products,
  onRegisterReturn,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
  onRegisterReturn: (productId: number, quantity: number) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [productId, setProductId] = useState<string>('')
  const [quantity, setQuantity] = useState('1')

  const selected = products.find((p) => String(p.id) === productId)
  const qtyNum = Number(quantity) || 0

  function reset() {
    setProductId('')
    setQuantity('1')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) {
      return toast.error('Escolha um produto')
    }
    if (qtyNum < 1) {
      return toast.error('Quantidade inválida')
    }

    startTransition(async () => {
      try {
        await onRegisterReturn(selected.id, qtyNum)
        toast.success('Retorno registrado — item de volta na arara')
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
          <DialogTitle>Registrar retorno / não vendido</DialogTitle>
          <DialogDescription>
            Itens que voltaram do condicional retornam ao estoque.
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
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} · {p.size} · {formatBRL(Number(p.price))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="return-qty">Quantidade que voltou</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={() =>
                  setQuantity((q) => String(Math.max(1, (Number(q) || 1) - 1)))
                }
                aria-label="Diminuir quantidade"
              >
                –
              </Button>
              <input
                id="return-qty"
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
                onClick={() => setQuantity((q) => String((Number(q) || 0) + 1))}
                aria-label="Aumentar quantidade"
              >
                +
              </Button>
            </div>
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
              {isPending ? 'Registrando...' : 'Confirmar retorno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
