import { env } from './env'

/** Cấu hình tập trung của ứng dụng. */
export const appConfig = {
  appName: 'TPP Simulator',
  environmentLabel: 'UAT',
  version: '0.1.0-uat',
  apiBaseUrl: env.apiBaseUrl,
  /** Gốc URL callback: cấu hình nếu có, nếu không thì địa chỉ trang đang mở (D8). */
  get callbackBaseUrl(): string {
    return env.callbackBaseUrl || window.location.origin
  },
  displayTimezone: 'Asia/Ho_Chi_Minh',
  displayTimezoneLabel: 'GMT+7',
  /** Chu kỳ tự cập nhật (polling) ở màn hình theo dõi. */
  pollIntervalMs: 5000,
  /** Cỡ trang mặc định của danh sách theo dõi (backend: `size` mặc định 20). */
  defaultPageSize: 20,
  /** Backend chỉ nhận `size` thuộc ba giá trị này; gửi giá trị khác bị 400. */
  pageSizeOptions: [20, 50, 100],
} as const
