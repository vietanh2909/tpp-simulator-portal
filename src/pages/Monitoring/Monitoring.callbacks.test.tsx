import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fakeMonitoringBackend } from '@/test/fixtures/fake-backend'
import {
  CB_MAPPING_ERROR_DTO,
  CB_REJECTED_DTO,
  CB_REJECTED_TEXT_DTO,
  callbackDto,
  makeCallbacks,
} from '@/test/fixtures/monitoring'
import { CHI_HO_DTO, DA_XOA_DTO, THU_HO_DTO } from '@/test/fixtures/services'
import { renderMonitoringApp } from '@/test/monitoring-app'

const SERVICES = [THU_HO_DTO, CHI_HO_DTO, DA_XOA_DTO]
const THREE_KINDS = [callbackDto(7), CB_MAPPING_ERROR_DTO, CB_REJECTED_DTO]

function callbackRows() {
  return within(screen.getByTestId('callbacks-table')).getAllByRole('row').slice(1)
}

async function openCallbacks(entry = '/transactions?tab=callbacks') {
  renderMonitoringApp(entry)
  return screen.findByTestId('callbacks-table')
}

async function apply(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
}

beforeEach(() => window.sessionStorage.clear())

describe('Màn hình theo dõi: tab Tất cả callback', () => {
  it('có cả callback thành công, lỗi mapping thiếu transactionId và bị từ chối 401, mỗi lần nhận một dòng', async () => {
    fakeMonitoringBackend({ callbacks: THREE_KINDS, services: SERVICES })
    await openCallbacks()

    expect(callbackRows()).toHaveLength(3)
    const text = callbackRows().map((row) => row.textContent ?? '')
    expect(text.some((cell) => cell.includes('Thành công'))).toBe(true)
    expect(text.some((cell) => cell.includes('Lỗi mapping'))).toBe(true)
    expect(text.some((cell) => cell.includes('Bị từ chối'))).toBe(true)
  })

  it('mỗi dòng có dịch vụ, transactionId (nếu có), thời điểm nhận, mã HTTP đã trả và kết quả xử lý kèm lý do', async () => {
    fakeMonitoringBackend({ callbacks: THREE_KINDS, services: SERVICES })
    await openCallbacks()

    for (const name of ['Nhận lúc', 'Dịch vụ', 'transactionId', 'Status nghiệp vụ', 'Kết quả xử lý', 'HTTP đã trả']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
    }
    const rejected = callbackRows().find((row) => within(row).queryByText('#9')) as HTMLElement
    expect(within(rejected).getByText('Bị từ chối')).toBeInTheDocument()
    expect(within(rejected).getByText('Sai API key')).toBeInTheDocument()
    expect(within(rejected).getByText('401 Unauthorized')).toBeInTheDocument()
    const mappingError = callbackRows().find((row) => within(row).queryByText('#8')) as HTMLElement
    expect(within(mappingError).getByText('Không lấy được transactionId')).toBeInTheDocument()
    const ok = callbackRows().find((row) => within(row).queryByText('#7')) as HTMLElement
    expect(within(ok).getByText('T100')).toBeInTheDocument()
    expect(within(ok).getByText('2026-10-19 10:27:15')).toBeInTheDocument()
  })

  it('chỉ tab đang xem được tải: tab Giao dịch không gọi /api/callbacks và ngược lại', async () => {
    const backend = fakeMonitoringBackend({ callbacks: THREE_KINDS, services: SERVICES })
    await openCallbacks()

    expect(backend.callsTo('/api/callbacks').length).toBeGreaterThan(0)
    expect(backend.callsTo('/api/transactions')).toHaveLength(0)
  })

  it('mới nhất trước, 20 dòng mặc định và phân trang như danh sách giao dịch', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ callbacks: makeCallbacks(25), services: SERVICES })
    await openCallbacks()

    expect(callbackRows()).toHaveLength(20)
    expect(within(callbackRows()[0] as HTMLElement).getByText('#25')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Trang 2 trên 2' }))

    await waitFor(() => expect(callbackRows()).toHaveLength(5))
    expect(within(callbackRows()[0] as HTMLElement).getByText('#5')).toBeInTheDocument()
  })

  it('không có ô Status ở tab này; có "Kết quả xử lý" và "Lý do" chỉ khi chọn "Bị từ chối"', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ callbacks: THREE_KINDS, services: SERVICES })
    await openCallbacks()

    expect(screen.queryByLabelText('Status (chứa chuỗi)')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Lý do')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Kết quả xử lý'), 'Thành công')
    expect(screen.queryByLabelText('Lý do')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Kết quả xử lý'), 'Bị từ chối')

    const reasons = within(screen.getByLabelText('Lý do'))
    expect(reasons.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Tất cả lý do',
      'Sai API key',
      'Thiếu API key',
      'JSON không hợp lệ',
      'Content-Type không hỗ trợ',
      'Dịch vụ đang tắt',
      'Dịch vụ đã xóa',
    ])
  })

  it('lọc "Bị từ chối" kèm lý do chỉ ra đúng callback bị từ chối với lý do đó', async () => {
    const user = userEvent.setup()
    const backend = fakeMonitoringBackend({
      callbacks: [...THREE_KINDS, CB_REJECTED_TEXT_DTO],
      services: SERVICES,
    })
    await openCallbacks()
    expect(callbackRows()).toHaveLength(4)

    await user.selectOptions(screen.getByLabelText('Kết quả xử lý'), 'Bị từ chối')
    await apply(user)
    await waitFor(() => expect(callbackRows()).toHaveLength(2))
    expect(callbackRows().every((row) => row.textContent?.includes('Bị từ chối'))).toBe(true)

    await user.selectOptions(screen.getByLabelText('Lý do'), 'JSON không hợp lệ')
    await apply(user)

    await waitFor(() => expect(callbackRows()).toHaveLength(1))
    expect(within(callbackRows()[0] as HTMLElement).getByText('JSON không hợp lệ')).toBeInTheDocument()
    const query = backend.lastQuery('/api/callbacks')
    expect(query.get('outcome')).toBe('REJECTED')
    expect(query.get('rejectionReason')).toBe('INVALID_JSON')
  })

  it('đổi "Kết quả xử lý" khỏi "Bị từ chối" bỏ lý do đã chọn, không gửi rejectionReason', async () => {
    const user = userEvent.setup()
    const backend = fakeMonitoringBackend({ callbacks: THREE_KINDS, services: SERVICES })
    await openCallbacks('/transactions?tab=callbacks&outcome=REJECTED&reason=INVALID_API_KEY')
    await waitFor(() => expect(callbackRows()).toHaveLength(1))

    await user.selectOptions(screen.getByLabelText('Kết quả xử lý'), 'Lỗi mapping')
    await apply(user)

    await waitFor(() => expect(within(callbackRows()[0] as HTMLElement).getByText('#8')).toBeInTheDocument())
    expect(backend.lastQuery('/api/callbacks').has('rejectionReason')).toBe(false)
    expect(screen.getByTestId('location')).not.toHaveTextContent('reason=')
  })

  it('lọc dịch vụ và transactionId cùng lúc chỉ ra dòng thỏa cả hai điều kiện', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({
      callbacks: [
        callbackDto(1, { serviceCode: 'THU_HO', transactionId: 'ABC-1' }),
        callbackDto(2, { serviceCode: 'CHI_HO', transactionId: 'ABC-2' }),
        callbackDto(3, { serviceCode: 'THU_HO', transactionId: 'XYZ-3' }),
      ],
      services: SERVICES,
    })
    await openCallbacks()
    await waitFor(() => expect(callbackRows()).toHaveLength(3))

    await waitFor(() =>
      expect(within(screen.getByLabelText('Dịch vụ tích hợp')).getAllByRole('option').length).toBeGreaterThan(1),
    )
    await user.selectOptions(screen.getByLabelText('Dịch vụ tích hợp'), 'THU_HO')
    fireEvent.change(screen.getByLabelText('Mã giao dịch (transactionId)'), { target: { value: 'abc' } })
    await apply(user)

    await waitFor(() => expect(callbackRows()).toHaveLength(1))
    expect(within(callbackRows()[0] as HTMLElement).getByText('ABC-1')).toBeInTheDocument()
  })

  it('lọc "Lỗi mapping" chỉ ra callback lỗi mapping', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ callbacks: THREE_KINDS, services: SERVICES })
    await openCallbacks()

    await user.selectOptions(screen.getByLabelText('Kết quả xử lý'), 'Lỗi mapping')
    await apply(user)

    await waitFor(() => expect(callbackRows()).toHaveLength(1))
    expect(within(callbackRows()[0] as HTMLElement).getByText('#8')).toBeInTheDocument()
  })

  it('bộ lọc không khớp hiện "Không có dữ liệu khớp bộ lọc", khác với chưa có dữ liệu', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ callbacks: THREE_KINDS, services: SERVICES })
    await openCallbacks()

    fireEvent.change(screen.getByLabelText('Mã giao dịch (transactionId)'), { target: { value: 'khong-co' } })
    await apply(user)

    expect(await screen.findByText('Không có dữ liệu khớp bộ lọc')).toBeInTheDocument()
    expect(screen.queryByText('Chưa nhận callback nào')).not.toBeInTheDocument()
  })

  it('chưa có callback nào hiện "Chưa nhận callback nào"', async () => {
    fakeMonitoringBackend({ callbacks: [], services: SERVICES })
    renderMonitoringApp('/transactions?tab=callbacks')

    expect(await screen.findByText('Chưa nhận callback nào')).toBeInTheDocument()
  })

  it('bấm "Xem" mở trang chi tiết callback theo recordId và quay lại giữ tab và bộ lọc', async () => {
    const user = userEvent.setup()
    fakeMonitoringBackend({ callbacks: THREE_KINDS, services: SERVICES })
    await openCallbacks('/transactions?tab=callbacks&service=CHI_HO')
    await waitFor(() => expect(callbackRows()).toHaveLength(1))

    await user.click(screen.getByRole('link', { name: 'Xem chi tiết callback #8 của CHI_HO' }))
    await screen.findByText('Chi tiết callback')
    expect(screen.getByTestId('location')).toHaveTextContent('/callbacks/8')

    await user.click(screen.getByRole('button', { name: 'Quay lại danh sách theo dõi' }))

    await screen.findByTestId('callbacks-table')
    expect(screen.getByTestId('location')).toHaveTextContent('/transactions?tab=callbacks&service=CHI_HO')
  })
})
