import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface PageLoadingContextValue {
  /** Số tác vụ tải đang chạy. */
  pending: number
  /** Đánh dấu bắt đầu một tác vụ tải; trả về hàm kết thúc. */
  begin: () => () => void
}

const PageLoadingContext = createContext<PageLoadingContextValue | null>(null)

export function PageLoadingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(0)

  const begin = useCallback(() => {
    setPending((count) => count + 1)
    let ended = false
    return () => {
      if (ended) return
      ended = true
      setPending((count) => Math.max(0, count - 1))
    }
  }, [])

  const value = useMemo(() => ({ pending, begin }), [pending, begin])
  return <PageLoadingContext.Provider value={value}>{children}</PageLoadingContext.Provider>
}

export function usePageLoading(): PageLoadingContextValue {
  const context = useContext(PageLoadingContext)
  if (!context) throw new Error('usePageLoading phải được dùng bên trong PageLoadingProvider')
  return context
}
