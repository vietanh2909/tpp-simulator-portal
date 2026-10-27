import { http } from '@/services/http/client'
import type { MappingTestResponse, ServiceFormValues } from '../types/callback-services.types'
import { toMappingTestRequest } from '../utils/service-dto'

export const mappingTestsApi = {
  /**
   * Thử mapping bằng cấu hình đang nhập (chưa cần lưu) và JSON mẫu. Server tính kết quả bằng đúng bộ ánh xạ
   * lúc nhận callback; thao tác này không ghi callback hay giao dịch nào.
   */
  run(values: ServiceFormValues, sampleJson: string, signal?: AbortSignal): Promise<MappingTestResponse> {
    return http.post<MappingTestResponse>('/api/mapping-tests', toMappingTestRequest(values, sampleJson), { signal })
  },
}
