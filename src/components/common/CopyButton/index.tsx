import { useEffect, useRef, useState } from 'react'
import { Icon, useToast } from '@/components/ui'
import { cn } from '@/utils/cn'

interface CopyButtonProps {
  text: string
  label?: string
  className?: string
  /** Hiển thị kèm nhãn chữ thay vì chỉ biểu tượng. */
  withLabel?: boolean
}

export function CopyButton({ text, label = 'Sao chép', className, withLabel = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const toast = useToast()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback cho ngữ cảnh không có Clipboard API (http, trình duyệt cũ).
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      if (!ok) {
        toast.show('Không sao chép được. Hãy sao chép thủ công.', 'error')
        return
      }
    }
    setCopied(true)
    toast.show('Đã sao chép vào clipboard')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => void handleCopy()}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1 rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary',
        withLabel ? 'h-7 px-2 text-body-sm' : 'h-7 w-7',
        copied && 'text-emerald-600',
        className,
      )}
    >
      <Icon name={copied ? 'check' : 'content_copy'} size={16} />
      {withLabel && <span>{copied ? 'Đã chép' : label}</span>}
    </button>
  )
}
