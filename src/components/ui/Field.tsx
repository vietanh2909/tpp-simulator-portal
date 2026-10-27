import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/utils/cn'

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string | undefined
  required?: boolean
  optionalLabel?: string
  className?: string
  /** Render-prop nhận id/aria để gắn vào control. */
  children: (control: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
  labelClassName?: string
}

export function Field({
  label,
  hint,
  error,
  required,
  optionalLabel,
  className,
  children,
  labelClassName,
}: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className={cn('font-mono text-label-sm text-on-surface-variant', labelClassName)}>
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
        {optionalLabel && <span className="ml-1 text-on-surface-variant/70">({optionalLabel})</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-body-sm text-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

const CONTROL_BASE =
  'w-full rounded-lg border bg-surface-container-lowest px-3 text-body-md text-on-surface placeholder:text-on-surface-variant/60 transition-colors focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container disabled:bg-surface-container-low disabled:text-on-surface-variant'

function controlClass(invalid: boolean | undefined): string {
  return cn(CONTROL_BASE, invalid ? 'border-error' : 'border-outline-variant')
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  mono?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, mono, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlClass(invalid), 'h-9', mono && 'font-mono text-code-body', className)}
      {...rest}
    />
  )
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlClass(invalid), 'h-9 pr-8', className)}
      {...rest}
    >
      {children}
    </select>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  mono?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, mono, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlClass(invalid), 'py-2', mono && 'font-mono text-code-body', className)}
      {...rest}
    />
  )
})
