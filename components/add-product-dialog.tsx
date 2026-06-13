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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORIES, SIZES } from '@/lib/constants'

/**
 * Dialog component to add a new product to the inventory.
 *
 * @param props Component properties including open states, reset state handlers, and creation callbacks.
 * @returns The rendered React element.
 */
export function AddProductDialog({
  open,
  onOpenChange,
  onAddProduct,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddProduct: (product: {
    name: string
    category: string
    size: string
    quantity: number
    price: number
  }) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [size, setSize] = useState<string>('M')
  const [quantity, setQuantity] = useState('1')
  const [price, setPrice] = useState('')

  function reset() {
    setName('')
    setCategory(CATEGORIES[0])
    setSize('M')
    setQuantity('1')
    setPrice('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const priceNum = Number(price.replace(',', '.'))
    if (!name.trim()) {
      return toast.error('Informe o nome do product')
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return toast.error('Informe um preço válido')
    }

    startTransition(async () => {
      try {
        await onAddProduct({
          name,
          category,
          size,
          quantity: Number(quantity) || 0,
          price: priceNum,
        })
        toast.success('Produto adicionado ao estoque')
        reset()
        onOpenChange(false)
      } catch {
        toast.error('Não foi possível adicionar o produto')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
          <DialogDescription>
            Cadastre uma peça no seu estoque.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="product-name">Nome do produto</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Legging Power"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Categoria</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v ?? CATEGORIES[0])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tamanho</Label>
              <Select value={size} onValueChange={(v) => setSize(v ?? 'M')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-qty">Quantidade</Label>
              <Input
                id="product-qty"
                type="number"
                min={0}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-price">Preço (R$)</Label>
              <Input
                id="product-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
              />
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
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
