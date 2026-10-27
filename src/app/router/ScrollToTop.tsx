import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Cuộn lên đầu trang khi đổi đường dẫn (không cuộn khi chỉ đổi query/bộ lọc). */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
