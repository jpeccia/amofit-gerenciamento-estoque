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
import { PricingFormulaAssistant } from '@/components/pricing-formula-assistant'

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
    costPrice?: number | null
    colors?: string
    sku?: string
  }) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [size, setSize] = useState<string>('M')
  const [quantity, setQuantity] = useState('1')
  const [price, setPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [colors, setColors] = useState('')
  const [sku, setSku] = useState('')

  function reset() {
    setName('')
    setCategory(CATEGORIES[0])
    setSize('M')
    setQuantity('1')
    setPrice('')
    setCostPrice('')
    setColors('')
    setSku('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const priceNum = Number(price.replace(',', '.'))
    if (!name.trim()) {
      return toast.error('Informe o nome do produto')
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return toast.error('Informe um preço de venda válido')
    }

    const costPriceNum = costPrice.trim() ? Number(costPrice.replace(',', '.')) : null
    if (costPriceNum !== null && (Number.isNaN(costPriceNum) || costPriceNum < 0)) {
      return toast.error('Informe um preço de custo válido')
    }

    startTransition(async () => {
      try {
        await onAddProduct({
          name,
          category,
          size,
          quantity: Number(quantity) || 0,
          price: priceNum,
          costPrice: costPriceNum,
          colors: colors.trim() || undefined,
          sku: sku.trim() || undefined,
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
              <Label htmlFor="product-sku">Referência / SKU</Label>
              <Input
                id="product-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ex: LEG001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="product-cost">Preço Custo (R$)</Label>
                <span className="text-[10px] text-muted-foreground font-medium">Opcional</span>
              </div>
              <Input
                id="product-cost"
                inputMode="decimal"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-price">Preço Venda (R$)</Label>
              <Input
                id="product-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <PricingFormulaAssistant
            costPriceStr={costPrice}
            onApplyPrice={setPrice}
            currentPriceStr={price}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-colors">Cores disponíveis</Label>
            <Input
              id="product-colors"
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              placeholder="Ex: Preto (ou Preto, Marrom)"
            />
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
