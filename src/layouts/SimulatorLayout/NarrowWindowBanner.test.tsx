import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AppProviders } from '@/app/providers'
import { expectNoA11yViolations } from '@/test/a11y'
import { SimulatorLayout } from './index'

const ORIGINAL_WIDTH = window.innerWidth

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
}

function renderLayout() {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={['/services']}>
        <SimulatorLayout>
          <h1>Nội dung trang</h1>
        </SimulatorLayout>
      </MemoryRouter>
    </AppProviders>,
  )
}

const BANNER_TEXT = 'Cửa sổ hẹp hơn 1024px nên giao diện có thể khó dùng. Hãy mở rộng cửa sổ hoặc giảm mức phóng to.'

describe('Banner cửa sổ hẹp (D15)', () => {
  afterEach(() => setWidth(ORIGINAL_WIDTH))

  it('dưới 1024px hiện banner đúng chữ nhưng không chặn nội dung', async () => {
    setWidth(800)
    const { container } = renderLayout()

    expect(screen.getByTestId('narrow-window-banner')).toHaveTextContent(BANNER_TEXT)
    expect(screen.getByRole('heading', { name: 'Nội dung trang' })).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it('từ 1024px trở lên không hiện banner', () => {
    setWidth(1024)
    renderLayout()
    expect(screen.queryByTestId('narrow-window-banner')).not.toBeInTheDocument()
  })

  it('đóng được bằng nút "Đóng" và không tự hiện lại khi cửa sổ vẫn hẹp', async () => {
    const user = userEvent.setup()
    setWidth(700)
    renderLayout()

    await user.click(screen.getByRole('button', { name: 'Đóng' }))
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(screen.queryByTestId('narrow-window-banner')).not.toBeInTheDocument()
  })

  it('đổi kích thước cửa sổ làm banner hiện hoặc ẩn theo ngưỡng 1024px', () => {
    setWidth(1280)
    renderLayout()
    expect(screen.queryByTestId('narrow-window-banner')).not.toBeInTheDocument()

    act(() => {
      setWidth(900)
      window.dispatchEvent(new Event('resize'))
    })
    expect(screen.getByTestId('narrow-window-banner')).toBeInTheDocument()

    act(() => {
      setWidth(1400)
      window.dispatchEvent(new Event('resize'))
    })
    expect(screen.queryByTestId('narrow-window-banner')).not.toBeInTheDocument()
  })
})
