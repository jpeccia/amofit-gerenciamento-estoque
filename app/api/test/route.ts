import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { sales } from '@/lib/db/schema'
import { and, eq, gte } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' })
    }

    const userId = session.user.id
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const allSales = await db
      .select()
      .from(sales)
      .where(eq(sales.userId, userId))
      .limit(10)

    const todayMovements = await db
      .select()
      .from(sales)
      .where(and(eq(sales.userId, userId), gte(sales.createdAt, startOfDay)))

    return NextResponse.json({
      serverTime: new Date().toISOString(),
      startOfDay: startOfDay.toISOString(),
      allSalesCount: allSales.length,
      todayMovementsCount: todayMovements.length,
      allSales,
      todayMovements,
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
  }
}
