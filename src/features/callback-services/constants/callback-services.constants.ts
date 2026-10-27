import type { SelectOption } from '@/types/common'
import type { AuthType, MappingFieldKey, TimestampFormat } from '../types/callback-services.types'

export const AUTH_TYPE_LABEL: Record<AuthType, string> = {
  NONE: 'Không xác thực',
  API_KEY: 'API key',
}

export const TIMESTAMP_FORMAT_OPTIONS: SelectOption<TimestampFormat>[] = [
  { value: 'ISO_8601', label: 'ISO 8601 (Chuẩn quốc tế)' },
  { value: 'UNIX_SECONDS', label: 'Unix timestamp (giây)' },
  { value: 'UNIX_MILLIS', label: 'Unix timestamp (mili giây)' },
  { value: 'CUSTOM', label: 'Tùy chỉnh (mẫu định dạng)' },
]

export interface TimezoneOption extends SelectOption {
  offsetMinutes: number
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (GMT+7)', offsetMinutes: 7 * 60 },
  { value: 'UTC', label: 'UTC (GMT+0)', offsetMinutes: 0 },
]

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'

export const DEFAULT_PATTERN = 'yyyy-MM-dd HH:mm:ss'

/** Mặc định khi tạo dịch vụ (D13). */
export const DEFAULT_RESPONSE_BODY = '{}'

export const MAX_NAME_LENGTH = 100
export const MAX_DESCRIPTION_LENGTH = 500
export const MAX_PATTERN_LENGTH = 100
export const MAX_API_KEY_HEADER_LENGTH = 100
export const MAX_API_KEY_SECRET_LENGTH = 256
/** Giới hạn `responseBody` của backend: 64 KB. */
export const MAX_RESPONSE_BODY_BYTES = 64 * 1024
/** HTTP không cho phép thân với các mã này nên backend từ chối. */
export const FORBIDDEN_RESPONSE_STATUSES: readonly number[] = [204, 205, 304]

export interface MappingFieldMeta {
  key: MappingFieldKey
  label: string
  required: boolean
  description: string
  example: string
  dataType: string
}

export const MAPPING_FIELDS: MappingFieldMeta[] = [
  {
    key: 'transactionId',
    label: 'transactionId',
    required: true,
    description: 'Mã định danh giao dịch phía Core',
    example: 'Ví dụ: $.transId hoặc $.data.transId',
    dataType: 'String / Integer',
  },
  {
    key: 'status',
    label: 'status',
    required: true,
    description: 'Trạng thái nghiệp vụ ngân hàng gửi (giữ nguyên giá trị)',
    example: 'Ví dụ: $.code hoặc $.data.status',
    dataType: 'String / Enum',
  },
  {
    key: 'timestamp',
    label: 'timestamp',
    required: false,
    description: 'Thời điểm phát sinh giao dịch (timestamp nghiệp vụ)',
    example: 'Ví dụ: $.time hoặc $.audit.createdAt',
    dataType: 'DateTime ISO / Epoch',
  },
]

export const MAX_SERVICE_CODE_LENGTH = 50
