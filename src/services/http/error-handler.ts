import { ERROR_CODES } from '@/constants/error-codes'
import type { FieldError } from '@/types/api'

export const SIMULATOR_ERROR_HEADER = 'X-Simulator-Error'

/** Lỗi từ backend hoặc do trình duyệt phân loại (mạng, hết thời gian). Thông điệp không bao giờ chứa nội dung yêu cầu. */
export class ApiError extends Error {
  readonly status: number
  /** Mã `error` của backend (ví dụ `VALIDATION_FAILED`) hoặc `NETWORK`, `TIMEOUT`, `INVALID_RESPONSE`, `UNKNOWN`. */
  readonly code: string
  readonly fieldErrors: FieldError[]

  constructor(status: number, code: string, message: string, fieldErrors: FieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }

  get isNetwork(): boolean {
    return this.code === ERROR_CODES.NETWORK
  }

  get isTimeout(): boolean {
    return this.code === ERROR_CODES.TIMEOUT
  }

  get isServerError(): boolean {
    return this.status >= 500
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readFieldErrors(value: unknown): FieldError[] {
  if (!Array.isArray(value)) return []
  const result: FieldError[] = []
  for (const item of value) {
    if (isRecord(item) && typeof item.field === 'string' && typeof item.message === 'string') {
      result.push({ field: item.field, message: item.message })
    }
  }
  return result
}

function defaultMessage(status: number): string {
  return status >= 500 ? `Máy chủ gặp lỗi (HTTP ${status}).` : `Yêu cầu thất bại (HTTP ${status}).`
}

/** Dựng `ApiError` từ phản hồi lỗi: ưu tiên thân `ErrorResponse`, sau đó header `X-Simulator-Error`, cuối cùng là mã HTTP. */
export async function parseErrorResponse(response: Response): Promise<ApiError> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    // Thân không phải JSON (ví dụ 500 từ proxy): dùng thông điệp mặc định theo mã HTTP.
  }
  const headerCode = response.headers.get(SIMULATOR_ERROR_HEADER)
  const record = isRecord(body) ? body : {}
  const code =
    typeof record.error === 'string' && record.error !== ''
      ? record.error
      : headerCode || (response.status >= 500 ? ERROR_CODES.INTERNAL_ERROR : ERROR_CODES.UNKNOWN)
  const message =
    typeof record.message === 'string' && record.message !== '' ? record.message : defaultMessage(response.status)
  return new ApiError(response.status, code, message, readFieldErrors(record.fieldErrors))
}

export function networkError(): ApiError {
  return new ApiError(
    0,
    ERROR_CODES.NETWORK,
    'Không kết nối được tới máy chủ. Kiểm tra backend đã chạy chưa rồi thử lại.',
  )
}

export function timeoutError(timeoutMs: number): ApiError {
  return new ApiError(0, ERROR_CODES.TIMEOUT, `Máy chủ không phản hồi trong ${Math.round(timeoutMs / 1000)} giây.`)
}

export function invalidResponseError(status: number): ApiError {
  return new ApiError(status, ERROR_CODES.INVALID_RESPONSE, 'Máy chủ trả về dữ liệu không đọc được.')
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Đã xảy ra lỗi không xác định.'
}
