import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from './Icon'

interface CardProps {
  className?: string
  children: ReactNode
  as?: 'div' | 'section'
}

export function Card({ className, children, as: Tag = 'div' }: CardProps) {
  return <Tag className={cn('rounded-xl bg-surface-container-lowest shadow-card', className)}>{children}</Tag>
}

interface SectionHeaderProps {
  icon?: string
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export function SectionHeader({ icon, title, subtitle, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">
            <Icon name={icon} size={18} />
          </span>
        )}
        <div>
          <h2 className="text-headline-md text-on-surface">{title}</h2>
          {subtitle && <p className="text-body-sm text-on-surface-variant">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
