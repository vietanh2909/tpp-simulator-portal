const VN_OFFSET_MS = 7 * 60 * 60 * 1000

/** Múi giờ hiển thị cố định của UI: Asia/Ho_Chi_Minh (GMT+7, không có DST). */
export const DISPLAY_TZ_LABEL = 'GMT+7'

function toVietnamIso(ms: number): string {
  return new Date(ms + VN_OFFSET_MS).toISOString()
}

/** `2026-10-20 10:24:15` (GMT+7). Trả `—` nếu rỗng hoặc không hợp lệ. */
export function formatDateTime(iso: string | null | undefined, withMillis = false): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return '—'
  const s = toVietnamIso(ms)
  return `${s.slice(0, 10)} ${s.slice(11, withMillis ? 23 : 19)}`
}

/** `10:24:15` (GMT+7). */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return '—'
  return toVietnamIso(ms).slice(11, 19)
}

export function formatRelative(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return ''
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const diffSec = Math.max(0, Math.round((nowMs - ms) / 1000))
  if (diffSec < 10) return 'vừa xong'
  if (diffSec < 60) return `${diffSec} giây trước`
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min} phút trước`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} giờ trước`
  return `${Math.floor(hours / 24)} ngày trước`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** ISO UTC -> giá trị cho `<input type="datetime-local">` theo GMT+7. */
export function toDateTimeLocalValue(iso: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  return toVietnamIso(ms).slice(0, 16)
}

/** Giá trị `datetime-local` (hiểu theo GMT+7) -> ISO UTC. Trả null nếu không hợp lệ. */
export function fromDateTimeLocalValue(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!m) return null
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])) - VN_OFFSET_MS
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

/** Pretty-print JSON nếu hợp lệ, ngược lại trả nguyên văn. */
export function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}
