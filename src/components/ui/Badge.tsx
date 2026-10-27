import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'primary'

interface BadgeProps {
  tone?: BadgeTone
  mono?: boolean
  className?: string
  title?: string
  children: ReactNode
}

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-slate-50 text-slate-600 border-slate-300',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

export function Badge({ tone = 'neutral', mono = true, className, title, children }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-label-sm leading-none whitespace-nowrap',
        mono ? 'font-mono font-semibold' : 'font-medium',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
