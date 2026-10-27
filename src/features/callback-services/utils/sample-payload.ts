import { TIMEZONE_OPTIONS } from '../constants/callback-services.constants'
import type { FieldMapping, MappingFieldKey, TimestampFormat } from '../types/callback-services.types'
import { mappingPathSegments } from './mapping-path'

/** Phần cấu hình mapping dùng để sinh payload mẫu. */
export interface MappingConfig {
  mapping: FieldMapping
  timestampFormat: TimestampFormat
  timestampPattern: string
  timezone: string
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}

/** Định dạng một thời điểm theo cấu hình timestamp của dịch vụ (dùng để sinh payload mẫu). */
export function formatSampleTimestamp(date: Date, config: MappingConfig): string | number {
  const offset = TIMEZONE_OPTIONS.find((o) => o.value === config.timezone)?.offsetMinutes ?? 0
  const local = new Date(date.getTime() + offset * 60_000)
  const parts = {
    yyyy: pad(local.getUTCFullYear(), 4),
    MM: pad(local.getUTCMonth() + 1),
    dd: pad(local.getUTCDate()),
    HH: pad(local.getUTCHours()),
    mm: pad(local.getUTCMinutes()),
    ss: pad(local.getUTCSeconds()),
    SSS: pad(local.getUTCMilliseconds(), 3),
  }

  switch (config.timestampFormat) {
    case 'UNIX_SECONDS':
      return Math.floor(date.getTime() / 1000)
    case 'UNIX_MILLIS':
      return date.getTime()
    case 'CUSTOM':
      return config.timestampPattern.replace(/yyyy|MM|dd|HH|mm|ss|SSS/g, (token) => parts[token as keyof typeof parts])
    case 'ISO_8601': {
      const sign = offset < 0 ? '-' : '+'
      const abs = Math.abs(offset)
      const zone = offset === 0 ? 'Z' : `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
      return `${parts.yyyy}-${parts.MM}-${parts.dd}T${parts.HH}:${parts.mm}:${parts.ss}${zone}`
    }
  }
}

function setPath(target: Record<string, unknown>, segments: string[], value: unknown): void {
  let cursor = target
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      cursor[segment] = value
      return
    }
    const next = cursor[segment]
    if (typeof next !== 'object' || next === null || Array.isArray(next)) cursor[segment] = {}
    cursor = cursor[segment] as Record<string, unknown>
  })
}

export interface SamplePayloadOptions {
  transactionId: string
  status: string
  businessTime: Date
  /** Bỏ qua một trường để mô phỏng payload thiếu key. */
  omit?: MappingFieldKey
}

/** Sinh payload JSON mẫu theo đúng cấu trúc mapping hiện tại (không cần sửa code khi đổi cấu trúc). */
export function buildSamplePayload(config: MappingConfig, options: SamplePayloadOptions): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  const values: Record<MappingFieldKey, string | number> = {
    transactionId: options.transactionId,
    status: options.status,
    timestamp: formatSampleTimestamp(options.businessTime, config),
  }

  for (const key of ['transactionId', 'status', 'timestamp'] as const) {
    if (key === options.omit) continue
    const segments = mappingPathSegments(config.mapping[key])
    if (!segments) continue
    setPath(payload, segments, values[key])
  }

  if (!('amount' in payload)) payload.amount = 250000
  if (!('currency' in payload)) payload.currency = 'VND'
  return payload
}
