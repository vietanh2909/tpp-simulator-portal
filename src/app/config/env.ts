const raw = import.meta.env

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

/** Giá trị đọc từ biến môi trường Vite (xem .env.example). */
export const env = {
  /** Để trống: gọi cùng nguồn qua Vite proxy. */
  apiBaseUrl: trimTrailingSlash(raw.VITE_API_BASE_URL ?? ''),
  /** Để trống: dùng `window.location.origin` (xem `appConfig.callbackBaseUrl`). */
  callbackBaseUrl: trimTrailingSlash(raw.VITE_CALLBACK_BASE_URL ?? ''),
} as const
