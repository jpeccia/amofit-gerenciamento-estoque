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

/**
 * Registers a sale of one or more products under a single transaction.
 * Decreases the stock quantity for each product and logs corresponding sale movements.
 *
 * @param input Contain the items list and the payment method used for the sale.
 * @returns A promise resolving to a success indicator or standard API error response.
 */


    export async function registerSale(input: {
  items: {
    productId?: number | null
    quantity: number
    color?: string
    name?: string
    category?: string
    size?: string
    price?: number
    sku?: string
  }[]
  paymentMethod: string
  installments?: number
  paymentStatus?: string
  customerName?: string
}): Promise<{
  success: boolean
  error?: {
    error: string
    message: string
    statusCode: number
  }
}> {
  let userId: string
  try {
    userId = await getUserId()
  } catch (err) {
    const internalLog = {
      type: 'https://errors.amofit.com.br/unauthorized',
      title: 'Unauthorized Access',
      detail: 'Authentication required to register sale',
      instance: '/app/actions/sales/registerSale',
      trace_id: Math.random().toString(36).substring(2, 15),
      stack_trace: err instanceof Error ? err.stack : undefined,
    }
    console.error(
      JSON.stringify({
        level: 'error',
        service_name: 'sales-service',
        message: 'Authentication failure in registerSale',
        trace_id: internalLog.trace_id,
        error_details: internalLog,
      })
    )
    return {
      success: false,
      error: {
        error: 'Unauthorized',
        message: 'AUTH_003',
        statusCode: 401,
      },
    }
  }

  if (!input.items || input.items.length === 0) {
    return {
      success: false,
      error: {
        error: 'BadRequest',
        message: 'SALES_REGISTER_400',
        statusCode: 400,
      },
    }
  }

  if (!PAYMENT_METHODS.includes(input.paymentMethod as any)) {
    return {
      success: false,
      error: {
        error: 'BadRequest',
        message: 'SALES_REGISTER_400',
        statusCode: 400,
      },
    }
  }

  for (const item of input.items) {
    if (item.productId !== null && item.productId !== undefined && item.productId > 0) {
      if (typeof item.productId !== 'number') {
        return {
          success: false,
          error: {
            error: 'BadRequest',
            message: 'SALES_REGISTER_400',
            statusCode: 400,
          },
        }
      }
    } else {
      // Validate custom item details
      if (typeof item.name !== 'string' || !item.name.trim()) {
        return {
          success: false,
          error: {
            error: 'BadRequest',
            message: 'SALES_REGISTER_400',
            statusCode: 400,
          },
        }
      }
      if (typeof item.price !== 'number' || item.price <= 0) {
        return {
          success: false,
          error: {
            error: 'BadRequest',
            message: 'SALES_REGISTER_400',
            statusCode: 400,
          },
        }
      }
    }

    if (
      typeof item.quantity !== 'number' ||
      item.quantity < 1 ||
      !Number.isInteger(item.quantity)
    ) {
      return {
        success: false,
        error: {
          error: 'BadRequest',
          message: 'SALES_REGISTER_400',
          statusCode: 400,
        },
      }
    }
  }

  try {
    await db.transaction(async (tx) => {
      for (const item of input.items) {
        const qty = item.quantity
        const isCustom = item.productId === null || item.productId === undefined || item.productId <= 0

        let productName = item.name || ''
        let category = item.category || 'Outros'
        let size = item.size || 'M'
        let unitPrice = item.price || 0
        let sku = item.sku || null

        if (!isCustom) {
          const [product] = await tx
            .select()
            .from(products)
            .where(
              and(eq(products.id, item.productId!), eq(products.userId, userId))
            )

          if (!product) {
            throw new Error('PRODUCT_NOT_FOUND')
          }

          productName = product.name
          category = product.category
          size = product.size
          unitPrice = Number(product.price)
          sku = product.sku || null

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
            throw new Error('INSUFFICIENT_STOCK')
          }
        }

        const total = unitPrice * qty
        const initialStatus = input.paymentStatus || 'paid'
        const amountPaid = initialStatus === 'paid' ? total : 0

        await tx.insert(sales).values({
          userId,
          productId: isCustom ? null : item.productId,
          productName,
          category,
          size,
          quantity: qty,
          unitPrice: unitPrice.toFixed(2),
          total: total.toFixed(2),
          paymentMethod: input.paymentMethod,
          color: item.color || null,
          installments: input.installments || 1,
          paymentStatus: initialStatus,
          customerName: input.customerName || null,
          sku,
          amountPaid: amountPaid.toFixed(2),
          type: 'sale',
        })
      }
    })

    revalidatePath('/')
    return { success: true }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : ''
    const isNotFound = errorMsg === 'PRODUCT_NOT_FOUND'
    const isInsufficient = errorMsg === 'INSUFFICIENT_STOCK'

    const errorStatus = isNotFound
      ? 'NotFound'
      : isInsufficient
      ? 'Conflict'
      : 'InternalServerError'
    const errorCode = isNotFound
      ? 'SALES_REGISTER_404'
      : isInsufficient
      ? 'SALES_REGISTER_409'
      : 'SALES_REGISTER_500'
    const statusCode = isNotFound ? 404 : isInsufficient ? 409 : 500

    const internalLog = {
      type: `https://errors.amofit.com.br/${errorStatus.toLowerCase()}`,
      title: 'Sales Registration Error',
      detail: `Failed to register sale: ${errorMsg}`,
      instance: '/app/actions/sales/registerSale',
      trace_id: Math.random().toString(36).substring(2, 15),
      stack_trace: err instanceof Error ? err.stack : undefined,
    }

    console.error(
      JSON.stringify({
        level: 'error',
        service_name: 'sales-service',
        message: 'Database transaction failed in registerSale',
        trace_id: internalLog.trace_id,
        error_details: internalLog,
      })
    )

    return {
      success: false,
      error: {
        error: errorStatus,
        message: errorCode,
        statusCode,
      },
    }
  }
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
    const todayMovements = await db
      .select({
        type: sales.type,
        total: sales.total,
        quantity: sales.quantity,
        paymentMethod: sales.paymentMethod,
        paymentStatus: sales.paymentStatus,
      })
      .from(sales)
      .where(eq(sales.userId, userId))

    let totalSales = 0
    let countSales = 0
    let countReturns = 0
    let itemsSold = 0
    let totalPending = 0
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
        if (m.paymentStatus === 'pending') {
          totalPending += val
        }
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
      totalPending,
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
      totalPending: 0,
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
export async function undoMovement(movementId: number): Promise<{
  success: boolean
  error?: {
    error: string
    message: string
    statusCode: number
  }
}> {
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
export async function clearTodaySales(): Promise<{
  success: boolean
  error?: {
    error: string
    message: string
    statusCode: number
  }
}> {
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

/**
 * Updates the payment status of a sale to 'paid'.
 *
 * @param saleId The database ID of the sale to mark as paid.
 * @returns A promise resolving to a success indicator or standard API error response.
 */
export async function markSaleAsPaid(saleId: number, amount?: number): Promise<{
  success: boolean
  error?: {
    error: string
    message: string
    statusCode: number
  }
}> {
  let userId: string
  try {
    userId = await getUserId()
  } catch (err) {
    const internalLog = {
      type: 'https://errors.amofit.com.br/unauthorized',
      title: 'Unauthorized Access',
      detail: 'Authentication required to update payment status',
      instance: `/app/actions/sales/markSaleAsPaid?id=${saleId}`,
      trace_id: Math.random().toString(36).substring(2, 15),
      stack_trace: err instanceof Error ? err.stack : undefined,
    }
    console.error(
      JSON.stringify({
        level: 'error',
        service_name: 'sales-service',
        message: 'Authentication failure in markSaleAsPaid',
        trace_id: internalLog.trace_id,
        error_details: internalLog,
      })
    )
    return {
      success: false,
      error: {
        error: 'Unauthorized',
        message: 'AUTH_004',
        statusCode: 401,
      },
    }
  }

  try {
    // Fetch current sale to calculate partial amortization
    const [sale] = await db
      .select()
      .from(sales)
      .where(and(eq(sales.id, saleId), eq(sales.userId, userId)))

    if (!sale) {
      return {
        success: false,
        error: {
          error: 'NotFound',
          message: 'SALES_UPDATE_404',
          statusCode: 404,
        },
      }
    }

    let newAmountPaid: number
    let newStatus = 'paid'

    if (amount !== undefined && amount > 0) {
      newAmountPaid = Number(sale.amountPaid || '0') + amount
      const totalVal = Number(sale.total)
      if (newAmountPaid < totalVal) {
        newStatus = 'pending'
      } else {
        newAmountPaid = totalVal // Cap at total
        newStatus = 'paid'
      }
    } else {
      newAmountPaid = Number(sale.total)
      newStatus = 'paid'
    }

    const updated = await db
      .update(sales)
      .set({
        paymentStatus: newStatus,
        amountPaid: newAmountPaid.toFixed(2),
      })
      .where(and(eq(sales.id, saleId), eq(sales.userId, userId)))
      .returning()

    if (updated.length === 0) {
      return {
        success: false,
        error: {
          error: 'NotFound',
          message: 'SALES_UPDATE_404',
          statusCode: 404,
        },
      }
    }

    revalidatePath('/')
    return { success: true }
  } catch (err) {
    const internalLog = {
      type: 'https://errors.amofit.com.br/database-error',
      title: 'Database Update Error',
      detail: `Failed to update sale status for ID ${saleId}`,
      instance: `/app/actions/sales/markSaleAsPaid?id=${saleId}`,
      trace_id: Math.random().toString(36).substring(2, 15),
      stack_trace: err instanceof Error ? err.stack : undefined,
    }
    console.error(
      JSON.stringify({
        level: 'error',
        service_name: 'sales-service',
        message: 'Database update failed in markSaleAsPaid',
        trace_id: internalLog.trace_id,
        error_details: internalLog,
      })
    )
    return {
      success: false,
      error: {
        error: 'InternalServerError',
        message: 'SALES_UPDATE_500',
        statusCode: 500,
      },
    }
  }
}

