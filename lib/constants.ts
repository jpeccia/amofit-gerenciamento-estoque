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

export const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4'] as const

export const PAYMENT_METHODS = ['Pix', 'Cartão', 'Dinheiro'] as const

export type Product = {
  id: number
  userId: string
  name: string
  category: string
  size: string
  quantity: number
  price: string
  colors?: string | null
  sku?: string | null
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
  color?: string | null
  installments?: number | null
  paymentStatus?: string | null
  customerName?: string | null
  sku?: string | null
  amountPaid?: string | null
  saleGroupId?: string | null
  deletedAt?: Date | null
  paidAt?: Date | null
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
  totalPending: number
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

/**
 * Formats a Date object or string to a full Brazilian date and time string (e.g. 10/08/2026 às 16:16).
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  const dateStr = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
  const timeStr = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return `${dateStr} às ${timeStr}`
}

/**
 * Formats a Date object or string to a compact date and time string (e.g. 10/08 às 16:16).
 */
export function formatShortDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  const dateStr = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(d)
  const timeStr = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return `${dateStr} às ${timeStr}`
}
