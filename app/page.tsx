import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getProducts } from '@/app/actions/products'
import { getTodaySummary, getRecentMovements, getAllSales } from '@/app/actions/sales'
import { Dashboard } from '@/components/dashboard'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const [products, summary, movements, allSales] = await Promise.all([
    getProducts(),
    getTodaySummary(),
    getRecentMovements(20),
    getAllSales(),
  ])

  return (
    <Dashboard
      userName={session.user.name}
      products={products}
      summary={summary}
      movements={movements}
      allSales={allSales}
    />
  )
}
