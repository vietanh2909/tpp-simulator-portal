import { describe, expect, it } from 'vitest'
import { CHI_HO_DTO, THU_HO_DTO, TEST_KEY } from '@/test/fixtures/services'
import type { ServiceFormValues } from '../types/callback-services.types'
import {
  normalizeIsoTimestamp,
  toCallbackService,
  toCreateRequest,
  toFormValues,
  toServiceRequest,
} from './service-dto'

function formValues(overrides: Partial<ServiceFormValues> = {}): ServiceFormValues {
  return {
    ...toFormValues(toCallbackService(THU_HO_DTO)),
    ...overrides,
  }
}

describe('toCallbackService (DTO backend -> mô hình giao diện)', () => {
  it('ánh xạ tên trường, PATTERN thành CUSTOM và đưa giá trị vắng về chuỗi rỗng', () => {
    const service = toCallbackService(CHI_HO_DTO)

    expect(service).toMatchObject({
      code: 'CHI_HO',
      callbackPath: '/callbacks/CHI_HO',
      name: 'Chi hộ',
      description: '',
      authType: 'API_KEY',
      apiKeyHeader: 'X-API-Key',
      apiKeyConfigured: true,
      mapping: { transactionId: '$.processId', status: '$.status', timestamp: '$.date' },
      timestampFormat: 'CUSTOM',
      timestampPattern: 'yyyy-MM-dd HH:mm:ss',
      timezone: 'Asia/Ho_Chi_Minh',
      responseStatus: 201,
      version: 1,
      deleted: false,
    })
  })

  it('đưa responseBody (giá trị JSON) về văn bản để soạn thảo và cắt thời điểm về mili giây', () => {
    const service = toCallbackService(THU_HO_DTO)

    expect(JSON.parse(service.responseBody)).toEqual({ ok: true })
    expect(service.createdAt).toBe('2026-10-19T03:00:00.123Z')
    expect(service.updatedAt).toBe('2026-10-20T04:30:15Z')
    expect(normalizeIsoTimestamp('2026-10-19T03:00:00.123456789Z')).toBe('2026-10-19T03:00:00.123Z')
  })

  it('đường dẫn timestamp vắng thành chuỗi rỗng và múi giờ vắng lấy mặc định Asia/Ho_Chi_Minh', () => {
    const service = toCallbackService({ ...THU_HO_DTO, timestampPath: null, defaultTimeZone: undefined })

    expect(service.mapping.timestamp).toBe('')
    expect(service.timezone).toBe('Asia/Ho_Chi_Minh')
  })

  it('không mang theo và không đọc về giá trị khóa: form sửa luôn có ô khóa rỗng', () => {
    const service = toCallbackService({ ...CHI_HO_DTO, apiKeySecret: TEST_KEY } as typeof CHI_HO_DTO)
    const values = toFormValues(service)

    expect(JSON.stringify(service)).not.toContain(TEST_KEY)
    expect(JSON.stringify(values)).not.toContain(TEST_KEY)
    expect(values.apiKeySecret).toBe('')
    expect(values.apiKeyConfigured).toBe(true)
  })
})

describe('toServiceRequest / toCreateRequest (form -> yêu cầu backend)', () => {
  it('không gửi apiKeySecret khi ô khóa để trống (giữ khóa cũ)', () => {
    const values = toFormValues(toCallbackService(CHI_HO_DTO))

    const request = toServiceRequest(values)

    expect('apiKeySecret' in request).toBe(false)
    expect(request.apiKeyHeaderName).toBe('X-API-Key')
    expect(request.authType).toBe('API_KEY')
  })

  it('gửi apiKeySecret khi người dùng nhập khóa mới', () => {
    const values = { ...toFormValues(toCallbackService(CHI_HO_DTO)), apiKeySecret: TEST_KEY }

    expect(toServiceRequest(values).apiKeySecret).toBe(TEST_KEY)
  })

  it('chuyển sang NONE thì bỏ cả tên header và khóa dù ô khóa còn nội dung', () => {
    const values = { ...toFormValues(toCallbackService(CHI_HO_DTO)), authType: 'NONE' as const, apiKeySecret: TEST_KEY }

    const request = toServiceRequest(values)

    expect(request.authType).toBe('NONE')
    expect(request.apiKeyHeaderName).toBeNull()
    expect('apiKeySecret' in request).toBe(false)
    expect(JSON.stringify(request)).not.toContain(TEST_KEY)
  })

  it('gửi responseBody dạng giá trị JSON, CUSTOM thành PATTERN và mẫu chỉ đi kèm PATTERN', () => {
    const custom = toServiceRequest(
      formValues({ timestampFormat: 'CUSTOM', timestampPattern: ' yyyyMMdd HHmmss ', responseBody: '{"ok": true}' }),
    )
    const iso = toServiceRequest(formValues({ timestampFormat: 'ISO_8601', timestampPattern: 'yyyy' }))

    expect(custom.responseBody).toEqual({ ok: true })
    expect(typeof custom.responseBody).toBe('object')
    expect(custom.timestampFormat).toBe('PATTERN')
    expect(custom.timestampPattern).toBe('yyyyMMdd HHmmss')
    expect(iso.timestampFormat).toBe('ISO_8601')
    expect(iso.timestampPattern).toBeNull()
  })

  it('đường dẫn timestamp và mô tả rỗng thành null, đường dẫn được cắt khoảng trắng, status thành số', () => {
    const request = toServiceRequest(
      formValues({
        description: '   ',
        responseStatus: ' 201 ',
        mapping: { transactionId: ' $.a.b ', status: '$.c', timestamp: '' },
      }),
    )

    expect(request.description).toBeNull()
    expect(request.timestampPath).toBeNull()
    expect(request.transactionIdPath).toBe('$.a.b')
    expect(request.responseHttpStatus).toBe(201)
    expect(request.defaultTimeZone).toBe('Asia/Ho_Chi_Minh')
  })

  it('yêu cầu tạo mang serviceCode đã cắt khoảng trắng, enabled và khóa mới', () => {
    const values = formValues({
      code: ' THU_HO ',
      enabled: false,
      authType: 'API_KEY',
      apiKeyHeader: 'X-API-Key',
      apiKeySecret: TEST_KEY,
    })

    const request = toCreateRequest(values)

    expect(request.serviceCode).toBe('THU_HO')
    expect(request.enabled).toBe(false)
    expect(request.apiKeySecret).toBe(TEST_KEY)
  })
})
