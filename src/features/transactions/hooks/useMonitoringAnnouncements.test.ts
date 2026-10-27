import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  describeAnnouncement,
  useMonitoringAnnouncements,
  type AnnouncementSnapshot,
} from './useMonitoringAnnouncements'

function snapshot(partial: Partial<AnnouncementSnapshot> = {}): AnnouncementSnapshot {
  return {
    updatedAt: new Date(1000),
    hasError: false,
    total: 5,
    page: 1,
    totalPages: 1,
    dataKey: 'q1',
    ...partial,
  }
}

function setup(initial: AnnouncementSnapshot) {
  return renderHook(({ current }) => useMonitoringAnnouncements(current), { initialProps: { current: initial } })
}

describe('Vùng thông báo aria-live (D12)', () => {
  it('lần tải đầu và nhịp tự cập nhật bình thường không nói gì', () => {
    const view = setup(snapshot())
    expect(view.result.current.message).toBe('')

    view.rerender({ current: snapshot({ updatedAt: new Date(6000) }) })
    view.rerender({ current: snapshot({ updatedAt: new Date(11_000) }) })

    expect(view.result.current.message).toBe('')
  })

  it('bấm Tải lại thì nói một lần khi dữ liệu về, rồi im lặng ở nhịp sau', () => {
    const view = setup(snapshot())

    act(() => view.result.current.notify('reload', 'q1'))
    view.rerender({ current: snapshot({ updatedAt: new Date(2000) }) })
    expect(view.result.current.message).toBe('Đã tải lại, 5 kết quả.')
    const sequence = view.result.current.sequence

    view.rerender({ current: snapshot({ updatedAt: new Date(7000) }) })
    expect(view.result.current.sequence).toBe(sequence)
  })

  it('áp dụng bộ lọc nói số kết quả khi dữ liệu của đúng truy vấn về; đổi trang nói "Trang N trên M"', () => {
    const view = setup(snapshot())

    act(() => view.result.current.notify('apply', 'q2'))
    view.rerender({ current: snapshot({ updatedAt: new Date(2000), total: 128, dataKey: 'q2' }) })
    expect(view.result.current.message).toBe('Đã áp dụng bộ lọc, 128 kết quả.')

    act(() => view.result.current.notify('page', 'q3'))
    view.rerender({
      current: snapshot({ updatedAt: new Date(3000), total: 128, page: 2, totalPages: 7, dataKey: 'q3' }),
    })
    expect(view.result.current.message).toBe('Trang 2 trên 7.')
  })

  it('kết quả cũ của truy vấn khác về muộn không "ăn" mất thông báo của thao tác', () => {
    const view = setup(snapshot())

    act(() => view.result.current.notify('apply', 'q2'))
    view.rerender({ current: snapshot({ updatedAt: new Date(2000), total: 5, dataKey: 'q1' }) })
    expect(view.result.current.message).toBe('')

    view.rerender({ current: snapshot({ updatedAt: new Date(3000), total: 9, dataKey: 'q2' }) })
    expect(view.result.current.message).toBe('Đã áp dụng bộ lọc, 9 kết quả.')
  })

  it('tổng số dòng đổi giữa hai lần tải cùng truy vấn thì nói; đổi truy vấn hay tab thì không đọc là tổng số đổi', () => {
    const view = setup(snapshot())

    view.rerender({ current: snapshot({ updatedAt: new Date(6000), total: 6 }) })
    expect(view.result.current.message).toBe('Tổng số đã đổi thành 6.')

    const sequence = view.result.current.sequence
    view.rerender({ current: snapshot({ updatedAt: new Date(7000), total: 40, dataKey: 'callbacks' }) })
    expect(view.result.current.sequence).toBe(sequence)
  })

  it('lỗi mới nói một lần, lỗi kéo dài không lặp lại, phục hồi nói một lần', () => {
    const view = setup(snapshot())

    view.rerender({ current: snapshot({ hasError: true }) })
    expect(view.result.current.message).toBe('Không cập nhật được dữ liệu. Đang hiển thị dữ liệu cũ.')
    const sequence = view.result.current.sequence

    view.rerender({ current: snapshot({ hasError: true }) })
    expect(view.result.current.sequence).toBe(sequence)

    view.rerender({ current: snapshot({ updatedAt: new Date(9000) }) })
    expect(view.result.current.message).toBe('Đã cập nhật lại dữ liệu sau lỗi.')
    expect(view.result.current.sequence).toBe(sequence + 1)
  })

  it('cùng một câu bấm hai lần vẫn tăng sequence để trình đọc đọc lại', () => {
    const view = setup(snapshot())

    act(() => view.result.current.notify('reload', 'q1'))
    view.rerender({ current: snapshot({ updatedAt: new Date(2000) }) })
    const first = view.result.current.sequence
    act(() => view.result.current.notify('reload', 'q1'))
    view.rerender({ current: snapshot({ updatedAt: new Date(3000) }) })

    expect(view.result.current.message).toBe('Đã tải lại, 5 kết quả.')
    expect(view.result.current.sequence).toBe(first + 1)
  })
})

describe('describeAnnouncement', () => {
  const base = {
    trigger: null,
    hadError: false,
    hasError: false,
    previousTotal: 5,
    total: 5,
    page: 1,
    totalPages: 1,
    sameQuery: true,
    loaded: true,
  } as const

  it('im lặng khi không có gì đáng nói', () => {
    expect(describeAnnouncement(base)).toBeNull()
    expect(describeAnnouncement({ ...base, loaded: false, total: undefined })).toBeNull()
  })

  it('ưu tiên lỗi hơn mọi thông báo khác', () => {
    expect(describeAnnouncement({ ...base, hasError: true, trigger: 'apply' })).toMatch(/Không cập nhật được/)
  })
})
