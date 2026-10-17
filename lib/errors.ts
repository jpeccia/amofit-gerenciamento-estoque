/**
 * Catalog of application error codes following the `<MODULE>_<CATEGORY>_<CODE>` convention.
 * Each code maps to an HTTP-like status and a user-facing Portuguese message.
 */
export const ERROR_CATALOG = {
  AUTH_SESSION_401: { status: 401, label: 'Unauthorized', userMessage: 'Sessão expirada. Faça login novamente.' },

  PRODUCTS_CREATE_400: { status: 400, label: 'BadRequest', userMessage: 'Dados do produto inválidos.' },
  PRODUCTS_CREATE_500: { status: 500, label: 'InternalServerError', userMessage: 'Não foi possível adicionar o produto.' },
  PRODUCTS_UPDATE_400: { status: 400, label: 'BadRequest', userMessage: 'Dados do produto inválidos.' },
  PRODUCTS_UPDATE_404: { status: 404, label: 'NotFound', userMessage: 'Produto não encontrado.' },
  PRODUCTS_UPDATE_409: { status: 409, label: 'Conflict', userMessage: 'Uma variante só pode ter uma cor. Cadastre outra cor como novo produto.' },
  PRODUCTS_UPDATE_500: { status: 500, label: 'InternalServerError', userMessage: 'Não foi possível atualizar o produto.' },
  PRODUCTS_ADJUST_400: { status: 400, label: 'BadRequest', userMessage: 'Ajuste de estoque inválido.' },
  PRODUCTS_ADJUST_404: { status: 404, label: 'NotFound', userMessage: 'Produto não encontrado.' },
  PRODUCTS_ADJUST_500: { status: 500, label: 'InternalServerError', userMessage: 'Não foi possível ajustar o estoque.' },
  PRODUCTS_DELETE_404: { status: 404, label: 'NotFound', userMessage: 'Produto não encontrado.' },
  PRODUCTS_DELETE_500: { status: 500, label: 'InternalServerError', userMessage: 'Não foi possível remover o produto.' },
  PRODUCTS_REDISTRIBUTE_400: { status: 400, label: 'BadRequest', userMessage: 'Distribuição de cores inválida.' },
  PRODUCTS_REDISTRIBUTE_404: { status: 404, label: 'NotFound', userMessage: 'Produto pendente não encontrado.' },
  PRODUCTS_REDISTRIBUTE_409: { status: 409, label: 'Conflict', userMessage: 'A soma das cores é maior que a quantidade disponível.' },
  PRODUCTS_REDISTRIBUTE_500: { status: 500, label: 'InternalServerError', userMessage: 'Não foi possível ajustar as cores.' },

  SALES_REGISTER_400: { status: 400, label: 'BadRequest', userMessage: 'Dados da venda inválidos. Verifique as quantidades e preços.' },
  SALES_REGISTER_404: { status: 404, label: 'NotFound', userMessage: 'Um ou mais produtos não foram encontrados no estoque.' },
  SALES_REGISTER_409: { status: 409, label: 'Conflict', userMessage: 'Estoque insuficiente para um ou mais produtos selecionados.' },
  SALES_REGISTER_500: { status: 500, label: 'InternalServerError', userMessage: 'Não foi possível registrar a venda.' },
  SALES_RETURN_400: { status: 400, label: 'BadRequest', userMessage: 'Dados do retorno inválidos.' },
  SALES_RETURN_404: { status: 404, label: 'NotFound', userMessage: 'Produto não encontrado.' },
  SALES_RETURN_500: { status: 500, label: 'InternalServerError', userMessage: 'Não foi possível registrar o retorno.' },
  SALES_UNDO_404: { status: 404, label: 'NotFound', userMessage: 'Movimentação não encontrada.' },
  SALES_UNDO_500: { status: 500, label: 'InternalServerError', userMessage: 'Não foi possível desfazer a movimentação.' },
  SALES_UPDATE_400: { status: 400, label: 'BadRequest', userMessage: 'Dados da venda inválidos.' },
  SALES_UPDATE_404: { status: 404, label: 'NotFound', userMessage: 'Venda não encontrada.' },
  SALES_UPDATE_409: { status: 409, label: 'Conflict', userMessage: 'Estoque insuficiente para aumentar a quantidade.' },
  SALES_UPDATE_500: { status: 500, label: 'InternalServerError', userMessage: 'Não foi possível atualizar a venda.' },
  SALES_CLEAR_500: { status: 500, label: 'InternalServerError', userMessage: 'Não foi possível zerar o caixa.' },
} as const

export type ErrorCode = keyof typeof ERROR_CATALOG

/**
 * Domain error carrying a catalogued application error code.
 */
export class DomainError extends Error {
  readonly code: ErrorCode

  /**
   * @param code The catalogued error code.
   */
  constructor(code: ErrorCode) {
    super(code)
    this.name = 'DomainError'
    this.code = code
  }
}

/**
 * Sanitized error payload returned to clients.
 */
export type ActionErrorPayload = {
  error: string
  message: ErrorCode
  statusCode: number
}

/**
 * Standard server action result envelope.
 */
export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: ActionErrorPayload }

/**
 * Builds the sanitized client payload for a catalogued error code.
 *
 * @param code The catalogued error code.
 * @returns The client-safe error payload.
 */
export function toErrorPayload(code: ErrorCode): ActionErrorPayload {
  const entry = ERROR_CATALOG[code]
  return { error: entry.label, message: code, statusCode: entry.status }
}

/**
 * Type guard verifying a string is a known error code.
 *
 * @param value The candidate string.
 * @returns True if the value is a catalogued error code.
 */
export function isErrorCode(value: string): value is ErrorCode {
  return Object.prototype.hasOwnProperty.call(ERROR_CATALOG, value)
}

/**
 * Resolves a user-facing Portuguese message from a thrown value.
 *
 * @param err The thrown value, typically an Error whose message is an error code.
 * @param fallback Message used when the code is unknown.
 * @returns The user-facing message.
 */
export function getUserMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback
  return isErrorCode(err.message) ? ERROR_CATALOG[err.message].userMessage : fallback
}
