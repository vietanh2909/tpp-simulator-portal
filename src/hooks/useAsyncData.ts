import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'
import { usePageLoading } from '@/app/providers/PageLoadingProvider'

export interface AsyncDataState<T> {
  /** Dữ liệu thành công gần nhất. Được giữ lại khi đang tải lại hoặc khi lỗi để không làm mất ngữ cảnh đang xem. */
  data: T | undefined
  error: Error | undefined
  /** Đang tải lần đầu hoặc do thay đổi tham số (chưa có kết quả mới). */
  loading: boolean
  /** Đang tải lại nền (polling/tải lại thủ công). */
  refreshing: boolean
  /** Thời điểm tải thành công gần nhất; không đổi khi lần tải sau lỗi. */
  updatedAt: Date | undefined
  /** Tải lại ngay theo yêu cầu người dùng: hủy lần tải đang chạy và chỉ nhận kết quả của lần này. */
  reload: () => void
}

interface Options {
  /** Chu kỳ tự cập nhật (ms). Bỏ trống hoặc null để tắt. */
  pollMs?: number | null
}

/** Hàm tải nhận `signal` để hủy khi bị thay thế hoặc khi gỡ thành phần; hàm không dùng `signal` vẫn hợp lệ. */
export type Fetcher<T> = (signal: AbortSignal) => Promise<T>

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error('Đã xảy ra lỗi không xác định.')
}

interface InFlight {
  id: number
  controller: AbortController
}

/**
 * Tải dữ liệu bất đồng bộ, tự tải lại khi `deps` đổi và hỗ trợ polling.
 *
 * - Chỉ nhận kết quả của lần tải mới nhất; thao tác của người dùng (đổi tham số, `reload`) hủy lần đang chạy.
 * - Nhịp polling **bị bỏ qua** khi một lần tải còn đang chạy: không bao giờ có hai lần tải chồng nhau (AC3.9.3).
 * - Lỗi giữ `data` và `updatedAt` của lần thành công gần nhất; lần thành công sau xóa lỗi (AC3.9.1, AC3.9.2).
 */
export function useAsyncData<T>(fetcher: Fetcher<T>, deps: DependencyList, options: Options = {}): AsyncDataState<T> {
  const { pollMs = null } = options
  const { begin } = usePageLoading()
  const fetcherRef = useRef(fetcher)
  const requestIdRef = useRef(0)
  const inFlightRef = useRef<InFlight | null>(null)
  const [state, setState] = useState<Omit<AsyncDataState<T>, 'reload'>>({
    data: undefined,
    error: undefined,
    loading: true,
    refreshing: false,
    updatedAt: undefined,
  })

  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const run = useCallback(
    async (mode: 'initial' | 'refresh') => {
      // Hủy lần đang chạy (nếu có): kết quả của nó không còn được nhận.
      inFlightRef.current?.controller.abort()
      const requestId = ++requestIdRef.current
      const controller = new AbortController()
      inFlightRef.current = { id: requestId, controller }
      const end = mode === 'initial' ? begin() : undefined
      setState((prev) => ({
        ...prev,
        error: mode === 'initial' ? undefined : prev.error,
        loading: mode === 'initial' ? true : prev.loading,
        refreshing: mode === 'refresh',
      }))
      try {
        const data = await fetcherRef.current(controller.signal)
        if (requestId !== requestIdRef.current) return
        setState({ data, error: undefined, loading: false, refreshing: false, updatedAt: new Date() })
      } catch (error) {
        if (requestId !== requestIdRef.current) return
        setState((prev) => ({ ...prev, error: toError(error), loading: false, refreshing: false }))
      } finally {
        if (inFlightRef.current?.id === requestId) inFlightRef.current = null
        end?.()
      }
    },
    [begin],
  )

  // `deps` do nơi gọi quyết định (giá trị nguyên thủy), nên so sánh qua chuỗi serialize.
  const depsKey = JSON.stringify(deps)
  useEffect(() => {
    void run('initial')
    return () => {
      // Đổi tham số hoặc gỡ thành phần: hủy yêu cầu đang chạy và bỏ kết quả về muộn.
      requestIdRef.current += 1
      inFlightRef.current?.controller.abort()
      inFlightRef.current = null
    }
  }, [run, depsKey])

  useEffect(() => {
    if (!pollMs) return undefined
    const timer = window.setInterval(() => {
      // Lần tải trước chưa xong: bỏ qua nhịp này thay vì chồng thêm một yêu cầu (AC3.9.3).
      if (inFlightRef.current) return
      void run('refresh')
    }, pollMs)
    return () => window.clearInterval(timer)
  }, [pollMs, run])

  const reload = useCallback(() => void run('refresh'), [run])
  return { ...state, reload }
}
