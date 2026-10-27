import { beforeEach, describe, expect, it } from 'vitest'
import {
  EMPTY_FILTERS,
  describeFilters,
  hasActiveFilters,
  loadTabState,
  normalizeFilters,
  normalizePageSize,
  parseQuery,
  saveTabState,
  serializeQuery,
  type MonitoringQuery,
} from './monitoring-query'

function query(partial: Partial<MonitoringQuery> = {}): MonitoringQuery {
  return { tab: 'transactions', ...EMPTY_FILTERS, page: 1, size: 20, ...partial }
}

describe('Trạng thái bộ lọc trong URL', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('URL trống là tab Giao dịch, trang 1, 20 dòng, không bộ lọc', () => {
    expect(parseQuery(new URLSearchParams(''))).toEqual(query())
    expect(serializeQuery(query()).toString()).toBe('')
  })

  it('tab Giao dịch: dịch vụ, transactionId, status chữ, thời gian, trang và cỡ trang đi qua URL', () => {
    const original = query({
      service: 'THU_HO',
      txn: 't1',
      status: '0',
      range: 'custom',
      from: '2026-10-19 10:00:00',
      to: '2026-10-19 11:00:00',
      page: 2,
      size: 50,
    })

    expect(parseQuery(serializeQuery(original))).toEqual(original)
  })

  it('tab Tất cả callback: outcome và reason đi qua URL, status bị bỏ', () => {
    const original = query({ tab: 'callbacks', outcome: 'REJECTED', reason: 'INVALID_API_KEY', status: 'x' })

    const parsed = parseQuery(serializeQuery(original))

    expect(parsed).toMatchObject({ tab: 'callbacks', outcome: 'REJECTED', reason: 'INVALID_API_KEY', status: '' })
    expect(serializeQuery(original).get('status')).toBeNull()
  })

  it('liên kết từ trang gửi thử ?tab=callbacks&service=<mã> mở tab callback đã lọc theo dịch vụ', () => {
    expect(parseQuery(new URLSearchParams('tab=callbacks&service=THU_HO'))).toMatchObject({
      tab: 'callbacks',
      service: 'THU_HO',
      page: 1,
    })
  })

  it('size ngoài {20, 50, 100} quy về 20; page không hợp lệ quy về 1', () => {
    expect(parseQuery(new URLSearchParams('size=10&page=0')).size).toBe(20)
    expect(parseQuery(new URLSearchParams('size=abc&page=-3')).page).toBe(1)
    expect(parseQuery(new URLSearchParams('size=100&page=3'))).toMatchObject({ size: 100, page: 3 })
    expect([20, 50, 100].map(normalizePageSize)).toEqual([20, 50, 100])
  })

  it('reason chỉ hợp lệ khi outcome là REJECTED; giá trị lạ bị bỏ', () => {
    expect(parseQuery(new URLSearchParams('tab=callbacks&reason=INVALID_JSON')).reason).toBe('')
    expect(parseQuery(new URLSearchParams('tab=callbacks&outcome=SUCCESS&reason=INVALID_JSON')).reason).toBe('')
    expect(parseQuery(new URLSearchParams('tab=callbacks&outcome=REJECTED&reason=KHONG_CO')).reason).toBe('')
    expect(parseQuery(new URLSearchParams('tab=callbacks&outcome=LA')).outcome).toBe('')
  })

  it('hai ô thời gian chỉ giữ khi range là custom', () => {
    const parsed = parseQuery(new URLSearchParams('range=24h&from=2026-10-19&to=2026-10-20'))

    expect(parsed).toMatchObject({ range: '24h', from: '', to: '' })
  })

  it('nhớ trạng thái từng tab riêng trong sessionStorage và khôi phục khi quay lại', () => {
    saveTabState('callbacks', { ...EMPTY_FILTERS, outcome: 'MAPPING_ERROR', service: 'CHI_HO', page: 3, size: 50 })

    expect(loadTabState('callbacks')).toMatchObject({ outcome: 'MAPPING_ERROR', service: 'CHI_HO', page: 3, size: 50 })
    expect(loadTabState('transactions')).toBeNull()
  })

  it('trạng thái nhớ hỏng hoặc có giá trị lạ được làm sạch thay vì làm hỏng màn hình', () => {
    window.sessionStorage.setItem('tpp-simulator:monitoring:callbacks', '{không phải JSON')
    expect(loadTabState('callbacks')).toBeNull()

    window.sessionStorage.setItem(
      'tpp-simulator:monitoring:callbacks',
      JSON.stringify({ ...EMPTY_FILTERS, outcome: 'LA', page: -1, size: 7 }),
    )
    expect(loadTabState('callbacks')).toMatchObject({ outcome: '', page: 1, size: 20 })
  })

  it('hasActiveFilters: "custom" chỉ tính là đang lọc khi có ít nhất một ô; preset thì luôn tính; "all" thì không', () => {
    const custom = (from: string, to: string) => ({ ...EMPTY_FILTERS, range: 'custom' as const, from, to })

    expect(hasActiveFilters(custom('', ''))).toBe(false)
    expect(hasActiveFilters(custom('  ', ' '))).toBe(false)
    expect(hasActiveFilters(custom('2026-10-19', ''))).toBe(true)
    expect(hasActiveFilters(custom('', '2026-10-19 11:00:00'))).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, range: '24h' })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, range: 'all' })).toBe(false)
    expect(describeFilters(custom('', ''))).toBe('')
  })

  it('"custom" với hai ô trống được chuẩn hóa về "all", kể cả khi đi qua URL', () => {
    const empty = { ...EMPTY_FILTERS, range: 'custom' as const }
    const withFrom = { ...empty, from: '2026-10-19' }

    expect(normalizeFilters('transactions', empty).range).toBe('all')
    expect(normalizeFilters('transactions', withFrom)).toMatchObject({ range: 'custom', from: '2026-10-19', to: '' })
    expect(serializeQuery(query(empty)).toString()).toBe('')
    expect(parseQuery(new URLSearchParams('range=custom'))).toMatchObject({ range: 'all', from: '', to: '' })
    expect(parseQuery(new URLSearchParams('range=custom&to=2026-10-19'))).toMatchObject({
      range: 'custom',
      to: '2026-10-19',
    })
  })

  it('hasActiveFilters và describeFilters phản ánh đúng bộ lọc đang áp dụng', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
    const filters = { ...EMPTY_FILTERS, service: 'THU_HO', txn: 't1', outcome: 'REJECTED' as const }

    expect(hasActiveFilters(filters)).toBe(true)
    expect(describeFilters(filters, 'THU_HO (Thu hộ)')).toBe(
      'dịch vụ THU_HO (Thu hộ) · transactionId chứa "t1" · kết quả xử lý: Bị từ chối',
    )
  })
})
