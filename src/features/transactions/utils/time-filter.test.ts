import { describe, expect, it } from 'vitest'
import {
  TIME_FORMAT_ERROR,
  TIME_ORDER_ERROR,
  parseLocalDateTime,
  resolveRange,
  toApiInstant,
  validateTimeInputs,
} from './time-filter'

const NOW = Date.UTC(2026, 9, 19, 3, 0, 0)

describe('Phân tích ô thời gian (GMT+7)', () => {
  it('đổi yyyy-MM-dd HH:mm:ss giờ Việt Nam sang UTC, kể cả qua nửa đêm', () => {
    const midnight = parseLocalDateTime('2026-10-19 00:30:00', 'start')
    const evening = parseLocalDateTime('2026-10-19 23:59:59', 'end')

    expect(typeof midnight === 'number' && toApiInstant(midnight)).toBe('2026-10-18T17:30:00Z')
    expect(typeof evening === 'number' && toApiInstant(evening)).toBe('2026-10-19T16:59:59Z')
  })

  it('gõ tắt yyyy-MM-dd là 00:00:00 cho ô "Từ" và 23:59:59 cho ô "Đến"', () => {
    const start = parseLocalDateTime('2026-10-19', 'start')
    const end = parseLocalDateTime('2026-10-19', 'end')

    expect(typeof start === 'number' && toApiInstant(start)).toBe('2026-10-18T17:00:00Z')
    expect(typeof end === 'number' && toApiInstant(end)).toBe('2026-10-19T16:59:59Z')
  })

  it('ô rỗng là không giới hạn; sai dạng hoặc ngày không tồn tại là không hợp lệ', () => {
    expect(parseLocalDateTime('   ', 'start')).toBeNull()
    for (const bad of [
      '2026-10-19T10:00:00',
      '19/10/2026',
      '2026-10-19 10:00',
      '2026-02-30',
      '2026-13-01',
      '2026-10-19 24:00:00',
    ]) {
      expect(parseLocalDateTime(bad, 'start')).toBe('invalid')
    }
  })

  it('mốc gửi API không có phần thập phân giây', () => {
    expect(toApiInstant(Date.UTC(2026, 9, 19, 4, 0, 0, 999))).toBe('2026-10-19T04:00:00Z')
  })
})

describe('Kiểm tra khoảng thời gian tùy chọn', () => {
  it('dạng sai báo lỗi cạnh đúng ô với chữ "Nhập theo dạng yyyy-MM-dd HH:mm:ss."', () => {
    expect(validateTimeInputs('hôm qua', '2026-10-19 11:00:00')).toEqual({ from: TIME_FORMAT_ERROR })
    expect(validateTimeInputs('2026-10-19 10:00:00', '11:00')).toEqual({ to: TIME_FORMAT_ERROR })
    expect(TIME_FORMAT_ERROR).toBe('Nhập theo dạng yyyy-MM-dd HH:mm:ss.')
  })

  it('"Từ" sau "Đến" báo "Thời gian bắt đầu phải trước thời gian kết thúc."', () => {
    expect(validateTimeInputs('2026-10-19 12:00:00', '2026-10-19 11:00:00')).toEqual({ from: TIME_ORDER_ERROR })
    expect(TIME_ORDER_ERROR).toBe('Thời gian bắt đầu phải trước thời gian kết thúc.')
  })

  it('đầu và cuối trùng giây vẫn hợp lệ, một đầu để trống vẫn hợp lệ', () => {
    expect(validateTimeInputs('2026-10-19 10:00:00', '2026-10-19 10:00:00')).toEqual({})
    expect(validateTimeInputs('', '2026-10-19')).toEqual({})
  })
})

describe('Quy đổi khoảng thời gian sang tham số API', () => {
  it('biên 10:00:00 và 11:00:00 (GMT+7) đều nằm trong khoảng vì "đến" là hết chính giây đó', () => {
    const range = resolveRange('custom', '2026-10-19 10:00:00', '2026-10-19 11:00:00')

    expect(range).toEqual({ receivedFrom: '2026-10-19T03:00:00Z', receivedTo: '2026-10-19T04:00:00Z' })
  })

  it('"all" không giới hạn; "custom" bỏ qua ô sai dạng', () => {
    expect(resolveRange('all', 'x', 'y')).toEqual({})
    expect(resolveRange('custom', 'sai', '2026-10-19 11:00:00')).toEqual({ receivedTo: '2026-10-19T04:00:00Z' })
  })

  it('preset tương đối tính từ thời điểm gọi và không có phần thập phân', () => {
    expect(resolveRange('15m', '', '', NOW + 123)).toEqual({ receivedFrom: '2026-10-19T02:45:00Z' })
    expect(resolveRange('1h', '', '', NOW)).toEqual({ receivedFrom: '2026-10-19T02:00:00Z' })
    expect(resolveRange('24h', '', '', NOW)).toEqual({ receivedFrom: '2026-10-18T03:00:00Z' })
    expect(resolveRange('7d', '', '', NOW)).toEqual({ receivedFrom: '2026-10-12T03:00:00Z' })
  })
})
