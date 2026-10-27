import type { Page } from '@/types/api'
import type { IsoDateTime } from '@/types/common'
import type { MappingFieldErrorCode, MappingFieldKey } from '@/features/callback-services/types/callback-services.types'

// ---------------------------------------------------------------------------------------------
// Kết quả xử lý của một lần nhận (openapi.yaml: `outcome`, `rejectionReason`).
// ---------------------------------------------------------------------------------------------

export type CallbackOutcome = 'SUCCESS' | 'MAPPING_ERROR' | 'REJECTED'

export type RejectionReason =
  | 'INVALID_API_KEY'
  | 'MISSING_API_KEY'
  | 'INVALID_JSON'
  | 'UNSUPPORTED_CONTENT_TYPE'
  | 'SERVICE_DISABLED'
  | 'SERVICE_DELETED'

// ---------------------------------------------------------------------------------------------
// DTO của backend (schema `CallbackSummary`, `CallbackDetail`, `FieldResult`). Tách khỏi mô hình giao diện.
// ---------------------------------------------------------------------------------------------

export interface CallbackSummaryDto {
  recordId: number
  serviceCode: string
  serviceDeleted?: boolean
  receivedAt: IsoDateTime
  outcome: CallbackOutcome
  rejectionReason?: RejectionReason | null
  httpStatusReturned: number
  transactionId?: string | null
  status?: string | null
  businessTimestamp?: IsoDateTime | null
}

export interface FieldResultDto {
  value?: string | null
  errorCode?: MappingFieldErrorCode | null
  error?: string | null
  warning?: string | null
}

export interface CallbackDetailDto extends CallbackSummaryDto {
  configVersionNumber?: number | null
  /** Header đã che: giá trị `***` là đã che. */
  requestHeaders?: Record<string, string> | null
  /** Payload JSON; có thể là mọi giá trị JSON, kể cả `null`. Có đúng một trong `payloadJson` hoặc `payloadRawText`. */
  payloadJson?: unknown
  /** Body văn bản gốc khi không phải JSON hợp lệ. */
  payloadRawText?: string
  /** Rỗng (`{}`) với lần nhận bị từ chối vì chưa chạy mapping. */
  mappingFieldResults?: Partial<Record<MappingFieldKey, FieldResultDto>> | null
  responseStatusReturned?: number | null
  /** Giá trị JSON bất kỳ; vắng khi lỗi ghi. */
  responseBodyReturned?: unknown
}

// ---------------------------------------------------------------------------------------------
// Mô hình giao diện.
// ---------------------------------------------------------------------------------------------

/** Một header của lần nhận. `masked` khi backend đã che giá trị (hiện `***`). */
export interface StoredHeader {
  name: string
  value: string
  masked: boolean
}

/** Kết quả mapping của một trường, đã chuẩn hóa các giá trị vắng thành `null`. */
export interface FieldResult {
  value: string | null
  errorCode: MappingFieldErrorCode | null
  error: string | null
  warning: string | null
}

export type MappingFields = Partial<Record<MappingFieldKey, FieldResult>>

/** Nội dung nhận được: JSON đã định dạng đẹp, hoặc văn bản gốc khi body không phải JSON. */
export type PayloadView = { kind: 'json'; text: string; value: unknown } | { kind: 'text'; text: string }

export interface CallbackSummary {
  recordId: number
  serviceCode: string
  serviceDeleted: boolean
  receivedAt: IsoDateTime
  outcome: CallbackOutcome
  rejectionReason: RejectionReason | null
  httpStatusReturned: number
  transactionId: string | null
  status: string | null
  businessTimestamp: IsoDateTime | null
}

export interface CallbackDetail extends CallbackSummary {
  configVersionNumber: number | null
  headers: StoredHeader[]
  payload: PayloadView
  /** Rỗng với lần nhận bị từ chối (chưa chạy mapping). */
  mapping: MappingFields
  /** Mã HTTP đã trả; rơi về `httpStatusReturned` khi backend không ghi được. */
  responseStatus: number
  /** Body đã trả, dạng văn bản; `null` khi không có (lỗi ghi). */
  responseBodyText: string | null
}

export type CallbackPage = Page<CallbackSummary>

export interface CallbackFilter {
  serviceCode?: string
  /** Khớp chuỗi chứa, không phân biệt hoa thường. */
  transactionId?: string
  outcome?: CallbackOutcome
  /** Chỉ có nghĩa khi `outcome` là `REJECTED`. */
  rejectionReason?: RejectionReason
  receivedFrom?: IsoDateTime
  receivedTo?: IsoDateTime
}

export interface SelfTestRequest {
  headers: Record<string, string>
  body: string
}

export interface SelfTestResult {
  httpStatus: number
  responseBody: string
  processingMs: number
  sentAt: IsoDateTime
  /** Giá trị header `X-Simulator-Error` nếu simulator tự từ chối request; null với response đã cấu hình của dịch vụ. */
  simulatorError: string | null
  responseHeaders: Record<string, string>
}
