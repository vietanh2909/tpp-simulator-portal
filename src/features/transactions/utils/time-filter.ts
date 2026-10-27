import type { SelectOption } from '@/types/common'

/** Giờ Việt Nam cố định GMT+7, không có giờ mùa hè. */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000

export type RangeKey = 'all' | '15m' | '1h' | '24h' | '7d' | 'custom'

export const RANGE_OPTIONS: SelectOption<RangeKey>[] = [
  { value: 'all', label: 'Tất cả thời gian' },
  { value: '15m', label: '15 phút gần đây' },
  { value: '1h', label: '1 giờ gần đây' },
  { value: '24h', label: '24 giờ gần đây' },
  { value: '7d', label: '7 ngày gần đây' },
  { value: 'custom', label: 'Tùy chọn (GMT+7)...' },
]

const PRESET_MS: Record<Exclude<RangeKey, 'all' | 'custom'>, number> = {
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '24h': 24 * 60 * 60_000,
  '7d': 7 * 24 * 60 * 60_000,
}

export const TIME_FORMAT_ERROR = 'Nhập theo dạng yyyy-MM-dd HH:mm:ss.'
export const TIME_ORDER_ERROR = 'Thời gian bắt đầu phải trước thời gian kết thúc.'

export function isRangeKey(value: string | null): value is RangeKey {
  return RANGE_OPTIONS.some((option) => option.value === value)
}

const DATE_TIME_REGEX = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}):(\d{2}))?$/

/**
 * Ô thời gian `yyyy-MM-dd HH:mm:ss` (giờ GMT+7) hoặc gõ tắt `yyyy-MM-dd`: ô "Từ" hiểu là 00:00:00, ô "Đến" hiểu là
 * 23:59:59. Trả mili giây UTC; `null` khi rỗng; `'invalid'` khi sai dạng hoặc ngày giờ không tồn tại (ví dụ 2026-02-30).
 */
export function parseLocalDateTime(text: string, edge: 'start' | 'end'): number | null | 'invalid' {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const match = DATE_TIME_REGEX.exec(trimmed)
  if (!match) return 'invalid'
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const hasTime = match[4] !== undefined
  const hour = hasTime ? Number(match[4]) : edge === 'start' ? 0 : 23
  const minute = hasTime ? Number(match[5]) : edge === 'start' ? 0 : 59
  const second = hasTime ? Number(match[6]) : edge === 'start' ? 0 : 59
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return 'invalid'
  const utc = Date.UTC(year, month - 1, day, hour, minute, second)
  const check = new Date(utc)
  // Date.UTC tự cuộn ngày không tồn tại sang tháng sau; so lại để bắt 2026-02-30.
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return 'invalid'
  }
  return utc - VN_OFFSET_MS
}

/** ISO 8601 UTC **không có phần thập phân giây** (đầu "đến" là hết chính giây đã nhập, theo BR19.1 của backend). */
export function toApiInstant(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export interface TimeInputErrors {
  from?: string
  to?: string
}

/** Kiểm tra hai ô thời gian của khoảng tùy chọn. Chỉ có lỗi thì không được gọi server. */
export function validateTimeInputs(from: string, to: string): TimeInputErrors {
  const start = parseLocalDateTime(from, 'start')
  const end = parseLocalDateTime(to, 'end')
  const errors: TimeInputErrors = {}
  if (start === 'invalid') errors.from = TIME_FORMAT_ERROR
  if (end === 'invalid') errors.to = TIME_FORMAT_ERROR
  if (typeof start === 'number' && typeof end === 'number' && start > end) errors.from = TIME_ORDER_ERROR
  return errors
}

/**
 * Quy đổi khoảng thời gian nhận sang mốc ISO UTC để gửi lên API. Khoảng tương đối được tính tại thời điểm gọi
 * (gọi trong hàm tải để mỗi lần tự cập nhật tính lại). Ô sai dạng bị bỏ qua: nơi gọi đã kiểm bằng `validateTimeInputs`.
 */
export function resolveRange(
  key: RangeKey,
  from: string,
  to: string,
  nowMs: number = Date.now(),
): { receivedFrom?: string; receivedTo?: string } {
  if (key === 'all') return {}
  if (key === 'custom') {
    const start = parseLocalDateTime(from, 'start')
    const end = parseLocalDateTime(to, 'end')
    return {
      ...(typeof start === 'number' ? { receivedFrom: toApiInstant(start) } : {}),
      ...(typeof end === 'number' ? { receivedTo: toApiInstant(end) } : {}),
    }
  }
  return { receivedFrom: toApiInstant(nowMs - PRESET_MS[key]) }
}
