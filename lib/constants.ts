export const CATEGORIES = [
  'Legging',
  'Top',
  'Camiseta',
  'Short',
  'Macaquinho',
  'Conjunto',
  'Jaqueta',
  'Acessório',
] as const

export const SIZES = ['PP', 'P', 'M', 'G', 'GG'] as const

export const PAYMENT_METHODS = ['Pix', 'Cartão', 'Dinheiro'] as const

export type Product = {
  id: number
  userId: string
  name: string
  category: string
  size: string
  quantity: number
  price: string
  createdAt: Date
}

export type Movement = {
  id: number
  userId: string
  productId: number | null
  productName: string
  category: string
  size: string
  quantity: number
  unitPrice: string
  total: string
  paymentMethod: string
  type: string
  createdAt: Date
}

/**
 * Represents the summary metrics of the daily sales activity.
 */
export type Summary = {
  totalSales: number
  countSales: number
  countReturns: number
  itemsSold: number
  paymentBreakdown: {
    Pix: number
    'Cartão': number
    Dinheiro: number
  }
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
