import { appConfig } from '@/app/config'

export function SimulatorFooter() {
  return (
    <footer className="px-4 pb-6 text-center font-mono text-label-sm text-on-surface-variant xl:px-6">
      Kết nối backend: {appConfig.apiBaseUrl || 'cùng nguồn (qua Vite proxy)'}
    </footer>
  )
}
