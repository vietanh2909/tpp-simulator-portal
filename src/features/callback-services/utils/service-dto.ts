import { DEFAULT_PATTERN, DEFAULT_TIMEZONE } from '../constants/callback-services.constants'
import type {
  BackendTimestampFormat,
  CallbackService,
  MappingTestRequest,
  ServiceCreateRequest,
  ServiceDto,
  ServiceFormValues,
  ServiceUpdateRequest,
  TimestampFormat,
} from '../types/callback-services.types'

/**
 * Backend trả ISO 8601 có thể kèm phần thập phân tới micro giây. Cắt về mili giây để không phụ thuộc
 * cách trình duyệt phân tích phần thập phân dài.
 */
export function normalizeIsoTimestamp(value: string): string {
  return value.replace(/(\.\d{3})\d+/, '$1')
}

const FORMAT_FROM_BACKEND: Record<BackendTimestampFormat, TimestampFormat> = {
  ISO_8601: 'ISO_8601',
  UNIX_SECONDS: 'UNIX_SECONDS',
  UNIX_MILLIS: 'UNIX_MILLIS',
  PATTERN: 'CUSTOM',
}

const FORMAT_TO_BACKEND: Record<TimestampFormat, BackendTimestampFormat> = {
  ISO_8601: 'ISO_8601',
  UNIX_SECONDS: 'UNIX_SECONDS',
  UNIX_MILLIS: 'UNIX_MILLIS',
  CUSTOM: 'PATTERN',
}

/** DTO `Service` của backend -> mô hình giao diện. Không có chỗ nào cho giá trị khóa: backend không bao giờ trả nó. */
export function toCallbackService(dto: ServiceDto): CallbackService {
  return {
    code: dto.serviceCode,
    callbackPath: dto.callbackPath,
    name: dto.name,
    description: dto.description ?? '',
    enabled: dto.enabled,
    deleted: dto.deleted,
    authType: dto.authType,
    apiKeyHeader: dto.apiKeyHeaderName ?? '',
    apiKeyConfigured: dto.apiKeyConfigured,
    mapping: {
      transactionId: dto.transactionIdPath,
      status: dto.statusPath,
      timestamp: dto.timestampPath ?? '',
    },
    timestampFormat: FORMAT_FROM_BACKEND[dto.timestampFormat],
    timestampPattern: dto.timestampPattern ?? DEFAULT_PATTERN,
    timezone: dto.defaultTimeZone ?? DEFAULT_TIMEZONE,
    responseStatus: dto.responseHttpStatus,
    responseBody: JSON.stringify(dto.responseBody ?? {}, null, 2),
    version: dto.currentVersionNumber,
    createdAt: normalizeIsoTimestamp(dto.createdAt),
    updatedAt: normalizeIsoTimestamp(dto.updatedAt),
  }
}

/** Mô hình giao diện -> giá trị form. Ô khóa luôn rỗng: khóa chỉ ghi, không bao giờ đọc về. */
export function toFormValues(service: CallbackService): ServiceFormValues {
  return {
    code: service.code,
    name: service.name,
    description: service.description,
    enabled: service.enabled,
    authType: service.authType,
    apiKeyHeader: service.apiKeyHeader,
    apiKeySecret: '',
    apiKeyConfigured: service.authType === 'API_KEY' && service.apiKeyConfigured,
    mapping: { ...service.mapping },
    timestampFormat: service.timestampFormat,
    timestampPattern: service.timestampPattern,
    timezone: service.timezone,
    responseStatus: String(service.responseStatus),
    responseBody: service.responseBody,
  }
}

function toConfigBody(values: ServiceFormValues): Omit<ServiceUpdateRequest, 'apiKeySecret'> {
  const apiKey = values.authType === 'API_KEY'
  const custom = values.timestampFormat === 'CUSTOM'
  const description = values.description.trim()
  const timestampPath = values.mapping.timestamp.trim()
  return {
    name: values.name.trim(),
    description: description === '' ? null : description,
    authType: values.authType,
    apiKeyHeaderName: apiKey ? values.apiKeyHeader.trim() : null,
    transactionIdPath: values.mapping.transactionId.trim(),
    statusPath: values.mapping.status.trim(),
    timestampPath: timestampPath === '' ? null : timestampPath,
    timestampFormat: FORMAT_TO_BACKEND[values.timestampFormat],
    timestampPattern: custom ? values.timestampPattern.trim() : null,
    defaultTimeZone: values.timezone,
    responseHttpStatus: Number(values.responseStatus.trim()),
    // Backend nhận GIÁ TRỊ JSON, không phải chuỗi JSON. Gọi sau khi `validateServiceForm` đã xác nhận JSON hợp lệ.
    responseBody: JSON.parse(values.responseBody) as unknown,
  }
}

/** Form (cấu hình đang nhập, có thể chưa lưu) + JSON mẫu -> yêu cầu `POST /api/mapping-tests`. Không có khóa API và không ghi gì. */
export function toMappingTestRequest(values: ServiceFormValues, sampleJson: string): MappingTestRequest {
  const timestampPath = values.mapping.timestamp.trim()
  const custom = values.timestampFormat === 'CUSTOM'
  return {
    transactionIdPath: values.mapping.transactionId.trim(),
    statusPath: values.mapping.status.trim(),
    timestampPath: timestampPath === '' ? null : timestampPath,
    timestampFormat: FORMAT_TO_BACKEND[values.timestampFormat],
    timestampPattern: custom ? values.timestampPattern.trim() : null,
    defaultTimeZone: values.timezone,
    sampleJson,
  }
}

/** `apiKeySecret` chỉ có mặt khi dùng API_KEY và người dùng thực sự gõ khóa; vắng nghĩa là giữ khóa cũ. */
function secretField(values: ServiceFormValues): { apiKeySecret?: string } {
  return values.authType === 'API_KEY' && values.apiKeySecret !== '' ? { apiKeySecret: values.apiKeySecret } : {}
}

/** Form -> yêu cầu `PUT /api/services/{code}`. */
export function toServiceRequest(values: ServiceFormValues): ServiceUpdateRequest {
  return { ...toConfigBody(values), ...secretField(values) }
}

/** Form -> yêu cầu `POST /api/services`. */
export function toCreateRequest(values: ServiceFormValues): ServiceCreateRequest {
  return {
    serviceCode: values.code.trim(),
    enabled: values.enabled,
    ...toConfigBody(values),
    ...secretField(values),
  }
}
