import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppProviders } from '@/app/providers'
import { MappingTester } from '@/features/callback-services/components/form/MappingTester'
import { ServiceFormView } from '@/features/callback-services/components/ServiceFormView'
import { toCallbackService, toFormValues } from '@/features/callback-services/utils/service-dto'
import { SelfTestPanel } from '@/features/callbacks/components/SelfTestPanel'
import { SimulatorLayout } from '@/layouts'
import ServiceTestPage from '@/pages/ServiceTest'
import ServicesPage from '@/pages/Services'
import { expectNoA11yViolations } from './a11y'
import { BIEN_DONG_DTO, CHI_HO_DTO, THU_HO_DTO, TEST_KEY } from './fixtures/services'
import { errorResponse, jsonResponse, routeFetch } from './http'
import { renderPage } from './render'

const chiHo = toCallbackService(CHI_HO_DTO)

describe('Truy cập cơ bản (NFR4): axe-core không báo vi phạm', () => {
  it('khung ứng dụng (thanh bên, header, skip link, nội dung)', async () => {
    const { container } = render(
      <AppProviders>
        <MemoryRouter initialEntries={['/services']}>
          <SimulatorLayout>
            <h1>Nội dung</h1>
          </SimulatorLayout>
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.getByRole('link', { name: 'Bỏ qua điều hướng' })).toHaveAttribute('href', '#main-content')
    expect(screen.queryByText(/\d{2}:\d{2}:\d{2}/)).not.toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it('danh sách dịch vụ (có dữ liệu) và trạng thái trống', async () => {
    routeFetch({ 'GET /api/services': () => jsonResponse(200, [THU_HO_DTO, CHI_HO_DTO, BIEN_DONG_DTO]) })
    const filled = renderPage(<ServicesPage />, { path: '/services' })
    await screen.findByText('CHI_HO', { selector: 'td span' })
    await expectNoA11yViolations(filled.container)
    filled.unmount()

    routeFetch({ 'GET /api/services': () => jsonResponse(200, []) })
    const empty = renderPage(<ServicesPage />, { path: '/services' })
    await screen.findByText('Chưa có dịch vụ callback nào')
    await expectNoA11yViolations(empty.container)
  })

  it('biểu mẫu tạo dịch vụ, kể cả khi đang hiện lỗi từng ô', async () => {
    const user = userEvent.setup()
    routeFetch({})
    const { container } = renderPage(<ServiceFormView />, { path: '/services/new' })
    await expectNoA11yViolations(container)

    await user.click(screen.getAllByRole('button', { name: 'Lưu cấu hình' })[0] as HTMLElement)
    await screen.findByText('Nhập mã dịch vụ.', { selector: 'p' })
    await expectNoA11yViolations(container)
  })

  it('biểu mẫu sửa dịch vụ có khóa API đã cấu hình', async () => {
    routeFetch({})
    const { container } = renderPage(<ServiceFormView service={chiHo} />, { path: '/services/CHI_HO/edit' })

    await expectNoA11yViolations(container)
  })

  it('thử mapping có kết quả và có lỗi', async () => {
    const user = userEvent.setup()
    routeFetch({
      'POST /api/mapping-tests': () =>
        jsonResponse(200, {
          sampleJsonValid: true,
          transactionId: { value: 'T1' },
          status: { errorCode: 'NOT_FOUND', error: 'Không có.' },
          timestamp: { value: '2026-10-19T03:00:00Z' },
        }),
    })
    const { container } = render(<MappingTester values={toFormValues(chiHo)} />)
    await user.click(screen.getByRole('button', { name: 'Kiểm tra mapping' }))
    await screen.findByText('T1')

    await expectNoA11yViolations(container)
  })

  it('trang gửi thử, trước và sau khi gửi', async () => {
    const user = userEvent.setup()
    routeFetch({
      'GET /api/services/CHI_HO': () => jsonResponse(200, CHI_HO_DTO),
      'POST /callbacks/CHI_HO': () => jsonResponse(201, { code: '00' }),
    })
    const { container } = renderPage(<ServiceTestPage />, {
      path: '/services/:code/test',
      entry: '/services/CHI_HO/test',
    })
    await screen.findByRole('button', { name: 'Gửi callback' })
    await expectNoA11yViolations(container)

    await user.click(screen.getByRole('button', { name: 'Gửi callback' }))
    await screen.findByText('Hoàn tất')
    await expectNoA11yViolations(container)
  })
})

describe('Không lộ khóa API (NFR3)', () => {
  it('form sửa: không có khóa trong DOM, ô khóa rỗng, và giá trị vừa gõ không lọt vào thông báo lỗi khi lưu thất bại', async () => {
    const user = userEvent.setup()
    routeFetch({
      'PUT /api/services/CHI_HO': () => errorResponse(500, 'INTERNAL_ERROR', 'Lỗi nội bộ.'),
    })
    const { container } = renderPage(<ServiceFormView service={chiHo} />, { path: '/services/CHI_HO/edit' })
    const secret = screen.getByLabelText(/Giá trị khóa/)
    expect(secret).toHaveValue('')
    expect(container.innerHTML).not.toContain(TEST_KEY)

    // fireEvent.change thay vì gõ từng phím để không phụ thuộc tốc độ render khi cả bộ chạy song song.
    fireEvent.change(secret, { target: { value: TEST_KEY } })
    await user.click(screen.getAllByRole('button', { name: 'Lưu cấu hình' })[0] as HTMLElement)

    expect(await screen.findByText(/Không lưu được cấu hình\. Lỗi nội bộ\./)).toBeInTheDocument()
    // Chuỗi người dùng vừa gõ nằm trong ô nhập (thuộc tính value) nên chỉ khẳng định về văn bản hiển thị và thông báo lỗi.
    expect(document.body.textContent).not.toContain(TEST_KEY)
  })

  it('form sửa để trống ô khóa: yêu cầu gửi đi không chứa khóa', async () => {
    const user = userEvent.setup()
    const { calls } = routeFetch({ 'PUT /api/services/CHI_HO': () => jsonResponse(200, CHI_HO_DTO) })
    renderPage(<ServiceFormView service={chiHo} />, { path: '/services/CHI_HO/edit' })

    await user.click(screen.getAllByRole('button', { name: 'Lưu cấu hình' })[0] as HTMLElement)

    await screen.findByTestId('location')
    expect(calls).toHaveLength(1)
    expect(calls[0]?.body).not.toContain('apiKeySecret')
    expect(calls[0]?.body).not.toContain(TEST_KEY)
  })

  it('lỗi mạng khi gửi thử không chứa khóa đã gõ và ô khóa được xóa sau khi gửi', async () => {
    const user = userEvent.setup()
    routeFetch({
      'POST /callbacks/CHI_HO': () => {
        throw new TypeError(`Failed to fetch with ${TEST_KEY}`)
      },
    })
    renderPage(<SelfTestPanel service={chiHo} />, { path: '/' })
    await user.click(screen.getByRole('tab', { name: /Request Headers/ }))
    fireEvent.change(screen.getByLabelText('Giá trị header X-API-Key'), { target: { value: TEST_KEY } })

    await user.click(screen.getByRole('button', { name: 'Gửi callback' }))

    expect(await screen.findByText('Không gửi được callback')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(TEST_KEY)
    expect(screen.getByLabelText('Giá trị header X-API-Key')).toHaveValue('')
  })
})
