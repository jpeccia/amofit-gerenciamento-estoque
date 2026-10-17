/**
 * Pricing Formula Engine for Amo Fit
 * Allows calculating final selling prices from cost prices using customizable formulas.
 */

export interface PricingFormulaConfig {
  formula: string
  autoApply: boolean
}

const STORAGE_KEY_FORMULA = 'amofit_pricing_formula'
const STORAGE_KEY_AUTO_APPLY = 'amofit_pricing_auto_apply'
export const DEFAULT_FORMULA = 'custo * 2'

/**
 * Retrieves the stored pricing formula from local storage or returns the default.
 *
 * @returns The active formula expression string.
 */
export function getStoredPricingFormula(): string {
  if (typeof window === 'undefined') return DEFAULT_FORMULA
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FORMULA)
    return saved && saved.trim() ? saved.trim() : DEFAULT_FORMULA
  } catch {
    return DEFAULT_FORMULA
  }
}

/**
 * Persists a customized pricing formula string into local storage.
 *
 * @param formula The formula expression to store.
 */
export function setStoredPricingFormula(formula: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_FORMULA, formula.trim())
  } catch {
    // Graceful fallback for restricted storage environments
  }
}

/**
 * Retrieves whether auto-applying calculated price on cost input is enabled.
 *
 * @returns True if auto-apply is enabled, false otherwise.
 */
export function getStoredAutoApply(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY_AUTO_APPLY) === 'true'
  } catch {
    return false
  }
}

/**
 * Persists the auto-apply preference into local storage.
 *
 * @param enabled Whether auto-apply should be active.
 */
export function setStoredAutoApply(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_AUTO_APPLY, enabled ? 'true' : 'false')
  } catch {
    // Graceful fallback for restricted storage environments
  }
}

/**
 * Tokenizes and normalizes an expression string into safe math tokens.
 *
 * @param expr The mathematical expression string.
 * @param cost The numerical cost price to substitute for the variable.
 * @returns Array of valid tokens or null if expression contains unsupported characters.
 */
function tokenizeExpression(expr: string, cost: number): string[] | null {
  const cleanExpr = expr
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/custo|cost|c|x(?=[^0-9.]|$)/g, cost.toString())

  const validTokenRegex = /^([0-9.]+|[+\-*/()]|x)+$/
  if (!validTokenRegex.test(cleanExpr)) {
    return null
  }

  const tokens = cleanExpr.match(/([0-9.]+|[+\-*/()])/g)
  return tokens
}

/**
 * Evaluates basic mathematical tokens using safe operator precedence.
 *
 * @param tokens The validated list of numeric and operator tokens.
 * @returns The calculated numeric result, or null if syntax is invalid.
 */
function evaluateTokens(tokens: string[]): number | null {
  const values: number[] = []
  const ops: string[] = []

  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
  }

  const applyOp = () => {
    const op = ops.pop()
    const b = values.pop()
    const a = values.pop()
    if (op === undefined || a === undefined || b === undefined) return false

    if (op === '+') values.push(a + b)
    else if (op === '-') values.push(a - b)
    else if (op === '*') values.push(a * b)
    else if (op === '/') values.push(b === 0 ? 0 : a / b)
    return true
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const num = Number(token)

    if (!Number.isNaN(num)) {
      values.push(num)
    } else if (token === '(') {
      ops.push(token)
    } else if (token === ')') {
      while (ops.length > 0 && ops[ops.length - 1] !== '(') {
        if (!applyOp()) return null
      }
      ops.pop()
    } else if (token in precedence) {
      while (
        ops.length > 0 &&
        ops[ops.length - 1] in precedence &&
        precedence[ops[ops.length - 1]] >= precedence[token]
      ) {
        if (!applyOp()) return null
      }
      ops.push(token)
    } else {
      return null
    }
  }

  while (ops.length > 0) {
    if (!applyOp()) return null
  }

  return values.length === 1 && !Number.isNaN(values[0]) ? values[0] : null
}

/**
 * Safely evaluates a pricing formula expression against a given cost price.
 * Supports formulas such as 'custo * 2', 'custo * 2.2 + 5', or pure multipliers like '2.2' or 'x2'.
 *
 * @param formula The formula string configured by the user.
 * @param cost The numerical cost price.
 * @returns The calculated final selling price, or null if formula could not be evaluated.
 */
export function calculatePriceFromFormula(
  formula: string,
  cost: number
): number | null {
  if (cost <= 0 || Number.isNaN(cost)) return null
  if (!formula || !formula.trim()) return null

  const trimmed = formula.trim()

  const multiplierMatch = trimmed.match(/^x?([0-9]+(?:[.,][0-9]+)?)$/i)
  if (multiplierMatch) {
    const mult = Number(multiplierMatch[1].replace(',', '.'))
    if (!Number.isNaN(mult) && mult > 0) {
      return Math.round(cost * mult * 100) / 100
    }
  }

  const normalizedFormula = trimmed.replace(/,/g, '.')
  const tokens = tokenizeExpression(normalizedFormula, cost)
  if (!tokens || tokens.length === 0) return null

  const result = evaluateTokens(tokens)
  if (result === null || Number.isNaN(result) || result <= 0) return null

  return Math.round(result * 100) / 100
}
