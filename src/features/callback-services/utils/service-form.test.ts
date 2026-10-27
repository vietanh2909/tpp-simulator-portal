import { describe, expect, it } from 'vitest'
import { ApiError } from '@/services/http/error-handler'
import type { ServiceFormValues } from '../types/callback-services.types'
import {
  applyApiError,
  EMPTY_FORM_VALUES,
  firstErrorKey,
  isTimestampSettingsLocked,
  validateServiceForm,
} from './service-form'

function valid(overrides: Partial<ServiceFormValues> = {}): ServiceFormValues {
  return {
    ...EMPTY_FORM_VALUES,
    code: 'THU_HO',
    name: 'Thu hộ',
    mapping: { transactionId: '$.transId', status: '$.code', timestamp: '$.time' },
    ...overrides,
  }
}

const NEW = { isNew: true }
const EDIT = { isNew: false }

describe('validateServiceForm: mặc định và mã dịch vụ', () => {
  it('giá trị mặc định khi tạo: bật, NONE, ISO 8601, Asia/Ho_Chi_Minh, response 200 với body {}', () => {
    expect(EMPTY_FORM_VALUES).toMatchObject({
      enabled: true,
      authType: 'NONE',
      timestampFormat: 'ISO_8601',
      timezone: 'Asia/Ho_Chi_Minh',
      responseStatus: '200',
      responseBody: '{}',
    })
    expect(validateServiceForm(valid(), NEW)).toEqual({})
  })

  it('chấp nhận chữ hoa và gạch dưới, từ chối ký tự lạ, mã rỗng và mã dài 51 ký tự', () => {
    expect(validateServiceForm(valid({ code: 'THU_HO' }), NEW).code).toBeUndefined()
    expect(validateServiceForm(valid({ code: 'thu_ho' }), NEW).code).toBeUndefined()
    expect(validateServiceForm(valid({ code: 'a'.repeat(50) }), NEW).code).toBeUndefined()
    expect(validateServiceForm(valid({ code: 'a'.repeat(51) }), NEW).code).toContain('1–50')
    expect(validateServiceForm(valid({ code: 'thu ho' }), NEW).code).toContain('chữ, số')
    expect(validateServiceForm(valid({ code: 'thu.ho' }), NEW).code).toContain('chữ, số')
    expect(validateServiceForm(valid({ code: '  ' }), NEW).code).toBe('Nhập mã dịch vụ.')
  })

  it('không kiểm tra mã khi sửa (ô mã chỉ đọc) nhưng tên vẫn bắt buộc', () => {
    const errors = validateServiceForm(valid({ code: 'khong hop le', name: '  ' }), EDIT)

    expect(errors.code).toBeUndefined()
    expect(errors.name).toBe('Nhập tên dịch vụ.')
  })
})

describe('validateServiceForm: mapping', () => {
  it('chấp nhận $.a.b.c và từ chối data.transId, $.items[0].id, $..id, $ trơn', () => {
    const ok = validateServiceForm(
      valid({ mapping: { transactionId: '$.data.transId', status: '$.status', timestamp: '$.date' } }),
      NEW,
    )
    expect(ok).toEqual({})

    for (const bad of ['data.transId', '$.items[0].id', '$..id', '$', '$.a.*', '$.a b']) {
      const errors = validateServiceForm(valid({ mapping: { transactionId: bad, status: '$.s', timestamp: '' } }), NEW)
      expect(errors['mapping.transactionId'], bad).toContain('$.a.b.c')
    }
  })

  it('giới hạn 10 đoạn và 200 ký tự; transactionId và status bắt buộc, timestamp được để trống', () => {
    const tenSegments = `$.${Array.from({ length: 10 }, (_, i) => `s${i}`).join('.')}`
    const elevenSegments = `${tenSegments}.s10`
    const tooLong = `$.${'a'.repeat(199)}`

    expect(
      validateServiceForm(valid({ mapping: { transactionId: tenSegments, status: '$.s', timestamp: '' } }), NEW),
    ).toEqual({})
    expect(
      validateServiceForm(valid({ mapping: { transactionId: elevenSegments, status: '$.s', timestamp: '' } }), NEW)[
        'mapping.transactionId'
      ],
    ).toBeDefined()
    expect(
      validateServiceForm(valid({ mapping: { transactionId: tooLong, status: '$.s', timestamp: '' } }), NEW)[
        'mapping.transactionId'
      ],
    ).toBeDefined()

    const empty = validateServiceForm(valid({ mapping: { transactionId: '', status: ' ', timestamp: '' } }), NEW)
    expect(empty['mapping.transactionId']).toBe('Nhập đường dẫn.')
    expect(empty['mapping.status']).toBe('Nhập đường dẫn.')
    expect(empty['mapping.timestamp']).toBeUndefined()
  })

  it('mẫu thời gian chuỗi: bắt buộc khi chọn Tùy chỉnh, cần đủ năm tháng ngày giờ phút, bỏ qua khi chọn định dạng khác', () => {
    expect(validateServiceForm(valid({ timestampFormat: 'CUSTOM', timestampPattern: '' }), NEW).timestampPattern).toBe(
      'Nhập mẫu ngày giờ.',
    )
    expect(
      validateServiceForm(valid({ timestampFormat: 'CUSTOM', timestampPattern: 'abc' }), NEW).timestampPattern,
    ).toContain('DateTimeFormatter')
    expect(
      validateServiceForm(valid({ timestampFormat: 'CUSTOM', timestampPattern: 'yyyy-MM-dd HH:mm:ss' }), NEW)
        .timestampPattern,
    ).toBeUndefined()
    // R-04: backend chấp nhận `u` cho năm, form không được chặn mẫu hợp lệ này.
    expect(
      validateServiceForm(valid({ timestampFormat: 'CUSTOM', timestampPattern: 'uuuu-MM-dd HH:mm:ss' }), NEW)
        .timestampPattern,
    ).toBeUndefined()
    expect(
      validateServiceForm(valid({ timestampFormat: 'ISO_8601', timestampPattern: 'abc' }), NEW).timestampPattern,
    ).toBeUndefined()
  })

  it('khóa định dạng và múi giờ khi đường dẫn timestamp để trống (D3)', () => {
    expect(
      isTimestampSettingsLocked(valid({ mapping: { transactionId: '$.a', status: '$.b', timestamp: '  ' } })),
    ).toBe(true)
    expect(isTimestampSettingsLocked(valid())).toBe(false)
  })
})

describe('validateServiceForm: response', () => {
  it('HTTP status chỉ nhận 200 đến 599: biên 199, 200, 599, 600 và chuỗi không phải số', () => {
    const status = (value: string) => validateServiceForm(valid({ responseStatus: value }), NEW).responseStatus

    expect(status('199')).toBe('HTTP status phải từ 200 đến 599.')
    expect(status('200')).toBeUndefined()
    expect(status('599')).toBeUndefined()
    expect(status('600')).toBe('HTTP status phải từ 200 đến 599.')
    expect(status('abc')).toBe('HTTP status phải từ 200 đến 599.')
    expect(status('')).toBe('HTTP status phải từ 200 đến 599.')
  })

  it('từ chối 204, 205 và 304 vì HTTP không cho phép body', () => {
    for (const code of ['204', '205', '304']) {
      expect(validateServiceForm(valid({ responseStatus: code }), NEW).responseStatus, code).toContain(
        '204, 205 hoặc 304',
      )
    }
  })

  it('body phải là JSON hợp lệ và không quá 64 KB', () => {
    const body = (value: string) => validateServiceForm(valid({ responseBody: value }), NEW).responseBody

    expect(body('{ok:true}')).toBe('Body phải là JSON hợp lệ.')
    expect(body('')).toBe('Body phải là JSON hợp lệ.')
    expect(body('{"ok":true}')).toBeUndefined()
    expect(body('null')).toBeUndefined()
    expect(body(JSON.stringify({ pad: 'x'.repeat(65 * 1024) }))).toBe('Body tối đa 64 KB.')
  })
})

describe('validateServiceForm: khóa API', () => {
  const apiKey = { authType: 'API_KEY' as const, apiKeyHeader: 'X-API-Key' }

  it('tạo mới với API_KEY: bắt buộc tên header và giá trị khóa', () => {
    const errors = validateServiceForm(valid({ ...apiKey, apiKeyHeader: ' ', apiKeySecret: '' }), NEW)

    expect(errors.apiKeyHeader).toBe('Nhập tên header.')
    expect(errors.apiKeySecret).toBe('Nhập giá trị khóa.')
  })

  it('sửa dịch vụ đã có khóa: để trống ô khóa là giữ khóa cũ, không báo lỗi', () => {
    const errors = validateServiceForm(valid({ ...apiKey, apiKeySecret: '', apiKeyConfigured: true }), EDIT)

    expect(errors).toEqual({})
  })

  it('sửa dịch vụ chuyển từ NONE sang API_KEY thì bắt buộc nhập khóa', () => {
    const errors = validateServiceForm(valid({ ...apiKey, apiKeySecret: '', apiKeyConfigured: false }), EDIT)

    expect(errors.apiKeySecret).toBe('Nhập giá trị khóa.')
  })

  it('khóa mới phải là ASCII in được, không có khoảng trắng đầu cuối; tên header chỉ gồm ký tự hợp lệ; NONE bỏ qua mọi quy tắc khóa', () => {
    expect(validateServiceForm(valid({ ...apiKey, apiKeySecret: ' abc' }), NEW).apiKeySecret).toContain('ASCII')
    expect(validateServiceForm(valid({ ...apiKey, apiKeySecret: 'khóa-có-dấu' }), NEW).apiKeySecret).toContain('ASCII')
    expect(validateServiceForm(valid({ ...apiKey, apiKeySecret: 'a'.repeat(257) }), NEW).apiKeySecret).toContain('256')
    expect(
      validateServiceForm(valid({ ...apiKey, apiKeyHeader: 'X API', apiKeySecret: 'k' }), NEW).apiKeyHeader,
    ).toContain('không hợp lệ')
    expect(validateServiceForm(valid({ authType: 'NONE', apiKeyHeader: '', apiKeySecret: '' }), NEW)).toEqual({})
  })
})

describe('applyApiError: lỗi từ backend về từng ô', () => {
  it('ánh xạ fieldErrors[] theo tên trường backend, giữ lỗi đầu tiên của mỗi ô và gom lỗi không gắn được', () => {
    const error = new ApiError(400, 'VALIDATION_FAILED', 'Sai.', [
      { field: 'transactionIdPath', message: 'Đường dẫn sai.' },
      { field: 'transactionIdPath', message: 'Lỗi thứ hai bị bỏ.' },
      { field: 'responseHttpStatus', message: 'Status sai.' },
      { field: 'defaultTimeZone', message: 'Múi giờ sai.' },
      { field: 'apiKeyHeaderName', message: 'Header sai.' },
      { field: 'khongBiet', message: 'Lỗi lạ.' },
    ])

    const { errors, unmatched } = applyApiError(error)

    expect(errors).toEqual({
      'mapping.transactionId': 'Đường dẫn sai.',
      responseStatus: 'Status sai.',
      timezone: 'Múi giờ sai.',
      apiKeyHeader: 'Header sai.',
    })
    expect(unmatched).toEqual(['Lỗi lạ.'])
  })

  it('409 trùng mã gắn vào ô mã; lỗi mạng và lỗi không phải ApiError không gắn vào ô nào', () => {
    expect(applyApiError(new ApiError(409, 'SERVICE_CODE_DUPLICATE', 'Trùng.')).errors.code).toContain('đã tồn tại')
    expect(applyApiError(new ApiError(0, 'NETWORK', 'Mất mạng.'))).toEqual({ errors: {}, unmatched: [] })
    expect(applyApiError(new Error('x'))).toEqual({ errors: {}, unmatched: [] })
  })

  it('firstErrorKey trả ô lỗi đầu tiên theo thứ tự hiển thị trên form', () => {
    expect(firstErrorKey({ responseBody: 'x', name: 'y', 'mapping.status': 'z' })).toBe('name')
    expect(firstErrorKey({})).toBeUndefined()
  })
})
