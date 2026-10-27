import { describe, expect, it } from 'vitest'
import { DELETED_TXN_DTO, T100_DTO, callbackDto, pageOf } from '@/test/fixtures/monitoring'
import { toTransactionDetail, toTransactionPage, toTransactionSummary } from './transaction-dto'

describe('Ánh xạ giao dịch của backend sang mô hình giao diện', () => {
  it('cắt mốc thời gian về mili giây và giữ mọi trường của TransactionSummary', () => {
    const summary = toTransactionSummary(T100_DTO)

    expect(summary).toEqual({
      serviceCode: 'THU_HO',
      serviceDeleted: false,
      transactionId: 'T100',
      latestStatus: '00',
      latestBusinessTimestamp: '2026-10-19T03:24:00.123Z',
      latestReceivedAt: '2026-10-19T03:24:15.987Z',
      latestCallbackId: 3,
      latestHasMappingError: false,
      callbackCount: 3,
    })
  })

  it('giao dịch của dịch vụ đã xóa có cờ serviceDeleted và status null giữ là null', () => {
    const summary = toTransactionSummary(DELETED_TXN_DTO)

    expect(summary.serviceDeleted).toBe(true)
    expect(summary.latestStatus).toBeNull()
    expect(summary.latestBusinessTimestamp).toBeNull()
    expect(summary.latestHasMappingError).toBe(true)
  })

  it('trang giữ nguyên page, size, totalItems, totalPages của backend', () => {
    const page = toTransactionPage(pageOf([T100_DTO], { page: 2, size: 50, totalItems: 60 }))

    expect(page).toMatchObject({ page: 2, size: 50, totalItems: 60, totalPages: 2 })
    expect(page.items).toHaveLength(1)
  })

  it('chi tiết giữ thứ tự nhận của backend và ánh xạ từng lần nhận', () => {
    const detail = toTransactionDetail({
      transaction: T100_DTO,
      callbacks: [callbackDto(1), callbackDto(2), callbackDto(3)],
    })

    expect(detail.callbacks.map((callback) => callback.recordId)).toEqual([1, 2, 3])
    expect(detail.transaction.transactionId).toBe('T100')
    expect(detail.callbacks[0]?.receivedAt).toBe('2026-10-19T03:21:15.123Z')
  })
})
