import { normalizeIsoTimestamp } from '@/features/callback-services/utils/service-dto'
import { toCallbackDetail } from '@/features/callbacks/utils/callback-dto'
import type { Page } from '@/types/api'
import type {
  TransactionDetail,
  TransactionDetailDto,
  TransactionPage,
  TransactionSummary,
  TransactionSummaryDto,
} from '../types/transactions.types'

export function toTransactionSummary(dto: TransactionSummaryDto): TransactionSummary {
  return {
    serviceCode: dto.serviceCode,
    serviceDeleted: dto.serviceDeleted === true,
    transactionId: dto.transactionId,
    latestStatus: dto.latestStatus ?? null,
    latestBusinessTimestamp: dto.latestBusinessTimestamp ? normalizeIsoTimestamp(dto.latestBusinessTimestamp) : null,
    latestReceivedAt: normalizeIsoTimestamp(dto.latestReceivedAt),
    latestCallbackId: dto.latestCallbackId ?? null,
    latestHasMappingError: dto.latestHasMappingError,
    callbackCount: dto.callbackCount,
  }
}

export function toTransactionPage(page: Page<TransactionSummaryDto>): TransactionPage {
  return { ...page, items: page.items.map(toTransactionSummary) }
}

export function toTransactionDetail(dto: TransactionDetailDto): TransactionDetail {
  return {
    transaction: toTransactionSummary(dto.transaction),
    callbacks: dto.callbacks.map(toCallbackDetail),
  }
}
