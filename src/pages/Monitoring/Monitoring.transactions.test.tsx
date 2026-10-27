import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fakeMonitoringBackend } from '@/test/fixtures/fake-backend'
import {
  DELETED_TXN_DTO,
  SLASH_TXN_DTO,
  T100_DTO,
  T200_DTO,
  callbackDto,
  makeTransactions,
} from '@/test/fixtures/monitoring'
import { CHI_HO_DTO, DA_XOA_DTO, THU_HO_DTO } from '@/test/fixtures/services'
import { renderMonitoringApp } from '@/test/monitoring-app'

const SERVICES = [THU_HO_DTO, CHI_HO_DTO, DA_XOA_DTO]

function tableRows() {
  return within(screen.getByTestId('transactions-table')).getAllByRole('row').slice(1)
}

async function openTable() {
  return screen.findByTestId('transactions-table')
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

async function apply(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
}

beforeEach(() => window.sessionStorage.clear())

describe('Màn hình theo dõi: tab Giao dịch', () => {
  it('mở trang là tab "Giao dịch", trang 1, 20 dòng, tự cập nhật đang bật', async () => {
    const backend = fakeMonitoringBackend({ transactions: makeTransactions(25), services: SERVICES })
    renderMonitoringApp('/transactions')
    await openTable()

    expect(screen.getByRole('tab', { name: /Giao dịch/ })).toHaveAttribute('aria-selected', 'true')
    expect(tableRows()).toHaveLength(20)
    expect(screen.getByRole('switch', { name: 'Tự cập nhật mỗi 5 giây' })).toHaveAttribute('aria-checked', 'true')
    expect(backend.lastQuery('/api/transactions').get('page')).toBe('1')
    expect(backend.lastQuery('/api/transactions').get('size')).toBe('20')
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/transactions$/)
  })

  it('đủ cột của AC3.1.1 và status nghiệp vụ luôn trung tính, kể cả 00 hay FAILED', async () => {
    fakeMonitoringBackend({
      transactions: [T100_DTO, { ...T200_DTO, latestStatus: 'FAILED' }],
      services: SERVICES,
    })
    renderMonitoringApp('/transactions')
    await openTable()

    for (const name of [
      'Dịch vụ',
      'transactionId',
      'Status nhận gần nhất',
      'Timestamp nghiệp vụ',
      'Nhận gần nhất',
      'Số callback',
      'Thao tác',
    ]) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
    }
    const row = tableRows().find((item) => within(item).queryByText('T100')) as HTMLElement
    expect(within(row).getByText('THU_HO')).toBeInTheDocument()
    expect(within(row).getByText('2026-10-19 10:24:00')).toBeInTheDocument()
    expect(within(row).getByText('10:24:15')).toBeInTheDocument()
    expect(within(row).getByText('3 callback')).toBeInTheDocument()
    expect(within(row).getByText('00').className).toContain('bg-slate-50')
    const failed = screen.getByText('FAILED')
    expect(failed.className).toBe(within(row).getByText('00').className)
  })

  it('thiếu status: ô status có chữ "Thiếu status" và dấu "Lỗi mapping", dịch vụ đã xóa có "(đã xóa)"', async () => {
    fakeMonitoringBackend({ transactions: [DELETED_TXN_DTO], services: SERVICES })
    renderMonitoringApp('/transactions')
    await openTable()

    const [row] = tableRows() as [HTMLElement]
    expect(within(row).getByText('Thiếu status')).toBeInTheDocument()
    expect(within(row).getByText('Lỗi mapping')).toBeInTheDocument()
    expect(within(row).getByText('(đã xóa)')).toBeInTheDocument()
    expect(within(row).getByText('Không có timestamp nghiệp vụ')).toBeInTheDocument()
  })

  it('lọc transactionId "t1" chỉ ra T100 (chứa chuỗi, không phân biệt hoa thường)', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ transactions: [T100_DTO, T200_DTO], services: SERVICES })
    renderMonitoringApp('/transactions')
    await openTable()

    type('Mã giao dịch (transactionId)', 't1')
    await apply(user)

    await waitFor(() => expect(tableRows()).toHaveLength(1))
    expect(within(tableRows()[0] as HTMLElement).getByText('T100')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('txn=t1')
    expect(screen.getByTestId('active-filters')).toHaveTextContent('transactionId chứa "t1"')
  })

  it('Status là ô chữ: lọc "0" ra cả "00" và "10"', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ transactions: [T100_DTO, T200_DTO, SLASH_TXN_DTO], services: SERVICES })
    renderMonitoringApp('/transactions')
    await openTable()
    expect(screen.queryByRole('button', { name: /Tất cả \(/ })).not.toBeInTheDocument()

    type('Status (chứa chuỗi)', '0')
    await apply(user)

    await waitFor(() => expect(tableRows()).toHaveLength(2))
    expect(screen.getByText('T200')).toBeInTheDocument()
    expect(screen.getByText('T100')).toBeInTheDocument()
    expect(screen.queryByText('2026/10/001')).not.toBeInTheDocument()
  })

  it('bộ lọc dịch vụ có dịch vụ đã xóa kèm chữ "(đã xóa)" và gọi includeDeleted=true', async () => {
    const backend = fakeMonitoringBackend({ transactions: [T100_DTO], services: SERVICES })
    renderMonitoringApp('/transactions')
    await openTable()

    const select = screen.getByLabelText('Dịch vụ tích hợp')
    await waitFor(() => expect(within(select).getByRole('option', { name: /DA_XOA.*\(đã xóa\)/ })).toBeInTheDocument())
    expect(backend.callsTo('/api/services')[0]?.url).toBe('/api/services?includeDeleted=true')
    expect(within(select).getByRole('option', { name: 'THU_HO (Thu hộ)' })).toBeInTheDocument()
  })

  it('lọc khoảng thời gian chính xác tới giây, gồm cả hai đầu (10:00:00 và 11:00:00 GMT+7)', async () => {
    const user = userEvent.setup()
    const at = (latestReceivedAt: string, transactionId: string) => ({ ...T100_DTO, transactionId, latestReceivedAt })
    const backend = fakeMonitoringBackend({
      transactions: [
        at('2026-10-19T03:00:00Z', 'AT-10'),
        at('2026-10-19T04:00:00Z', 'AT-11'),
        at('2026-10-19T04:00:01Z', 'AFTER'),
        at('2026-10-19T02:59:59Z', 'BEFORE'),
      ],
      services: SERVICES,
    })
    renderMonitoringApp('/transactions')
    await openTable()

    await user.selectOptions(screen.getByLabelText('Khung giờ nhận (GMT+7)'), 'Tùy chọn (GMT+7)...')
    type('Nhận từ (GMT+7)', '2026-10-19 10:00:00')
    type('Nhận đến (GMT+7)', '2026-10-19 11:00:00')
    await apply(user)

    await waitFor(() => expect(tableRows()).toHaveLength(2))
    expect(screen.getByText('AT-10')).toBeInTheDocument()
    expect(screen.getByText('AT-11')).toBeInTheDocument()
    const query = backend.lastQuery('/api/transactions')
    expect(query.get('receivedFrom')).toBe('2026-10-19T03:00:00Z')
    expect(query.get('receivedTo')).toBe('2026-10-19T04:00:00Z')
  })

  it('ô thời gian sai dạng hoặc "Từ" sau "Đến" báo lỗi bằng chữ cạnh ô và không gọi server', async () => {
    const user = userEvent.setup()
    const backend = fakeMonitoringBackend({ transactions: [T100_DTO], services: SERVICES })
    renderMonitoringApp('/transactions')
    await openTable()
    await user.selectOptions(screen.getByLabelText('Khung giờ nhận (GMT+7)'), 'Tùy chọn (GMT+7)...')
    const callsBefore = backend.callsTo('/api/transactions').length

    type('Nhận từ (GMT+7)', 'hôm qua')
    await apply(user)
    expect(await screen.findByText('Nhập theo dạng yyyy-MM-dd HH:mm:ss.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nhận từ (GMT+7)')).toHaveAttribute('aria-invalid', 'true')

    type('Nhận từ (GMT+7)', '2026-10-19 12:00:00')
    type('Nhận đến (GMT+7)', '2026-10-19 11:00:00')
    await apply(user)
    expect(await screen.findByText('Thời gian bắt đầu phải trước thời gian kết thúc.')).toBeInTheDocument()
    expect(backend.callsTo('/api/transactions').length).toBe(callsBefore)
  })

  it('phân trang: 25 giao dịch thì trang 1 có 20 dòng và trang 2 có 5 dòng', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ transactions: makeTransactions(25), services: SERVICES })
    renderMonitoringApp('/transactions')
    await openTable()
    expect(tableRows()).toHaveLength(20)
    expect(screen.getByRole('tab', { name: /Giao dịch/ })).toHaveTextContent('25')

    await user.click(screen.getByRole('button', { name: 'Trang 2 trên 2' }))

    await waitFor(() => expect(tableRows()).toHaveLength(5))
    expect(screen.getByTestId('location')).toHaveTextContent('page=2')
  })

  it('chọn 50 dòng mỗi trang: lựa chọn chỉ gồm 20, 50, 100 và trang 1 có 50 dòng khi có 60 giao dịch', async () => {
    const user = userEvent.setup()
    const backend = fakeMonitoringBackend({ transactions: makeTransactions(60), services: SERVICES })
    renderMonitoringApp('/transactions')
    await openTable()

    const select = screen.getByLabelText('Dòng mỗi trang')
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['20', '50', '100'])
    await user.selectOptions(select, '50')

    await waitFor(() => expect(tableRows()).toHaveLength(50))
    expect(backend.lastQuery('/api/transactions').get('size')).toBe('50')
    expect(screen.getByTestId('location')).toHaveTextContent('size=50')
  })

  it('size không hợp lệ trên địa chỉ được quy về 20, không gửi 10 lên server', async () => {
    const backend = fakeMonitoringBackend({ transactions: makeTransactions(5), services: SERVICES })
    renderMonitoringApp('/transactions?size=10')
    await openTable()

    expect(backend.lastQuery('/api/transactions').get('size')).toBe('20')
  })

  it('100 dòng hiện đủ ngay khi API trả về, không có độ trễ nhân tạo', async () => {
    fakeMonitoringBackend({ transactions: makeTransactions(100), services: SERVICES })
    renderMonitoringApp('/transactions?size=100')

    await openTable()

    // Khẳng định đồng bộ ngay sau khi bảng xuất hiện: không có timer hay bước chờ nào nữa.
    expect(tableRows()).toHaveLength(100)
    expect(screen.getByText('Hiển thị', { exact: false })).toHaveTextContent('1 - 100')
  })

  it('ba thông báo rỗng khác nhau: chưa có dữ liệu, không khớp bộ lọc, lỗi tải', async () => {
    const user = userEvent.setup()
    const backend = fakeMonitoringBackend({ transactions: [], services: SERVICES })
    renderMonitoringApp('/transactions')
    expect(await screen.findByText('Chưa có giao dịch nào')).toBeInTheDocument()

    type('Mã giao dịch (transactionId)', 'khong-co')
    await apply(user)
    expect(await screen.findByText('Không có dữ liệu khớp bộ lọc')).toBeInTheDocument()
    expect(screen.queryByText('Chưa có giao dịch nào')).not.toBeInTheDocument()

    backend.state.down = true
    await user.click(screen.getByRole('button', { name: 'Tải lại' }))
    // Đã có dữ liệu (rỗng) của lần trước nên hiện banner giữ dữ liệu cũ, không phải màn hình lỗi toàn trang.
    expect(await screen.findByTestId('stale-banner')).toBeInTheDocument()
  })

  it('lỗi tải lần đầu hiện thông báo lỗi có nút thử lại, khác với trạng thái trống', async () => {
    const user = userEvent.setup()
    const backend = fakeMonitoringBackend({ transactions: makeTransactions(3), services: SERVICES })
    backend.state.down = true
    renderMonitoringApp('/transactions')

    expect(await screen.findByText('Không tải được dữ liệu')).toBeInTheDocument()
    expect(screen.queryByText('Chưa có giao dịch nào')).not.toBeInTheDocument()
    backend.state.down = false
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await openTable()).toBeInTheDocument()
  })

  it('"Xóa bộ lọc" ở trạng thái không khớp đưa danh sách về đầy đủ', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ transactions: [T100_DTO, T200_DTO], services: SERVICES })
    renderMonitoringApp('/transactions?txn=khong-co')
    await screen.findByText('Không có dữ liệu khớp bộ lọc')

    const empty = screen.getByText('Không có dữ liệu khớp bộ lọc').parentElement as HTMLElement
    await user.click(within(empty).getByRole('button', { name: 'Xóa bộ lọc' }))

    await waitFor(() => expect(tableRows()).toHaveLength(2))
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/transactions$/)
  })

  it('"Xóa bộ lọc" trên thanh bộ lọc xóa cả ô đang gõ chưa áp dụng và lỗi thời gian, dù bộ lọc đã áp dụng là mặc định', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ transactions: [T100_DTO, T200_DTO], services: SERVICES })
    renderMonitoringApp('/transactions')
    await openTable()
    await user.selectOptions(screen.getByLabelText('Khung giờ nhận (GMT+7)'), 'Tùy chọn (GMT+7)...')
    type('Mã giao dịch (transactionId)', 'dang-go-do')
    type('Nhận từ (GMT+7)', 'hôm qua')
    await apply(user)
    expect(await screen.findByText('Nhập theo dạng yyyy-MM-dd HH:mm:ss.')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/transactions$/)

    await user.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))

    await waitFor(() => expect(screen.getByLabelText('Mã giao dịch (transactionId)')).toHaveValue(''))
    expect(screen.queryByText('Nhập theo dạng yyyy-MM-dd HH:mm:ss.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Khung giờ nhận (GMT+7)')).toHaveValue('all')
    expect(screen.queryByLabelText('Nhận từ (GMT+7)')).not.toBeInTheDocument()
    expect(tableRows()).toHaveLength(2)
  })

  it('chọn "Tùy chọn" rồi áp dụng khi để trống cả hai ô không coi là đang lọc: cơ sở dữ liệu trống vẫn là "Chưa có giao dịch nào"', async () => {
    const user = userEvent.setup()
    const backend = fakeMonitoringBackend({ transactions: [], services: SERVICES })
    renderMonitoringApp('/transactions')
    expect(await screen.findByText('Chưa có giao dịch nào')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Khung giờ nhận (GMT+7)'), 'Tùy chọn (GMT+7)...')
    const callsBefore = backend.callsTo('/api/transactions').length

    await apply(user)

    await waitFor(() => expect(backend.callsTo('/api/transactions')).toHaveLength(callsBefore + 1))
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/transactions$/)
    expect(await screen.findByText('Chưa có giao dịch nào')).toBeInTheDocument()
    expect(screen.queryByText('Không có dữ liệu khớp bộ lọc')).not.toBeInTheDocument()
    expect(screen.queryByTestId('active-filters')).not.toBeInTheDocument()
  })

  it('lỗi khi tải lại giữ dữ liệu cũ kèm giờ cập nhật; tải lại thành công thì banner mất', async () => {
    const user = userEvent.setup()
    const backend = fakeMonitoringBackend({ transactions: [T100_DTO, T200_DTO], services: SERVICES })
    renderMonitoringApp('/transactions')
    await openTable()

    backend.state.down = true
    await user.click(screen.getByRole('button', { name: 'Tải lại' }))
    const banner = await screen.findByTestId('stale-banner')

    expect(banner).toHaveTextContent(/Không cập nhật được\. Đang hiển thị dữ liệu lúc \d{2}:\d{2}:\d{2} \(GMT\+7\)\./)
    expect(tableRows()).toHaveLength(2)
    backend.state.down = false
    await user.click(screen.getByRole('button', { name: 'Tải lại' }))

    await waitFor(() => expect(screen.queryByTestId('stale-banner')).not.toBeInTheDocument())
    expect(tableRows()).toHaveLength(2)
  })

  it('chuyển tab giữ bộ lọc riêng của từng tab', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({
      transactions: [T100_DTO, T200_DTO],
      callbacks: [callbackDto(1), callbackDto(2, { outcome: 'MAPPING_ERROR' })],
      services: SERVICES,
    })
    renderMonitoringApp('/transactions')
    await openTable()
    type('Mã giao dịch (transactionId)', 'T1')
    await apply(user)
    await waitFor(() => expect(tableRows()).toHaveLength(1))

    await user.click(screen.getByRole('tab', { name: /Tất cả callback/ }))
    await screen.findByTestId('callbacks-table')
    expect(screen.getByLabelText('Mã giao dịch (transactionId)')).toHaveValue('')
    expect(screen.getByTestId('location')).toHaveTextContent('tab=callbacks')
    await user.selectOptions(screen.getByLabelText('Kết quả xử lý'), 'Lỗi mapping')
    await apply(user)
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('outcome=MAPPING_ERROR'))

    await user.click(screen.getByRole('tab', { name: /Giao dịch/ }))
    await openTable()
    expect(screen.getByLabelText('Mã giao dịch (transactionId)')).toHaveValue('T1')
    expect(screen.getByTestId('location')).not.toHaveTextContent('tab=callbacks')

    await user.click(screen.getByRole('tab', { name: /Tất cả callback/ }))
    await screen.findByTestId('callbacks-table')
    expect(screen.getByLabelText('Kết quả xử lý')).toHaveValue('MAPPING_ERROR')
  })

  it('điều hướng sang chi tiết rồi quay lại giữ nguyên bộ lọc và trang', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({
      transactions: makeTransactions(25),
      callbacks: [callbackDto(1, { transactionId: 'TX021' })],
      services: SERVICES,
    })
    renderMonitoringApp('/transactions?txn=TX&page=2')
    await openTable()
    await waitFor(() => expect(tableRows()).toHaveLength(5))

    await user.click(screen.getByRole('link', { name: 'Xem chi tiết giao dịch TX021 của THU_HO' }))
    await screen.findByText('Chi tiết giao dịch')
    expect(screen.getByTestId('location')).toHaveTextContent('/transactions/THU_HO/TX021')

    await user.click(screen.getByRole('button', { name: 'Quay lại danh sách theo dõi' }))

    await openTable()
    expect(screen.getByTestId('location')).toHaveTextContent('/transactions?txn=TX&page=2')
    await waitFor(() => expect(tableRows()).toHaveLength(5))
    expect(screen.getByLabelText('Mã giao dịch (transactionId)')).toHaveValue('TX')
  })

  it('liên kết từ trang gửi thử ?tab=callbacks&service=THU_HO mở tab callback đã lọc theo dịch vụ', async () => {
    const backend = fakeMonitoringBackend({
      callbacks: [callbackDto(1), callbackDto(2, { serviceCode: 'CHI_HO' })],
      services: SERVICES,
    })
    renderMonitoringApp('/transactions?tab=callbacks&service=THU_HO')

    await screen.findByTestId('callbacks-table')

    expect(screen.getByRole('tab', { name: /Tất cả callback/ })).toHaveAttribute('aria-selected', 'true')
    expect(backend.lastQuery('/api/callbacks').get('serviceCode')).toBe('THU_HO')
    expect(within(screen.getByTestId('callbacks-table')).getAllByRole('row').slice(1)).toHaveLength(1)
    expect(backend.callsTo('/api/transactions')).toHaveLength(0)
  })

  it('giữ nguyên thứ tự backend trả về, ổn định giữa các lần tải (hai giao dịch cùng thời điểm nhận gần nhất)', async () => {
    const user = userEvent.setup()
    const same = '2026-10-19T03:00:00Z'
    fakeMonitoringBackend({
      transactions: [
        { ...T100_DTO, transactionId: 'SAME-B', latestReceivedAt: same, latestCallbackId: 8 },
        { ...T100_DTO, transactionId: 'SAME-A', latestReceivedAt: same, latestCallbackId: 9 },
      ],
      services: SERVICES,
    })
    renderMonitoringApp('/transactions')
    await openTable()
    const order = () => tableRows().map((row) => within(row).getAllByRole('cell')[1]?.textContent)

    expect(order()).toEqual(['SAME-A', 'SAME-B'])
    await user.click(screen.getByRole('button', { name: 'Tải lại' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tải lại' })).toBeEnabled())

    expect(order()).toEqual(['SAME-A', 'SAME-B'])
  })

  it('Enter trong ô lọc áp dụng bộ lọc mà không cần bấm nút', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ transactions: [T100_DTO, T200_DTO], services: SERVICES })
    renderMonitoringApp('/transactions')
    await openTable()

    await user.type(screen.getByLabelText('Mã giao dịch (transactionId)'), 'T2{Enter}')

    await waitFor(() => expect(tableRows()).toHaveLength(1))
  })
})
