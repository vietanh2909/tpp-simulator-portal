import { appConfig } from '@/app/config'

/** URL callback của dịch vụ: `POST {gốc cấu hình}/callbacks/{serviceCode}` (application/json). */
export function buildCallbackUrl(serviceCode: string): string {
  return `${appConfig.callbackBaseUrl}/callbacks/${serviceCode}`
}

/** URL callback đầy đủ từ `callbackPath` do backend trả (ví dụ `/callbacks/THU_HO`). */
export function buildCallbackUrlFromPath(callbackPath: string): string {
  return `${appConfig.callbackBaseUrl}${callbackPath}`
}
