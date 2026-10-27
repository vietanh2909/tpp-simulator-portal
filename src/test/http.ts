import { vi } from 'vitest'

export function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

export function errorResponse(
  status: number,
  error: string,
  message: string,
  fieldErrors?: { field: string; message: string }[],
): Response {
  return jsonResponse(
    status,
    { error, message, ...(fieldErrors ? { fieldErrors } : {}) },
    { 'X-Simulator-Error': error },
  )
}

export type RouteHandler = (call: RecordedCall) => Response | Promise<Response>

/** Giả lập theo bảng `"METHOD /đường-dẫn"` (không kèm query). Yêu cầu ngoài bảng làm kiểm thử lỗi để lộ lời gọi ngoài ý muốn. */
export function routeFetch(routes: Record<string, RouteHandler>) {
  return stubFetch((call) => {
    const key = `${call.method} ${call.url.split('?')[0]}`
    const handler = routes[key]
    if (!handler) throw new Error(`Chưa giả lập yêu cầu: ${key}`)
    return handler(call)
  })
}

export interface RecordedCall {
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
}

/**
 * Thay `fetch` toàn cục bằng bản giả. `handler` nhận từng yêu cầu đã ghi lại và trả về phản hồi.
 * Đây là biên mạng duy nhất được giả; mọi logic khác chạy thật.
 */
export function stubFetch(handler: (call: RecordedCall) => Response | Promise<Response>) {
  const calls: RecordedCall[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: RecordedCall = {
      url: String(input),
      method: init?.method ?? 'GET',
      headers: { ...(init?.headers as Record<string, string> | undefined) },
      body: typeof init?.body === 'string' ? init.body : null,
    }
    calls.push(call)
    return handler(call)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}
