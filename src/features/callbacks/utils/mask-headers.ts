const SENSITIVE_NAME_REGEX = /(authorization|cookie|api[-_]?key|token|secret|password|signature)/i

/**
 * Header có giá trị nhạy cảm (khóa, token...): ô nhập giá trị được che. Việc che header trong lịch sử callback
 * do backend làm (hiện `***`), nên ở trình duyệt chỉ còn cần phân loại để che ô nhập.
 */
export function isSensitiveHeader(name: string, apiKeyHeader?: string): boolean {
  if (apiKeyHeader && name.toLowerCase() === apiKeyHeader.toLowerCase()) return true
  return SENSITIVE_NAME_REGEX.test(name)
}
