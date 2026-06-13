'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { products, sales } from '@/lib/db/schema'
import { and, asc, eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { CATEGORIES, SIZES } from '@/lib/constants'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getProducts() {
  try {
    const userId = await getUserId()
    return await db
      .select()
      .from(products)
      .where(eq(products.userId, userId))
      .orderBy(asc(products.name), asc(products.size))
  } catch (err) {
    const internalLog = {
      type: 'https://errors.amofit.com.br/database-connection-error',
      title: 'Database connection failed',
      detail: 'Falling back to empty products list during query failure',
      instance: '/app/actions/products/getProducts',
      trace_id: Math.random().toString(36).substring(2, 15),
      stack_trace: err instanceof Error ? err.stack : undefined,
    }
    console.error(
      JSON.stringify({
        level: 'warn',
        service_name: 'products-service',
        message: 'Returning empty products list because database query failed',
        trace_id: internalLog.trace_id,
        error_details: internalLog,
      })
    )
    return []
  }
}

export async function createProduct(input: {
  name: string
  category: string
  size: string
  quantity: number
  price: number
}) {
  const userId = await getUserId()

  if (
    typeof input.name !== 'string' ||
    !input.name.trim() ||
    input.name.length > 100
  ) {
    throw new Error('Nome do produto deve ter entre 1 e 100 caracteres')
  }
  if (!CATEGORIES.includes(input.category as any)) {
    throw new Error('Categoria do produto inválida')
  }
  if (!SIZES.includes(input.size as any)) {
    throw new Error('Tamanho do produto inválido')
  }
  if (
    typeof input.quantity !== 'number' ||
    input.quantity < 0 ||
    !Number.isInteger(input.quantity)
  ) {
    throw new Error('Quantidade do produto deve ser um número inteiro positivo')
  }
  if (
    typeof input.price !== 'number' ||
    input.price <= 0 ||
    Number.isNaN(input.price)
  ) {
    throw new Error('Preço do produto deve ser maior que zero')
  }

  const [newProd] = await db
    .insert(products)
    .values({
      userId,
      name: input.name.trim(),
      category: input.category,
      size: input.size,
      quantity: Math.max(0, Math.floor(input.quantity)),
      price: input.price.toFixed(2),
    })
    .returning()

  if (newProd && newProd.quantity > 0) {
    await db.insert(sales).values({
      userId,
      productId: newProd.id,
      productName: newProd.name,
      category: newProd.category,
      size: newProd.size,
      quantity: newProd.quantity,
      unitPrice: newProd.price,
      total: '0.00',
      paymentMethod: '—',
      type: 'restock',
    })
  }

  revalidatePath('/')
}

export async function adjustStock(id: number, delta: number) {
  const userId = await getUserId()

  await db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.userId, userId)))

    if (!product) {
      throw new Error('Produto não encontrado')
    }

    const newQty = Math.max(0, product.quantity + delta)
    await tx
      .update(products)
      .set({ quantity: newQty })
      .where(eq(products.id, id))

    if (delta > 0) {
      await tx.insert(sales).values({
        userId,
        productId: product.id,
        productName: product.name,
        category: product.category,
        size: product.size,
        quantity: delta,
        unitPrice: product.price,
        total: '0.00',
        paymentMethod: '—',
        type: 'restock',
      })
    }
  })

  revalidatePath('/')
}

export async function deleteProduct(id: number) {
  const userId = await getUserId()
  await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.userId, userId)))
  revalidatePath('/')
}
