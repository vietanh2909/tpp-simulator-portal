import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { jsonResponse, stubFetch } from '@/test/http'
import { App } from './App'

describe('App (kiểm thử khói)', () => {
  it('khởi động không lỗi, chuyển / sang danh sách dịch vụ và hiện khung ứng dụng', async () => {
    stubFetch(() => jsonResponse(200, []))

    render(<App />)

    // Trang được tải theo nhu cầu (lazy import) nên lần đầu có thể chậm hơn thời gian chờ mặc định.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dịch vụ callback' }, { timeout: 20_000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/services')
  }, 30_000)
})
