import { randomUUID } from 'crypto'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

const SERVICE_NAME = 'amofit-stock'

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'credit_card',
  'document',
  'customername',
  'email',
  'phone',
]

/**
 * Determines whether a context key holds sensitive data that must be redacted.
 *
 * @param key The context key to inspect.
 * @returns True when the key matches a sensitive pattern.
 */
function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase()
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive))
}

/**
 * Produces a shallow copy of the context with sensitive values masked.
 *
 * @param context The raw log context.
 * @returns A sanitized context safe for emission.
 */
export function redact(context: LogContext): LogContext {
  const sanitized: LogContext = {}
  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = isSensitiveKey(key) ? '[REDACTED]' : value
  }
  return sanitized
}

/**
 * Converts an unknown thrown value into a serializable error descriptor.
 *
 * @param err The thrown value.
 * @returns A plain object with name, message and stack.
 */
export function describeError(err: unknown): LogContext {
  if (err instanceof Error) {
    return { error_name: err.name, error_message: err.message, stack_trace: err.stack }
  }
  return { error_message: String(err) }
}

/**
 * Generates a new correlation identifier for request tracing.
 *
 * @returns A UUIDv4 string.
 */
export function newTraceId(): string {
  return randomUUID()
}

/**
 * Emits a single-line structured JSON log entry.
 *
 * @param level The severity level.
 * @param message The English log message.
 * @param context Additional structured fields; must include trace_id when available.
 */
function emit(level: LogLevel, message: string, context: LogContext = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service_name: SERVICE_NAME,
    message,
    trace_id: context.trace_id ?? null,
    ...redact(context),
  }
  const line = `${JSON.stringify(entry)}\n`
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout
  stream.write(line)
}

/**
 * Centralized structured logger for server-side code.
 */
export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
}
