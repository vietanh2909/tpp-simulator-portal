import { normalizeIsoTimestamp } from '@/features/callback-services/utils/service-dto'
import type { MappingFieldKey } from '@/features/callback-services/types/callback-services.types'
import { MASKED_HEADER_VALUE } from '../constants/callbacks.constants'
import type {
  CallbackDetail,
  CallbackDetailDto,
  CallbackSummary,
  CallbackSummaryDto,
  FieldResult,
  FieldResultDto,
  MappingFields,
  PayloadView,
  StoredHeader,
} from '../types/callbacks.types'

const MAPPING_KEYS: MappingFieldKey[] = ['transactionId', 'status', 'timestamp']

function optionalIso(value: string | null | undefined): string | null {
  return value ? normalizeIsoTimestamp(value) : null
}

/** JSON đẹp của một giá trị bất kỳ; `undefined` (không biểu diễn được trong JSON) trả `null` chữ. */
export function formatJsonValue(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? 'null'
}

export function toCallbackSummary(dto: CallbackSummaryDto): CallbackSummary {
  return {
    recordId: dto.recordId,
    serviceCode: dto.serviceCode,
    serviceDeleted: dto.serviceDeleted === true,
    receivedAt: normalizeIsoTimestamp(dto.receivedAt),
    outcome: dto.outcome,
    rejectionReason: dto.rejectionReason ?? null,
    httpStatusReturned: dto.httpStatusReturned,
    transactionId: dto.transactionId ?? null,
    status: dto.status ?? null,
    businessTimestamp: optionalIso(dto.businessTimestamp),
  }
}

/**
 * Object header của backend thành danh sách. Giá trị `***` là đã che (backend che Authorization, Proxy-Authorization,
 * Cookie và header khóa API); phía trình duyệt không che thêm. Sắp theo tên để thứ tự ổn định giữa các lần tải.
 */
export function toHeaderEntries(headers: Record<string, string> | null | undefined): StoredHeader[] {
  return Object.entries(headers ?? {})
    .map(([name, value]) => ({ name, value, masked: value === MASKED_HEADER_VALUE }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
}

/** Chọn nguồn payload: `payloadRawText` có mặt thì là văn bản gốc, ngược lại là `payloadJson` (kể cả JSON null). */
export function toPayloadView(dto: Pick<CallbackDetailDto, 'payloadJson' | 'payloadRawText'>): PayloadView {
  if (typeof dto.payloadRawText === 'string') return { kind: 'text', text: dto.payloadRawText }
  if ('payloadJson' in dto) return { kind: 'json', text: formatJsonValue(dto.payloadJson), value: dto.payloadJson }
  return { kind: 'text', text: '' }
}

function toFieldResult(dto: FieldResultDto): FieldResult {
  return {
    value: dto.value ?? null,
    errorCode: dto.errorCode ?? null,
    error: dto.error ?? null,
    warning: dto.warning ?? null,
  }
}

/** `mappingFieldResults` rỗng (`{}` hoặc vắng) của lần bị từ chối cho kết quả rỗng, không bịa kết quả. */
export function toMappingFields(dto: CallbackDetailDto['mappingFieldResults']): MappingFields {
  const result: MappingFields = {}
  for (const key of MAPPING_KEYS) {
    const field = dto?.[key]
    if (field) result[key] = toFieldResult(field)
  }
  return result
}

export function toCallbackDetail(dto: CallbackDetailDto): CallbackDetail {
  const responseBodyText = dto.responseBodyReturned === undefined ? null : formatJsonValue(dto.responseBodyReturned)
  return {
    ...toCallbackSummary(dto),
    configVersionNumber: dto.configVersionNumber ?? null,
    headers: toHeaderEntries(dto.requestHeaders),
    payload: toPayloadView(dto),
    mapping: toMappingFields(dto.mappingFieldResults),
    responseStatus: dto.responseStatusReturned ?? dto.httpStatusReturned,
    responseBodyText,
  }
}

/** `recordId` từ đường dẫn SPA: chỉ nhận số nguyên không âm an toàn; còn lại là `null` (không gọi API). */
export function parseRecordId(text: string | null | undefined): number | null {
  if (!text || !/^\d+$/.test(text)) return null
  const value = Number(text)
  return Number.isSafeInteger(value) ? value : null
}

/** Callback có ít nhất một kết quả mapping (lần bị từ chối thì không). */
export function hasMappingResults(callback: Pick<CallbackDetail, 'mapping'>): boolean {
  return Object.keys(callback.mapping).length > 0
}
