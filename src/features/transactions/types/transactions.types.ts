import type { CallbackDetail, CallbackDetailDto } from '@/features/callbacks/types/callbacks.types'
import type { Page } from '@/types/api'
import type { IsoDateTime } from '@/types/common'

/** Schema `TransactionSummary` của backend (openapi.yaml). */
export interface TransactionSummaryDto {
  serviceCode: string
  serviceDeleted?: boolean
  transactionId: string
  /** null khi callback gần nhất thiếu hoặc lỗi status. */
  latestStatus?: string | null
  latestBusinessTimestamp?: IsoDateTime | null
  latestReceivedAt: IsoDateTime
  latestCallbackId?: number
  latestHasMappingError: boolean
  callbackCount: number
}

/** Phản hồi `GET /api/transactions/detail`. */
export interface TransactionDetailDto {
  transaction: TransactionSummaryDto
  /** Theo thứ tự nhận, cũ nhất trước. */
  callbacks: CallbackDetailDto[]
}

/** Giao dịch = một cặp serviceCode + transactionId, tổng hợp từ các callback đã nhận. */
export interface TransactionSummary {
  serviceCode: string
  serviceDeleted: boolean
  transactionId: string
  /** Status của callback nhận gần nhất; null nếu callback đó thiếu hoặc lỗi status. */
  latestStatus: string | null
  /** Timestamp nghiệp vụ của callback nhận gần nhất; null nếu thiếu hoặc lỗi. */
  latestBusinessTimestamp: IsoDateTime | null
  latestReceivedAt: IsoDateTime
  latestCallbackId: number | null
  latestHasMappingError: boolean
  callbackCount: number
}

export type TransactionPage = Page<TransactionSummary>

export interface TransactionDetail {
  transaction: TransactionSummary
  /** Lịch sử theo thứ tự nhận (cũ -> mới). */
  callbacks: CallbackDetail[]
}

export interface TransactionFilter {
  serviceCode?: string
  /** Khớp chuỗi chứa, không phân biệt hoa thường. */
  transactionId?: string
  /** Khớp chuỗi chứa, không phân biệt hoa thường; giao dịch có `latestStatus` null không khớp. */
  status?: string
  /** Lọc theo thời điểm nhận gần nhất của giao dịch, tính cả hai đầu. */
  receivedFrom?: IsoDateTime
  receivedTo?: IsoDateTime
}
