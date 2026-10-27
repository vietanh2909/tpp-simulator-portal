import { useCallback, useState } from 'react'

/** Điều người dùng vừa làm và khiến dữ liệu tải lại: chỉ khi đó vùng thông báo mới nói về kết quả. */
export type AnnouncementTrigger = 'reload' | 'apply' | 'page'

export interface AnnouncementSnapshot {
  /** Thay đổi mỗi lần tải thành công (danh tính đối tượng `Date`). */
  updatedAt: Date | undefined
  hasError: boolean
  total: number | undefined
  page: number
  totalPages: number | undefined
  /**
   * Khóa của truy vấn đã tạo ra dữ liệu hiện có (tab, bộ lọc, trang, cỡ trang). Thông báo về một thao tác chỉ phát khi
   * dữ liệu về đúng truy vấn mà thao tác đó dẫn tới; kết quả cũ về muộn không "ăn" mất thông báo, và tổng số chỉ được
   * coi là "đổi" khi so cùng một truy vấn (đổi tab hay bộ lọc không phải là tổng số đổi).
   */
  dataKey: string | undefined
}

interface Pending {
  kind: AnnouncementTrigger
  /** Khóa của truy vấn mà thao tác dẫn tới. */
  key: string
}

interface Seen {
  updatedAt: Date | undefined
  hasError: boolean
  total: number | undefined
  dataKey: string | undefined
}

interface DecisionInput {
  trigger: AnnouncementTrigger | null
  hadError: boolean
  hasError: boolean
  previousTotal: number | undefined
  total: number | undefined
  page: number
  totalPages: number | undefined
  sameQuery: boolean
  loaded: boolean
}

/**
 * Quyết định thông báo cho trình đọc màn hình (D12). Chỉ nói khi: lỗi mới xuất hiện, phục hồi sau lỗi, người dùng bấm
 * "Tải lại", áp dụng bộ lọc, đổi trang, hoặc tổng số dòng đổi. Nhịp tự cập nhật bình thường trả `null` (im lặng).
 */
export function describeAnnouncement(input: DecisionInput): string | null {
  if (input.hasError && !input.hadError) return 'Không cập nhật được dữ liệu. Đang hiển thị dữ liệu cũ.'
  if (input.hasError) return null
  if (input.hadError && input.loaded) return 'Đã cập nhật lại dữ liệu sau lỗi.'
  if (!input.loaded || input.total === undefined) return null
  if (input.trigger === 'apply') return `Đã áp dụng bộ lọc, ${input.total} kết quả.`
  if (input.trigger === 'page') return `Trang ${input.page} trên ${input.totalPages ?? 1}.`
  if (input.trigger === 'reload') return `Đã tải lại, ${input.total} kết quả.`
  if (input.sameQuery && input.previousTotal !== undefined && input.previousTotal !== input.total) {
    return `Tổng số đã đổi thành ${input.total}.`
  }
  return null
}

/**
 * Giữ nội dung của vùng `aria-live="polite"`. `notify(kind, key)` ghi nhận việc người dùng vừa làm cùng khóa truy vấn
 * mà việc đó dẫn tới; nội dung chỉ đổi khi dữ liệu của đúng truy vấn đó về (hoặc khi lỗi đổi trạng thái).
 * `sequence` đổi mỗi lần nói để cùng một câu vẫn được đọc lại (ví dụ bấm "Tải lại" hai lần liên tiếp).
 */
export function useMonitoringAnnouncements(snapshot: AnnouncementSnapshot) {
  const [pending, setPending] = useState<Pending | null>(null)
  const [seen, setSeen] = useState<Seen>({
    updatedAt: undefined,
    hasError: false,
    total: undefined,
    dataKey: snapshot.dataKey,
  })
  const [spoken, setSpoken] = useState({ message: '', sequence: 0 })

  // Điều chỉnh state trong lúc render (mẫu "lưu giá trị lần render trước"): chạy khi có kết quả mới hoặc lỗi đổi trạng thái.
  if (snapshot.updatedAt !== seen.updatedAt || snapshot.hasError !== seen.hasError) {
    const arrived = snapshot.updatedAt !== undefined && snapshot.updatedAt !== seen.updatedAt
    const matched = pending !== null && pending.key === snapshot.dataKey ? pending.kind : null
    const message = describeAnnouncement({
      trigger: arrived ? matched : null,
      hadError: seen.hasError,
      hasError: snapshot.hasError,
      previousTotal: seen.total,
      total: snapshot.total,
      page: snapshot.page,
      totalPages: snapshot.totalPages,
      sameQuery: seen.dataKey === snapshot.dataKey,
      loaded: arrived,
    })
    setSeen({
      updatedAt: snapshot.updatedAt,
      hasError: snapshot.hasError,
      total: snapshot.total,
      dataKey: snapshot.dataKey,
    })
    if (arrived && matched) setPending(null)
    if (message) setSpoken((current) => ({ message, sequence: current.sequence + 1 }))
  }

  const notify = useCallback((kind: AnnouncementTrigger, key: string) => setPending({ kind, key }), [])
  return { message: spoken.message, sequence: spoken.sequence, notify }
}
