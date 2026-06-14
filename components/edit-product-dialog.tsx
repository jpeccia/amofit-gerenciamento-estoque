'use client'

import { useEffect, useState, useTransition } from 'react'
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
import { CATEGORIES, SIZES, type Product } from '@/lib/constants'

/**
 * Dialog component to edit properties of an existing product in the stock list.
 *
 * @param props Component properties containing dialog open states, targeted product, and update callback.
 * @returns The rendered React element.
 */
export function EditProductDialog({
  open,
  onOpenChange,
  product,
  onUpdateProduct,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onUpdateProduct: (
    id: number,
    input: {
      name: string
      category: string
      size: string
      price: number
      colors?: string
    }
  ) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [size, setSize] = useState<string>('M')
  const [price, setPrice] = useState('')
  const [colors, setColors] = useState('')

  useEffect(() => {
    if (product) {
      setName(product.name)
      setCategory(product.category)
      setSize(product.size)
      setPrice(Number(product.price).toString().replace('.', ','))
      setColors(product.colors || '')
    }
  }, [product, open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!product) return

    const priceNum = Number(price.replace(',', '.'))
    if (!name.trim()) {
      return toast.error('Informe o nome do produto')
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return toast.error('Informe um preço válido')
    }

    startTransition(async () => {
      try {
        await onUpdateProduct(product.id, {
          name,
          category,
          size,
          price: priceNum,
          colors: colors.trim() || undefined,
        })
        toast.success('Produto atualizado com sucesso')
        onOpenChange(false)
      } catch {
        toast.error('Não foi possível atualizar o produto')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>
          <DialogDescription>
            Altere as informações desta peça no seu estoque.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-product-name">Nome do produto</Label>
            <Input
              id="edit-product-name"
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-product-price">Preço (R$)</Label>
            <Input
              id="edit-product-price"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-product-colors">Cores disponíveis</Label>
            <Input
              id="edit-product-colors"
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              placeholder="Ex: Preto, Azul, Rosa (separadas por vírgula)"
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
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              {isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
