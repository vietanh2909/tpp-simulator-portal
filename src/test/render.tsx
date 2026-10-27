import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppProviders } from '@/app/providers'

function LocationProbe() {
  const location = useLocation()
  return (
    <p data-testid="location">
      {location.pathname}
      {location.search}
    </p>
  )
}

/**
 * Dựng một trang trong đủ provider (toast, trạng thái tải) và router bộ nhớ.
 * Điều hướng sang đường dẫn khác `path` hiện đường dẫn đó ở `data-testid="location"`.
 */
export function renderPage(element: ReactElement, options: { path?: string; entry?: string } = {}) {
  const { path = '/', entry = path } = options
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
}
