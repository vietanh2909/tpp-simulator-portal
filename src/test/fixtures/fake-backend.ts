import type { CallbackDetailDto } from '@/features/callbacks/types/callbacks.types'
import type { ServiceDto } from '@/features/callback-services/types/callback-services.types'
import type { TransactionSummaryDto } from '@/features/transactions/types/transactions.types'
import { errorResponse, jsonResponse, stubFetch, type RecordedCall } from '../http'
import { pageOf } from './monitoring'

export interface FakeBackendData {
  transactions?: TransactionSummaryDto[]
  callbacks?: CallbackDetailDto[]
  services?: ServiceDto[]
}

/**
 * Backend giả ở biên `fetch` cho màn hình theo dõi: lọc, sắp xếp và phân trang theo mô tả của `openapi.yaml`
 * (khớp chuỗi chứa không phân biệt hoa thường, hai đầu thời gian tính cả hai, `size` chỉ nhận 20/50/100).
 * Đây vẫn chỉ là biên mạng: mọi logic giao diện chạy thật.
 */
export function fakeMonitoringBackend(data: FakeBackendData = {}) {
  const state = {
    transactions: data.transactions ?? [],
    callbacks: data.callbacks ?? [],
    services: data.services ?? [],
    /** Đặt `true` để mọi truy vấn danh sách và chi tiết trả 500 (backend tạm dừng). */
    down: false,
    /** Hàm giữ yêu cầu tới khi được giải phóng (kiểm tra tải chậm). */
    hold: null as null | Promise<void>,
  }

  const stub = stubFetch(async (call) => {
    if (state.hold) await state.hold
    return respond(call)
  })

  function respond(call: RecordedCall): Response {
    const url = new URL(call.url, 'http://localhost')
    const params = url.searchParams
    const path = url.pathname

    if (path === '/api/services') return jsonResponse(200, state.services)
    const serviceMatch = /^\/api\/services\/([^/]+)$/.exec(path)
    if (serviceMatch) {
      const code = decodeURIComponent(serviceMatch[1] ?? '')
      const service = state.services.find((item) => item.serviceCode.toLowerCase() === code.toLowerCase())
      return service ? jsonResponse(200, service) : errorResponse(404, 'SERVICE_NOT_FOUND', 'Không có dịch vụ.')
    }

    if (state.down) return errorResponse(500, 'INTERNAL_ERROR', 'Lỗi nội bộ.')

    if (path === '/api/transactions') {
      const bad = validatePaging(params)
      if (bad) return bad
      let items = state.transactions.filter(
        (item) =>
          matchesExact(item.serviceCode, params.get('serviceCode')) &&
          contains(item.transactionId, params.get('transactionId')) &&
          contains(item.latestStatus ?? undefined, params.get('status'), item.latestStatus === null) &&
          inRange(item.latestReceivedAt, params),
      )
      items = [...items].sort(
        (a, b) =>
          Date.parse(b.latestReceivedAt) - Date.parse(a.latestReceivedAt) ||
          (b.latestCallbackId ?? 0) - (a.latestCallbackId ?? 0),
      )
      return jsonResponse(200, paginate(items, params))
    }

    if (path === '/api/transactions/detail') {
      const serviceCode = params.get('serviceCode') ?? ''
      const transactionId = params.get('transactionId') ?? ''
      const transaction = state.transactions.find(
        (item) => item.serviceCode.toLowerCase() === serviceCode.toLowerCase() && item.transactionId === transactionId,
      )
      if (!transaction) return errorResponse(404, 'TRANSACTION_NOT_FOUND', 'Không có giao dịch.')
      const callbacks = state.callbacks
        .filter(
          (item) =>
            item.serviceCode.toLowerCase() === serviceCode.toLowerCase() && item.transactionId === transactionId,
        )
        .sort((a, b) => a.recordId - b.recordId)
      return jsonResponse(200, { transaction, callbacks })
    }

    if (path === '/api/callbacks') {
      const bad = validatePaging(params)
      if (bad) return bad
      let items = state.callbacks.filter(
        (item) =>
          matchesExact(item.serviceCode, params.get('serviceCode')) &&
          contains(item.transactionId ?? undefined, params.get('transactionId'), item.transactionId == null) &&
          (!params.get('outcome') || item.outcome === params.get('outcome')) &&
          (!params.get('rejectionReason') || item.rejectionReason === params.get('rejectionReason')) &&
          inRange(item.receivedAt, params),
      )
      items = [...items].sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt) || b.recordId - a.recordId)
      return jsonResponse(200, paginate(items.map(summaryOf), params))
    }

    const callbackMatch = /^\/api\/callbacks\/(\d+)$/.exec(path)
    if (callbackMatch) {
      const record = state.callbacks.find((item) => item.recordId === Number(callbackMatch[1]))
      return record ? jsonResponse(200, record) : errorResponse(404, 'CALLBACK_NOT_FOUND', 'Không có callback.')
    }

    throw new Error(`Chưa giả lập yêu cầu: ${call.method} ${call.url}`)
  }

  return {
    ...stub,
    state,
    /** Các lời gọi tới một đường dẫn (không kèm truy vấn). */
    callsTo: (path: string) => stub.calls.filter((call) => call.url.split('?')[0] === path),
    /** Tham số truy vấn của lời gọi gần nhất tới một đường dẫn. */
    lastQuery: (path: string): URLSearchParams => {
      const last = stub.calls.filter((call) => call.url.split('?')[0] === path).at(-1)
      return new URL(last?.url ?? path, 'http://localhost').searchParams
    },
  }
}

function summaryOf(detail: CallbackDetailDto) {
  return {
    recordId: detail.recordId,
    serviceCode: detail.serviceCode,
    serviceDeleted: detail.serviceDeleted,
    receivedAt: detail.receivedAt,
    outcome: detail.outcome,
    rejectionReason: detail.rejectionReason,
    httpStatusReturned: detail.httpStatusReturned,
    transactionId: detail.transactionId,
    status: detail.status,
    businessTimestamp: detail.businessTimestamp,
  }
}

function matchesExact(actual: string, expected: string | null): boolean {
  return !expected || actual.toLowerCase() === expected.toLowerCase()
}

/** Khớp chuỗi chứa, không phân biệt hoa thường. `missing` (giá trị null) không khớp khi có điều kiện lọc. */
function contains(actual: string | undefined, expected: string | null, missing = false): boolean {
  if (!expected) return true
  if (missing || actual === undefined) return false
  return actual.toLowerCase().includes(expected.toLowerCase())
}

function inRange(iso: string, params: URLSearchParams): boolean {
  const time = Date.parse(iso)
  const from = params.get('receivedFrom')
  const to = params.get('receivedTo')
  return (!from || time >= Date.parse(from)) && (!to || time <= Date.parse(to))
}

function validatePaging(params: URLSearchParams): Response | null {
  const size = Number(params.get('size') ?? 20)
  if (![20, 50, 100].includes(size)) {
    return errorResponse(400, 'VALIDATION_FAILED', 'Tham số không hợp lệ.', [
      { field: 'size', message: 'Chỉ nhận 20, 50 hoặc 100.' },
    ])
  }
  return null
}

function paginate<T>(items: T[], params: URLSearchParams) {
  const size = Number(params.get('size') ?? 20)
  const page = Number(params.get('page') ?? 1)
  return pageOf(items.slice((page - 1) * size, page * size), { page, size, totalItems: items.length })
}
