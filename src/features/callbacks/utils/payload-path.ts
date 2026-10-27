/** Đường dẫn mapping của backend: `$.` rồi 1 đến 10 đoạn `[A-Za-z0-9_-]`, chỉ đi qua object lồng nhau. */
const PATH_REGEX = /^\$((?:\.[A-Za-z0-9_-]+){1,10})$/

export interface PathReadResult {
  found: boolean
  value?: unknown
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Đọc giá trị theo `$.a.b.c` từ payload JSON. Chỉ đi qua object lồng nhau: gặp mảng, giá trị đơn hay đường dẫn sai
 * dạng (wildcard, chỉ số mảng) thì không đọc. Dùng để hiện giá trị gốc của timestamp cạnh thông báo lỗi (AC3.7.3),
 * vì backend không trả giá trị gốc.
 */
export function readPayloadPath(payload: unknown, path: string): PathReadResult {
  const match = PATH_REGEX.exec(path)
  if (!match) return { found: false }
  const segments = (match[1] ?? '').slice(1).split('.')
  let current: unknown = payload
  for (const segment of segments) {
    if (!isPlainObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) return { found: false }
    current = current[segment]
  }
  return { found: true, value: current }
}

/** Giá trị gốc thành chuỗi hiển thị: chuỗi giữ nguyên, các kiểu khác dạng JSON. */
export function describeRawValue(value: unknown): string {
  return typeof value === 'string' ? value : (JSON.stringify(value) ?? 'null')
}

/** Nguồn để hiện giá trị gốc của timestamp trong chi tiết một lần nhận. */
export type TimestampSource = { kind: 'path'; path: string; found: boolean; text: string | null } | { kind: 'payload' }

/**
 * Backend không trả giá trị gốc của timestamp. Khi lần nhận dùng đúng phiên bản cấu hình hiện hành của dịch vụ, đọc
 * giá trị ở `timestampPath` hiện hành từ payload JSON; khác phiên bản, dịch vụ đã xóa hay payload không phải JSON thì
 * chỉ chỉ người dùng xuống payload.
 */
export function resolveTimestampSource(
  callback: { configVersionNumber: number | null; payload: { kind: 'json'; value: unknown } | { kind: 'text' } },
  service: { timestampPath: string; version: number } | null | undefined,
): TimestampSource {
  if (
    !service ||
    !service.timestampPath ||
    callback.configVersionNumber === null ||
    callback.configVersionNumber !== service.version ||
    callback.payload.kind !== 'json'
  ) {
    return { kind: 'payload' }
  }
  const read = readPayloadPath(callback.payload.value, service.timestampPath)
  return {
    kind: 'path',
    path: service.timestampPath,
    found: read.found,
    text: read.found ? describeRawValue(read.value) : null,
  }
}
