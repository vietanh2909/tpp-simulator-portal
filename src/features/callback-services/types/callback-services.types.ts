import type { IsoDateTime } from '@/types/common'

export type AuthType = 'NONE' | 'API_KEY'
/** Định dạng thời gian ở giao diện. `CUSTOM` tương ứng `PATTERN` của backend. */
export type TimestampFormat = 'ISO_8601' | 'UNIX_SECONDS' | 'UNIX_MILLIS' | 'CUSTOM'
export type MappingFieldKey = 'transactionId' | 'status' | 'timestamp'
export type FieldMapping = Record<MappingFieldKey, string>

/** Phần cấu hình của một dịch vụ ở mô hình giao diện. Không bao giờ chứa giá trị khóa API. */
export interface ServiceSettings {
  name: string
  description: string
  enabled: boolean
  authType: AuthType
  /** Tên header chứa API key (chỉ dùng khi authType = API_KEY). */
  apiKeyHeader: string
  /** Backend đã lưu một khóa cho dịch vụ này. Chỉ là cờ; giá trị khóa không bao giờ được trả về. */
  apiKeyConfigured: boolean
  mapping: FieldMapping
  timestampFormat: TimestampFormat
  /** Mẫu thời gian kiểu Java `DateTimeFormatter`, ví dụ `yyyy-MM-dd HH:mm:ss` (chỉ dùng khi timestampFormat = CUSTOM). */
  timestampPattern: string
  /** Múi giờ áp dụng khi dữ liệu thời gian không kèm múi giờ. */
  timezone: string
  responseStatus: number
  /** Body JSON cố định trả về khi tiếp nhận callback, dạng văn bản để soạn thảo. */
  responseBody: string
}

export interface CallbackService extends ServiceSettings {
  /** Mã dịch vụ duy nhất, không đổi sau khi tạo (giữ chữ gốc lúc tạo). */
  code: string
  /** Đường dẫn callback do backend trả, ví dụ `/callbacks/THU_HO`. */
  callbackPath: string
  /** Số phiên bản cấu hình hiện hành (chỉ tăng khi cấu hình thật sự đổi). */
  version: number
  deleted: boolean
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export type ServiceStatusFilter = 'all' | 'enabled' | 'disabled'

export interface ListServicesParams {
  /** true: kèm dịch vụ đã xóa mềm (dùng cho bộ lọc ở màn hình theo dõi). Mặc định false. */
  includeDeleted?: boolean
}

export interface ServiceListResult {
  items: CallbackService[]
  /** Tổng số dịch vụ trả về (chưa áp bộ lọc tìm kiếm). */
  total: number
  enabledTotal: number
}

/** Giá trị form (chuỗi hóa) của màn hình tạo/sửa dịch vụ. */
export interface ServiceFormValues {
  code: string
  name: string
  description: string
  enabled: boolean
  authType: AuthType
  apiKeyHeader: string
  /** Khóa mới do người dùng gõ. Chỉ ghi: luôn rỗng khi mở form sửa. */
  apiKeySecret: string
  /** Dịch vụ đang sửa đã có khóa trên backend (quyết định ô khóa trống nghĩa là giữ khóa cũ). Không sửa được. */
  apiKeyConfigured: boolean
  mapping: FieldMapping
  timestampFormat: TimestampFormat
  timestampPattern: string
  timezone: string
  responseStatus: string
  responseBody: string
}

export type ServiceFormErrorKey =
  | 'code'
  | 'name'
  | 'description'
  | 'apiKeyHeader'
  | 'apiKeySecret'
  | 'mapping.transactionId'
  | 'mapping.status'
  | 'mapping.timestamp'
  | 'timestampFormat'
  | 'timestampPattern'
  | 'timezone'
  | 'responseStatus'
  | 'responseBody'

export type ServiceFormErrors = Partial<Record<ServiceFormErrorKey, string>>

// ---------------------------------------------------------------------------------------------
// DTO của backend (tpp-simulator-app/docs/api/openapi.yaml). Tách riêng khỏi mô hình giao diện.
// ---------------------------------------------------------------------------------------------

export type BackendTimestampFormat = 'ISO_8601' | 'UNIX_SECONDS' | 'UNIX_MILLIS' | 'PATTERN'

/** Schema `ServiceConfig`: cấu hình dùng chung cho yêu cầu và phản hồi. Không có khóa API. */
export interface ServiceConfigDto {
  name: string
  description?: string | null
  authType: AuthType
  apiKeyHeaderName?: string | null
  transactionIdPath: string
  statusPath: string
  timestampPath?: string | null
  timestampFormat: BackendTimestampFormat
  timestampPattern?: string | null
  defaultTimeZone?: string
  responseHttpStatus: number
  /** Giá trị JSON bất kỳ (không phải chuỗi). */
  responseBody: unknown
}

/** Schema `Service`: phản hồi của backend. */
export interface ServiceDto extends ServiceConfigDto {
  serviceCode: string
  enabled: boolean
  deleted: boolean
  apiKeyConfigured: boolean
  callbackPath: string
  currentVersionNumber: number
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/** Yêu cầu `POST /api/mapping-tests` (openapi.yaml, `testMapping`). */
export interface MappingTestRequest {
  transactionIdPath: string
  statusPath: string
  timestampPath: string | null
  timestampFormat: BackendTimestampFormat
  timestampPattern: string | null
  defaultTimeZone: string
  /** JSON mẫu dạng chuỗi, tối đa 1 MiB. */
  sampleJson: string
}

export type MappingFieldErrorCode =
  'NOT_FOUND' | 'EMPTY' | 'WRONG_TYPE' | 'TOO_LONG' | 'PAYLOAD_NOT_OBJECT' | 'UNPARSEABLE'

/** Schema `FieldResult` của backend. */
export interface MappingFieldResultDto {
  value?: string | null
  errorCode?: MappingFieldErrorCode | null
  error?: string | null
  warning?: string | null
}

/** Phản hồi `POST /api/mapping-tests`. JSON mẫu hỏng là 200 với `sampleJsonValid=false`. */
export interface MappingTestResponse {
  sampleJsonValid: boolean
  sampleJsonError?: string | null
  transactionId?: MappingFieldResultDto
  status?: MappingFieldResultDto
  timestamp?: MappingFieldResultDto
}

/** Schema `ServiceCreate`. `apiKeySecret` chỉ ghi. */
export interface ServiceCreateRequest extends ServiceConfigDto {
  serviceCode: string
  enabled: boolean
  apiKeySecret?: string
}

/** Schema `ServiceUpdate`. `apiKeySecret` vắng nghĩa là giữ khóa cũ. */
export interface ServiceUpdateRequest extends ServiceConfigDto {
  apiKeySecret?: string
}
