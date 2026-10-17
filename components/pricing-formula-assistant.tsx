'use client'

import { useState, useEffect, useMemo } from 'react'
import { Sparkles, Settings2, Check, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  calculatePriceFromFormula,
  getStoredPricingFormula,
  setStoredPricingFormula,
  getStoredAutoApply,
  setStoredAutoApply,
  DEFAULT_FORMULA,
} from '@/lib/pricing-formula'
import { formatBRL } from '@/lib/constants'

/**
 * Assistant component that calculates and applies final selling prices based on product cost
 * using custom, persistent markup formulas.
 *
 * @param props Props containing the raw cost string, the callback to set price, and optional current price.
 * @returns The rendered React component.
 */
export function PricingFormulaAssistant({
  costPriceStr,
  onApplyPrice,
  currentPriceStr,
}: {
  costPriceStr: string
  onApplyPrice: (priceStr: string) => void
  currentPriceStr?: string
}) {
  const [formula, setFormula] = useState(DEFAULT_FORMULA)
  const [tempFormula, setTempFormula] = useState(DEFAULT_FORMULA)
  const [autoApply, setAutoApply] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  useEffect(() => {
    const savedFormula = getStoredPricingFormula()
    const savedAuto = getStoredAutoApply()
    setFormula(savedFormula)
    setTempFormula(savedFormula)
    setAutoApply(savedAuto)
  }, [])

  const parsedCost = useMemo(() => {
    if (!costPriceStr) return 0
    const num = Number(costPriceStr.replace(',', '.'))
    return Number.isNaN(num) || num <= 0 ? 0 : num
  }, [costPriceStr])

  const calculatedPrice = useMemo(() => {
    if (parsedCost <= 0) return null
    return calculatePriceFromFormula(formula, parsedCost)
  }, [formula, parsedCost])

  const previewCalculatedPrice = useMemo(() => {
    const sampleCost = parsedCost > 0 ? parsedCost : 50
    return calculatePriceFromFormula(tempFormula, sampleCost)
  }, [tempFormula, parsedCost])

  useEffect(() => {
    if (autoApply && calculatedPrice !== null && parsedCost > 0) {
      const formatted = calculatedPrice.toFixed(2).replace('.', ',')
      if (formatted !== currentPriceStr) {
        onApplyPrice(formatted)
      }
    }
  }, [autoApply, calculatedPrice, parsedCost, currentPriceStr, onApplyPrice])

  function handleSaveFormula() {
    if (!tempFormula.trim()) {
      toast.error('Informe uma fórmula válida')
      return
    }
    const test = calculatePriceFromFormula(tempFormula, 50)
    if (test === null) {
      toast.error('Fórmula inválida. Use ex: "custo * 2" ou "custo * 2.2"')
      return
    }
    setStoredPricingFormula(tempFormula)
    setStoredAutoApply(autoApply)
    setFormula(tempFormula)
    setShowConfig(false)
    toast.success('Fórmula de precificação salva!')
  }

  function handleResetDefault() {
    setTempFormula(DEFAULT_FORMULA)
    setStoredPricingFormula(DEFAULT_FORMULA)
    setFormula(DEFAULT_FORMULA)
    toast.info('Fórmula restaurada para: custo * 2')
  }

  function handleQuickMultiplier(multiplier: number) {
    if (parsedCost <= 0) {
      toast.error('Preencha o Preço de Custo primeiro')
      return
    }
    const calculated = Math.round(parsedCost * multiplier * 100) / 100
    onApplyPrice(calculated.toFixed(2).replace('.', ','))
    toast.success(`Preço aplicado: ${formatBRL(calculated)} (${multiplier}x)`)
  }

  function handleApplyCalculated() {
    if (calculatedPrice === null) return
    onApplyPrice(calculatedPrice.toFixed(2).replace('.', ','))
    toast.success(`Preço calculado aplicado: ${formatBRL(calculatedPrice)}`)
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 flex flex-col gap-2 transition-all">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Fórmula de Preço:</span>
          <span className="font-mono bg-primary/10 px-1.5 py-0.5 rounded text-[11px] font-bold">
            {formula}
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setShowConfig(!showConfig)}
          className="h-6 px-2 text-[11px] gap-1 font-semibold text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="h-3 w-3" />
          <span>{showConfig ? 'Fechar' : 'Personalizar'}</span>
        </Button>
      </div>

      {parsedCost > 0 && calculatedPrice !== null && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-primary/10 flex-wrap">
          <div className="text-xs">
            <span className="text-muted-foreground">Sugerido: </span>
            <strong className="text-foreground text-sm font-bold">
              {formatBRL(calculatedPrice)}
            </strong>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold ml-1.5">
              (+{Math.round(((calculatedPrice - parsedCost) / parsedCost) * 100)}% margem)
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              onClick={handleApplyCalculated}
              className="h-7 px-2.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg cursor-pointer shadow-sm gap-1"
            >
              <Check className="h-3 w-3" />
              <span>Aplicar</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleQuickMultiplier(2.0)}
              className="h-7 px-1.5 text-[11px] font-bold cursor-pointer"
              title="Multiplicar por 2.0 (100% de margem)"
            >
              2x
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleQuickMultiplier(2.2)}
              className="h-7 px-1.5 text-[11px] font-bold cursor-pointer"
              title="Multiplicar por 2.2 (120% de margem)"
            >
              2.2x
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleQuickMultiplier(2.5)}
              className="h-7 px-1.5 text-[11px] font-bold cursor-pointer"
              title="Multiplicar por 2.5 (150% de margem)"
            >
              2.5x
            </Button>
          </div>
        </div>
      )}

      {showConfig && (
        <div className="mt-1 pt-2 border-t border-primary/20 flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-foreground">
              Expressão da Fórmula:
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                value={tempFormula}
                onChange={(e) => setTempFormula(e.target.value)}
                placeholder="Ex: custo * 2.2 ou custo * 2 + 5"
                className="h-8 text-xs font-mono"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSaveFormula}
                className="h-8 px-3 text-xs bg-primary text-primary-foreground font-bold shrink-0 cursor-pointer"
              >
                Salvar
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Utilize a palavra <strong className="text-foreground">custo</strong> (ex: <code className="bg-muted px-1 rounded">custo * 2.2</code>, <code className="bg-muted px-1 rounded">custo * 2 + 10</code> ou <code className="bg-muted px-1 rounded">custo / 0.5</code>).
            </p>
          </div>

          <div className="flex items-center justify-between text-xs bg-muted/40 p-2 rounded-lg">
            <span className="text-muted-foreground text-[11px]">
              Prévia (p/ custo {formatBRL(parsedCost > 0 ? parsedCost : 50)}):
            </span>
            <strong className="text-foreground font-bold">
              {previewCalculatedPrice !== null
                ? formatBRL(previewCalculatedPrice)
                : 'Fórmula inválida'}
            </strong>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoApply}
                onChange={(e) => {
                  setAutoApply(e.target.checked)
                  setStoredAutoApply(e.target.checked)
                }}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Preencher preço final automaticamente</span>
            </label>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetDefault}
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>Padrão</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
