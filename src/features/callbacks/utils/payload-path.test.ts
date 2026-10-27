import { describe, expect, it } from 'vitest'
import { describeRawValue, readPayloadPath, resolveTimestampSource } from './payload-path'

describe('Đọc giá trị theo đường dẫn $.a.b.c từ payload', () => {
  it('đọc được giá trị ở object lồng nhau', () => {
    expect(readPayloadPath({ a: { b: { c: 'x' } } }, '$.a.b.c')).toEqual({ found: true, value: 'x' })
    expect(readPayloadPath({ time: 123 }, '$.time')).toEqual({ found: true, value: 123 })
  })

  it('thiếu khóa hoặc đi qua mảng, giá trị đơn thì không đọc', () => {
    expect(readPayloadPath({ a: {} }, '$.a.b')).toEqual({ found: false })
    expect(readPayloadPath({ a: [{ b: 1 }] }, '$.a.b')).toEqual({ found: false })
    expect(readPayloadPath({ a: 'chuỗi' }, '$.a.b')).toEqual({ found: false })
    expect(readPayloadPath(null, '$.a')).toEqual({ found: false })
  })

  it('đường dẫn sai dạng (wildcard, chỉ số mảng, không có $.) không được đọc; không đọc khóa kế thừa', () => {
    for (const path of ['$.a[0]', '$..a', '$.*', 'a.b', '$', '$.']) {
      expect(readPayloadPath({ a: [1], '*': 1 }, path)).toEqual({ found: false })
    }
    expect(readPayloadPath({}, '$.constructor')).toEqual({ found: false })
  })

  it('describeRawValue giữ nguyên chuỗi và biểu diễn kiểu khác dưới dạng JSON', () => {
    expect(describeRawValue('19/10/2026')).toBe('19/10/2026')
    expect(describeRawValue(42)).toBe('42')
    expect(describeRawValue({ a: 1 })).toBe('{"a":1}')
    expect(describeRawValue(null)).toBe('null')
  })
})

describe('Giá trị gốc của timestamp (AC3.7.3)', () => {
  const payload = { kind: 'json' as const, value: { time: '19/10/2026 10:24' } }
  const service = { timestampPath: '$.time', version: 3 }

  it('cùng phiên bản cấu hình thì đọc theo đường dẫn hiện tại của dịch vụ', () => {
    expect(resolveTimestampSource({ configVersionNumber: 3, payload }, service)).toEqual({
      kind: 'path',
      path: '$.time',
      found: true,
      text: '19/10/2026 10:24',
    })
  })

  it('đường dẫn hiện tại không có trong payload thì found=false', () => {
    expect(
      resolveTimestampSource({ configVersionNumber: 3, payload }, { ...service, timestampPath: '$.khac' }),
    ).toEqual({
      kind: 'path',
      path: '$.khac',
      found: false,
      text: null,
    })
  })

  it('khác phiên bản, dịch vụ đã xóa, payload văn bản hoặc không có đường dẫn thì chỉ xuống payload', () => {
    expect(resolveTimestampSource({ configVersionNumber: 2, payload }, service)).toEqual({ kind: 'payload' })
    expect(resolveTimestampSource({ configVersionNumber: 3, payload }, null)).toEqual({ kind: 'payload' })
    expect(resolveTimestampSource({ configVersionNumber: 3, payload: { kind: 'text' } }, service)).toEqual({
      kind: 'payload',
    })
    expect(resolveTimestampSource({ configVersionNumber: null, payload }, service)).toEqual({ kind: 'payload' })
    expect(resolveTimestampSource({ configVersionNumber: 3, payload }, { ...service, timestampPath: '' })).toEqual({
      kind: 'payload',
    })
  })
})
