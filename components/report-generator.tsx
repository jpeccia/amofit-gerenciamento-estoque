'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatBRL, type Movement, type Product } from '@/lib/constants'

/**
 * Formats a Date to a full Brazilian date/time string.
 *
 * @param date The date to format.
 * @returns The formatted string in DD/MM/YYYY HH:MM format.
 */
function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/**
 * Formats a Date to a short Brazilian date string.
 *
 * @param date The date to format.
 * @returns The formatted string in DD/MM/YYYY format.
 */
function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Formats a number to a BRL-compatible CSV value using comma as decimal separator.
 *
 * @param value The numeric value to format.
 * @returns The formatted monetary string.
 */
function csvMoney(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

/**
 * Flattens grouped sales into individual sale item rows for export.
 *
 * @param sales The array of sale movements (may contain grouped sales with items).
 * @returns An array of individual sale item rows.
 */
function flattenSalesForExport(sales: Movement[]): Movement[] {
  const result: Movement[] = []
  for (const m of sales) {
    const items = (m as any).items as Movement[] | undefined
    if (items && items.length > 0) {
      for (const item of items) {
        result.push(item)
      }
    } else {
      result.push(m)
    }
  }
  return result
}

/**
 * Generates and downloads a comprehensive CSV report containing all sales
 * and current stock data, formatted for Brazilian Excel/Sheets compatibility.
 *
 * @param allSales All sale movements from the database.
 * @param products Current product inventory.
 */
export function generateFullCSV(
  allSales: Movement[],
  products: Product[]
): void {
  const now = formatFullDate(new Date())
  const salesItems = flattenSalesForExport(allSales)

  const totalRevenue = salesItems.reduce((s, m) => s + Number(m.total), 0)
  const totalReceived = salesItems.reduce((s, m) => s + Number(m.amountPaid || 0), 0)
  const totalPending = totalRevenue - totalReceived
  const totalStockValue = products.reduce((s, p) => s + Number(p.price) * p.quantity, 0)
  const totalStockUnits = products.reduce((s, p) => s + p.quantity, 0)

  const lines: string[] = []

  const addLine = (cols: string[]) => {
    lines.push(cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
  }

  const addEmpty = () => lines.push('')

  addLine(['AMÔFIT — Relatório Geral Completo'])
  addLine([`Gerado em: ${now}`])
  addEmpty()

  addLine(['═══ RESUMO FINANCEIRO ═══'])
  addLine(['Métrica', 'Valor'])
  addLine(['Total Faturado', `R$ ${csvMoney(totalRevenue)}`])
  addLine(['Total Recebido', `R$ ${csvMoney(totalReceived)}`])
  addLine(['Total Pendente (Fiado)', `R$ ${csvMoney(totalPending)}`])
  addLine(['Total de Vendas', String(salesItems.length)])
  addLine(['Capital Investido em Estoque', `R$ ${csvMoney(totalStockValue)}`])
  addLine(['Total Peças em Estoque', String(totalStockUnits)])
  addEmpty()

  addLine(['═══ HISTÓRICO COMPLETO DE VENDAS ═══'])
  addLine([
    'Data da Venda', 'Data do Ultimo Pagamento', 'Cliente', 'Ref / SKU', 'Produto', 'Categoria',
    'Tamanho', 'Cor', 'Qtd', 'Valor Unit. (R$)', 'Total (R$)',
    'Valor Pago (R$)', 'Valor Pendente (R$)', 'Método', 'Parcelas', 'Status',
  ])

  for (const item of salesItems) {
    const total = Number(item.total)
    const paid = Number(item.amountPaid || 0)
    addLine([
      formatFullDate(item.createdAt),
      item.paidAt ? formatFullDate(item.paidAt) : '—',
      item.customerName || '—',
      item.sku || '—',
      item.productName,
      item.category,
      item.size,
      item.color || '—',
      String(item.quantity),
      csvMoney(Number(item.unitPrice)),
      csvMoney(total),
      csvMoney(paid),
      csvMoney(total - paid),
      item.paymentMethod,
      String(item.installments || 1),
      item.paymentStatus === 'pending' ? 'Pendente' : 'Pago',
    ])
  }

  addLine([
    'TOTAL', '', '', '', '', '', '', '', '',
    `R$ ${csvMoney(totalRevenue)}`,
    `R$ ${csvMoney(totalReceived)}`,
    `R$ ${csvMoney(totalPending)}`,
    '', '', '', '',
  ])

  addEmpty()

  addLine(['═══ FIADOS PENDENTES (A RECEBER) ═══'])
  addLine(['Cliente', 'Produto', 'Tamanho', 'Data da Venda', 'Data Ultima Amortizacao', 'Total (R$)', 'Pago (R$)', 'Restante (R$)'])

  const pendingSales = salesItems.filter(s => s.paymentStatus === 'pending')
  for (const s of pendingSales) {
    const total = Number(s.total)
    const paid = Number(s.amountPaid || 0)
    addLine([
      s.customerName || '—',
      s.productName,
      s.size,
      formatFullDate(s.createdAt),
      s.paidAt ? formatFullDate(s.paidAt) : '—',
      csvMoney(total),
      csvMoney(paid),
      csvMoney(total - paid),
    ])
  }

  const pendingTotal = pendingSales.reduce((s, m) => s + Number(m.total) - Number(m.amountPaid || 0), 0)
  addLine(['TOTAL A RECEBER', '', '', '', '', '', '', `R$ ${csvMoney(pendingTotal)}`])

  addEmpty()

  addLine(['═══ INVENTÁRIO DE ESTOQUE ATUAL ═══'])
  addLine(['Produto', 'Categoria', 'Tamanho', 'Cores', 'Ref / SKU', 'Qtd Em Estoque', 'Preço Unit. (R$)', 'Valor Total Estoque (R$)'])

  for (const p of products) {
    addLine([
      p.name,
      p.category,
      p.size,
      p.colors || '—',
      p.sku || '—',
      String(p.quantity),
      csvMoney(Number(p.price)),
      csvMoney(Number(p.price) * p.quantity),
    ])
  }

  addLine([
    'TOTAL ESTOQUE', '', '', '', '',
    String(totalStockUnits),
    '',
    `R$ ${csvMoney(totalStockValue)}`,
  ])

  const csvContent = lines.join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `relatorio_amofit_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generates and downloads a beautifully designed PDF report containing executive summary,
 * detailed metrics, pending payments, complete sales history, stock inventory, and business recommendations.
 *
 * @param allSales All sale movements from the database.
 * @param products Current product inventory.
 */
export function generateReportPDF(
  allSales: Movement[],
  products: Product[]
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const salesItems = flattenSalesForExport(allSales)
  const now = formatFullDate(new Date())

  // Brand Palette
  const PURPLE = [107, 33, 168] as [number, number, number] // #6B21A8
  const PURPLE_LIGHT = [245, 238, 255] as [number, number, number]
  const AMBER = [217, 119, 6] as [number, number, number]
  const GREEN = [16, 185, 129] as [number, number, number]
  const GRAY = [100, 116, 139] as [number, number, number]
  const WHITE = [255, 255, 255] as [number, number, number]
  const DARK = [30, 41, 59] as [number, number, number]

  const totalRevenue = salesItems.reduce((s, m) => s + Number(m.total), 0)
  const totalReceived = salesItems.reduce((s, m) => s + Number(m.amountPaid || 0), 0)
  const totalPending = totalRevenue - totalReceived
  const totalStockValue = products.reduce((s, p) => s + Number(p.price) * p.quantity, 0)
  const totalStockUnits = products.reduce((s, p) => s + p.quantity, 0)
  const averageTicket = salesItems.length > 0 ? totalRevenue / salesItems.length : 0
  const totalItemsSold = salesItems.reduce((s, m) => s + m.quantity, 0)

  const returnsOnly = allSales.filter(m => m.type === 'return')
  const totalReturnedUnits = returnsOnly.reduce((s, r) => s + r.quantity, 0)
  const returnRate = totalItemsSold > 0 ? (totalReturnedUnits / totalItemsSold) * 100 : 0

  const currentStockUnits = totalStockUnits
  const sellThroughRate = (totalItemsSold + currentStockUnits) > 0
    ? (totalItemsSold / (totalItemsSold + currentStockUnits)) * 100
    : 0

  const pendingSales = salesItems.filter(s => s.paymentStatus === 'pending')
  const uniquePendingCustomers = new Set(pendingSales.map(s => s.customerName).filter(Boolean))

  let yPos = 0

  // --- HEADER BANNER ---
  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, pageWidth, 38, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...WHITE)
  doc.text('AMÔFIT', 14, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('RELATÓRIO EXECUTIVO DE VENDAS & ESTOQUE', 14, 26)

  doc.setFontSize(8)
  doc.setTextColor(230, 220, 250)
  doc.text(`Data de Emissão: ${now}`, pageWidth - 14, 26, { align: 'right' })

  yPos = 48

  // Section Header Helper
  const addSectionHeader = (title: string, y: number): number => {
    doc.setFillColor(...PURPLE_LIGHT)
    doc.roundedRect(14, y - 4, pageWidth - 28, 9, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...PURPLE)
    doc.text(title.toUpperCase(), 18, y + 2)
    return y + 10
  }

  // --- 1. VISÃO GERAL EXECUTIVA ---
  yPos = addSectionHeader('1. Visao Geral Executiva (Resumo de Indicadores)', yPos)

  const summaryKpis = [
    ['Total Faturado', formatBRL(totalRevenue)],
    ['Total Recebido no Caixa', formatBRL(totalReceived)],
    ['Total Pendente (Fiados a Receber)', formatBRL(totalPending)],
    ['Quantidade Total de Vendas', `${salesItems.length} transacoes`],
    ['Total de Peças Vendidas', `${totalItemsSold} unidades`],
    ['Ticket Médio por Venda', formatBRL(averageTicket)],
    ['Capital Investido em Estoque', formatBRL(totalStockValue)],
    ['Total de Peças no Estoque', `${totalStockUnits} peças em arara`],
    ['Taxa de Giro de Estoque', `${sellThroughRate.toFixed(1)}%`],
    ['Clientes com Fiado Pendente', `${uniquePendingCustomers.size} clientes`],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Indicador de Negocio', 'Valor / Metrica']],
    body: summaryKpis,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: PURPLE,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: { fontSize: 8.5, textColor: DARK },
    alternateRowStyles: { fillColor: [250, 246, 255] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
  })

  yPos = (doc as any).lastAutoTable.finalY + 8

  // --- 2. INSIGHTS ESTRATÉGICOS & PERFORMANCE ---
  if (yPos > 230) {
    doc.addPage()
    yPos = 20
  }

  yPos = addSectionHeader('2. Insights Estrategicos e Desempenho de Produtos', yPos)

  const productCounts: Record<string, number> = {}
  const categoryRevenue: Record<string, number> = {}
  const sizeCounts: Record<string, number> = {}
  const methodRevenue: Record<string, number> = {}

  for (const s of salesItems) {
    productCounts[s.productName] = (productCounts[s.productName] || 0) + s.quantity
    categoryRevenue[s.category] = (categoryRevenue[s.category] || 0) + Number(s.total)
    sizeCounts[s.size] = (sizeCounts[s.size] || 0) + s.quantity
    methodRevenue[s.paymentMethod] = (methodRevenue[s.paymentMethod] || 0) + Number(s.total)
  }

  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]
  const topCategory = Object.entries(categoryRevenue).sort((a, b) => b[1] - a[1])[0]
  const topSize = Object.entries(sizeCounts).sort((a, b) => b[1] - a[1])[0]
  const topMethod = Object.entries(methodRevenue).sort((a, b) => b[1] - a[1])[0]

  const soldProductNames = new Set(salesItems.map(s => s.productName))
  const deadStockProducts = products.filter(p => p.quantity > 0 && !soldProductNames.has(p.name))

  const insightsRows: string[][] = []

  if (topProduct) {
    insightsRows.push(['Produto Campeao de Vendas', `${topProduct[0]} (${topProduct[1]} unidades vendidas)`])
  }
  if (topCategory) {
    insightsRows.push(['Categoria Lider em Receita', `${topCategory[0]} (${formatBRL(topCategory[1])} faturados)`])
  }
  if (topSize) {
    insightsRows.push(['Tamanho Mais Procurado', `Grade ${topSize[0]} (${topSize[1]} unidades vendidas)`])
  }
  if (topMethod) {
    const pct = totalRevenue > 0 ? ((topMethod[1] / totalRevenue) * 100).toFixed(0) : '0'
    insightsRows.push(['Forma de Pagamento Preferida', `${topMethod[0]} (${formatBRL(topMethod[1])} - ${pct}% do total)`])
  }
  insightsRows.push(['Giro de Estoque (Sell-Through)', `${sellThroughRate.toFixed(1)}% do estoque total comercializado`])
  insightsRows.push(['Taxa de Devolucao / Retornos', `${returnRate.toFixed(1)}% (${totalReturnedUnits} devolucoes registradas)`])
  insightsRows.push(['Itens Sem Giro (Estoque Parado)', deadStockProducts.length > 0
    ? `${deadStockProducts.length} produtos parados (Ex: ${deadStockProducts[0].name})`
    : 'Nenhum item parado'
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Destaque Estrategico', 'Analise de Desempenho']],
    body: insightsRows,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: PURPLE,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [250, 246, 255] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { fontStyle: 'normal' },
    },
  })

  yPos = (doc as any).lastAutoTable.finalY + 8

  // --- 3. FIADOS PENDENTES E REPASSES A RECEBER ---
  if (pendingSales.length > 0) {
    if (yPos > 220) {
      doc.addPage()
      yPos = 20
    }

    yPos = addSectionHeader('3. Controle de Fiados e Contas a Receber', yPos)

    const customerDebts: Record<string, { items: string[], total: number, paid: number }> = {}
    for (const s of pendingSales) {
      const name = s.customerName || 'Cliente nao identificado'
      if (!customerDebts[name]) {
        customerDebts[name] = { items: [], total: 0, paid: 0 }
      }
      customerDebts[name].items.push(`${s.productName} (${s.size})`)
      customerDebts[name].total += Number(s.total)
      customerDebts[name].paid += Number(s.amountPaid || 0)
    }

    const debtRows = Object.entries(customerDebts)
      .sort((a, b) => (b[1].total - b[1].paid) - (a[1].total - a[1].paid))
      .map(([name, data]) => [
        name,
        data.items.join(', '),
        formatBRL(data.total),
        formatBRL(data.paid),
        formatBRL(data.total - data.paid),
      ])

    autoTable(doc, {
      startY: yPos,
      head: [['Nome do Cliente', 'Produtos Adquiridos', 'Valor Total', 'Valor Pago', 'Saldo Restante']],
      body: debtRows,
      theme: 'striped',
      margin: { left: 14, right: 14 },
      headStyles: {
        fillColor: AMBER,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 7.5, textColor: DARK },
      alternateRowStyles: { fillColor: [255, 251, 242] },
      columnStyles: {
        0: { cellWidth: 38, fontStyle: 'bold' },
        1: { cellWidth: 62 },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [180, 80, 0] },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(180, 80, 0)
    doc.text(`TOTAL PENDENTE A RECEBER: ${formatBRL(totalPending)}`, pageWidth - 14, yPos, { align: 'right' })
    yPos += 8
  }

  // --- 4. HISTÓRICO DE VENDAS ---
  if (yPos > 220) {
    doc.addPage()
    yPos = 20
  }

  yPos = addSectionHeader('4. Historico Completo de Vendas Registradas', yPos)

  const salesRows = salesItems.map(item => {
    const total = Number(item.total)
    return [
      formatShortDate(item.createdAt),
      item.customerName || '—',
      item.productName,
      item.size,
      String(item.quantity),
      formatBRL(total),
      item.paymentMethod,
      item.paymentStatus === 'pending' ? 'Pendente' : 'Pago',
    ]
  })

  autoTable(doc, {
    startY: yPos,
    head: [['Data', 'Cliente', 'Produto', 'Tam', 'Qtd', 'Total', 'Forma Pagto', 'Status']],
    body: salesRows,
    theme: 'striped',
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: PURPLE,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7.5, textColor: DARK },
    alternateRowStyles: { fillColor: [250, 246, 255] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 28 },
      2: { cellWidth: 44 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'center' },
      7: { cellWidth: 18, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = data.cell.raw as string
        if (val === 'Pendente') {
          data.cell.styles.textColor = [180, 80, 0]
          data.cell.styles.fontStyle = 'bold'
        } else {
          data.cell.styles.textColor = [0, 130, 70]
        }
      }
    },
  })

  yPos = (doc as any).lastAutoTable.finalY + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...PURPLE)
  doc.text(`TOTAL DE VENDAS: ${salesItems.length} | FATURAMENTO TOTAL: ${formatBRL(totalRevenue)}`, pageWidth - 14, yPos, { align: 'right' })
  yPos += 8

  // --- 5. INVENTÁRIO DE ESTOQUE ATUAL ---
  if (yPos > 220) {
    doc.addPage()
    yPos = 20
  }

  yPos = addSectionHeader('5. Inventario de Estoque Atual', yPos)

  const stockRows = products.map(p => [
    p.name,
    p.category,
    p.size,
    p.colors || '—',
    p.sku || '—',
    String(p.quantity),
    formatBRL(Number(p.price)),
    formatBRL(Number(p.price) * p.quantity),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Produto', 'Categoria', 'Tam', 'Cores', 'Ref / SKU', 'Qtd', 'Preco Unit.', 'Valor Total']],
    body: stockRows,
    theme: 'striped',
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: PURPLE,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7.5, textColor: DARK },
    alternateRowStyles: { fillColor: [250, 246, 255] },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 22 },
      2: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 24 },
      4: { cellWidth: 22 },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 26, halign: 'right' },
      7: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
  })

  yPos = (doc as any).lastAutoTable.finalY + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...PURPLE)
  doc.text(
    `TOTAL EM ESTOQUE: ${totalStockUnits} peças | CAPITAL INVESTIDO: ${formatBRL(totalStockValue)}`,
    pageWidth - 14,
    yPos,
    { align: 'right' }
  )

  // --- FOOTER FOR ALL PAGES ---
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text(
      `AMÔFIT — SE AME. SE MOVA. — Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 7,
      { align: 'center' }
    )
  }

  doc.save(`relatorio_amofit_${new Date().toISOString().slice(0, 10)}.pdf`)
}
