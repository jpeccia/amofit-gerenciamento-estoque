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

/**
 * Creates a new product and records an initial restock movement if initial quantity > 0.
 *
 * @param input The product parameters including optional costPrice and SKU.
 * @returns A promise resolving once the product is inserted.
 */
export async function createProduct(input: {
  name: string
  category: string
  size: string
  quantity: number
  price: number
  costPrice?: number | null
  colors?: string
  sku?: string
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
  if (
    input.costPrice !== undefined &&
    input.costPrice !== null &&
    (typeof input.costPrice !== 'number' || input.costPrice < 0 || Number.isNaN(input.costPrice))
  ) {
    throw new Error('Preço de custo inválido')
  }

  const costPriceVal =
    input.costPrice !== undefined && input.costPrice !== null && !Number.isNaN(input.costPrice)
      ? input.costPrice.toFixed(2)
      : null

  const [newProd] = await db
    .insert(products)
    .values({
      userId,
      name: input.name.trim(),
      category: input.category,
      size: input.size,
      quantity: Math.max(0, Math.floor(input.quantity)),
      price: input.price.toFixed(2),
      costPrice: costPriceVal,
      colors: input.colors ? input.colors.trim() : null,
      sku: input.sku ? input.sku.trim() : null,
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
      unitCost: newProd.costPrice || null,
      total: '0.00',
      paymentMethod: '—',
      type: 'restock',
      sku: newProd.sku || null,
    })
  }

  revalidatePath('/')
}

/**
 * Adjusts product inventory count by a delta and registers the corresponding audit movement.
 *
 * @param id The product database ID.
 * @param delta The delta change to apply to quantity.
 */
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
        unitCost: product.costPrice || null,
        total: '0.00',
        paymentMethod: '—',
        type: 'restock',
        sku: product.sku || null,
      })
    } else if (delta < 0) {
      const removedQty = Math.min(product.quantity, Math.abs(delta))
      if (removedQty > 0) {
        await tx.insert(sales).values({
          userId,
          productId: product.id,
          productName: product.name,
          category: product.category,
          size: product.size,
          quantity: removedQty,
          unitPrice: product.price,
          unitCost: product.costPrice || null,
          total: '0.00',
          paymentMethod: '—',
          type: 'adjustment',
          sku: product.sku || null,
        })
      }
    }
  })

  revalidatePath('/')
}

/**
 * Deletes a product from the database for the authenticated user.
 *
 * @param id The product database ID.
 */
export async function deleteProduct(id: number) {
  const userId = await getUserId()
  await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.userId, userId)))
  revalidatePath('/')
}

/**
 * Updates a product's properties by its ID.
 *
 * @param id The product database ID.
 * @param input The object containing new property values including optional costPrice.
 */
export async function updateProduct(
  id: number,
  input: {
    name: string
    category: string
    size: string
    price: number
    costPrice?: number | null
    colors?: string
    sku?: string
  }
) {
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
    typeof input.price !== 'number' ||
    input.price <= 0 ||
    Number.isNaN(input.price)
  ) {
    throw new Error('Preço do produto deve ser maior que zero')
  }
  if (
    input.costPrice !== undefined &&
    input.costPrice !== null &&
    (typeof input.costPrice !== 'number' || input.costPrice < 0 || Number.isNaN(input.costPrice))
  ) {
    throw new Error('Preço de custo inválido')
  }

  const costPriceVal =
    input.costPrice !== undefined && input.costPrice !== null && !Number.isNaN(input.costPrice)
      ? input.costPrice.toFixed(2)
      : null

  await db
    .update(products)
    .set({
      name: input.name.trim(),
      category: input.category,
      size: input.size,
      price: input.price.toFixed(2),
      costPrice: costPriceVal,
      colors: input.colors ? input.colors.trim() : null,
      sku: input.sku ? input.sku.trim() : null,
    })
    .where(and(eq(products.id, id), eq(products.userId, userId)))

  revalidatePath('/')
}

