import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  BusinessStatusBadge,
  HttpStatusBadge,
  MappingErrorBadge,
  OutcomeBadge,
  RejectionReasonBadge,
} from './StatusBadges'

describe('Nhãn trạng thái', () => {
  it('status nghiệp vụ luôn cùng một màu trung tính, không diễn giải 00 hay FAILED', () => {
    render(
      <>
        <BusinessStatusBadge status="00" />
        <BusinessStatusBadge status="FAILED" />
        <BusinessStatusBadge status="SUCCESS" />
      </>,
    )

    const classes = ['00', 'FAILED', 'SUCCESS'].map((text) => screen.getByText(text).className)
    expect(new Set(classes).size).toBe(1)
    expect(classes[0]).toContain('bg-slate-50')
  })

  it('thiếu status có nhãn chữ "Thiếu status", không chỉ bằng màu', () => {
    render(<BusinessStatusBadge status={null} />)
    expect(screen.getByText('Thiếu status')).toBeInTheDocument()
  })

  it('kết quả xử lý có chữ và biểu tượng chữ cho cả ba loại', () => {
    render(
      <>
        <OutcomeBadge outcome="SUCCESS" />
        <OutcomeBadge outcome="MAPPING_ERROR" />
        <OutcomeBadge outcome="REJECTED" />
      </>,
    )

    expect(screen.getByText('Thành công').parentElement).toHaveTextContent('✓Thành công')
    expect(screen.getByText('Lỗi mapping').parentElement).toHaveTextContent('✕Lỗi mapping')
    expect(screen.getByText('Bị từ chối').parentElement).toHaveTextContent('⛔Bị từ chối')
  })

  it('lý do từ chối hiện bằng chữ cho cả sáu lý do', () => {
    render(
      <>
        <RejectionReasonBadge reason="INVALID_API_KEY" />
        <RejectionReasonBadge reason="MISSING_API_KEY" />
        <RejectionReasonBadge reason="INVALID_JSON" />
        <RejectionReasonBadge reason="UNSUPPORTED_CONTENT_TYPE" />
        <RejectionReasonBadge reason="SERVICE_DISABLED" />
        <RejectionReasonBadge reason="SERVICE_DELETED" />
      </>,
    )

    for (const text of [
      'Sai API key',
      'Thiếu API key',
      'JSON không hợp lệ',
      'Content-Type không hỗ trợ',
      'Dịch vụ đang tắt',
      'Dịch vụ đã xóa',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })

  it('mã HTTP có màu theo nhóm và dấu lỗi mapping có chữ', () => {
    render(
      <>
        <HttpStatusBadge status={200} />
        <HttpStatusBadge status={401} />
        <MappingErrorBadge />
      </>,
    )

    expect(screen.getByText('200 OK').className).toContain('emerald')
    expect(screen.getByText('401 Unauthorized').className).toContain('rose')
    expect(screen.getByText('Lỗi mapping')).toBeInTheDocument()
  })
})
