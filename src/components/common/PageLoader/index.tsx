import { usePageLoading } from '@/app/providers/PageLoadingProvider'

/** Thanh tiến trình mảnh ở đầu trang, hiện khi có tác vụ tải đang chạy. */
export function PageLoader() {
  const { pending } = usePageLoading()
  if (pending === 0) return null
  return (
    <div
      role="progressbar"
      aria-label="Đang tải"
      className="fixed top-0 right-0 left-0 z-[60] h-0.5 overflow-hidden bg-primary-fixed"
    >
      <div
        className="h-full w-1/4 bg-primary-container"
        style={{ animation: 'page-loader 1.1s ease-in-out infinite' }}
      />
    </div>
  )
}

/** Khối placeholder khi chưa có dữ liệu lần đầu. */
export function SectionLoader({ label = 'Đang tải dữ liệu...' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 px-6 py-12 text-body-md text-on-surface-variant"
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-primary-container border-t-transparent"
      />
      {label}
    </div>
  )
}
