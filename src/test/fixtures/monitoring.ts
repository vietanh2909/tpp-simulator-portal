import type { CallbackDetailDto } from '@/features/callbacks/types/callbacks.types'
import type { TransactionSummaryDto } from '@/features/transactions/types/transactions.types'
import type { Page } from '@/types/api'

/** Một trang đúng dạng `Page` của backend (openapi.yaml). */
export function pageOf<T>(items: T[], options: { page?: number; size?: number; totalItems?: number } = {}): Page<T> {
  const { page = 1, size = 20, totalItems = items.length } = options
  return { items, page, size, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / size)) }
}

/** Giao dịch `THU_HO`/`T100`: mốc thời gian có phần thập phân tới micro giây (backend có thể trả như vậy). */
export const T100_DTO: TransactionSummaryDto = {
  serviceCode: 'THU_HO',
  serviceDeleted: false,
  transactionId: 'T100',
  latestStatus: '00',
  latestBusinessTimestamp: '2026-10-19T03:24:00.123456Z',
  latestReceivedAt: '2026-10-19T03:24:15.987654Z',
  latestCallbackId: 3,
  latestHasMappingError: false,
  callbackCount: 3,
}

export const T200_DTO: TransactionSummaryDto = {
  serviceCode: 'CHI_HO',
  serviceDeleted: false,
  transactionId: 'T200',
  latestStatus: '10',
  latestBusinessTimestamp: '2026-10-19T03:20:00Z',
  latestReceivedAt: '2026-10-19T03:20:05Z',
  latestCallbackId: 5,
  latestHasMappingError: false,
  callbackCount: 1,
}

/** `transactionId` chứa `/` để kiểm tra mã hóa phần trăm qua đường dẫn SPA và API. */
export const SLASH_TXN_DTO: TransactionSummaryDto = {
  serviceCode: 'THU_HO',
  serviceDeleted: false,
  transactionId: '2026/10/001',
  latestStatus: 'OK',
  latestBusinessTimestamp: null,
  latestReceivedAt: '2026-10-19T03:10:00Z',
  latestCallbackId: 7,
  latestHasMappingError: true,
  callbackCount: 1,
}

/** Giao dịch của dịch vụ đã xóa, callback gần nhất thiếu status. */
export const DELETED_TXN_DTO: TransactionSummaryDto = {
  serviceCode: 'DA_XOA',
  serviceDeleted: true,
  transactionId: 'OLD-1',
  latestStatus: null,
  latestBusinessTimestamp: null,
  latestReceivedAt: '2026-10-18T03:00:00Z',
  latestCallbackId: 1,
  latestHasMappingError: true,
  callbackCount: 2,
}

/** `count` giao dịch THU_HO `TX001`, `TX002`…; `TX001` nhận gần nhất (danh sách mặc định mới nhất trước). */
export function makeTransactions(
  count: number,
  overrides: Partial<TransactionSummaryDto> = {},
): TransactionSummaryDto[] {
  const base = Date.parse('2026-10-19T03:00:00Z')
  return Array.from({ length: count }, (_, index) => ({
    serviceCode: 'THU_HO',
    serviceDeleted: false,
    transactionId: `TX${String(index + 1).padStart(3, '0')}`,
    latestStatus: '00',
    latestBusinessTimestamp: '2026-10-19T02:59:00Z',
    latestReceivedAt: new Date(base - index * 1000).toISOString().replace('.000Z', 'Z'),
    latestCallbackId: count - index,
    latestHasMappingError: false,
    callbackCount: 1,
    ...overrides,
  }))
}

const OK_FIELD = (value: string) => ({ value, errorCode: null, error: null, warning: null })

/** Callback thành công của `THU_HO`/`T100`, header đã che bởi backend. */
export function callbackDto(recordId: number, overrides: Partial<CallbackDetailDto> = {}): CallbackDetailDto {
  return {
    recordId,
    serviceCode: 'THU_HO',
    serviceDeleted: false,
    receivedAt: `2026-10-19T03:2${recordId % 10}:15.123456Z`,
    outcome: 'SUCCESS',
    rejectionReason: null,
    httpStatusReturned: 200,
    transactionId: 'T100',
    status: '00',
    businessTimestamp: '2026-10-19T03:24:00Z',
    configVersionNumber: 3,
    requestHeaders: { Authorization: '***', 'X-API-Key': '***', 'X-Request-Id': 'abc' },
    payloadJson: { transId: 'T100', code: '00', time: '2026-10-19T10:24:00+07:00' },
    mappingFieldResults: {
      transactionId: OK_FIELD('T100'),
      status: OK_FIELD('00'),
      timestamp: OK_FIELD('2026-10-19T03:24:00Z'),
    },
    responseStatusReturned: 200,
    responseBodyReturned: { ok: true },
    ...overrides,
  }
}

/** `count` callback thành công của THU_HO; `recordId` càng lớn càng mới (danh sách mới nhất trước). */
export function makeCallbacks(count: number): CallbackDetailDto[] {
  const base = Date.parse('2026-10-19T03:00:00Z')
  return Array.from({ length: count }, (_, index) =>
    callbackDto(index + 1, {
      receivedAt: new Date(base + index * 1000).toISOString().replace('.000Z', 'Z'),
      transactionId: `TX${String(index + 1).padStart(3, '0')}`,
    }),
  )
}

/** Lỗi mapping, thiếu transactionId. */
export const CB_MAPPING_ERROR_DTO: CallbackDetailDto = callbackDto(8, {
  serviceCode: 'CHI_HO',
  outcome: 'MAPPING_ERROR',
  transactionId: null,
  status: '00',
  businessTimestamp: null,
  payloadJson: { code: '00' },
  mappingFieldResults: {
    transactionId: {
      value: null,
      errorCode: 'NOT_FOUND',
      error: 'Không tìm thấy giá trị tại $.processId.',
      warning: null,
    },
    status: OK_FIELD('00'),
    timestamp: { value: null, errorCode: null, error: null, warning: null },
  },
})

/** Bị từ chối 401 do sai khóa: chưa chạy mapping nên `mappingFieldResults` là `{}`. */
export const CB_REJECTED_DTO: CallbackDetailDto = callbackDto(9, {
  outcome: 'REJECTED',
  rejectionReason: 'INVALID_API_KEY',
  httpStatusReturned: 401,
  transactionId: null,
  status: null,
  businessTimestamp: null,
  configVersionNumber: null,
  payloadJson: { transId: 'T9' },
  mappingFieldResults: {},
  responseStatusReturned: 401,
  responseBodyReturned: { error: 'INVALID_API_KEY', message: 'Khóa API không đúng.' },
})

/** Bị từ chối vì body không phải JSON: backend trả `payloadRawText`. */
export const CB_REJECTED_TEXT_DTO: CallbackDetailDto = (() => {
  const dto = callbackDto(10, {
    outcome: 'REJECTED',
    rejectionReason: 'INVALID_JSON',
    httpStatusReturned: 400,
    transactionId: null,
    status: null,
    businessTimestamp: null,
    configVersionNumber: null,
    payloadRawText: 'đây không phải JSON {',
    mappingFieldResults: {},
    responseStatusReturned: 400,
    responseBodyReturned: { error: 'INVALID_JSON', message: 'Body không phải JSON hợp lệ.' },
  })
  delete (dto as { payloadJson?: unknown }).payloadJson
  return dto
})()

/** Lỗi timestamp: không đọc được theo định dạng đã cấu hình. */
export const CB_TIMESTAMP_ERROR_DTO: CallbackDetailDto = callbackDto(11, {
  outcome: 'MAPPING_ERROR',
  businessTimestamp: null,
  payloadJson: { transId: 'T100', code: '00', time: '19/10/2026 10:24' },
  mappingFieldResults: {
    transactionId: OK_FIELD('T100'),
    status: OK_FIELD('00'),
    timestamp: {
      value: null,
      errorCode: 'UNPARSEABLE',
      error: 'Không đọc được theo định dạng đã cấu hình.',
      warning: null,
    },
  },
})
