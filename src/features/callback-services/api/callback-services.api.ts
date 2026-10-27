import { ERROR_CODES } from '@/constants/error-codes'
import { http } from '@/services/http/client'
import { ApiError } from '@/services/http/error-handler'
import type {
  CallbackService,
  ListServicesParams,
  ServiceDto,
  ServiceFormValues,
  ServiceListResult,
} from '../types/callback-services.types'
import { toCallbackService, toCreateRequest, toServiceRequest } from '../utils/service-dto'

export interface CallbackServicesApi {
  /** `GET /api/services`: toàn bộ dịch vụ chưa xóa. Tìm kiếm và lọc bật/tắt làm phía client (xem `filterServices`). */
  list(params?: ListServicesParams, signal?: AbortSignal): Promise<ServiceListResult>
  /** Dịch vụ đã xóa mềm được coi như không tìm thấy. */
  get(code: string, signal?: AbortSignal): Promise<CallbackService>
  create(values: ServiceFormValues): Promise<CallbackService>
  update(code: string, values: ServiceFormValues): Promise<CallbackService>
  setEnabled(code: string, enabled: boolean): Promise<CallbackService>
  remove(code: string): Promise<void>
}

function servicePath(code: string): string {
  return `/api/services/${encodeURIComponent(code)}`
}

export const callbackServicesApi: CallbackServicesApi = {
  async list(params, signal) {
    const includeDeleted = params?.includeDeleted === true
    const dtos = await http.get<ServiceDto[]>('/api/services', {
      query: includeDeleted ? { includeDeleted: true } : undefined,
      signal,
    })
    const items = dtos.map(toCallbackService).filter((service) => includeDeleted || !service.deleted)
    return { items, total: items.length, enabledTotal: items.filter((service) => service.enabled).length }
  },

  async get(code, signal) {
    const service = toCallbackService(await http.get<ServiceDto>(servicePath(code), { signal }))
    if (service.deleted) {
      throw new ApiError(404, ERROR_CODES.SERVICE_NOT_FOUND, `Dịch vụ "${code}" đã bị xóa.`)
    }
    return service
  },

  async create(values) {
    return toCallbackService(await http.post<ServiceDto>('/api/services', toCreateRequest(values)))
  },

  async update(code, values) {
    return toCallbackService(await http.put<ServiceDto>(servicePath(code), toServiceRequest(values)))
  },

  async setEnabled(code, enabled) {
    return toCallbackService(await http.put<ServiceDto>(`${servicePath(code)}/enabled`, { enabled }))
  },

  async remove(code) {
    await http.delete<void>(servicePath(code))
  },
}
