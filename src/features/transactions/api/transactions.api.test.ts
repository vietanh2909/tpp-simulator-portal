import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/services/http/error-handler'
import { SLASH_TXN_DTO, T100_DTO, callbackDto, pageOf } from '@/test/fixtures/monitoring'
import { errorResponse, jsonResponse, stubFetch } from '@/test/http'
import { transactionsApi } from './transactions.api'

function params(url: string): URLSearchParams {
  return new URL(url, 'http://localhost').searchParams
}

describe('API giao dịch bám openapi.yaml', () => {
  it('list gọi GET /api/transactions với page và size (không phải pageSize) kèm bộ lọc', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, pageOf([T100_DTO], { page: 2, size: 50, totalItems: 60 })))

    const page = await transactionsApi.list(
      {
        serviceCode: 'THU_HO',
        transactionId: 't1',
        status: '0',
        receivedFrom: '2026-10-19T03:00:00Z',
        receivedTo: '2026-10-19T04:00:00Z',
      },
      2,
      50,
    )

    expect(calls).toHaveLength(1)
    expect(calls[0]?.method).toBe('GET')
    expect(calls[0]?.url.startsWith('/api/transactions?')).toBe(true)
    const query = params(calls[0]?.url ?? '')
    expect(Object.fromEntries(query)).toEqual({
      serviceCode: 'THU_HO',
      transactionId: 't1',
      status: '0',
      receivedFrom: '2026-10-19T03:00:00Z',
      receivedTo: '2026-10-19T04:00:00Z',
      page: '2',
      size: '50',
    })
    expect(query.has('pageSize')).toBe(false)
    expect(page).toMatchObject({ page: 2, size: 50, totalItems: 60, totalPages: 2 })
  })

  it('không gửi tham số rỗng và ánh xạ mốc thời gian về mili giây', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, pageOf([T100_DTO])))

    const page = await transactionsApi.list({ serviceCode: '', transactionId: undefined, status: '' }, 1, 20)

    expect(calls[0]?.url).toBe('/api/transactions?page=1&size=20')
    expect(page.items[0]?.latestReceivedAt).toBe('2026-10-19T03:24:15.987Z')
  })

  it('get gọi GET /api/transactions/detail với serviceCode và transactionId trong truy vấn', async () => {
    const { calls } = stubFetch(() =>
      jsonResponse(200, { transaction: T100_DTO, callbacks: [callbackDto(1), callbackDto(2)] }),
    )

    const detail = await transactionsApi.get('THU_HO', 'T100')

    expect(calls[0]?.url).toBe('/api/transactions/detail?serviceCode=THU_HO&transactionId=T100')
    expect(detail.callbacks.map((callback) => callback.recordId)).toEqual([1, 2])
    expect(detail.transaction.callbackCount).toBe(3)
  })

  it('transactionId có / ? # % và khoảng trắng được mã hóa phần trăm, không thành đường dẫn', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, { transaction: SLASH_TXN_DTO, callbacks: [] }))

    await transactionsApi.get('THU_HO', '2026/10/001')
    await transactionsApi.get('THU_HO', 'a b?c#d%e')

    expect(calls[0]?.url).toBe('/api/transactions/detail?serviceCode=THU_HO&transactionId=2026%2F10%2F001')
    const second = calls[1]?.url ?? ''
    expect(second.split('?')).toHaveLength(2)
    expect(second).not.toContain('#')
    expect(params(second).get('transactionId')).toBe('a b?c#d%e')
  })

  it('404 TRANSACTION_NOT_FOUND giữ là ApiError với mã của backend', async () => {
    stubFetch(() => errorResponse(404, 'TRANSACTION_NOT_FOUND', 'Không có giao dịch.'))

    const error = await transactionsApi.get('THU_HO', 'KHONG_CO').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, code: 'TRANSACTION_NOT_FOUND' })
  })

  it('400 VALIDATION_FAILED mang fieldErrors dạng mảng', async () => {
    stubFetch(() =>
      errorResponse(400, 'VALIDATION_FAILED', 'Tham số không hợp lệ.', [
        { field: 'size', message: 'Chỉ nhận 20, 50, 100.' },
      ]),
    )

    const error = await transactionsApi.list({}, 1, 10).catch((e: unknown) => e)

    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' })
    expect((error as ApiError).fieldErrors).toEqual([{ field: 'size', message: 'Chỉ nhận 20, 50, 100.' }])
  })

  it('hủy bằng AbortSignal thì hủy yêu cầu đang chạy và ném lại AbortError', async () => {
    let received: AbortSignal | null | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            received = init?.signal
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Đã hủy', 'AbortError')))
          }),
      ),
    )
    const controller = new AbortController()

    const pending = transactionsApi.list({}, 1, 20, controller.signal)
    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(received?.aborted).toBe(true)
  })
})
