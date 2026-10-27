import { useState, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import type { CodeTone } from './JsonViewer'

interface JsonEditorProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string
  onChange: (value: string) => void
  tone?: CodeTone
  minLines?: number
  invalid?: boolean
}

const LINE_HEIGHT = 18
const PADDING_Y = 8

/** Trình soạn thảo JSON dạng textarea có cột số dòng đồng bộ cuộn. */
export function JsonEditor({
  value,
  onChange,
  tone = 'light',
  minLines = 8,
  invalid,
  className,
  ...rest
}: JsonEditorProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const lineCount = Math.max(minLines, value.split('\n').length)
  const dark = tone === 'dark'

  return (
    <div
      className={cn(
        'relative flex overflow-hidden rounded-lg border font-mono text-code-body',
        dark ? 'border-slate-700 bg-code-bg' : 'border-slate-300 bg-slate-50',
        invalid && 'border-error',
        className,
      )}
      style={{ height: minLines * LINE_HEIGHT + PADDING_Y * 2 + 2 }}
    >
      <div
        aria-hidden="true"
        className={cn(
          'w-10 shrink-0 overflow-hidden pr-2 text-right select-none',
          dark ? 'text-slate-500' : 'text-slate-400',
        )}
      >
        <div style={{ transform: `translateY(${PADDING_Y - scrollTop}px)` }}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} style={{ height: LINE_HEIGHT }}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      <textarea
        value={value}
        spellCheck={false}
        wrap="off"
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        className={cn(
          'h-full min-w-0 flex-1 resize-none border-l bg-transparent px-3 whitespace-pre outline-none focus:ring-1 focus:ring-inset focus:ring-primary-container',
          dark ? 'border-slate-700 text-slate-100' : 'border-slate-200 text-slate-800',
        )}
        style={{ lineHeight: `${LINE_HEIGHT}px`, paddingTop: PADDING_Y, paddingBottom: PADDING_Y }}
        {...rest}
      />
    </div>
  )
}
