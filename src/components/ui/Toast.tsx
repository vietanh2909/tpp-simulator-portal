import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from './Icon'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE_STYLE: Record<ToastTone, { icon: string; className: string }> = {
  success: { icon: 'check_circle', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  error: { icon: 'error', className: 'border-rose-200 bg-rose-50 text-rose-800' },
  info: { icon: 'info', className: 'border-sky-200 bg-sky-50 text-sky-800' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const show = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId.current++
    setItems((current) => [...current, { id, message, tone }])
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3500)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-center gap-2 rounded-lg border px-3 py-2 text-body-md shadow-overlay',
              TONE_STYLE[item.tone].className,
            )}
          >
            <Icon name={TONE_STYLE[item.tone].icon} size={18} filled />
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast phải được dùng bên trong ToastProvider')
  return context
}
