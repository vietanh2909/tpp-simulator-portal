export const ROUTES = {
  home: '/',
  services: '/services',
  serviceCreate: '/services/new',
  serviceEdit: (code: string) => `/services/${encodeURIComponent(code)}/edit`,
  serviceTest: (code: string) => `/services/${encodeURIComponent(code)}/test`,
  monitoring: '/transactions',
  /** `transactionId` có thể chứa `/ ? # %` hay khoảng trắng nên luôn mã hóa phần trăm. `recordId` chọn sẵn một lần nhận. */
  transactionDetail: (serviceCode: string, transactionId: string, recordId?: number) => {
    const base = `/transactions/${encodeURIComponent(serviceCode)}/${encodeURIComponent(transactionId)}`
    return recordId === undefined ? base : `${base}?callback=${recordId}`
  },
  callbackDetail: (recordId: number) => `/callbacks/${recordId}`,
} as const
