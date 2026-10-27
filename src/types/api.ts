/** Một lỗi theo trường trong `ErrorResponse.fieldErrors` (backend trả MẢNG, không phải bản đồ). */
export interface FieldError {
  field: string
  message: string
}

/** Thân lỗi của backend (openapi.yaml, schema `ErrorResponse`). */
export interface ErrorResponse {
  error: string
  message: string
  fieldErrors?: FieldError[]
}

/** Một trang kết quả của backend (openapi.yaml: `page`, `size`, `totalItems`, `totalPages`). */
export interface Page<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}
