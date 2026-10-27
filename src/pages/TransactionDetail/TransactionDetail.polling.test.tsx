import { act, cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeMonitoringBackend } from '@/test/fixtures/fake-backend'
import { T100_DTO, callbackDto } from '@/test/fixtures/monitoring'
import { THU_HO_DTO } from '@/test/fixtures/services'
import { renderMonitoringApp } from '@/test/monitoring-app'

/**
 * Tự cập nhật 5 giây ở trang chi tiết giao dịch (AC3.8.2, AC3.9.1, AC3.9.2, D11): đồng hồ giả, nhịp thật đi qua công tắc.
 * Đồng hồ vẫn trôi theo đồng hồ thật (`shouldAdvanceTime`) để `findBy*` không bị treo; bước nhảy 5 giây do kiểm thử đẩy.
 */
const DETAIL = '/api/transactions/detail'

function setup() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function timeline() {
  return screen.getAllByTestId('timeline-item')
}

function backend() {
  return fakeMonitoringBackend({
    transactions: [T100_DTO],
    callbacks: [callbackDto(1), callbackDto(2), callbackDto(3)],
    services: [THU_HO_DTO],
  })
}

beforeEach(() => {
  window.sessionStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Chi tiết giao dịch: tự cập nhật 5 giây', () => {
  it('sau một nhịp có thêm lần nhận thì hiện "Có 1 callback mới" và lần đang chọn không đổi', async () => {
    const user = setup()
    const fake = backend()
    renderMonitoringApp('/transactions/THU_HO/T100')
    await screen.findAllByTestId('timeline-item')
    await user.click(timeline()[1] as HTMLElement)
    expect(timeline()[1]).toHaveAttribute('aria-current', 'true')
    expect(screen.queryByTestId('new-callbacks')).not.toBeInTheDocument()
    const callsBefore = fake.callsTo(DETAIL).length

    fake.state.callbacks.push(callbackDto(4))
    await advance(5000)

    const notice = await screen.findByTestId('new-callbacks')
    expect(notice).toHaveTextContent('Có 1 callback mới')
    expect(timeline()).toHaveLength(4)
    expect(timeline()[1]).toHaveAttribute('aria-current', 'true')
    expect(timeline()[3]).not.toHaveAttribute('aria-current')
    expect(fake.callsTo(DETAIL)).toHaveLength(callsBefore + 1)
    expect(fake.lastQuery(DETAIL).get('serviceCode')).toBe('THU_HO')
    expect(fake.lastQuery(DETAIL).get('transactionId')).toBe('T100')

    await user.click(within(notice).getByRole('button', { name: 'Xem lần nhận mới nhất' }))

    expect(timeline()[3]).toHaveAttribute('aria-current', 'true')
    expect(screen.queryByTestId('new-callbacks')).not.toBeInTheDocument()
  })

  it('tắt công tắc thì sau 15 giây không có lời gọi mới và không có "callback mới"; Tải lại mới có', async () => {
    const user = setup()
    const fake = backend()
    renderMonitoringApp('/transactions/THU_HO/T100')
    await screen.findAllByTestId('timeline-item')
    const callsBefore = fake.callsTo(DETAIL).length

    await user.click(screen.getByRole('switch', { name: 'Tự cập nhật mỗi 5 giây' }))
    expect(screen.getByRole('switch', { name: 'Tự cập nhật mỗi 5 giây' })).toHaveAttribute('aria-checked', 'false')
    fake.state.callbacks.push(callbackDto(4))
    await advance(15_000)

    expect(fake.callsTo(DETAIL)).toHaveLength(callsBefore)
    expect(screen.queryByTestId('new-callbacks')).not.toBeInTheDocument()
    expect(timeline()).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Tải lại' }))

    expect(await screen.findByTestId('new-callbacks')).toHaveTextContent('Có 1 callback mới')
    expect(fake.callsTo(DETAIL)).toHaveLength(callsBefore + 1)
  })

  it('lỗi ở nhịp tự cập nhật giữ nguyên lịch sử đang xem kèm banner; nhịp sau phục hồi thì banner mất', async () => {
    const fake = backend()
    renderMonitoringApp('/transactions/THU_HO/T100')
    await screen.findAllByTestId('timeline-item')

    fake.state.down = true
    await advance(5000)

    const banner = await screen.findByTestId('stale-banner')
    expect(banner).toHaveTextContent(/Không cập nhật được\. Đang hiển thị dữ liệu lúc \d{2}:\d{2}:\d{2} \(GMT\+7\)\./)
    expect(timeline()).toHaveLength(3)

    fake.state.down = false
    fake.state.callbacks.push(callbackDto(4))
    await advance(5000)

    expect(await screen.findByTestId('new-callbacks')).toHaveTextContent('Có 1 callback mới')
    expect(screen.queryByTestId('stale-banner')).not.toBeInTheDocument()
    expect(timeline()).toHaveLength(4)
  })
})
