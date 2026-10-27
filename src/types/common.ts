/** Chuỗi ISO 8601 (UTC) dùng để lưu trữ thời điểm. */
export type IsoDateTime = string

export interface SelectOption<T extends string = string> {
  value: T
  label: string
}
