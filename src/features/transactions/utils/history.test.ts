import { describe, expect, it } from 'vitest'
import { findNewCallbackIds, hasOutOfOrderBusinessTimestamps } from './history'

describe('Lịch sử callback của một giao dịch', () => {
  it('phát hiện callback nhận sau nhưng có timestamp nghiệp vụ cũ hơn', () => {
    expect(
      hasOutOfOrderBusinessTimestamps([
        { businessTimestamp: '2026-10-19T03:00:00Z' },
        { businessTimestamp: '2026-10-19T03:10:00Z' },
        { businessTimestamp: '2026-10-19T03:05:00Z' },
      ]),
    ).toBe(true)
  })

  it('đúng thứ tự, thiếu timestamp hoặc timestamp trùng thì không báo sai thứ tự', () => {
    expect(
      hasOutOfOrderBusinessTimestamps([
        { businessTimestamp: '2026-10-19T03:00:00Z' },
        { businessTimestamp: null },
        { businessTimestamp: '2026-10-19T03:00:00Z' },
        { businessTimestamp: '2026-10-19T03:01:00Z' },
      ]),
    ).toBe(false)
    expect(hasOutOfOrderBusinessTimestamps([])).toBe(false)
  })

  it('đếm các lần nhận mới so với những lần người dùng đã biết, theo thứ tự nhận', () => {
    const callbacks = [{ recordId: 1 }, { recordId: 2 }, { recordId: 5 }, { recordId: 6 }]

    expect(findNewCallbackIds([1, 2], callbacks)).toEqual([5, 6])
    expect(findNewCallbackIds([1, 2, 5, 6], callbacks)).toEqual([])
  })
})
