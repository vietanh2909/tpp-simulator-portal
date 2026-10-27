import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PageLoadingProvider } from '@/app/providers/PageLoadingProvider'
import { useAsyncData, type Fetcher } from './useAsyncData'

function wrapper({ children }: { children: ReactNode }) {
  return <PageLoadingProvider>{children}</PageLoadingProvider>
}

/** Một lần tải "treo" do bài kiểm thử tự giải quyết; ghi lại `signal` để khẳng định việc hủy. */
function deferredFetcher() {
  const pending: { resolve: (value: string) => void; reject: (error: Error) => void; signal: AbortSignal }[] = []
  const fetcher: Fetcher<string> = (signal) =>
    new Promise<string>((resolve, reject) => {
      pending.push({ resolve, reject, signal })
    })
  return { fetcher, pending }
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('useAsyncData: tải dữ liệu và tự cập nhật', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('tải lần đầu: loading rồi có data và updatedAt', async () => {
    const fetcher = vi.fn(async () => 'a')
    const { result } = renderHook(() => useAsyncData(fetcher, []), { wrapper })

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeUndefined()
    await advance(0)

    expect(result.current.data).toBe('a')
    expect(result.current.loading).toBe(false)
    expect(result.current.updatedAt).toBeInstanceOf(Date)
  })

  it('cứ mỗi nhịp 5 giây tải lại một lần', async () => {
    let value = 0
    const fetcher = vi.fn(async () => `v${++value}`)
    const { result } = renderHook(() => useAsyncData(fetcher, [], { pollMs: 5000 }), { wrapper })
    await advance(0)

    await advance(5000)
    expect(result.current.data).toBe('v2')
    await advance(5000)

    expect(result.current.data).toBe('v3')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('một lần tải kéo dài hơn 5 giây thì nhịp kế tiếp bị bỏ qua, không có hai lần tải chồng nhau', async () => {
    const { fetcher, pending } = deferredFetcher()
    const spy = vi.fn(fetcher)
    renderHook(() => useAsyncData(spy, [], { pollMs: 5000 }), { wrapper })
    await advance(0)
    expect(spy).toHaveBeenCalledTimes(1)

    await advance(5000)
    await advance(5000)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(pending[0]?.signal.aborted).toBe(false)

    await act(async () => pending[0]?.resolve('xong'))
    await advance(5000)

    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('đổi tham số hủy lần tải cũ và bỏ kết quả của nó dù về muộn', async () => {
    const { fetcher, pending } = deferredFetcher()
    const { result, rerender } = renderHook(({ id }) => useAsyncData(fetcher, [id]), {
      wrapper,
      initialProps: { id: 1 },
    })
    await advance(0)

    rerender({ id: 2 })
    await advance(0)
    expect(pending).toHaveLength(2)
    expect(pending[0]?.signal.aborted).toBe(true)

    await act(async () => pending[1]?.resolve('mới'))
    await act(async () => pending[0]?.resolve('cũ'))

    expect(result.current.data).toBe('mới')
  })

  it('Tải lại hủy lần đang chạy và chỉ nhận kết quả của lần mới nhất', async () => {
    const { fetcher, pending } = deferredFetcher()
    const { result } = renderHook(() => useAsyncData(fetcher, [], { pollMs: 5000 }), { wrapper })
    await advance(0)

    act(() => result.current.reload())
    await advance(0)

    expect(pending).toHaveLength(2)
    expect(pending[0]?.signal.aborted).toBe(true)
    await act(async () => pending[1]?.resolve('mới nhất'))
    await act(async () => pending[0]?.resolve('đã hủy'))
    expect(result.current.data).toBe('mới nhất')
  })

  it('lỗi giữ dữ liệu cũ và giờ cập nhật thành công gần nhất; lần thành công sau xóa lỗi', async () => {
    let fail = false
    const fetcher = vi.fn(async () => {
      if (fail) throw new Error('Backend tạm dừng')
      return 'ổn'
    })
    const { result } = renderHook(() => useAsyncData(fetcher, [], { pollMs: 5000 }), { wrapper })
    await advance(0)
    const firstUpdate = result.current.updatedAt

    fail = true
    await advance(5000)
    expect(result.current.error?.message).toBe('Backend tạm dừng')
    expect(result.current.data).toBe('ổn')
    expect(result.current.updatedAt).toBe(firstUpdate)

    fail = false
    await advance(5000)
    expect(result.current.error).toBeUndefined()
    expect(result.current.updatedAt).not.toBe(firstUpdate)
  })

  it('tắt tự cập nhật (pollMs null) thì dữ liệu chỉ đổi khi Tải lại', async () => {
    let value = 0
    const fetcher = vi.fn(async () => `v${++value}`)
    const { result } = renderHook(() => useAsyncData(fetcher, [], { pollMs: null }), { wrapper })
    await advance(0)

    await advance(15_000)
    expect(result.current.data).toBe('v1')

    act(() => result.current.reload())
    await advance(0)

    expect(result.current.data).toBe('v2')
  })

  it('gỡ thành phần dừng polling và hủy yêu cầu đang chạy', async () => {
    const { fetcher, pending } = deferredFetcher()
    const spy = vi.fn(fetcher)
    const { unmount } = renderHook(() => useAsyncData(spy, [], { pollMs: 5000 }), { wrapper })
    await advance(0)

    unmount()
    await advance(20_000)

    expect(pending[0]?.signal.aborted).toBe(true)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('hàm tải bỏ qua signal (kiểu của U3) vẫn chạy bình thường', async () => {
    const { result } = renderHook(() => useAsyncData(() => Promise.resolve(42), ['x']), { wrapper })
    await advance(0)

    expect(result.current.data).toBe(42)
  })
})
