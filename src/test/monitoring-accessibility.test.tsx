import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from './a11y'
import { fakeMonitoringBackend } from './fixtures/fake-backend'
import {
  CB_MAPPING_ERROR_DTO,
  CB_REJECTED_DTO,
  DELETED_TXN_DTO,
  T100_DTO,
  T200_DTO,
  callbackDto,
  makeTransactions,
} from './fixtures/monitoring'
import { CHI_HO_DTO, THU_HO_DTO, TEST_KEY } from './fixtures/services'
import { renderMonitoringApp } from './monitoring-app'

const SERVICES = [THU_HO_DTO, CHI_HO_DTO]

beforeEach(() => window.sessionStorage.clear())

describe('Truy cập cơ bản (NFR4): màn hình theo dõi và chi tiết', () => {
  it('tab Giao dịch có dữ liệu không có vi phạm axe', async () => {
    fakeMonitoringBackend({ transactions: [T100_DTO, T200_DTO, DELETED_TXN_DTO], services: SERVICES })
    const { container } = renderMonitoringApp('/transactions')
    await screen.findByTestId('transactions-table')
    await screen.findByRole('option', { name: 'THU_HO (Thu hộ)' })

    await expectNoA11yViolations(container)
  })

  it('tab Tất cả callback có dữ liệu (thành công, lỗi mapping, bị từ chối) không có vi phạm axe', async () => {
    fakeMonitoringBackend({ callbacks: [callbackDto(7), CB_MAPPING_ERROR_DTO, CB_REJECTED_DTO], services: SERVICES })
    const { container } = renderMonitoringApp('/transactions?tab=callbacks&outcome=REJECTED')
    await screen.findByTestId('callbacks-table')

    await expectNoA11yViolations(container)
  })

  it('trạng thái rỗng và trạng thái lỗi tải không có vi phạm axe', async () => {
    const empty = fakeMonitoringBackend({ transactions: [], services: SERVICES })
    const first = renderMonitoringApp('/transactions')
    await screen.findByText('Chưa có giao dịch nào')
    await expectNoA11yViolations(first.container)
    first.unmount()

    empty.state.down = true
    const failed = renderMonitoringApp('/transactions?tab=callbacks')
    await screen.findByText('Không tải được dữ liệu')
    await expectNoA11yViolations(failed.container)
  })

  it('chi tiết giao dịch và chi tiết callback bị từ chối không có vi phạm axe', async () => {
    fakeMonitoringBackend({
      transactions: [T100_DTO],
      callbacks: [callbackDto(1), callbackDto(2), callbackDto(3), CB_REJECTED_DTO],
      services: SERVICES,
    })
    const detail = renderMonitoringApp('/transactions/THU_HO/T100')
    await screen.findAllByTestId('timeline-item')
    await expectNoA11yViolations(detail.container)
    detail.unmount()

    const rejected = renderMonitoringApp('/callbacks/9')
    await screen.findByTestId('rejected-note')
    await expectNoA11yViolations(rejected.container)
  })

  it('bàn phím: mũi tên đổi tab Giao dịch / Tất cả callback và đưa tiêu điểm theo', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ transactions: [T100_DTO], callbacks: [callbackDto(1)], services: SERVICES })
    renderMonitoringApp('/transactions')
    await screen.findByTestId('transactions-table')

    screen.getByRole('tab', { name: /Giao dịch/ }).focus()
    await user.keyboard('{ArrowRight}')

    await screen.findByTestId('callbacks-table')
    const callbacksTab = screen.getByRole('tab', { name: /Tất cả callback/ })
    expect(callbacksTab).toHaveAttribute('aria-selected', 'true')
    expect(callbacksTab).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', callbacksTab.id)
  })

  it('bàn phím: Tab tới nút "Xem" của từng dòng và Enter mở chi tiết', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ transactions: [T100_DTO, T200_DTO], callbacks: [callbackDto(1)], services: SERVICES })
    renderMonitoringApp('/transactions')
    await screen.findByTestId('transactions-table')

    const links = screen.getAllByTestId('view-transaction')
    expect(links).toHaveLength(2)
    links[0]?.focus()
    await user.tab()
    expect(links[1]).toHaveFocus()
    links[0]?.focus()
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Chi tiết giao dịch')).toBeInTheDocument()
  })

  it('bàn phím: công tắc tự cập nhật bật/tắt bằng phím và đổi nhãn chữ', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ transactions: [T100_DTO], services: SERVICES })
    renderMonitoringApp('/transactions')
    await screen.findByTestId('transactions-table')
    const toggle = screen.getByRole('switch', { name: 'Tự cập nhật mỗi 5 giây' })

    toggle.focus()
    await user.keyboard(' ')

    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Tự cập nhật đang tắt')).toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('mọi bảng có chú thích ẩn và tiêu đề cột scope="col"; ô trống có chữ ẩn', async () => {
    fakeMonitoringBackend({ transactions: [DELETED_TXN_DTO], services: SERVICES })
    renderMonitoringApp('/transactions')
    const table = await screen.findByTestId('transactions-table')

    expect(within(table).getByText(/Danh sách giao dịch/)).toHaveClass('sr-only')
    for (const header of within(table).getAllByRole('columnheader')) {
      expect(header).toHaveAttribute('scope', 'col')
    }
    expect(within(table).getByText('Không có timestamp nghiệp vụ')).toHaveClass('sr-only')
  })
})

describe('Vùng thông báo aria-live (D12)', () => {
  it('im lặng khi mở trang; nói khi bấm "Tải lại", áp dụng bộ lọc, đổi trang và khi lỗi rồi phục hồi', async () => {
    const user = userEvent.setup()
    const fake = fakeMonitoringBackend({ transactions: makeTransactions(25), services: SERVICES })
    renderMonitoringApp('/transactions')
    await screen.findByTestId('transactions-table')
    const live = screen.getByTestId('live-region')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveTextContent('')

    await user.click(screen.getByRole('button', { name: 'Tải lại' }))
    await waitFor(() => expect(live).toHaveTextContent('Đã tải lại, 25 kết quả.'))

    await user.click(screen.getByRole('button', { name: 'Trang 2 trên 2' }))
    await waitFor(() => expect(live).toHaveTextContent('Trang 2 trên 2.'))

    fireEvent.change(screen.getByLabelText('Mã giao dịch (transactionId)'), { target: { value: 'TX00' } })
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
    await waitFor(() => expect(live).toHaveTextContent('Đã áp dụng bộ lọc, 9 kết quả.'))

    fake.state.down = true
    await user.click(screen.getByRole('button', { name: 'Tải lại' }))
    await waitFor(() => expect(live).toHaveTextContent('Không cập nhật được dữ liệu.'))
    fake.state.down = false
    await user.click(screen.getByRole('button', { name: 'Tải lại' }))
    await waitFor(() => expect(live).toHaveTextContent('Đã cập nhật lại dữ liệu sau lỗi.'))
  })
})

describe('Không lộ khóa API (NFR3): màn hình theo dõi', () => {
  it('header khóa đã che hiện *** và không có chuỗi khóa nào trong DOM, địa chỉ hay thông báo lỗi', async () => {
    const user = userEvent.setup()
    const fake = fakeMonitoringBackend({
      transactions: [T100_DTO],
      callbacks: [
        callbackDto(1, {
          requestHeaders: { Authorization: '***', 'X-API-Key': '***', 'X-Request-Id': 'abc' },
          payloadJson: { transId: 'T100', note: 'không chứa khóa' },
        }),
        CB_REJECTED_DTO,
      ],
      services: SERVICES,
    })
    renderMonitoringApp('/transactions/THU_HO/T100')
    await screen.findAllByTestId('timeline-item')

    const headers = within(screen.getByTestId('headers-table'))
    expect(headers.getByText('X-API-Key')).toBeInTheDocument()
    expect(headers.getAllByText('(đã che)', { exact: false })).toHaveLength(2)
    expect(document.body.textContent).not.toContain(TEST_KEY)
    expect(screen.getByTestId('location').textContent).not.toContain(TEST_KEY)

    fake.state.down = true
    await user.click(screen.getByRole('button', { name: 'Tải lại' }))
    const banner = await screen.findByTestId('stale-banner')
    expect(banner.textContent).not.toContain(TEST_KEY)
    expect(JSON.stringify(fake.calls)).not.toContain(TEST_KEY)
  })
})
