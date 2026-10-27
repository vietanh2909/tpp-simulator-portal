/** Trạng thái điều hướng kèm theo khi mở chi tiết từ danh sách: địa chỉ danh sách (có bộ lọc, trang, tab) để quay lại. */
export interface BackState {
  backTo: string
}

export function buildBackState(pathname: string, search: string): BackState {
  return { backTo: `${pathname}${search}` }
}

/** Chỉ nhận đường dẫn nội bộ của ứng dụng (bắt đầu bằng một dấu `/`), tránh chuyển hướng ra ngoài. */
export function readBackTo(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('backTo' in state)) return undefined
  const value = (state as { backTo: unknown }).backTo
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : undefined
}
