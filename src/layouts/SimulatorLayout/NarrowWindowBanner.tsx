import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui'

/** Dưới ngưỡng này giao diện không có bố cục riêng (D15). */
export const MIN_SUPPORTED_WIDTH = 1024

/**
 * Banner cảnh báo cửa sổ hẹp (D15): đóng được, không chặn nội dung. Người phóng to trình duyệt 200% trên màn hình
 * 1920px chỉ còn 960px CSS, nên chỉ cảnh báo thay vì thay màn hình bằng thông báo.
 */
export function NarrowWindowBanner() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < MIN_SUPPORTED_WIDTH)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function onResize() {
      setNarrow(window.innerWidth < MIN_SUPPORTED_WIDTH)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!narrow || dismissed) return null
  return (
    <div
      role="status"
      data-testid="narrow-window-banner"
      className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-body-md text-amber-900"
    >
      <Icon name="warning" size={18} filled className="shrink-0 text-amber-600" />
      <p className="flex-1">
        Cửa sổ hẹp hơn {MIN_SUPPORTED_WIDTH}px nên giao diện có thể khó dùng. Hãy mở rộng cửa sổ hoặc giảm mức phóng to.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-lg px-2 py-1 font-medium text-amber-900 hover:bg-amber-100"
      >
        Đóng
      </button>
    </div>
  )
}
