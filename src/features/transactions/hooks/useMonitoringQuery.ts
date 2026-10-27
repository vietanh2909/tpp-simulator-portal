import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DEFAULT_PAGE_SIZE,
  EMPTY_FILTERS,
  loadTabState,
  normalizeFilters,
  normalizePageSize,
  parseQuery,
  queryKey,
  saveTabState,
  serializeQuery,
  type MonitoringFilters,
  type MonitoringQuery,
  type MonitoringTab,
} from '../utils/monitoring-query'

export type { MonitoringQuery, MonitoringTab }

/**
 * Bộ lọc, trang, cỡ trang và tab đang xem nằm trong URL nên giữ nguyên khi tự cập nhật và khi quay lại từ chi tiết
 * (AC3.4.3, AC3.7.4). Giá trị của tab kia nhớ trong `sessionStorage` để chuyển tab qua lại không mất (D9).
 */
export function useMonitoringQuery() {
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => parseQuery(params), [params])

  // Ghi trạng thái tab đang xem để khi quay lại tab này từ tab kia, bộ lọc và trang còn nguyên.
  useEffect(() => {
    saveTabState(query.tab, query)
  }, [query])

  const commit = useCallback(
    (next: MonitoringQuery) => {
      setParams(serializeQuery(next), { replace: true })
    },
    [setParams],
  )

  /**
   * Đổi bộ lọc, trang hoặc cỡ trang. Đổi bộ lọc hay cỡ trang đưa về trang 1 trừ khi nơi gọi nêu `page`.
   * Trả truy vấn mới nếu URL (nên cả truy vấn dữ liệu) thật sự đổi; `null` nghĩa là không có gì đổi để nơi gọi tải lại
   * thủ công.
   */
  const update = useCallback(
    (patch: Partial<MonitoringFilters> & { page?: number; size?: number }): MonitoringQuery | null => {
      const { page, size, ...filterPatch } = patch
      const filters = normalizeFilters(query.tab, { ...query, ...filterPatch })
      const sizeChanged = size !== undefined && normalizePageSize(size) !== query.size
      const filtersChanged = Object.keys(filterPatch).length > 0
      const next: MonitoringQuery = {
        tab: query.tab,
        ...filters,
        size: size === undefined ? query.size : normalizePageSize(size),
        page: page ?? (sizeChanged || filtersChanged ? 1 : query.page),
      }
      if (queryKey(next) === queryKey(query)) return null
      commit(next)
      return next
    },
    [commit, query],
  )

  /** Chuyển tab: lưu tab hiện tại, nạp bộ lọc và trang đã nhớ của tab đích (hoặc mặc định). */
  const switchTab = useCallback(
    (tab: MonitoringTab) => {
      if (tab === query.tab) return
      saveTabState(query.tab, query)
      const stored = loadTabState(tab)
      commit({
        tab,
        ...(stored ?? { ...EMPTY_FILTERS, page: 1, size: DEFAULT_PAGE_SIZE }),
      })
    },
    [commit, query],
  )

  return { query, update, switchTab }
}
