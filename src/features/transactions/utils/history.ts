/**
 * Phát hiện timestamp nghiệp vụ đến sai thứ tự: một callback nhận sau nhưng có timestamp
 * nghiệp vụ cũ hơn callback nhận trước đó. Danh sách phải theo thứ tự nhận (cũ -> mới).
 */
export function hasOutOfOrderBusinessTimestamps(callbacks: { businessTimestamp: string | null }[]): boolean {
  let latestSeen: number | null = null
  for (const callback of callbacks) {
    if (!callback.businessTimestamp) continue
    const time = Date.parse(callback.businessTimestamp)
    if (Number.isNaN(time)) continue
    if (latestSeen !== null && time < latestSeen) return true
    latestSeen = latestSeen === null ? time : Math.max(latestSeen, time)
  }
  return false
}

/** Mã các lần nhận mà người dùng chưa biết (chưa có trong `knownIds`), theo thứ tự nhận. */
export function findNewCallbackIds(knownIds: readonly number[], callbacks: { recordId: number }[]): number[] {
  const known = new Set(knownIds)
  return callbacks.filter((callback) => !known.has(callback.recordId)).map((callback) => callback.recordId)
}
