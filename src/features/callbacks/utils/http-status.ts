const REASONS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
}

export function httpStatusText(status: number): string {
  const reason = REASONS[status]
  return reason ? `${status} ${reason}` : String(status)
}

export type HttpStatusClass = 'success' | 'redirect' | 'client-error' | 'server-error' | 'other'

export function httpStatusClass(status: number): HttpStatusClass {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'redirect'
  if (status >= 400 && status < 500) return 'client-error'
  if (status >= 500 && status < 600) return 'server-error'
  return 'other'
}
