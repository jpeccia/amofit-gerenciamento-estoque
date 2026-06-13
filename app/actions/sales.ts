'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { products, sales } from '@/lib/db/schema'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { PAYMENT_METHODS } from '@/lib/constants'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function registerSale(input: {
  productId: number
  quantity: number
  paymentMethod: string
}) {
  const userId = await getUserId()
  const qty = Math.max(1, Math.floor(input.quantity))

  if (typeof input.productId !== 'number' || input.productId <= 0) {
    throw new Error('Produto inválido')
  }
  if (
    typeof input.quantity !== 'number' ||
    input.quantity < 1 ||
    !Number.isInteger(input.quantity)
  ) {
    throw new Error('Quantidade inválida')
  }
  if (!PAYMENT_METHODS.includes(input.paymentMethod as any)) {
    throw new Error('Forma de pagamento inválida')
  }

  await db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, input.productId), eq(products.userId, userId)))

    if (!product) {
      throw new Error('Produto não encontrado')
    }

    const unitPrice = Number(product.price)
    const total = unitPrice * qty

    const updated = await tx
      .update(products)
      .set({ quantity: sql`${products.quantity} - ${qty}` })
      .where(
        and(
          eq(products.id, product.id),
          eq(products.userId, userId),
          gte(products.quantity, qty)
        )
      )
      .returning()

    if (updated.length === 0) {
      throw new Error('Estoque insuficiente para esta venda')
    }

    await tx.insert(sales).values({
      userId,
      productId: product.id,
      productName: product.name,
      category: product.category,
      size: product.size,
      quantity: qty,
      unitPrice: unitPrice.toFixed(2),
      total: total.toFixed(2),
      paymentMethod: input.paymentMethod,
      type: 'sale',
    })
  })

  revalidatePath('/')
}

export async function registerReturn(input: {
  productId: number
  quantity: number
}) {
  const userId = await getUserId()
  const qty = Math.max(1, Math.floor(input.quantity))

  if (typeof input.productId !== 'number' || input.productId <= 0) {
    throw new Error('Produto inválido')
  }
  if (
    typeof input.quantity !== 'number' ||
    input.quantity < 1 ||
    !Number.isInteger(input.quantity)
  ) {
    throw new Error('Quantidade inválida')
  }

  await db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, input.productId), eq(products.userId, userId)))

    if (!product) {
      throw new Error('Produto não encontrado')
    }

    await tx
      .update(products)
      .set({ quantity: sql`${products.quantity} + ${qty}` })
      .where(and(eq(products.id, product.id), eq(products.userId, userId)))

    await tx.insert(sales).values({
      userId,
      productId: product.id,
      productName: product.name,
      category: product.category,
      size: product.size,
      quantity: qty,
      unitPrice: Number(product.price).toFixed(2),
      total: '0.00',
      paymentMethod: '—',
      type: 'return',
    })
  })

  revalidatePath('/')
}

export async function getTodaySummary() {
  try {
    const userId = await getUserId()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const todayMovements = await db
      .select({
        type: sales.type,
        total: sales.total,
        quantity: sales.quantity,
        paymentMethod: sales.paymentMethod,
      })
      .from(sales)
      .where(and(eq(sales.userId, userId), gte(sales.createdAt, startOfDay)))

    let totalSales = 0
    let countSales = 0
    let countReturns = 0
    let itemsSold = 0
    const paymentBreakdown = {
      Pix: 0,
      'Cartão': 0,
      Dinheiro: 0,
    }

    for (const m of todayMovements) {
      if (m.type === 'sale') {
        const val = Number(m.total)
        totalSales += val
        countSales += 1
        itemsSold += m.quantity
        if (m.paymentMethod === 'Pix') {
          paymentBreakdown.Pix += val
        } else if (m.paymentMethod === 'Cartão') {
          paymentBreakdown['Cartão'] += val
        } else if (m.paymentMethod === 'Dinheiro') {
          paymentBreakdown.Dinheiro += val
        }
      } else if (m.type === 'return') {
        countReturns += 1
      }
    }

    return {
      totalSales,
      countSales,
      countReturns,
      itemsSold,
      paymentBreakdown,
    }
  } catch (err) {
    const internalLog = {
      type: 'https://errors.amofit.com.br/database-connection-error',
      title: 'Database connection failed',
      detail: 'Falling back to empty summary data during query failure',
      instance: '/app/actions/sales/getTodaySummary',
      trace_id: Math.random().toString(36).substring(2, 15),
      stack_trace: err instanceof Error ? err.stack : undefined,
    }
    console.error(
      JSON.stringify({
        level: 'warn',
        service_name: 'sales-service',
        message: 'Returning empty summary because database query failed',
        trace_id: internalLog.trace_id,
        error_details: internalLog,
      })
    )
    return {
      totalSales: 0,
      countSales: 0,
      countReturns: 0,
      itemsSold: 0,
      paymentBreakdown: {
        Pix: 0,
        'Cartão': 0,
        Dinheiro: 0,
      },
    }
  }
}

export async function getRecentMovements(limit = 8) {
  try {
    const userId = await getUserId()
    return await db
      .select()
      .from(sales)
      .where(eq(sales.userId, userId))
      .orderBy(desc(sales.createdAt))
      .limit(limit)
  } catch (err) {
    const internalLog = {
      type: 'https://errors.amofit.com.br/database-connection-error',
      title: 'Database connection failed',
      detail: 'Falling back to empty movements list during query failure',
      instance: '/app/actions/sales/getRecentMovements',
      trace_id: Math.random().toString(36).substring(2, 15),
      stack_trace: err instanceof Error ? err.stack : undefined,
    }
    console.error(
      JSON.stringify({
        level: 'warn',
        service_name: 'sales-service',
        message: 'Returning empty movements list because database query failed',
        trace_id: internalLog.trace_id,
        error_details: internalLog,
      })
    )
    return []
  }
}

/**
 * Undoes a movement (sale or return) by restoring the products stock quantity
 * and deleting the corresponding record from the sales table.
 *
 * @param movementId The ID of the movement to be undone.
 * @returns A promise resolving to an object indicating success or failure.
 */
export async function undoMovement(movementId: number) {
  let userId: string
  try {
    userId = await getUserId()
  } catch (err) {
    const internalLog = {
      type: 'https://errors.amofit.com.br/unauthorized',
      title: 'Unauthorized Access',
      detail: 'Authentication required to undo movement',
      instance: `/app/actions/sales/undoMovement?id=${movementId}`,
      trace_id: Math.random().toString(36).substring(2, 15),
      stack_trace: err instanceof Error ? err.stack : undefined,
    }
    console.error(
      JSON.stringify({
        level: 'error',
        service_name: 'sales-service',
        message: 'Authentication failure in undoMovement',
        trace_id: internalLog.trace_id,
        error_details: internalLog,
      })
    )
    return {
      success: false,
      error: {
        error: 'Unauthorized',
        message: 'AUTH_001',
        statusCode: 401,
      },
    }
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [movement] = await tx
        .select()
        .from(sales)
        .where(and(eq(sales.id, movementId), eq(sales.userId, userId)))

      if (!movement) {
        throw new Error('MOVEMENT_NOT_FOUND')
      }

      if (movement.productId) {
        const [product] = await tx
          .select()
          .from(products)
          .where(
            and(eq(products.id, movement.productId), eq(products.userId, userId))
          )

        if (product) {
          const qtyDiff = movement.quantity
          const newQty =
            movement.type === 'sale'
              ? product.quantity + qtyDiff
              : Math.max(0, product.quantity - qtyDiff)

          await tx
            .update(products)
            .set({ quantity: newQty })
            .where(eq(products.id, product.id))
        }
      }

      await tx.delete(sales).where(eq(sales.id, movementId))
      return { success: true }
    })

    revalidatePath('/')
    return result
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : ''
    const isNotFound = errorMsg === 'MOVEMENT_NOT_FOUND'

    const internalLog = {
      type: isNotFound
        ? 'https://errors.amofit.com.br/movement-not-found'
        : 'https://errors.amofit.com.br/database-error',
      title: isNotFound ? 'Movement Not Found' : 'Database Transaction Error',
      detail: isNotFound
        ? `Movement with ID ${movementId} not found or access denied`
        : `Failed to execute undo transaction for movement ID ${movementId}`,
      instance: `/app/actions/sales/undoMovement?id=${movementId}`,
      trace_id: Math.random().toString(36).substring(2, 15),
      stack_trace: err instanceof Error ? err.stack : undefined,
    }

    console.error(
      JSON.stringify({
        level: 'error',
        service_name: 'sales-service',
        message: isNotFound
          ? 'Movement not found for undo'
          : 'Database transaction failed in undoMovement',
        trace_id: internalLog.trace_id,
        error_details: internalLog,
      })
    )

    return {
      success: false,
      error: {
        error: isNotFound ? 'NotFound' : 'InternalServerError',
        message: isNotFound ? 'SALES_UNDO_404' : 'SALES_UNDO_500',
        statusCode: isNotFound ? 404 : 500,
      },
    }
  }
}

/**
 * Deletes all sales and returns registered on the current day for the authenticated user,
 * effectively resetting the daily cash register faturamento to zero.
 *
 * @returns A promise resolving to an object indicating success or failure.
 */
export async function clearTodaySales() {
  let userId: string
  try {
    userId = await getUserId()
  } catch (err) {
    const internalLog = {
      type: 'https://errors.amofit.com.br/unauthorized',
      title: 'Unauthorized Access',
      detail: 'Authentication required to clear today sales',
      instance: '/app/actions/sales/clearTodaySales',
      trace_id: Math.random().toString(36).substring(2, 15),
      stack_trace: err instanceof Error ? err.stack : undefined,
    }
    console.error(
      JSON.stringify({
        level: 'error',
        service_name: 'sales-service',
        message: 'Authentication failure in clearTodaySales',
        trace_id: internalLog.trace_id,
        error_details: internalLog,
      })
    )
    return {
      success: false,
      error: {
        error: 'Unauthorized',
        message: 'AUTH_002',
        statusCode: 401,
      },
    }
  }

  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    await db
      .delete(sales)
      .where(and(eq(sales.userId, userId), gte(sales.createdAt, startOfDay)))

    revalidatePath('/')
    return { success: true }
  } catch (err) {
    const internalLog = {
      type: 'https://errors.amofit.com.br/database-error',
      title: 'Database Clear Error',
      detail: 'Failed to delete daily sales records',
      instance: '/app/actions/sales/clearTodaySales',
      trace_id: Math.random().toString(36).substring(2, 15),
      stack_trace: err instanceof Error ? err.stack : undefined,
    }

    console.error(
      JSON.stringify({
        level: 'error',
        service_name: 'sales-service',
        message: 'Database deletion failed in clearTodaySales',
        trace_id: internalLog.trace_id,
        error_details: internalLog,
      })
    )

    return {
      success: false,
      error: {
        error: 'InternalServerError',
        message: 'SALES_CLEAR_500',
        statusCode: 500,
      },
    }
  }
}

