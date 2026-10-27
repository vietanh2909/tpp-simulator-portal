import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ERROR_CODES } from '@/constants/error-codes'
import { http, REQUEST_TIMEOUT_MS, sendRaw } from './client'
import { ApiError } from './error-handler'

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Mong đợi lời gọi bị lỗi nhưng đã thành công.')
}

describe('http client: lỗi từ backend', () => {
  it('đọc ErrorResponse có fieldErrors dạng mảng', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        400,
        {
          error: 'VALIDATION_FAILED',
          message: 'Dữ liệu không hợp lệ.',
          fieldErrors: [
            { field: 'serviceCode', message: 'Mã sai ký tự.' },
            { field: 'transactionIdPath', message: 'Đường dẫn sai.' },
          ],
        },
        { 'X-Simulator-Error': 'VALIDATION_FAILED' },
      ),
    )

    const error = await catchError(http.post('/api/services', { serviceCode: 'x y' }))

    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.status).toBe(400)
    expect(apiError.code).toBe(ERROR_CODES.VALIDATION_FAILED)
    expect(apiError.message).toBe('Dữ liệu không hợp lệ.')
    expect(apiError.fieldErrors).toEqual([
      { field: 'serviceCode', message: 'Mã sai ký tự.' },
      { field: 'transactionIdPath', message: 'Đường dẫn sai.' },
    ])
  })

  it('giữ mã SERVICE_CODE_DUPLICATE của lỗi 409', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: 'SERVICE_CODE_DUPLICATE', message: 'Mã đã tồn tại.' }))

    const apiError = (await catchError(http.post('/api/services', {}))) as ApiError

    expect(apiError.status).toBe(409)
    expect(apiError.code).toBe(ERROR_CODES.SERVICE_CODE_DUPLICATE)
    expect(apiError.fieldErrors).toEqual([])
  })

  it('giữ mã SERVICE_NOT_FOUND của lỗi 404', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'SERVICE_NOT_FOUND', message: 'Không có dịch vụ.' }))

    const apiError = (await catchError(http.get('/api/services/ABC'))) as ApiError

    expect(apiError.status).toBe(404)
    expect(apiError.code).toBe(ERROR_CODES.SERVICE_NOT_FOUND)
  })

  it('lỗi 500 không có thân JSON dùng header X-Simulator-Error hoặc INTERNAL_ERROR và đánh dấu lỗi máy chủ', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 500 }))
    fetchMock.mockResolvedValueOnce(
      new Response('lỗi', { status: 503, headers: { 'X-Simulator-Error': 'SERVICE_DISABLED' } }),
    )

    const first = (await catchError(http.get('/api/services'))) as ApiError
    const second = (await catchError(http.get('/api/services'))) as ApiError

    expect(first.code).toBe(ERROR_CODES.INTERNAL_ERROR)
    expect(first.isServerError).toBe(true)
    expect(first.message).toBe('Máy chủ gặp lỗi (HTTP 500).')
    expect(second.code).toBe('SERVICE_DISABLED')
  })

  it('bỏ qua fieldErrors sai dạng thay vì ném lỗi', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { error: 'VALIDATION_FAILED', message: 'Sai.', fieldErrors: { name: 'sai dạng bản đồ' } }),
    )

    const apiError = (await catchError(http.post('/api/services', {}))) as ApiError

    expect(apiError.code).toBe(ERROR_CODES.VALIDATION_FAILED)
    expect(apiError.fieldErrors).toEqual([])
  })
})

describe('http client: lỗi mạng, hết thời gian, hủy', () => {
  it('phân loại lỗi mạng và không đưa thông điệp gốc hay nội dung yêu cầu vào lỗi', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed for body {"apiKeySecret":"test-key-not-real"}'))

    const apiError = (await catchError(http.post('/api/services', { apiKeySecret: 'test-key-not-real' }))) as ApiError

    expect(apiError.isNetwork).toBe(true)
    expect(apiError.status).toBe(0)
    expect(apiError.message).not.toContain('test-key-not-real')
    expect(apiError.message).not.toContain('fetch failed')
  })

  it('hết thời gian sau 30 giây', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )

    const pending = catchError(http.get('/api/services'))
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    const apiError = (await pending) as ApiError

    expect(apiError.isTimeout).toBe(true)
    expect(apiError.message).toContain('30 giây')
  })

  it('bên gọi hủy bằng AbortSignal thì nhận lại AbortError, không phải lỗi mạng', async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    const controller = new AbortController()

    const pending = catchError(http.get('/api/services', { signal: controller.signal }))
    controller.abort()
    const error = await pending

    expect(error).not.toBeInstanceOf(ApiError)
    expect((error as DOMException).name).toBe('AbortError')
  })
})

describe('http client: yêu cầu thành công', () => {
  it('bỏ tham số rỗng, gửi PUT với thân JSON và trả undefined cho 204', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { items: [] }))
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { enabled: false }))
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await http.get('/api/callbacks', { query: { serviceCode: 'THU_HO', transactionId: '', size: 20 } })
    await http.put('/api/services/THU_HO/enabled', { enabled: false })
    const deleted = await http.delete('/api/services/THU_HO')

    const [getUrl] = fetchMock.mock.calls[0] ?? []
    expect(getUrl).toBe('/api/callbacks?serviceCode=THU_HO&size=20')
    const [, putInit] = fetchMock.mock.calls[1] ?? []
    expect(putInit?.method).toBe('PUT')
    expect(putInit?.body).toBe('{"enabled":false}')
    expect((putInit?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(deleted).toBeUndefined()
  })

  it('sendRaw trả cả phản hồi 401 kèm header mà không ném lỗi', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: 'UNAUTHORIZED', message: 'Khóa sai.' }, { 'X-Simulator-Error': 'UNAUTHORIZED' }),
    )

    const result = await sendRaw('POST', '/callbacks/THU_HO', {
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'r-1' },
      body: '{"a":1}',
    })

    expect(result.status).toBe(401)
    expect(result.headers['x-simulator-error']).toBe('UNAUTHORIZED')
    expect(JSON.parse(result.bodyText)).toMatchObject({ error: 'UNAUTHORIZED' })
    const [, init] = fetchMock.mock.calls[0] ?? []
    expect((init?.headers as Record<string, string>)['X-Request-Id']).toBe('r-1')
    expect(init?.body).toBe('{"a":1}')
  })
})
