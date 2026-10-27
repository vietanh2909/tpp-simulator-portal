import type { CallbackService, ServiceStatusFilter } from '../types/callback-services.types'

/** Tìm theo mã hoặc tên (không phân biệt hoa thường) và lọc bật/tắt. `GET /api/services` không có tham số lọc nên làm ở client. */
export function filterServices(
  items: readonly CallbackService[],
  search: string,
  status: ServiceStatusFilter,
): CallbackService[] {
  const needle = search.trim().toLowerCase()
  return items.filter((service) => {
    if (status === 'enabled' && !service.enabled) return false
    if (status === 'disabled' && service.enabled) return false
    if (needle === '') return true
    return service.code.toLowerCase().includes(needle) || service.name.toLowerCase().includes(needle)
  })
}
