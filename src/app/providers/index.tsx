import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui'
import { PageLoadingProvider } from './PageLoadingProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <PageLoadingProvider>{children}</PageLoadingProvider>
    </ToastProvider>
  )
}
