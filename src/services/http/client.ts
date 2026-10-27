import { appConfig } from '@/app/config'
import { invalidResponseError, networkError, parseErrorResponse, timeoutError } from './error-handler'

/** Hết thời gian chờ phản hồi (contract C5): 30 giây, không tự thử lại. */
export const REQUEST_TIMEOUT_MS = 30_000

type QueryValue = string | number | boolean | undefined | null

interface RequestOptions {
  query?: Record<string, QueryValue>
  body?: unknown
  /** Bên gọi hủy yêu cầu (ví dụ khi rời trang). Hủy thì ném lại `AbortError` gốc, không đổi thành lỗi mạng. */
  signal?: AbortSignal | undefined
}

export interface RawResponse {
  status: number
  headers: Record<string, string>
  bodyText: string
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const queryString = params.toString()
  return `${appConfig.apiBaseUrl}${path}${queryString ? `?${queryString}` : ''}`
}

/** `fetch` có hết thời gian chờ và hủy từ bên gọi. Lỗi mạng và hết thời gian được đổi thành `ApiError`. */
async function fetchWithTimeout(url: string, init: RequestInit, external?: AbortSignal): Promise<Response> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  const onExternalAbort = () => controller.abort(external?.reason)
  if (external?.aborted) onExternalAbort()
  else external?.addEventListener('abort', onExternalAbort, { once: true })

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (cause) {
    if (timedOut) throw timeoutError(REQUEST_TIMEOUT_MS)
    if (external?.aborted) throw cause
    // Không đưa thông điệp gốc vào lỗi: nó có thể kèm địa chỉ hoặc nội dung yêu cầu.
    throw networkError()
  } finally {
    clearTimeout(timer)
    external?.removeEventListener('abort', onExternalAbort)
  }
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const hasBody = options.body !== undefined
  const response = await fetchWithTimeout(
    buildUrl(path, options.query),
    {
      method,
      headers: hasBody
        ? { Accept: 'application/json', 'Content-Type': 'application/json' }
        : { Accept: 'application/json' },
      body: hasBody ? JSON.stringify(options.body) : null,
    },
    options.signal,
  )
  if (!response.ok) throw await parseErrorResponse(response)
  if (response.status === 204) return undefined as T
  try {
    return (await response.json()) as T
  } catch {
    throw invalidResponseError(response.status)
  }
}

/** Client HTTP dùng chung cho `/api/*`. Lỗi luôn là `ApiError` (hoặc `AbortError` khi bên gọi hủy). */
export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}

/**
 * Gửi yêu cầu tùy ý (header và thân do người dùng soạn) và trả mọi phản hồi, kể cả 4xx/5xx, không ném lỗi theo mã HTTP.
 * Dùng cho "Gửi callback thử": phản hồi lỗi của simulator chính là kết quả cần hiển thị.
 */
export async function sendRaw(
  method: string,
  path: string,
  init: { headers: Record<string, string>; body: string; signal?: AbortSignal | undefined },
): Promise<RawResponse> {
  const response = await fetchWithTimeout(
    buildUrl(path),
    { method, headers: init.headers, body: init.body },
    init.signal,
  )
  let bodyText: string
  try {
    bodyText = await response.text()
  } catch {
    throw invalidResponseError(response.status)
  }
  const headers: Record<string, string> = {}
  response.headers.forEach((value, name) => {
    headers[name] = value
  })
  return { status: response.status, headers, bodyText }
}
