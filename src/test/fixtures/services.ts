import type { ServiceDto } from '@/features/callback-services/types/callback-services.types'

/** Khóa giả của kiểm thử. Các kiểm thử khẳng định chuỗi này không bao giờ xuất hiện trong DOM, lỗi hay yêu cầu ngoài ý muốn. */
export const TEST_KEY = 'test-key-not-real'

/** Dịch vụ thu hộ, không xác thực (dạng backend trả về, đúng `openapi.yaml`). */
export const THU_HO_DTO: ServiceDto = {
  serviceCode: 'THU_HO',
  name: 'Thu hộ',
  description: 'Nhận kết quả thu hộ từ ngân hàng',
  enabled: true,
  deleted: false,
  authType: 'NONE',
  apiKeyHeaderName: null,
  apiKeyConfigured: false,
  transactionIdPath: '$.transId',
  statusPath: '$.code',
  timestampPath: '$.time',
  timestampFormat: 'ISO_8601',
  timestampPattern: null,
  defaultTimeZone: 'Asia/Ho_Chi_Minh',
  responseHttpStatus: 200,
  responseBody: { ok: true },
  callbackPath: '/callbacks/THU_HO',
  currentVersionNumber: 3,
  createdAt: '2026-10-19T03:00:00.123456Z',
  updatedAt: '2026-10-20T04:30:15Z',
}

/** Dịch vụ chi hộ có khóa API đã cấu hình và định dạng thời gian theo mẫu. */
export const CHI_HO_DTO: ServiceDto = {
  ...THU_HO_DTO,
  serviceCode: 'CHI_HO',
  name: 'Chi hộ',
  description: null,
  authType: 'API_KEY',
  apiKeyHeaderName: 'X-API-Key',
  apiKeyConfigured: true,
  transactionIdPath: '$.processId',
  statusPath: '$.status',
  timestampPath: '$.date',
  timestampFormat: 'PATTERN',
  timestampPattern: 'yyyy-MM-dd HH:mm:ss',
  responseHttpStatus: 201,
  responseBody: { code: '00' },
  callbackPath: '/callbacks/CHI_HO',
  currentVersionNumber: 1,
}

/** Dịch vụ đang tắt, không có đường dẫn timestamp. */
export const BIEN_DONG_DTO: ServiceDto = {
  ...THU_HO_DTO,
  serviceCode: 'BIEN_DONG',
  name: 'Biến động số dư',
  description: null,
  enabled: false,
  transactionIdPath: '$.trnId',
  statusPath: '$.stage',
  timestampPath: null,
  callbackPath: '/callbacks/BIEN_DONG',
}

/** Dịch vụ đã xóa mềm (backend chỉ trả khi `includeDeleted=true` hoặc khi đọc đích danh). */
export const DA_XOA_DTO: ServiceDto = {
  ...THU_HO_DTO,
  serviceCode: 'DA_XOA',
  name: 'Đã xóa',
  deleted: true,
  callbackPath: '/callbacks/DA_XOA',
}
