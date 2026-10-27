import { useAsyncData } from '@/hooks/useAsyncData'
import { callbackServicesApi } from '../api/callback-services.api'

export function useService(code: string) {
  return useAsyncData(() => callbackServicesApi.get(code), [code])
}
