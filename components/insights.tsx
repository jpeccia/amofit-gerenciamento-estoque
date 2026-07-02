'use client'

import { useState, useMemo } from 'react'
import {
  Lightbulb,
  TrendingUp,
  DollarSign,
  Package2,
  Users,
  ArrowUpRight,
  Percent,
  ShoppingBag,
  AlertCircle,
  Sparkles,
  Ruler,
  RefreshCw,
  BarChart3,
  CreditCard,
  Layers
} from 'lucide-react'
import { formatBRL, type Movement, type Product } from '@/lib/constants'

/**
 * Calculates and displays store insights strictly using real database metrics.
 *
 * @param props Contains the products and movements arrays.
 * @returns The rendered React element.
 */
export function Insights({
  products,
  movements,
}: {
  products: Product[]
  movements: Movement[]
}) {
  const [activeTab, setActiveTab] = useState<'geral' | 'campeoes' | 'estoque' | 'fiados'>('geral')

  const salesOnly = useMemo(() => {
    return movements.filter((m) => m.type === 'sale')
  }, [movements])

  const returnsOnly = useMemo(() => {
    return movements.filter((m) => m.type === 'return')
  }, [movements])

  const bestSeller = useMemo(() => {
    if (salesOnly.length === 0) return null
    const counts: Record<string, number> = {}
    for (const s of salesOnly) {
      counts[s.productName] = (counts[s.productName] || 0) + s.quantity
    }
    let topProduct = ''
    let topQty = 0
    for (const name of Object.keys(counts)) {
      if (counts[name] > topQty) {
        topQty = counts[name]
        topProduct = name
      }
    }
    return { name: topProduct, quantity: topQty }
  }, [salesOnly])

  const topCategory = useMemo(() => {
    if (salesOnly.length === 0) return null
    const revenues: Record<string, number> = {}
    for (const s of salesOnly) {
      revenues[s.category] = (revenues[s.category] || 0) + Number(s.total)
    }
    let topCat = ''
    let topRev = 0
    for (const cat of Object.keys(revenues)) {
      if (revenues[cat] > topRev) {
        topRev = revenues[cat]
        topCat = cat
      }
    }
    return { category: topCat, revenue: topRev }
  }, [salesOnly])

  const averageTicket = useMemo(() => {
    if (salesOnly.length === 0) return 0
    const totalRev = salesOnly.reduce((sum, s) => sum + Number(s.total), 0)
    return totalRev / salesOnly.length
  }, [salesOnly])

  const totalCapital = useMemo(() => {
    return products.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0)
  }, [products])

  const pendingDebts = useMemo(() => {
    const pendingSales = salesOnly.filter((s) => s.paymentStatus === 'pending')

    const groups: Record<string, (typeof pendingSales)[0] & { items?: typeof pendingSales }> = {}

    for (const s of pendingSales) {
      const key = s.saleGroupId || `single-${s.id}`
      if (!groups[key]) {
        groups[key] = {
          ...s,
          items: [],
        }
      }
      groups[key].items?.push(s)
    }

    const groupedPendingSales = Object.values(groups).map((group) => {
      const items = group.items || []
      if (items.length <= 1) {
        return group
      }
      const totalVal = items.reduce((sum, item) => sum + Number(item.total), 0)
      const paidVal = items.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0)
      const qty = items.reduce((sum, item) => sum + item.quantity, 0)

      const productNames = items.map((item) => item.productName).join(', ')
      const sizes = Array.from(new Set(items.map((item) => item.size))).join(', ')

      return {
        ...group,
        total: totalVal.toFixed(2),
        amountPaid: paidVal.toFixed(2),
        quantity: qty,
        productName: productNames,
        size: sizes,
      }
    })

    const totalPending = pendingSales.reduce((sum, s) => sum + (Number(s.total) - Number(s.amountPaid || 0)), 0)
    const uniqueCustomers = new Set(pendingSales.map((s) => s.customerName).filter(Boolean))
    return { total: totalPending, customersCount: uniqueCustomers.size, sales: groupedPendingSales }
  }, [salesOnly])

  const lowStockAlerts = useMemo(() => {
    return products.filter((p) => p.quantity === 0).slice(0, 3)
  }, [products])

  const sellThroughRate = useMemo(() => {
    const totalSold = salesOnly.reduce((sum, s) => sum + s.quantity, 0)
    const currentStock = products.reduce((sum, p) => sum + p.quantity, 0)
    const universe = totalSold + currentStock
    if (universe === 0) return 0
    return (totalSold / universe) * 100
  }, [salesOnly, products])

  const returnRate = useMemo(() => {
    const totalSold = salesOnly.reduce((sum, s) => sum + s.quantity, 0)
    const totalReturned = returnsOnly.reduce((sum, r) => sum + r.quantity, 0)
    if (totalSold === 0) return 0
    return (totalReturned / totalSold) * 100
  }, [salesOnly, returnsOnly])

  const topSize = useMemo(() => {
    if (salesOnly.length === 0) return null
    const counts: Record<string, number> = {}
    for (const s of salesOnly) {
      counts[s.size] = (counts[s.size] || 0) + s.quantity
    }
    let topSz = ''
    let topQty = 0
    for (const sz of Object.keys(counts)) {
      if (counts[sz] > topQty) {
        topQty = counts[sz]
        topSz = sz
      }
    }
    return { size: topSz, quantity: topQty }
  }, [salesOnly])

  const paymentPreferences = useMemo(() => {
    if (salesOnly.length === 0) return []
    const counts: Record<string, number> = { Pix: 0, Cartão: 0, Dinheiro: 0 }
    let totalRev = 0
    for (const s of salesOnly) {
      const val = Number(s.total)
      const key = s.paymentMethod
      if (key in counts) {
        counts[key] += val
      } else {
        counts[key] = (counts[key] || 0) + val
      }
      totalRev += val
    }
    if (totalRev === 0) return []
    return Object.keys(counts).map(key => ({
      method: key,
      value: counts[key],
      percentage: (counts[key] / totalRev) * 100
    })).sort((a, b) => b.value - a.value)
  }, [salesOnly])

  const deadStock = useMemo(() => {
    const soldProductNames = new Set(salesOnly.map(s => s.productName))
    return products.filter(p => p.quantity > 0 && !soldProductNames.has(p.name)).slice(0, 3)
  }, [products, salesOnly])

  const recommendations = useMemo(() => {
    const list: string[] = []
    if (salesOnly.length === 0) {
      list.push("Sua loja está pronta! Registre a primeira venda para começar a gerar estatísticas e insights de crescimento.")
      return list
    }
    if (sellThroughRate < 25 && totalCapital > 1000) {
      list.push(`O giro de estoque está baixo (${sellThroughRate.toFixed(1)}%). Recomendamos criar um bazar de fim de semana ou ofertas casadas (ex: Compre Legging + Top com desconto) para movimentar peças paradas.`)
    } else if (sellThroughRate >= 40) {
      list.push(`Excelente ritmo de vendas! Seu giro de estoque está em ${sellThroughRate.toFixed(1)}%. Mantenha o fluxo de caixa ativo para financiar a próxima grade de produtos.`)
    }
    if (topSize) {
      list.push(`Demanda por Grade: O tamanho "${topSize.size}" é o mais procurado pela sua clientela. Priorize a compra deste tamanho no próximo ciclo de produção.`)
    }
    if (returnRate > 8) {
      list.push(`Atenção: A taxa de retorno/devolução está em ${returnRate.toFixed(1)}%. Investigue se há algum tamanho específico ou tecido apresentando problemas de caimento.`)
    }
    if (deadStock.length > 0) {
      list.push(`Itens Sem Giro: Produtos como "${deadStock[0].name}" têm estoque físico mas nenhuma venda registrada. Ofereça um cupom especial ou coloque na arara de destaque da loja.`)
    }
    if (pendingDebts.total > 150) {
      list.push(`Você tem ${formatBRL(pendingDebts.total)} travados em contas a receber. Uma ação de renegociação ou parcelamento no PIX/Cartão traria dinheiro imediato para a marca crescer.`)
    }
    return list
  }, [salesOnly, sellThroughRate, totalCapital, topSize, returnRate, deadStock, pendingDebts])

  return (
    <section className="mt-10 border-t border-border/85 pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple dark:bg-brand-purple/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-extrabold text-brand-purple dark:text-purple-400 tracking-tight">
              Insights de Venda & Estoque Real
            </h2>
            <p className="text-xs text-muted-foreground font-medium">Análise de desempenho e sugestões baseadas no banco de dados real</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/60 pb-3 mb-6 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('geral')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'geral'
              ? 'bg-brand-purple/10 text-brand-purple dark:bg-brand-purple/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Geral do Caixa
        </button>
        <button
          onClick={() => setActiveTab('campeoes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'campeoes'
              ? 'bg-brand-purple/10 text-brand-purple dark:bg-brand-purple/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🏆 Mais Vendidos
        </button>
        <button
          onClick={() => setActiveTab('estoque')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'estoque'
              ? 'bg-brand-purple/10 text-brand-purple dark:bg-brand-purple/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📦 Saúde de Estoque
        </button>
        <button
          onClick={() => setActiveTab('fiados')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'fiados'
              ? 'bg-brand-purple/10 text-brand-purple dark:bg-brand-purple/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          💰 Fiados & Caixa
        </button>
      </div>

      {/* Tab Panel: Geral */}
      {activeTab === 'geral' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <BarChart3 className="h-16 w-16 text-primary" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider mb-3">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <RefreshCw className="h-3.5 w-3.5" />
                </div>
                <span>Giro de Estoque</span>
              </div>
              <div>
                <p className="text-lg font-extrabold text-foreground">{sellThroughRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">
                  Do inventário total vendido
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Percent className="h-16 w-16 text-emerald-500" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider mb-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
                <span>Ticket Médio</span>
              </div>
              <div>
                <p className="text-lg font-extrabold text-foreground">{formatBRL(averageTicket)}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">
                  Valor médio por venda
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Package2 className="h-16 w-16 text-brand-purple" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider mb-3">
                <div className="p-1.5 rounded-lg bg-brand-purple/10 text-brand-purple">
                  <Package2 className="h-3.5 w-3.5" />
                </div>
                <span>Capital Ativo</span>
              </div>
              <div>
                <p className="text-lg font-extrabold text-foreground">{formatBRL(totalCapital)}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">
                  Investimento em estoque
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="h-16 w-16 text-amber-500" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider mb-3">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <span>Fiados Pendentes</span>
              </div>
              <div>
                <p className="text-lg font-extrabold text-foreground">{formatBRL(pendingDebts.total)}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">
                  A receber de {pendingDebts.customersCount} clientes
                </p>
              </div>
            </div>
          </div>

          {/* Payment Preferences */}
          {paymentPreferences.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-brand-purple" />
                Preferência de Meio de Pagamento (Faturamento)
              </h3>
              <div className="space-y-3.5">
                {paymentPreferences.map((pref) => (
                  <div key={pref.method} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm font-semibold text-foreground">
                      <span>{pref.method}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatBRL(pref.value)} ({pref.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-purple transition-all duration-500"
                        style={{ width: `${pref.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
              Nenhuma venda registrada para traçar preferências de pagamento.
            </div>
          )}
        </div>
      )}

      {/* Tab Panel: Campeões */}
      {activeTab === 'campeoes' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden group">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Produto Campeão
            </h3>
            {bestSeller ? (
              <div>
                <p className="text-xl font-black text-foreground">{bestSeller.name}</p>
                <p className="text-sm text-muted-foreground font-semibold mt-2">
                  Volume de vendas: <span className="text-primary font-bold">{bestSeller.quantity} unidades</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-medium py-4">Nenhuma venda registrada ainda.</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden group">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-emerald-500" />
              Categoria Líder em Receita
            </h3>
            {topCategory ? (
              <div>
                <p className="text-xl font-black text-foreground">{topCategory.category}</p>
                <p className="text-sm text-muted-foreground font-semibold mt-2">
                  Faturamento gerado: <span className="text-emerald-500 font-bold">{formatBRL(topCategory.revenue)}</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-medium py-4">Nenhuma venda registrada ainda.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab Panel: Estoque */}
      {activeTab === 'estoque' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3.5 flex items-center gap-1.5">
                <Ruler className="h-4 w-4 text-brand-purple" />
                Tamanho com Maior Saída
              </h3>
              {topSize ? (
                <div>
                  <p className="text-3xl font-black text-brand-purple">{topSize.size}</p>
                  <p className="text-xs text-muted-foreground font-semibold mt-1">
                    Representa {topSize.quantity} vendas individuais.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-medium py-3">Sem registros de grade comercializada.</p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3.5 flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4 text-amber-500" />
                Taxa de Retorno (Devoluções)
              </h3>
              <div>
                <p className="text-3xl font-black text-amber-500">{returnRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">
                  Ideal manter abaixo de 5%.
                </p>
              </div>
            </div>
          </div>

          {deadStock.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-rose-500" />
                Alerta de Itens Sem Giro (Estoque Parado)
              </h3>
              <p className="text-xs text-muted-foreground font-semibold mb-4">
                Estes produtos possuem quantidade física mas não registraram nenhuma venda recentemente.
              </p>
              <div className="divide-y divide-border/60">
                {deadStock.map(p => (
                  <div key={p.id} className="py-2.5 flex justify-between items-center text-sm font-semibold">
                    <span className="text-foreground truncate max-w-[200px]">{p.name}</span>
                    <span className="text-xs text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full">
                      {p.quantity} peças paradas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Panel: Fiados */}
      {activeTab === 'fiados' && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-amber-500" />
            Controle de Fiados & Clientes Pendentes
          </h3>
          <p className="text-xs text-muted-foreground font-semibold mb-4">
            Total acumulado a receber: <span className="text-amber-500 font-bold">{formatBRL(pendingDebts.total)}</span>
          </p>

          {pendingDebts.sales.length > 0 ? (
            <div className="space-y-3">
              {pendingDebts.sales.map((sale) => {
                const due = Number(sale.total) - Number(sale.amountPaid || '0')
                return (
                  <div key={sale.id} className="p-3.5 rounded-xl border border-border/80 bg-accent/30 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-extrabold text-foreground">{sale.customerName || 'Cliente sem nome'}</p>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                        {sale.productName} ({sale.size}) • {sale.quantity} unid.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-600 dark:text-amber-400">{formatBRL(due)}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">restantes</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-medium py-4">Nenhum fiado pendente no momento.</p>
          )}
        </div>
      )}

      {/* Suggestions */}
      <div className="mt-6 rounded-2xl border border-primary/10 bg-gradient-to-r from-brand-purple/5 to-primary/5 p-5">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-purple dark:text-purple-300 mb-3 flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4" />
          Sugestões de Expansão & Estoque
        </h3>
        <ul className="space-y-3">
          {recommendations.map((rec, i) => (
            <li key={i} className="text-sm font-semibold text-foreground/80 flex items-start gap-2.5 leading-relaxed">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple text-xs font-bold mt-0.5">
                {i + 1}
              </span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {lowStockAlerts.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-destructive/5 border border-destructive/15 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-destructive">Reposição Recomendada</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Os seguintes produtos estão zerados e possuem alta procura: {lowStockAlerts.map((p) => `${p.name} (${p.size})`).join(', ')}.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
