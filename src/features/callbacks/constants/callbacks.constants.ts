import type { CallbackOutcome, RejectionReason } from '../types/callbacks.types'

/** Nhãn chữ của kết quả xử lý. Luôn đi kèm biểu tượng chữ khi hiển thị để không chỉ dựa vào màu (NFR4). */
export const OUTCOME_LABEL: Record<CallbackOutcome, string> = {
  SUCCESS: 'Thành công',
  MAPPING_ERROR: 'Lỗi mapping',
  REJECTED: 'Bị từ chối',
}

export const OUTCOME_ICON: Record<CallbackOutcome, string> = {
  SUCCESS: '✓',
  MAPPING_ERROR: '✕',
  REJECTED: '⛔',
}

export const OUTCOME_VALUES: CallbackOutcome[] = ['SUCCESS', 'MAPPING_ERROR', 'REJECTED']

export const REJECTION_REASON_LABEL: Record<RejectionReason, string> = {
  INVALID_API_KEY: 'Sai API key',
  MISSING_API_KEY: 'Thiếu API key',
  INVALID_JSON: 'JSON không hợp lệ',
  UNSUPPORTED_CONTENT_TYPE: 'Content-Type không hỗ trợ',
  SERVICE_DISABLED: 'Dịch vụ đang tắt',
  SERVICE_DELETED: 'Dịch vụ đã xóa',
}

export const REJECTION_REASON_VALUES: RejectionReason[] = [
  'INVALID_API_KEY',
  'MISSING_API_KEY',
  'INVALID_JSON',
  'UNSUPPORTED_CONTENT_TYPE',
  'SERVICE_DISABLED',
  'SERVICE_DELETED',
]

/** Giá trị mà backend dùng để đánh dấu header đã che. */
export const MASKED_HEADER_VALUE = '***'
