export interface NavItem {
  label: string
  to: string
  icon: string
  /** Tiền tố đường dẫn để đánh dấu mục đang active. */
  matchPrefixes: string[]
}
