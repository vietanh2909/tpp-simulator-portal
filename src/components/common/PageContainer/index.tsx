import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-4 p-4 xl:p-6', className)}>{children}</div>
}
