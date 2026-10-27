import { ERROR_CODES } from '@/constants/error-codes'
import { ApiError } from '@/services/http/error-handler'
import { byteLength } from '@/utils/format'
import {
  DEFAULT_PATTERN,
  DEFAULT_RESPONSE_BODY,
  DEFAULT_TIMEZONE,
  FORBIDDEN_RESPONSE_STATUSES,
  MAX_API_KEY_HEADER_LENGTH,
  MAX_API_KEY_SECRET_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PATTERN_LENGTH,
  MAX_RESPONSE_BODY_BYTES,
  MAX_SERVICE_CODE_LENGTH,
} from '../constants/callback-services.constants'
import type { ServiceFormErrorKey, ServiceFormErrors, ServiceFormValues } from '../types/callback-services.types'
import { isValidMappingPath, MAPPING_PATH_ERROR } from './mapping-path'

/** Giá trị mặc định khi tạo dịch vụ (D13, AC2.5.4): bật, NONE, ISO 8601, Asia/Ho_Chi_Minh, response 200 `{}`. */
export const EMPTY_FORM_VALUES: ServiceFormValues = {
  code: '',
  name: '',
  description: '',
  enabled: true,
  authType: 'NONE',
  apiKeyHeader: 'X-API-Key',
  apiKeySecret: '',
  apiKeyConfigured: false,
  mapping: { transactionId: '$.transactionId', status: '$.status', timestamp: '$.timestamp' },
  timestampFormat: 'ISO_8601',
  timestampPattern: DEFAULT_PATTERN,
  timezone: DEFAULT_TIMEZONE,
  responseStatus: '200',
  responseBody: DEFAULT_RESPONSE_BODY,
}

/** Thứ tự các ô trên form, dùng để chuyển tiêu điểm tới ô lỗi đầu tiên. */
export const FORM_FIELD_ORDER: readonly ServiceFormErrorKey[] = [
  'code',
  'name',
  'description',
  'apiKeyHeader',
  'apiKeySecret',
  'mapping.transactionId',
  'mapping.status',
  'mapping.timestamp',
  'timestampFormat',
  'timestampPattern',
  'timezone',
  'responseStatus',
  'responseBody',
]

export function firstErrorKey(errors: ServiceFormErrors): ServiceFormErrorKey | undefined {
  return FORM_FIELD_ORDER.find((key) => errors[key] !== undefined)
}

/** D3: định dạng và múi giờ chỉ có nghĩa khi có đường dẫn timestamp, nên bị khóa (giữ giá trị) khi đường dẫn để trống. */
export function isTimestampSettingsLocked(values: ServiceFormValues): boolean {
  return values.mapping.timestamp.trim() === ''
}

const SERVICE_CODE_REGEX = /^[A-Za-z0-9_-]{1,50}$/
/** Tên header HTTP hợp lệ (token theo RFC 9110). */
const HEADER_NAME_REGEX = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/
/** ASCII in được (khoảng trắng đến `~`). */
const PRINTABLE_ASCII_REGEX = /^[\x20-\x7e]+$/

const MESSAGES = {
  codeRequired: 'Nhập mã dịch vụ.',
  codeInvalid: `Mã chỉ gồm chữ, số, '-' và '_', dài 1–${MAX_SERVICE_CODE_LENGTH} ký tự.`,
  codeDuplicate: 'Mã dịch vụ đã tồn tại (kể cả dịch vụ đã xóa).',
  nameRequired: 'Nhập tên dịch vụ.',
  headerRequired: 'Nhập tên header.',
  headerInvalid: 'Tên header chứa ký tự không hợp lệ.',
  secretRequired: 'Nhập giá trị khóa.',
  secretInvalid: `Khóa gồm ký tự ASCII in được, không có khoảng trắng ở đầu hoặc cuối, tối đa ${MAX_API_KEY_SECRET_LENGTH} ký tự.`,
  pathRequired: 'Nhập đường dẫn.',
  patternRequired: 'Nhập mẫu ngày giờ.',
  patternInvalid: 'Mẫu ngày giờ không hợp lệ theo cú pháp DateTimeFormatter của Java.',
  statusRange: 'HTTP status phải từ 200 đến 599.',
  statusForbidden: 'HTTP status không được là 204, 205 hoặc 304 vì các mã này không có body.',
  bodyInvalid: 'Body phải là JSON hợp lệ.',
  bodyTooLarge: 'Body tối đa 64 KB.',
} as const

/**
 * Mẫu `DateTimeFormatter` cần đủ năm, tháng, ngày, giờ và phút; cú pháp chi tiết do backend kiểm.
 * Năm có thể viết `y` (year-of-era) hoặc `u` (year), backend chấp nhận cả hai.
 */
function patternHasRequiredFields(pattern: string): boolean {
  return /[yu]/.test(pattern) && /M/.test(pattern) && /d/.test(pattern) && /[HhKk]/.test(pattern) && /m/.test(pattern)
}

/** Kiểm tra form trước khi gửi. Backend vẫn là nơi quyết định cuối cùng (xem `applyApiError`). */
export function validateServiceForm(values: ServiceFormValues, options: { isNew: boolean }): ServiceFormErrors {
  const errors: ServiceFormErrors = {}

  if (options.isNew) {
    const code = values.code.trim()
    if (code === '') errors.code = MESSAGES.codeRequired
    else if (!SERVICE_CODE_REGEX.test(code)) errors.code = MESSAGES.codeInvalid
  }

  const name = values.name.trim()
  if (name === '') errors.name = MESSAGES.nameRequired
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Tên tối đa ${MAX_NAME_LENGTH} ký tự.`

  if (values.description.trim().length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Mô tả tối đa ${MAX_DESCRIPTION_LENGTH} ký tự.`
  }

  if (values.authType === 'API_KEY') {
    const header = values.apiKeyHeader.trim()
    if (header === '') errors.apiKeyHeader = MESSAGES.headerRequired
    else if (!HEADER_NAME_REGEX.test(header) || header.length > MAX_API_KEY_HEADER_LENGTH) {
      errors.apiKeyHeader = MESSAGES.headerInvalid
    }

    const secret = values.apiKeySecret
    if (secret === '') {
      // Sửa dịch vụ đã có khóa: để trống nghĩa là giữ khóa cũ (AC2.4.3). Các trường hợp còn lại bắt buộc có khóa.
      if (!values.apiKeyConfigured) errors.apiKeySecret = MESSAGES.secretRequired
    } else if (
      secret.length > MAX_API_KEY_SECRET_LENGTH ||
      !PRINTABLE_ASCII_REGEX.test(secret) ||
      secret !== secret.trim()
    ) {
      errors.apiKeySecret = MESSAGES.secretInvalid
    }
  }

  const required = [
    ['mapping.transactionId', values.mapping.transactionId],
    ['mapping.status', values.mapping.status],
  ] as const
  for (const [key, raw] of required) {
    const path = raw.trim()
    if (path === '') errors[key] = MESSAGES.pathRequired
    else if (!isValidMappingPath(path)) errors[key] = MAPPING_PATH_ERROR
  }
  const timestampPath = values.mapping.timestamp.trim()
  if (timestampPath !== '' && !isValidMappingPath(timestampPath)) errors['mapping.timestamp'] = MAPPING_PATH_ERROR

  if (values.timestampFormat === 'CUSTOM') {
    const pattern = values.timestampPattern.trim()
    if (pattern === '') errors.timestampPattern = MESSAGES.patternRequired
    else if (pattern.length > MAX_PATTERN_LENGTH || !patternHasRequiredFields(pattern)) {
      errors.timestampPattern = MESSAGES.patternInvalid
    }
  }

  const statusText = values.responseStatus.trim()
  const status = Number(statusText)
  if (!/^\d{3}$/.test(statusText) || status < 200 || status > 599) errors.responseStatus = MESSAGES.statusRange
  else if (FORBIDDEN_RESPONSE_STATUSES.includes(status)) errors.responseStatus = MESSAGES.statusForbidden

  const body = values.responseBody
  if (body.trim() === '') {
    errors.responseBody = MESSAGES.bodyInvalid
  } else if (byteLength(body) > MAX_RESPONSE_BODY_BYTES) {
    errors.responseBody = MESSAGES.bodyTooLarge
  } else {
    try {
      JSON.parse(body)
    } catch {
      errors.responseBody = MESSAGES.bodyInvalid
    }
  }

  return errors
}

/** Tên trường của backend (`ServiceCreate`/`ServiceUpdate`) -> ô trên form. */
const BACKEND_FIELD_TO_FORM_KEY: Record<string, ServiceFormErrorKey> = {
  serviceCode: 'code',
  name: 'name',
  description: 'description',
  apiKeyHeaderName: 'apiKeyHeader',
  apiKeySecret: 'apiKeySecret',
  transactionIdPath: 'mapping.transactionId',
  statusPath: 'mapping.status',
  timestampPath: 'mapping.timestamp',
  timestampFormat: 'timestampFormat',
  timestampPattern: 'timestampPattern',
  defaultTimeZone: 'timezone',
  responseHttpStatus: 'responseStatus',
  responseBody: 'responseBody',
}

export interface ApiErrorMapping {
  /** Lỗi gắn được vào từng ô. */
  errors: ServiceFormErrors
  /** Thông điệp không gắn được vào ô nào (hiện ở tóm tắt). */
  unmatched: string[]
}

/**
 * Ánh xạ lỗi của backend về từng ô: `fieldErrors[]` theo tên trường, và 409 trùng mã vào ô mã.
 * Lỗi khác (mạng, 5xx) không gắn vào ô: `errors` rỗng và `unmatched` rỗng, bên gọi hiện `error.message`.
 */
export function applyApiError(error: unknown): ApiErrorMapping {
  const mapping: ApiErrorMapping = { errors: {}, unmatched: [] }
  if (!(error instanceof ApiError)) return mapping

  if (error.code === ERROR_CODES.SERVICE_CODE_DUPLICATE) {
    mapping.errors.code = MESSAGES.codeDuplicate
    return mapping
  }

  for (const fieldError of error.fieldErrors) {
    const lastSegment = fieldError.field.split('.').pop() ?? fieldError.field
    const key = BACKEND_FIELD_TO_FORM_KEY[fieldError.field] ?? BACKEND_FIELD_TO_FORM_KEY[lastSegment]
    if (key === undefined) mapping.unmatched.push(fieldError.message)
    else if (mapping.errors[key] === undefined) mapping.errors[key] = fieldError.message
  }
  return mapping
}
