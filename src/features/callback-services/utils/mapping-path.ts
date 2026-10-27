/**
 * Đường dẫn mapping theo hợp lệ của backend (openapi.yaml, `transactionIdPath`): `$.` rồi 1 đến 10 đoạn nối bằng dấu chấm,
 * mỗi đoạn gồm chữ cái ASCII, chữ số, gạch dưới, gạch ngang; tối đa 200 ký tự. Chỉ đi qua object lồng nhau
 * (không wildcard, đệ quy hay chỉ số mảng). Quy tắc cuối cùng do backend quyết định; đây chỉ là kiểm tra sớm.
 */
export const MAPPING_PATH_MAX_LENGTH = 200
export const MAPPING_PATH_MAX_SEGMENTS = 10

const MAPPING_PATH_PATTERN = /^\$\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){0,9}$/

export const MAPPING_PATH_ERROR =
  'Đường dẫn phải có dạng $.a.b.c (object lồng nhau, tối đa 10 đoạn; không dùng [ ], * hay ..).'

export function isValidMappingPath(path: string): boolean {
  return path.length <= MAPPING_PATH_MAX_LENGTH && MAPPING_PATH_PATTERN.test(path)
}

/** Các đoạn của đường dẫn hợp lệ, hoặc null nếu đường dẫn không hợp lệ. */
export function mappingPathSegments(path: string): string[] | null {
  const trimmed = path.trim()
  return isValidMappingPath(trimmed) ? trimmed.slice(2).split('.') : null
}
