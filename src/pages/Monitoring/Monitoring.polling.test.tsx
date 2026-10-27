import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeMonitoringBackend } from '@/test/fixtures/fake-backend'
import { T100_DTO, T200_DTO, makeTransactions } from '@/test/fixtures/monitoring'
import { CHI_HO_DTO, THU_HO_DTO } from '@/test/fixtures/services'
import { renderMonitoringApp } from '@/test/monitoring-app'

/**
 * Tự cập nhật 5 giây ở cấp trang (AC3.8.2, AC3.8.3, AC3.9.1, AC3.9.2): đồng hồ giả, nhịp thật đi qua công tắc,
 * `pollMs` và `useAsyncData`. Đồng hồ vẫn trôi theo đồng hồ thật (`shouldAdvanceTime`) để `findBy*` và `waitFor` của
 * Testing Library không bị treo; mọi bước nhảy 5 giây là do kiểm thử tự đẩy.
 */
const SERVICES = [THU_HO_DTO, CHI_HO_DTO]
const LIST = '/api/transactions'

function setup() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function tableRows() {
  return within(screen.getByTestId('transactions-table')).getAllByRole('row').slice(1)
}

function newTransaction(transactionId: string, receivedAt: string) {
  return { ...T100_DTO, transactionId, latestReceivedAt: receivedAt }
}

beforeEach(() => {
  window.sessionStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Màn hình theo dõi: tự cập nhật 5 giây', () => {
  it('sau 5 giây gọi lại đúng tham số (cùng bộ lọc, cùng trang 2), giữ bộ lọc và trang, hiện dữ liệu mới', async () => {
    const backend = fakeMonitoringBackend({ transactions: makeTransactions(45), services: SERVICES })
    renderMonitoringApp('/transactions?txn=TX&page=2')
    await screen.findByTestId('transactions-table')
    await waitFor(() => expect(tableRows()).toHaveLength(20))
    expect(screen.queryByText('DA-DOI')).not.toBeInTheDocument()
    const callsBefore = backend.callsTo(LIST).length

    // Dữ liệu đổi ở backend: TX021 là dòng đầu của trang 2.
    backend.state.transactions = backend.state.transactions.map((item) =>
      item.transactionId === 'TX021' ? { ...item, latestStatus: 'DA-DOI' } : item,
    )
    await advance(5000)

    expect(await screen.findByText('DA-DOI')).toBeInTheDocument()
    const calls = backend.callsTo(LIST)
    expect(calls).toHaveLength(callsBefore + 1)
    expect(calls.at(-1)?.url).toBe(calls.at(-2)?.url)
    const query = backend.lastQuery(LIST)
    expect(query.get('transactionId')).toBe('TX')
    expect(query.get('page')).toBe('2')
    expect(query.get('size')).toBe('20')
    // Bộ lọc, trang và địa chỉ vẫn giữ nguyên sau nhịp tự cập nhật.
    expect(screen.getByLabelText('Mã giao dịch (transactionId)')).toHaveValue('TX')
    expect(screen.getByTestId('location')).toHaveTextContent('/transactions?txn=TX&page=2')
    expect(tableRows()).toHaveLength(20)
  })

  it('tắt công tắc thì sau 15 giây không có lời gọi mới; Tải lại mới có; bật lại thì tự cập nhật tiếp', async () => {
    const user = setup()
    const backend = fakeMonitoringBackend({ transactions: [T100_DTO, T200_DTO], services: SERVICES })
    renderMonitoringApp('/transactions')
    await screen.findByTestId('transactions-table')
    const callsBefore = backend.callsTo(LIST).length

    await user.click(screen.getByRole('switch', { name: 'Tự cập nhật mỗi 5 giây' }))
    expect(screen.getByRole('switch', { name: 'Tự cập nhật mỗi 5 giây' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Tự cập nhật đang tắt')).toBeInTheDocument()
    backend.state.transactions.push(newTransaction('T300', '2026-10-19T03:30:00Z'))
    await advance(15_000)

    expect(backend.callsTo(LIST)).toHaveLength(callsBefore)
    expect(screen.queryByText('T300')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tải lại' }))

    expect(await screen.findByText('T300')).toBeInTheDocument()
    expect(backend.callsTo(LIST)).toHaveLength(callsBefore + 1)

    backend.state.transactions.push(newTransaction('T400', '2026-10-19T03:40:00Z'))
    await user.click(screen.getByRole('switch', { name: 'Tự cập nhật mỗi 5 giây' }))
    await advance(5000)

    expect(await screen.findByText('T400')).toBeInTheDocument()
    expect(backend.callsTo(LIST)).toHaveLength(callsBefore + 2)
  })

  it('lỗi ở nhịp tự cập nhật giữ dữ liệu cũ kèm banner; nhịp sau phục hồi thì banner mất và có dữ liệu mới', async () => {
    const backend = fakeMonitoringBackend({ transactions: [T100_DTO, T200_DTO], services: SERVICES })
    renderMonitoringApp('/transactions')
    await screen.findByTestId('transactions-table')

    backend.state.down = true
    await advance(5000)

    const banner = await screen.findByTestId('stale-banner')
    expect(banner).toHaveTextContent(/Không cập nhật được\. Đang hiển thị dữ liệu lúc \d{2}:\d{2}:\d{2} \(GMT\+7\)\./)
    expect(tableRows()).toHaveLength(2)

    backend.state.down = false
    backend.state.transactions.push(newTransaction('T300', '2026-10-19T03:30:00Z'))
    await advance(5000)

    await waitFor(() => expect(screen.queryByTestId('stale-banner')).not.toBeInTheDocument())
    expect(await screen.findByText('T300')).toBeInTheDocument()
    expect(tableRows()).toHaveLength(3)
  })
})
