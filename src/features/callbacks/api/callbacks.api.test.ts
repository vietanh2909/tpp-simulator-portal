import { describe, expect, it } from 'vitest'
import { ApiError } from '@/services/http/error-handler'
import { CB_REJECTED_TEXT_DTO, callbackDto, pageOf } from '@/test/fixtures/monitoring'
import { errorResponse, jsonResponse, stubFetch } from '@/test/http'
import { callbacksApi } from './callbacks.api'

function params(url: string): URLSearchParams {
  return new URL(url, 'http://localhost').searchParams
}

describe('API callback bám openapi.yaml', () => {
  it('list gọi GET /api/callbacks với outcome, rejectionReason, page và size', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, pageOf([callbackDto(1)], { size: 100 })))

    await callbacksApi.list(
      {
        serviceCode: 'THU_HO',
        transactionId: 'T1',
        outcome: 'REJECTED',
        rejectionReason: 'INVALID_API_KEY',
        receivedFrom: '2026-10-19T03:00:00Z',
      },
      3,
      100,
    )

    expect(calls[0]?.method).toBe('GET')
    const query = params(calls[0]?.url ?? '')
    expect(calls[0]?.url.startsWith('/api/callbacks?')).toBe(true)
    expect(Object.fromEntries(query)).toEqual({
      serviceCode: 'THU_HO',
      transactionId: 'T1',
      outcome: 'REJECTED',
      rejectionReason: 'INVALID_API_KEY',
      receivedFrom: '2026-10-19T03:00:00Z',
      page: '3',
      size: '100',
    })
    for (const legacy of ['pageSize', 'mapping']) expect(query.has(legacy)).toBe(false)
  })

  it('rejectionReason chỉ được gửi khi outcome là REJECTED và tham số rỗng không được gửi', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, pageOf([])))

    await callbacksApi.list({ outcome: 'SUCCESS', rejectionReason: 'INVALID_JSON', serviceCode: '' }, 1, 20)

    expect(calls[0]?.url).toBe('/api/callbacks?outcome=SUCCESS&page=1&size=20')
  })

  it('list ánh xạ từng dòng (mốc thời gian mili giây, giá trị vắng là null) và giữ totalItems', async () => {
    stubFetch(() =>
      jsonResponse(
        200,
        pageOf(
          [
            {
              recordId: 7,
              serviceCode: 'THU_HO',
              receivedAt: '2026-10-19T03:24:15.987654Z',
              outcome: 'REJECTED',
              rejectionReason: 'SERVICE_DISABLED',
              httpStatusReturned: 503,
            },
          ],
          { totalItems: 41 },
        ),
      ),
    )

    const page = await callbacksApi.list({}, 1, 20)

    expect(page.totalItems).toBe(41)
    expect(page.items[0]).toMatchObject({
      recordId: 7,
      receivedAt: '2026-10-19T03:24:15.987Z',
      rejectionReason: 'SERVICE_DISABLED',
      transactionId: null,
      status: null,
    })
  })

  it('get gọi GET /api/callbacks/{recordId} với recordId số và ánh xạ chi tiết (kể cả body văn bản gốc)', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, CB_REJECTED_TEXT_DTO))

    const detail = await callbacksApi.get(10)

    expect(calls[0]?.url).toBe('/api/callbacks/10')
    expect(detail.payload).toEqual({ kind: 'text', text: 'đây không phải JSON {' })
    expect(detail.rejectionReason).toBe('INVALID_JSON')
  })

  it('404 CALLBACK_NOT_FOUND giữ là ApiError', async () => {
    stubFetch(() => errorResponse(404, 'CALLBACK_NOT_FOUND', 'Không có callback.'))

    const error = await callbacksApi.get(999).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, code: 'CALLBACK_NOT_FOUND' })
  })

  it('400 VALIDATION_FAILED khi lọc sai mang fieldErrors', async () => {
    stubFetch(() =>
      errorResponse(400, 'VALIDATION_FAILED', 'Tham số không hợp lệ.', [
        { field: 'rejectionReason', message: 'Giá trị không hợp lệ.' },
      ]),
    )

    const error = await callbacksApi.list({}, 1, 20).catch((e: unknown) => e)

    expect((error as ApiError).fieldErrors[0]?.field).toBe('rejectionReason')
  })

  it('không còn lời gọi thống kê /api/callbacks/stats', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, pageOf([])))

    await callbacksApi.list({}, 1, 20)

    expect('getStats' in callbacksApi).toBe(false)
    expect(calls.map((call) => call.url)).not.toContainEqual(expect.stringContaining('/stats'))
  })
})
