import { formatBRL } from '@/lib/constants'

/**
 * Supported Pix key types in Brazil.
 */
export type PixKeyType = 'CNPJ' | 'CPF' | 'Celular' | 'E-mail' | 'Aleatória'

/**
 * Configuration schema for the store's Pix payment details.
 */
export interface StorePixConfig {
  key: string
  type: PixKeyType
  beneficiary?: string
  city?: string
}

const STORAGE_KEY_PIX = 'amofit_store_pix_config'

export const DEFAULT_PIX_CONFIG: StorePixConfig = {
  key: '',
  type: 'CNPJ',
  beneficiary: 'Amo Fit',
  city: '',
}

/**
 * Retrieves the store's configured Pix credentials from browser local storage.
 *
 * @returns The stored Pix configuration or the default fallback.
 */
export function getStorePixConfig(): StorePixConfig {
  if (typeof window === 'undefined') return DEFAULT_PIX_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PIX)
    if (!raw) return DEFAULT_PIX_CONFIG
    const parsed = JSON.parse(raw) as Partial<StorePixConfig>
    return {
      key: parsed.key?.trim() || '',
      type: parsed.type || 'CNPJ',
      beneficiary: parsed.beneficiary?.trim() || 'Amo Fit',
      city: parsed.city?.trim() || '',
    }
  } catch {
    return DEFAULT_PIX_CONFIG
  }
}

/**
 * Persists the store's Pix credentials into browser local storage.
 *
 * @param config The updated Pix configuration.
 */
export function setStorePixConfig(config: StorePixConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_PIX, JSON.stringify(config))
  } catch {
    // Graceful fallback for restricted storage environments
  }
}

/**
 * Options required to assemble a customer payment reminder message.
 */
export interface DebtReminderOptions {
  customerName?: string | null
  itemsDescription: string
  totalAmount: number
  amountPaid?: number
  remainingAmount: number
}

/**
 * Formats a clear, warm, and convenient WhatsApp debt reminder message.
 * Emits the Pix key on its own line for effortless single-tap copy on mobile WhatsApp.
 *
 * @param options Payment details and item summary for the customer reminder.
 * @returns Formatted WhatsApp message ready for URI encoding.
 */
export function formatWhatsAppDebtReminder(options: DebtReminderOptions): string {
  const pix = getStorePixConfig()
  const rawFirstName = options.customerName ? options.customerName.trim().split(' ')[0] : 'Cliente'
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)

  const lines: string[] = []

  lines.push(`Olá, ${firstName}! Tudo bem? 💜`)
  lines.push('')
  lines.push('Lembrete da sua compra na *Amo Fit*:')
  lines.push(`• *Peça(s):* ${options.itemsDescription}`)
  lines.push(`• *Valor pendente:* *${formatBRL(options.remainingAmount)}*`)
  lines.push('')

  if (pix.key) {
    lines.push(`🔑 *Pix (${pix.type}):*`)
    lines.push(pix.key)
    if (pix.beneficiary) {
      lines.push(`(${pix.beneficiary})`)
    }
    lines.push('')
  } else {
    lines.push('🔑 *Chave Pix da loja disponível para pagamento.*')
    lines.push('')
  }

  lines.push('_Se já efetuou o pagamento, por favor desconsidere!_')

  return lines.join('\n')
}
