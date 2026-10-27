import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import MonitoringPage from '@/pages/Monitoring'
import TransactionDetailPage from '@/pages/TransactionDetail'

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
 * Màn hình theo dõi cùng hai trang chi tiết trong một router bộ nhớ, để kiểm thử đi lại giữa danh sách và chi tiết.
 * `data-testid="location"` luôn hiện đường dẫn hiện tại (kể cả truy vấn).
 */
export function renderMonitoringApp(entry: string) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <Routes>
          <Route path="/transactions" element={<MonitoringPage />} />
          <Route path="/transactions/:serviceCode/:transactionId" element={<TransactionDetailPage />} />
          <Route path="/callbacks/:callbackId" element={<TransactionDetailPage />} />
          <Route path="*" element={<p>Không có route</p>} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
}
