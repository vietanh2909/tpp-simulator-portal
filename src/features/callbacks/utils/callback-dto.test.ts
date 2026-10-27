import { describe, expect, it } from 'vitest'
import {
  CB_MAPPING_ERROR_DTO,
  CB_REJECTED_DTO,
  CB_REJECTED_TEXT_DTO,
  CB_TIMESTAMP_ERROR_DTO,
  callbackDto,
} from '@/test/fixtures/monitoring'
import { OUTCOME_LABEL, REJECTION_REASON_LABEL, REJECTION_REASON_VALUES } from '../constants/callbacks.constants'
import { hasMappingResults, toCallbackDetail, toCallbackSummary, toHeaderEntries, toPayloadView } from './callback-dto'

describe('Ánh xạ CallbackDetail của backend sang mô hình giao diện', () => {
  it('cắt mốc thời gian có micro giây về mili giây và chuẩn hóa giá trị vắng thành null', () => {
    const summary = toCallbackSummary({
      recordId: 4,
      serviceCode: 'THU_HO',
      receivedAt: '2026-10-19T03:24:15.987654Z',
      outcome: 'SUCCESS',
      httpStatusReturned: 200,
      businessTimestamp: '2026-10-19T03:24:00.123456Z',
    })

    expect(summary.receivedAt).toBe('2026-10-19T03:24:15.987Z')
    expect(summary.businessTimestamp).toBe('2026-10-19T03:24:00.123Z')
    expect(summary.transactionId).toBeNull()
    expect(summary.status).toBeNull()
    expect(summary.rejectionReason).toBeNull()
    expect(summary.serviceDeleted).toBe(false)
  })

  it('header giá trị *** là đã che, header khác giữ nguyên và được sắp theo tên', () => {
    const headers = toHeaderEntries({ 'X-Request-Id': 'abc', Authorization: '***', 'x-api-key': '***' })

    expect(headers).toEqual([
      { name: 'Authorization', value: '***', masked: true },
      { name: 'x-api-key', value: '***', masked: true },
      { name: 'X-Request-Id', value: 'abc', masked: false },
    ])
    expect(toHeaderEntries(null)).toEqual([])
  })

  it('payloadRawText có mặt thì là văn bản gốc; ngược lại là payloadJson đã định dạng đẹp', () => {
    const text = toPayloadView(CB_REJECTED_TEXT_DTO)
    const json = toPayloadView({ payloadJson: { a: 1 } })

    expect(text).toEqual({ kind: 'text', text: 'đây không phải JSON {' })
    expect(json).toEqual({ kind: 'json', text: '{\n  "a": 1\n}', value: { a: 1 } })
  })

  it('JSON null là một payload hợp lệ, không bị nhầm với thiếu payload', () => {
    expect(toPayloadView({ payloadJson: null })).toEqual({ kind: 'json', text: 'null', value: null })
    expect(toPayloadView({})).toEqual({ kind: 'text', text: '' })
  })

  it('lần bị từ chối có mapping rỗng và vẫn giữ lý do, mã HTTP và response đã trả', () => {
    const detail = toCallbackDetail(CB_REJECTED_DTO)

    expect(hasMappingResults(detail)).toBe(false)
    expect(detail.outcome).toBe('REJECTED')
    expect(detail.rejectionReason).toBe('INVALID_API_KEY')
    expect(detail.httpStatusReturned).toBe(401)
    expect(detail.responseStatus).toBe(401)
    expect(detail.responseBodyText).toContain('INVALID_API_KEY')
    expect(detail.headers.find((header) => header.name === 'Authorization')?.masked).toBe(true)
  })

  it('kết quả mapping từng trường giữ giá trị, mã lỗi, thông báo và cảnh báo', () => {
    const ok = toCallbackDetail(callbackDto(1))
    const failed = toCallbackDetail(CB_TIMESTAMP_ERROR_DTO)
    const missing = toCallbackDetail(CB_MAPPING_ERROR_DTO)

    expect(ok.mapping.transactionId).toEqual({ value: 'T100', errorCode: null, error: null, warning: null })
    expect(failed.mapping.timestamp).toMatchObject({ value: null, errorCode: 'UNPARSEABLE' })
    expect(failed.mapping.timestamp?.error).toContain('định dạng')
    expect(missing.mapping.transactionId?.errorCode).toBe('NOT_FOUND')
    expect(hasMappingResults(ok)).toBe(true)
  })

  it('không có response ghi lại thì responseBodyText là null và mã HTTP rơi về httpStatusReturned', () => {
    const dto = callbackDto(2, { responseStatusReturned: null, httpStatusReturned: 201 })
    delete (dto as { responseBodyReturned?: unknown }).responseBodyReturned

    const detail = toCallbackDetail(dto)

    expect(detail.responseBodyText).toBeNull()
    expect(detail.responseStatus).toBe(201)
  })

  it('có nhãn chữ cho cả ba kết quả xử lý và đủ sáu lý do từ chối', () => {
    expect(Object.keys(OUTCOME_LABEL).sort()).toEqual(['MAPPING_ERROR', 'REJECTED', 'SUCCESS'])
    expect(REJECTION_REASON_VALUES).toHaveLength(6)
    for (const reason of REJECTION_REASON_VALUES) {
      expect(REJECTION_REASON_LABEL[reason]).toMatch(/\S/)
    }
  })

  it('kết quả ánh xạ không chứa khóa API dù header của backend có trường khóa đã che', () => {
    const detail = toCallbackDetail(callbackDto(3, { requestHeaders: { 'X-API-Key': '***' } }))

    expect(JSON.stringify(detail)).not.toContain('test-key-not-real')
    expect(detail.headers).toEqual([{ name: 'X-API-Key', value: '***', masked: true }])
  })
})
