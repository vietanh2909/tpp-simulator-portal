import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fakeMonitoringBackend } from '@/test/fixtures/fake-backend'
import {
  CB_MAPPING_ERROR_DTO,
  CB_REJECTED_DTO,
  CB_REJECTED_TEXT_DTO,
  CB_TIMESTAMP_ERROR_DTO,
  SLASH_TXN_DTO,
  T100_DTO,
  callbackDto,
} from '@/test/fixtures/monitoring'
import { CHI_HO_DTO, THU_HO_DTO } from '@/test/fixtures/services'
import { renderMonitoringApp } from '@/test/monitoring-app'

const THREE_RECEIPTS = [callbackDto(1), callbackDto(2), callbackDto(3)]
const SERVICES = [THU_HO_DTO, CHI_HO_DTO]

function timeline() {
  return screen.getAllByTestId('timeline-item')
}

function backend(extra: Parameters<typeof fakeMonitoringBackend>[0] = {}) {
  return fakeMonitoringBackend({
    transactions: [T100_DTO, SLASH_TXN_DTO],
    callbacks: [
      ...THREE_RECEIPTS,
      CB_MAPPING_ERROR_DTO,
      CB_REJECTED_DTO,
      CB_REJECTED_TEXT_DTO,
      // Tách khỏi giao dịch T100 để lịch sử của T100 chỉ có đúng ba lần nhận.
      { ...CB_TIMESTAMP_ERROR_DTO, transactionId: 'T-TS' },
      callbackDto(21, { transactionId: '2026/10/001', businessTimestamp: null, status: 'OK' }),
    ],
    services: SERVICES,
    ...extra,
  })
}

beforeEach(() => window.sessionStorage.clear())

describe('Chi tiết giao dịch', () => {
  it('giao dịch T100 có 3 callback thì hiện đủ 3 lần nhận theo thứ tự nhận, chọn sẵn lần gần nhất', async () => {
    backend()
    renderMonitoringApp('/transactions/THU_HO/T100')
    await screen.findAllByTestId('timeline-item')

    expect(timeline()).toHaveLength(3)
    expect(timeline().map((item) => item.textContent)).toEqual([
      expect.stringContaining('Lần nhận #1'),
      expect.stringContaining('Lần nhận #2'),
      expect.stringContaining('Lần nhận #3'),
    ])
    expect(timeline()[2]).toHaveTextContent('Gần nhất')
    expect(timeline()[2]).toHaveAttribute('aria-current', 'true')
    expect(timeline()[0]).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('heading', { name: 'T100' })).toBeInTheDocument()
  })

  it('mỗi lần nhận có payload, header đã che, mapping từng trường, response đã trả và phiên bản cấu hình', async () => {
    backend()
    renderMonitoringApp('/transactions/THU_HO/T100')
    await screen.findAllByTestId('timeline-item')

    expect(screen.getByRole('region', { name: 'Payload gốc' })).toHaveTextContent('"transId": "T100"')
    const headers = within(screen.getByTestId('headers-table'))
    expect(headers.getByText('Authorization')).toBeInTheDocument()
    expect(headers.getAllByText('***', { exact: false }).length).toBeGreaterThanOrEqual(2)
    expect(headers.getByText('abc')).toBeInTheDocument()
    const mapping = within(screen.getByTestId('mapping-table'))
    expect(mapping.getByText('T100')).toBeInTheDocument()
    expect(mapping.getByText('00')).toBeInTheDocument()
    expect(mapping.getByText('2026-10-19 10:24:00.000 GMT+7')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Nội dung response' })).toHaveTextContent('"ok": true')
    expect(screen.getByText('Cấu hình áp dụng: phiên bản 3')).toBeInTheDocument()
  })

  it('chọn lần nhận bằng bàn phím (Tab đến nút rồi Enter) đổi nội dung chi tiết và địa chỉ', async () => {
    const user = userEvent.setup()
    backend()
    renderMonitoringApp('/transactions/THU_HO/T100')
    await screen.findAllByTestId('timeline-item')

    timeline()[0]?.focus()
    await user.keyboard('{Enter}')

    expect(timeline()[0]).toHaveAttribute('aria-current', 'true')
    expect(screen.getByText('Callback #1', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('?callback=1')
  })

  it('"Có N callback mới" khi có lần nhận mới; lần đang chọn không tự nhảy; nút chọn lần mới nhất', async () => {
    const user = userEvent.setup()
    const fake = backend()
    renderMonitoringApp('/transactions/THU_HO/T100')
    await screen.findAllByTestId('timeline-item')
    expect(screen.queryByTestId('new-callbacks')).not.toBeInTheDocument()

    fake.state.callbacks.push(callbackDto(4))
    await user.click(screen.getByRole('button', { name: 'Tải lại' }))

    const notice = await screen.findByTestId('new-callbacks')
    expect(notice).toHaveTextContent('Có 1 callback mới')
    expect(timeline()).toHaveLength(4)
    expect(timeline()[2]).toHaveAttribute('aria-current', 'true')

    await user.click(within(notice).getByRole('button', { name: 'Xem lần nhận mới nhất' }))

    expect(timeline()[3]).toHaveAttribute('aria-current', 'true')
    expect(screen.queryByTestId('new-callbacks')).not.toBeInTheDocument()
  })

  it('callback đến sai thứ tự theo timestamp nghiệp vụ thì có cảnh báo, trạng thái vẫn theo thứ tự nhận', async () => {
    backend({
      callbacks: [
        callbackDto(1, { businessTimestamp: '2026-10-19T03:10:00Z' }),
        callbackDto(2, { businessTimestamp: '2026-10-19T03:05:00Z' }),
      ],
    })
    renderMonitoringApp('/transactions/THU_HO/T100')

    expect(await screen.findByText(/callback đến sai thứ tự/)).toBeInTheDocument()
  })

  it('transactionId có dấu "/" đi hết đường dẫn SPA và truy vấn API (2026/10/001)', async () => {
    const fake = backend()
    renderMonitoringApp('/transactions/THU_HO/2026%2F10%2F001')

    expect(await screen.findByRole('heading', { name: '2026/10/001' })).toBeInTheDocument()
    expect(fake.lastQuery('/api/transactions/detail').get('transactionId')).toBe('2026/10/001')
    expect(fake.lastQuery('/api/transactions/detail').get('serviceCode')).toBe('THU_HO')
  })

  it('từ danh sách bấm "Xem" giao dịch có "/" thì địa chỉ được mã hóa và chi tiết mở đúng', async () => {
    const user = userEvent.setup()
    backend()
    renderMonitoringApp('/transactions?txn=2026')
    await screen.findByTestId('transactions-table')

    await user.click(screen.getByRole('link', { name: 'Xem chi tiết giao dịch 2026/10/001 của THU_HO' }))

    expect(await screen.findByRole('heading', { name: '2026/10/001' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/transactions/THU_HO/2026%2F10%2F001')
  })

  it('giao dịch không tồn tại (404 TRANSACTION_NOT_FOUND) hiện "Không tìm thấy giao dịch"', async () => {
    backend()
    renderMonitoringApp('/transactions/THU_HO/KHONG_CO')

    expect(await screen.findByText('Không tìm thấy giao dịch')).toBeInTheDocument()
  })

  it('mở trực tiếp (không có danh sách trước đó) thì "Quay lại danh sách theo dõi" về /transactions', async () => {
    const user = userEvent.setup()
    backend()
    renderMonitoringApp('/transactions/THU_HO/T100')
    await screen.findAllByTestId('timeline-item')

    await user.click(screen.getByRole('button', { name: 'Quay lại danh sách theo dõi' }))

    await screen.findByTestId('transactions-table')
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/transactions$/)
  })

  it('lỗi khi tự cập nhật giữ nguyên chi tiết đang xem kèm banner và giờ cập nhật gần nhất', async () => {
    const user = userEvent.setup()
    const fake = backend()
    renderMonitoringApp('/transactions/THU_HO/T100')
    await screen.findAllByTestId('timeline-item')

    fake.state.down = true
    await user.click(screen.getByRole('button', { name: 'Tải lại' }))

    expect(await screen.findByTestId('stale-banner')).toHaveTextContent(/Đang hiển thị dữ liệu lúc \d{2}:\d{2}:\d{2}/)
    expect(timeline()).toHaveLength(3)
  })
})

describe('Chi tiết một lần nhận', () => {
  it('callback bị từ chối với body không phải JSON hiện văn bản gốc, mã HTTP và lý do', async () => {
    backend()
    renderMonitoringApp('/callbacks/10')
    await screen.findByTestId('callback-detail')

    expect(screen.getByRole('region', { name: 'Body văn bản gốc' })).toHaveTextContent('đây không phải JSON {')
    expect(screen.getByText('Body văn bản gốc (không phải JSON)')).toBeInTheDocument()
    expect(screen.getByTestId('rejected-note')).toHaveTextContent('JSON không hợp lệ')
    expect(screen.getByTestId('rejected-note')).toHaveTextContent('HTTP 400')
    expect(screen.getAllByText('400 Bad Request').length).toBeGreaterThan(0)
  })

  it('callback bị từ chối vì sai khóa: lý do bằng chữ, chưa chạy mapping, header đã che, response 401', async () => {
    backend()
    renderMonitoringApp('/callbacks/9')
    await screen.findByTestId('callback-detail')

    expect(screen.getByTestId('rejected-note')).toHaveTextContent('Sai API key')
    expect(screen.getByTestId('mapping-not-run')).toHaveTextContent('Chưa chạy mapping vì request bị từ chối')
    expect(screen.queryByTestId('mapping-table')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Nội dung response' })).toHaveTextContent('INVALID_API_KEY')
    expect(screen.getByText('Callback bị từ chối nên không thuộc giao dịch nào.')).toBeInTheDocument()
  })

  it('callback lỗi mapping thiếu transactionId có cảnh báo, mã lỗi và thông báo của trường', async () => {
    backend()
    renderMonitoringApp('/callbacks/8')
    await screen.findByTestId('callback-detail')

    expect(screen.getByText('Callback không lấy được transactionId')).toBeInTheDocument()
    const mapping = within(screen.getByTestId('mapping-table'))
    expect(mapping.getByText('NOT_FOUND')).toBeInTheDocument()
    expect(mapping.getByText('Không tìm thấy giá trị tại $.processId.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Xem giao dịch/ })).not.toBeInTheDocument()
  })

  it('lỗi timestamp cùng phiên bản cấu hình: hiện thông báo lỗi và giá trị gốc theo đường dẫn hiện tại của dịch vụ', async () => {
    backend()
    renderMonitoringApp('/callbacks/11')
    await screen.findByTestId('callback-detail')

    expect(screen.getAllByText('Không đọc được theo định dạng đã cấu hình.').length).toBeGreaterThan(0)
    const raw = await screen.findByText(/Giá trị gốc:/)
    expect(raw).toHaveTextContent('19/10/2026 10:24')
    expect(raw).toHaveTextContent('đọc theo đường dẫn hiện tại của dịch vụ')
  })

  it('lỗi timestamp khác phiên bản cấu hình thì chỉ xuống payload bên dưới, không bịa giá trị gốc', async () => {
    backend({ services: [{ ...THU_HO_DTO, currentVersionNumber: 4 }] })
    renderMonitoringApp('/callbacks/11')
    await screen.findByTestId('callback-detail')

    const raw = await screen.findByTestId('timestamp-raw')
    expect(raw).toHaveTextContent('xem giá trị trong payload bên dưới')
    expect(raw).not.toHaveTextContent('19/10/2026 10:24')
  })

  it('lỗi timestamp của dịch vụ đã xóa (không đọc được dịch vụ) cũng chỉ xuống payload', async () => {
    backend({ services: [] })
    renderMonitoringApp('/callbacks/11')
    await screen.findByTestId('callback-detail')

    expect(await screen.findByTestId('timestamp-raw')).toHaveTextContent('xem giá trị trong payload bên dưới')
  })

  it('có liên kết "Xem giao dịch" tới đúng giao dịch và lần nhận khi callback có transactionId', async () => {
    backend()
    renderMonitoringApp('/callbacks/1')
    await screen.findByTestId('callback-detail')

    expect(screen.getByRole('link', { name: /Xem giao dịch T100/ })).toHaveAttribute(
      'href',
      '/transactions/THU_HO/T100?callback=1',
    )
  })

  it('recordId không phải số thì hiện "Không tìm thấy callback" mà không gọi API', async () => {
    const fake = backend()
    renderMonitoringApp('/callbacks/abc')

    expect(await screen.findByText('Không tìm thấy callback')).toBeInTheDocument()
    expect(fake.callsTo('/api/callbacks')).toHaveLength(0)
  })

  it('callback không tồn tại (404 CALLBACK_NOT_FOUND) hiện "Không tìm thấy callback"', async () => {
    backend()
    renderMonitoringApp('/callbacks/9999')

    expect(await screen.findByText('Không tìm thấy callback')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Đang tải chi tiết callback...')).not.toBeInTheDocument())
  })
})
