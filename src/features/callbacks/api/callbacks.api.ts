import { http, sendRaw } from '@/services/http/client'
import type { Page } from '@/types/api'
import type {
  CallbackDetail,
  CallbackDetailDto,
  CallbackFilter,
  CallbackPage,
  CallbackSummaryDto,
  SelfTestRequest,
  SelfTestResult,
} from '../types/callbacks.types'
import { toCallbackDetail, toCallbackSummary } from '../utils/callback-dto'

export interface CallbacksApi {
  /** `GET /api/callbacks`. `size` chỉ nhận 20, 50, 100; `rejectionReason` chỉ gửi khi `outcome` là `REJECTED`. */
  list(filter: CallbackFilter, page: number, size: number, signal?: AbortSignal): Promise<CallbackPage>
  /** `GET /api/callbacks/{recordId}`; `recordId` là số nguyên. Không có: `ApiError` 404 `CALLBACK_NOT_FOUND`. */
  get(recordId: number, signal?: AbortSignal): Promise<CallbackDetail>
  /** Gửi callback thử tới endpoint callback thật của dịch vụ qua Vite proxy (`POST /callbacks/{serviceCode}`). */
  sendTest(serviceCode: string, request: SelfTestRequest, signal?: AbortSignal): Promise<SelfTestResult>
}

export const callbacksApi: CallbacksApi = {
  async list(filter, page, size, signal) {
    const result = await http.get<Page<CallbackSummaryDto>>('/api/callbacks', {
      query: {
        serviceCode: filter.serviceCode,
        transactionId: filter.transactionId,
        outcome: filter.outcome,
        rejectionReason: filter.outcome === 'REJECTED' ? filter.rejectionReason : undefined,
        receivedFrom: filter.receivedFrom,
        receivedTo: filter.receivedTo,
        page,
        size,
      },
      signal,
    })
    return { ...result, items: result.items.map(toCallbackSummary) }
  },

  async get(recordId, signal) {
    const result = await http.get<CallbackDetailDto>(`/api/callbacks/${recordId}`, { signal })
    return toCallbackDetail(result)
  },

  async sendTest(serviceCode, request, signal) {
    const sentAt = new Date().toISOString()
    const started = performance.now()
    const response = await sendRaw('POST', `/callbacks/${encodeURIComponent(serviceCode)}`, {
      headers: request.headers,
      body: request.body,
      signal,
    })
    return {
      httpStatus: response.status,
      responseBody: response.bodyText,
      // Đo ở trình duyệt từ lúc bắt đầu gửi tới lúc nhận đủ body (AC2.10.2).
      processingMs: Math.round(performance.now() - started),
      sentAt,
      // Chỉ có trên response do simulator sinh ra; response đã cấu hình của dịch vụ không có header này.
      simulatorError: response.headers['x-simulator-error'] ?? null,
      responseHeaders: response.headers,
    }
  },
}
