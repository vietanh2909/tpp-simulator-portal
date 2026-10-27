import { Fragment, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type CodeTone = 'light' | 'dark'

const TOKEN_REGEX = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g

const COLORS: Record<CodeTone, { key: string; string: string; number: string; nil: string; punct: string }> = {
  light: {
    key: 'text-indigo-700',
    string: 'text-emerald-600',
    number: 'text-amber-600',
    nil: 'text-rose-600',
    punct: 'text-slate-500',
  },
  dark: {
    key: 'text-sky-300',
    string: 'text-emerald-300',
    number: 'text-amber-300',
    nil: 'text-rose-300',
    punct: 'text-slate-400',
  },
}

/** Tô màu một dòng JSON (chuỗi không span nhiều dòng trong JSON hợp lệ). */
function highlightLine(line: string, tone: CodeTone): ReactNode[] {
  const colors = COLORS[tone]
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let key = 0
  for (const match of line.matchAll(TOKEN_REGEX)) {
    const index = match.index ?? 0
    if (index > lastIndex)
      nodes.push(
        <span key={key++} className={colors.punct}>
          {line.slice(lastIndex, index)}
        </span>,
      )
    const text = match[0]
    if (match[1] !== undefined) {
      if (match[2] !== undefined) {
        nodes.push(
          <span key={key++} className={colors.key}>
            {match[1]}
          </span>,
        )
        nodes.push(
          <span key={key++} className={colors.punct}>
            {match[2]}
          </span>,
        )
      } else {
        nodes.push(
          <span key={key++} className={colors.string}>
            {text}
          </span>,
        )
      }
    } else if (text === 'null') {
      nodes.push(
        <span key={key++} className={colors.nil}>
          {text}
        </span>,
      )
    } else {
      nodes.push(
        <span key={key++} className={colors.number}>
          {text}
        </span>,
      )
    }
    lastIndex = index + text.length
  }
  if (lastIndex < line.length)
    nodes.push(
      <span key={key} className={colors.punct}>
        {line.slice(lastIndex)}
      </span>,
    )
  return nodes
}

interface JsonViewerProps {
  value: string
  tone?: CodeTone
  className?: string
  maxHeightClass?: string
  /** Số dòng tối thiểu hiển thị (để khung có chiều cao ổn định). */
  minLines?: number
  ariaLabel?: string
  /** Hiện nguyên văn, không tô màu cú pháp (ví dụ body không phải JSON). */
  plain?: boolean
}

/** Khung hiển thị JSON/text có số dòng và tô màu cú pháp. */
export function JsonViewer({
  value,
  tone = 'light',
  className,
  maxHeightClass = 'max-h-96',
  minLines = 0,
  ariaLabel,
  plain = false,
}: JsonViewerProps) {
  const lines = value.split('\n')
  const padding = Math.max(0, minLines - lines.length)
  const dark = tone === 'dark'

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={cn(
        'overflow-auto rounded-lg border font-mono text-code-body',
        dark ? 'border-slate-700 bg-code-bg text-slate-100' : 'border-slate-300 bg-slate-50 text-slate-800',
        maxHeightClass,
        className,
      )}
    >
      <pre className="m-0 min-w-max py-2">
        {lines.map((line, index) => (
          <div key={index} className="flex min-h-[18px]">
            <span
              aria-hidden="true"
              className={cn(
                'sticky left-0 w-9 shrink-0 pr-2 text-right select-none',
                dark ? 'bg-code-bg text-slate-500' : 'bg-slate-50 text-slate-400',
              )}
            >
              {index + 1}
            </span>
            <code className={cn('border-l pl-3', dark ? 'border-slate-700' : 'border-slate-200')}>
              {line === '' ? ' ' : plain ? line : highlightLine(line, tone)}
            </code>
          </div>
        ))}
        {Array.from({ length: padding }, (_, i) => (
          <Fragment key={`pad-${i}`}>
            <div className="flex min-h-[18px]">
              <span
                aria-hidden="true"
                className={cn('w-9 shrink-0 pr-2 text-right select-none', dark ? 'text-slate-600' : 'text-slate-300')}
              >
                {lines.length + i + 1}
              </span>
              <span className={cn('border-l pl-3', dark ? 'border-slate-700' : 'border-slate-200')}> </span>
            </div>
          </Fragment>
        ))}
      </pre>
    </div>
  )
}
