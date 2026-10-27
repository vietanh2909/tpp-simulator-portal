import { http } from '@/services/http/client'
import type { Page } from '@/types/api'
import type {
  TransactionDetail,
  TransactionDetailDto,
  TransactionFilter,
  TransactionPage,
  TransactionSummaryDto,
} from '../types/transactions.types'
import { toTransactionDetail, toTransactionPage } from '../utils/transaction-dto'

export interface TransactionsApi {
  /** `GET /api/transactions`. `size` chỉ nhận 20, 50, 100; bộ lọc rỗng không được gửi. */
  list(filter: TransactionFilter, page: number, size: number, signal?: AbortSignal): Promise<TransactionPage>
  /**
   * `GET /api/transactions/detail?serviceCode&transactionId`. `transactionId` có thể chứa `/ ? # %` hay khoảng trắng nên
   * đi qua tham số truy vấn (đã mã hóa phần trăm), không đi qua đường dẫn. Không có giao dịch: `ApiError` 404
   * `TRANSACTION_NOT_FOUND`.
   */
  get(serviceCode: string, transactionId: string, signal?: AbortSignal): Promise<TransactionDetail>
}

export const transactionsApi: TransactionsApi = {
  async list(filter, page, size, signal) {
    const result = await http.get<Page<TransactionSummaryDto>>('/api/transactions', {
      query: {
        serviceCode: filter.serviceCode,
        transactionId: filter.transactionId,
        status: filter.status,
        receivedFrom: filter.receivedFrom,
        receivedTo: filter.receivedTo,
        page,
        size,
      },
      signal,
    })
    return toTransactionPage(result)
  },

  async get(serviceCode, transactionId, signal) {
    const result = await http.get<TransactionDetailDto>('/api/transactions/detail', {
      query: { serviceCode, transactionId },
      signal,
    })
    return toTransactionDetail(result)
  },
}
