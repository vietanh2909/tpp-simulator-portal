import type { ReactNode } from 'react'
import { Icon } from '@/components/ui'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name={icon} size={24} />
      </span>
      <p className="text-headline-sm text-on-surface">{title}</p>
      {description && <p className="mt-1 max-w-md text-body-sm text-on-surface-variant">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
