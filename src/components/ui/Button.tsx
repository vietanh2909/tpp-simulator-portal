import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from './Icon'

type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: string
  loading?: boolean
  children?: ReactNode
  /** React 19: `ref` là prop thường, được chuyển tiếp xuống `<button>`. */
  ref?: Ref<HTMLButtonElement>
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-container text-on-primary font-semibold hover:bg-primary shadow-sm disabled:bg-primary-container/50',
  secondary:
    'bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low disabled:text-on-surface-variant/60',
  tonal:
    'bg-surface-container-high text-on-surface hover:bg-surface-container-highest disabled:text-on-surface-variant/60',
  ghost: 'text-primary hover:bg-surface-container disabled:text-on-surface-variant/60',
  danger: 'bg-error text-on-error font-semibold hover:bg-error/90',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-body-sm gap-1',
  md: 'h-9 px-3 text-body-md gap-1.5',
  lg: 'h-11 px-5 text-body-lg gap-2',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : icon ? (
        <Icon name={icon} size={size === 'sm' ? 15 : size === 'lg' ? 20 : 18} />
      ) : null}
      {children}
    </button>
  )
}
