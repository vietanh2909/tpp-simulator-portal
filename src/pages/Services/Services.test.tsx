import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BIEN_DONG_DTO, CHI_HO_DTO, DA_XOA_DTO, THU_HO_DTO } from '@/test/fixtures/services'
import { errorResponse, jsonResponse, routeFetch } from '@/test/http'
import { renderPage } from '@/test/render'
import type { ServiceDto } from '@/features/callback-services/types/callback-services.types'
import ServicesPage from './index'

function renderServices(services: ServiceDto[] = [THU_HO_DTO, CHI_HO_DTO, BIEN_DONG_DTO]) {
  let current = [...services]
  const api = routeFetch({
    'GET /api/services': () => jsonResponse(200, current),
    'PUT /api/services/THU_HO/enabled': (call) => {
      const enabled = (JSON.parse(call.body ?? '{}') as { enabled: boolean }).enabled
      current = current.map((s) => (s.serviceCode === 'THU_HO' ? { ...s, enabled } : s))
      return jsonResponse(
        200,
        current.find((s) => s.serviceCode === 'THU_HO'),
      )
    },
    'DELETE /api/services/CHI_HO': () => {
      current = current.filter((s) => s.serviceCode !== 'CHI_HO')
      return new Response(null, { status: 204 })
    },
  })
  const view = renderPage(<ServicesPage />, { path: '/services' })
  return { ...api, ...view }
}

async function rowFor(code: string) {
  const cell = await screen.findByText(code, { selector: 'td span' })
  const row = cell.closest('tr')
  if (!row) throw new Error(`Không thấy dòng ${code}`)
  return row
}

describe('Danh sách dịch vụ', () => {
  it('hiện đủ cột và mỗi dòng có mã, tên, mô tả, URL callback, kiểu xác thực, trạng thái; không có dịch vụ đã xóa', async () => {
    renderServices([THU_HO_DTO, CHI_HO_DTO, DA_XOA_DTO])

    const thuHo = await rowFor('THU_HO')
    for (const header of [
      'Mã dịch vụ',
      'Tên dịch vụ',
      'URL callback (endpoint)',
      'Xác thực',
      'Hoạt động',
      'Thao tác',
    ]) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    expect(within(thuHo).getByText('Thu hộ')).toBeInTheDocument()
    expect(within(thuHo).getByText('Nhận kết quả thu hộ từ ngân hàng')).toBeInTheDocument()
    expect(within(thuHo).getByText(`${window.location.origin}/callbacks/THU_HO`)).toBeInTheDocument()
    expect(within(thuHo).getByText('Không xác thực')).toBeInTheDocument()
    expect(within(thuHo).getByText('Đang bật')).toBeInTheDocument()
    const chiHo = await rowFor('CHI_HO')
    expect(within(chiHo).getByText(/API key \(X-API-Key\)/)).toBeInTheDocument()
    expect(screen.queryByText('DA_XOA')).not.toBeInTheDocument()
  })

  it('không còn thẻ thống kê callback và nút "Nhật ký nhận"', async () => {
    const { calls } = renderServices()
    await rowFor('THU_HO')

    expect(screen.queryByText(/Nhật ký nhận/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Tỉ lệ mapping|p95|Callback 24h/i)).not.toBeInTheDocument()
    expect(calls.map((c) => c.url)).toEqual(['/api/services'])
  })

  it('danh sách trống hiện thông báo kèm nút tạo, khác với thông báo lỗi tải', async () => {
    renderServices([])

    expect(await screen.findByText('Chưa có dịch vụ callback nào')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Tạo dịch vụ' }).length).toBeGreaterThan(0)
    expect(screen.queryByText('Không tải được danh sách dịch vụ')).not.toBeInTheDocument()
  })

  it('lỗi tải hiện thông báo lỗi có nút thử lại, không hiện trạng thái trống', async () => {
    routeFetch({ 'GET /api/services': () => errorResponse(500, 'INTERNAL_ERROR', 'Lỗi nội bộ.') })
    renderPage(<ServicesPage />, { path: '/services' })

    expect(await screen.findByText('Không tải được danh sách dịch vụ')).toBeInTheDocument()
    expect(screen.getByText('Lỗi nội bộ.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    expect(screen.queryByText('Chưa có dịch vụ callback nào')).not.toBeInTheDocument()
  })

  it('nút sao chép chép URL đầy đủ vào clipboard và báo đã chép', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderServices()

    const row = await rowFor('THU_HO')
    await user.click(within(row).getByRole('button', { name: 'Sao chép URL' }))

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/callbacks/THU_HO`)
    expect(await screen.findByText('Đã sao chép vào clipboard')).toBeInTheDocument()
  })

  it('tìm theo mã hoặc tên và lọc bật/tắt ở client; không khớp thì hiện trạng thái không tìm thấy và xóa được bộ lọc', async () => {
    const user = userEvent.setup()
    const { calls } = renderServices()
    await rowFor('THU_HO')

    await user.type(screen.getByRole('textbox', { name: 'Tìm theo mã hoặc tên dịch vụ' }), 'chi hộ')
    await waitFor(() => expect(screen.queryByText('THU_HO', { selector: 'td span' })).not.toBeInTheDocument())
    expect(screen.getByText('CHI_HO', { selector: 'td span' })).toBeInTheDocument()

    await user.clear(screen.getByRole('textbox', { name: 'Tìm theo mã hoặc tên dịch vụ' }))
    await user.click(screen.getByRole('button', { name: 'Đã tắt' }))
    expect(await screen.findByText('BIEN_DONG', { selector: 'td span' })).toBeInTheDocument()
    expect(screen.queryByText('THU_HO', { selector: 'td span' })).not.toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Tìm theo mã hoặc tên dịch vụ' }), 'zzz')
    expect(await screen.findByText('Không tìm thấy dịch vụ phù hợp')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
    expect(await screen.findByText('THU_HO', { selector: 'td span' })).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'GET')).toHaveLength(1)
  })

  it('"Gửi thử" mở đúng trang gửi thử của dịch vụ', async () => {
    const user = userEvent.setup()
    renderServices()

    const row = await rowFor('CHI_HO')
    await user.click(within(row).getByRole('link', { name: 'Gửi thử' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/services/CHI_HO/test')
  })
})

describe('Bật/tắt dịch vụ', () => {
  it('chỉ đổi trạng thái hiển thị sau khi server xác nhận', async () => {
    const user = userEvent.setup()
    const { calls } = renderServices()
    const row = await rowFor('THU_HO')

    await user.click(within(row).getByRole('switch', { name: 'Tắt dịch vụ THU_HO' }))

    const put = calls.find((c) => c.method === 'PUT')
    expect(put?.url).toBe('/api/services/THU_HO/enabled')
    expect(JSON.parse(put?.body ?? '{}')).toEqual({ enabled: false })
    expect(await screen.findByText('Đã tắt dịch vụ "THU_HO".')).toBeInTheDocument()
    const updated = await rowFor('THU_HO')
    await waitFor(() => expect(within(updated).getByRole('switch', { name: 'Bật dịch vụ THU_HO' })).toBeInTheDocument())
  })

  it('lỗi mạng khi bật/tắt: trạng thái hiển thị không đổi và có thông báo lỗi', async () => {
    const user = userEvent.setup()
    routeFetch({
      'GET /api/services': () => jsonResponse(200, [THU_HO_DTO]),
      'PUT /api/services/THU_HO/enabled': () => {
        throw new TypeError('Failed to fetch')
      },
    })
    renderPage(<ServicesPage />, { path: '/services' })
    const row = await rowFor('THU_HO')

    await user.click(within(row).getByRole('switch', { name: 'Tắt dịch vụ THU_HO' }))

    expect(await screen.findByText('Không đổi được trạng thái của THU_HO. Thử lại.')).toBeInTheDocument()
    expect(within(await rowFor('THU_HO')).getByRole('switch', { name: 'Tắt dịch vụ THU_HO' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})

describe('Xóa mềm dịch vụ', () => {
  it('hủy trong hộp thoại xác nhận thì không gọi API và dòng vẫn còn', async () => {
    const user = userEvent.setup()
    const { calls } = renderServices()
    const row = await rowFor('CHI_HO')

    await user.click(within(row).getByRole('button', { name: 'Xóa dịch vụ CHI_HO' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Xóa dịch vụ CHI_HO?' })
    await user.click(within(dialog).getByRole('button', { name: 'Hủy' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
    expect(screen.getByText('CHI_HO', { selector: 'td span' })).toBeInTheDocument()
    // Hủy: tiêu điểm về đúng nút đã mở hộp thoại.
    expect(within(row).getByRole('button', { name: 'Xóa dịch vụ CHI_HO' })).toHaveFocus()
  })

  it('xác nhận xóa gọi DELETE rồi tải lại danh sách và dòng biến mất', async () => {
    const user = userEvent.setup()
    const { calls } = renderServices()
    const row = await rowFor('CHI_HO')

    await user.click(within(row).getByRole('button', { name: 'Xóa dịch vụ CHI_HO' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xóa dịch vụ' }))

    await waitFor(() => expect(screen.queryByText('CHI_HO', { selector: 'td span' })).not.toBeInTheDocument())
    expect(calls.find((c) => c.method === 'DELETE')?.url).toBe('/api/services/CHI_HO')
    expect(screen.getByText('THU_HO', { selector: 'td span' })).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    // Xóa xong, dòng và nút đã mở hộp thoại không còn: tiêu điểm phải ở nút "Tạo dịch vụ", không rơi về <body>.
    await waitFor(() => expect(screen.getByRole('link', { name: 'Tạo dịch vụ' })).toHaveFocus())
    expect(document.activeElement).not.toBe(document.body)
  })
})
