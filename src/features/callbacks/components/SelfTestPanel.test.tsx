import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { toCallbackService } from '@/features/callback-services/utils/service-dto'
import { CHI_HO_DTO, TEST_KEY, THU_HO_DTO } from '@/test/fixtures/services'
import { jsonResponse, routeFetch } from '@/test/http'
import { renderPage } from '@/test/render'
import { SelfTestPanel } from './SelfTestPanel'

const chiHo = toCallbackService(CHI_HO_DTO)
const thuHo = toCallbackService(THU_HO_DTO)

function renderPanel(service = chiHo, handler = () => jsonResponse(201, { code: '00' })) {
  const api = routeFetch({ [`POST /callbacks/${service.code}`]: handler })
  renderPage(<SelfTestPanel service={service} />, { path: '/services/:code/test' })
  return api
}

async function openHeaders(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('tab', { name: /Request Headers/ }))
}

describe('SelfTestPanel (gửi callback thử)', () => {
  it('dịch vụ API_KEY: tên header điền sẵn, ô giá trị khóa để trống và không có giá trị khóa nào trong DOM', async () => {
    const user = userEvent.setup()
    renderPanel()

    await openHeaders(user)

    expect(screen.getByLabelText('Giá trị header X-API-Key')).toHaveValue('')
    expect(screen.getAllByLabelText('Tên header').map((input) => (input as HTMLInputElement).value)).toEqual([
      'Content-Type',
      'X-API-Key',
    ])
    expect(document.body.innerHTML).not.toContain(TEST_KEY)
  })

  it('gửi POST /callbacks/{mã} kèm header tùy ý, hiện HTTP status, body phản hồi và thời gian ms', async () => {
    const user = userEvent.setup()
    const { calls } = renderPanel()
    await openHeaders(user)
    await user.click(screen.getByRole('button', { name: 'Thêm header' }))
    const names = screen.getAllByLabelText('Tên header')
    // fireEvent.change thay vì gõ từng phím: SelfTestPanel render nặng nên gõ ~35 ký tự vượt 30 giây khi cả bộ chạy song song.
    fireEvent.change(names[names.length - 1] as HTMLElement, { target: { value: 'X-Request-Id' } })
    fireEvent.change(screen.getByLabelText('Giá trị header X-Request-Id'), { target: { value: 'r-1' } })
    fireEvent.change(screen.getByLabelText('Giá trị header X-API-Key'), { target: { value: TEST_KEY } })

    await user.click(screen.getByRole('button', { name: 'Gửi callback' }))

    expect(await screen.findByText('Hoàn tất')).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ method: 'POST', url: '/callbacks/CHI_HO' })
    expect(calls[0]?.headers).toMatchObject({
      'X-Request-Id': 'r-1',
      'X-API-Key': TEST_KEY,
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({ processId: 'TEST-001', status: 'SUCCESS' })
    expect(screen.getByText(/^\d+ ms$/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Response body' })).toHaveTextContent('"code": "00"')
    expect(screen.getByText(/response đã cấu hình của dịch vụ/)).toBeInTheDocument()
  })

  it('hai tab Request Body/Headers theo mẫu ARIA: mũi tên đổi tab, mỗi tab trỏ tới tabpanel của nó', async () => {
    const user = userEvent.setup()
    renderPanel()
    const bodyTab = screen.getByRole('tab', { name: /Request Body/ })
    const headersTab = screen.getByRole('tab', { name: /Request Headers/ })

    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Request Body/)
    expect(bodyTab.getAttribute('aria-controls')).toBe(screen.getByRole('tabpanel').id)
    expect(headersTab).toHaveAttribute('tabindex', '-1')

    bodyTab.focus()
    await user.keyboard('{ArrowRight}')

    expect(headersTab).toHaveFocus()
    expect(headersTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Request Headers/)
    expect(headersTab.getAttribute('aria-controls')).toBe(screen.getByRole('tabpanel').id)
    expect(screen.getByLabelText('Giá trị header X-API-Key')).toBeInTheDocument()
  })

  it('tên header API key tùy biến (X-Partner) cũng được che, kể cả khi tên không khớp mẫu chung', async () => {
    const user = userEvent.setup()
    const partner = toCallbackService({ ...CHI_HO_DTO, apiKeyHeaderName: 'X-Partner' })
    renderPanel(partner)
    await openHeaders(user)

    const value = screen.getByLabelText('Giá trị header X-Partner')
    expect(value).toHaveAttribute('type', 'password')

    // Ô header khác (tên không nhạy cảm) vẫn hiện chữ thường.
    expect(screen.getByLabelText('Giá trị header Content-Type')).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Hiện giá trị' }))
    expect(screen.getByLabelText('Giá trị header X-Partner')).toHaveAttribute('type', 'text')
  })

  it('mẫu "Sai key" gửi khóa sai cố định và hiện 401 kèm X-Simulator-Error', async () => {
    const user = userEvent.setup()
    const { calls } = renderPanel(chiHo, () =>
      jsonResponse(401, { error: 'UNAUTHORIZED', message: 'Khóa sai.' }, { 'X-Simulator-Error': 'UNAUTHORIZED' }),
    )

    await user.click(screen.getByRole('button', { name: /Sai key \(401\)/ }))
    await user.click(screen.getByRole('button', { name: 'Gửi callback' }))

    expect(await screen.findByText(/Simulator từ chối request này/)).toBeInTheDocument()
    expect(screen.getByText(/X-Simulator-Error: UNAUTHORIZED/)).toBeInTheDocument()
    expect(calls[0]?.headers['X-API-Key']).toBe('sai-khoa')
    expect(screen.getAllByText(/401/).length).toBeGreaterThan(0)
  })

  it('413 có lời giải thích về giới hạn 1 MiB', async () => {
    const user = userEvent.setup()
    renderPanel(thuHo, () =>
      jsonResponse(
        413,
        { error: 'PAYLOAD_TOO_LARGE', message: 'Quá lớn.' },
        { 'X-Simulator-Error': 'PAYLOAD_TOO_LARGE' },
      ),
    )

    await user.click(screen.getByRole('button', { name: 'Gửi callback' }))

    const note = await screen.findByRole('note')
    expect(note).toHaveTextContent('1 MiB')
    expect(note).toHaveTextContent('không được lưu')
  })

  it('liên kết sang trang theo dõi (tab Tất cả callback) đã lọc theo dịch vụ', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Gửi callback' }))

    const link = await screen.findByRole('link', { name: /Xem trong Theo dõi giao dịch/ })
    expect(link).toHaveAttribute('href', '/transactions?tab=callbacks&service=CHI_HO')
  })

  it('không giữ giá trị khóa sau khi gửi: ô giá trị của header nhạy cảm được xóa, tên header còn', async () => {
    const user = userEvent.setup()
    renderPanel()
    await openHeaders(user)
    fireEvent.change(screen.getByLabelText('Giá trị header X-API-Key'), { target: { value: TEST_KEY } })

    await user.click(screen.getByRole('button', { name: 'Gửi callback' }))
    await screen.findByText('Hoàn tất')

    expect(screen.getByLabelText('Giá trị header X-API-Key')).toHaveValue('')
    expect(within(document.body).queryByDisplayValue(TEST_KEY)).not.toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain(TEST_KEY)
  })

  it('lỗi mạng hiện thông báo không gửi được thay vì kết quả', async () => {
    const user = userEvent.setup()
    renderPanel(thuHo, () => {
      throw new TypeError('Failed to fetch')
    })

    await user.click(screen.getByRole('button', { name: 'Gửi callback' }))

    expect(await screen.findByText('Không gửi được callback')).toBeInTheDocument()
    expect(screen.getByText('Lỗi')).toBeInTheDocument()
  })
})
