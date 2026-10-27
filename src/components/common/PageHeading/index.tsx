import type { ReactNode } from 'react'

interface PageHeadingProps {
  title: ReactNode
  description?: ReactNode
  /** Dòng nhỏ phía trên tiêu đề (breadcrumb, nhãn môi trường...). */
  eyebrow?: ReactNode
  actions?: ReactNode
}

export function PageHeading({ title, description, eyebrow, actions }: PageHeadingProps) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 font-mono text-label-sm text-on-surface-variant">{eyebrow}</div>}
        <h1 className="flex flex-wrap items-center gap-2 text-headline-lg text-on-surface">{title}</h1>
        {description && <p className="mt-1 text-body-md text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
