'use client'

import * as React from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { cn } from '~/lib/utils'

export interface InputPasswordProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Label text rendered above the input */
  label?: string
  /** Error message rendered below the input */
  error?: string | string[]
  /** Helper text rendered below the input (hidden when error is present) */
  description?: string
  /** Controlled visibility state */
  isVisible?: boolean
  /** Callback when visibility toggle is clicked */
  onVisibilityChange?: (isVisible: boolean) => void
  /** Custom class for the outermost wrapper div */
  wrapperClassName?: string
  /** Custom class for the toggle button */
  toggleClassName?: string
  /** Hide the toggle button entirely */
  hideToggle?: boolean
}

const InputPassword = React.forwardRef<HTMLInputElement, InputPasswordProps>(
  (
    {
      className,
      wrapperClassName,
      toggleClassName,
      label,
      error,
      description,
      isVisible: controlledVisible,
      onVisibilityChange,
      hideToggle = false,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`
    const descriptionId = `${inputId}-description`

    const [internalVisible, setInternalVisible] = React.useState(false)

    // Support both controlled and uncontrolled usage
    const isControlled = controlledVisible !== undefined
    const isVisible = isControlled ? controlledVisible : internalVisible

    const toggleVisibility = () => {
      const next = !isVisible
      if (!isControlled) setInternalVisible(next)
      onVisibilityChange?.(next)
    }

    // Normalise error: accept string or string[] (TanStack Form returns string[])
    const errorMessage = Array.isArray(error) ? error[0] : error
    const hasError = Boolean(errorMessage)

    return (
      <div className={cn('space-y-1.5', wrapperClassName)}>
        {label && (
          <Label
            htmlFor={inputId}
            className={cn(hasError && 'text-destructive')}
          >
            {label}
          </Label>
        )}

        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            type={isVisible ? 'text' : 'password'}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : description ? descriptionId : undefined
            }
            className={cn(
              !hideToggle && 'pr-9',
              hasError && 'border-destructive focus-visible:ring-destructive/30',
              className
            )}
            {...props}
          />
          {!hideToggle && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={toggleVisibility}
              className={cn(
                'text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent',
                toggleClassName
              )}
            >
              {isVisible ? (
                <EyeOffIcon className="size-4" aria-hidden="true" />
              ) : (
                <EyeIcon className="size-4" aria-hidden="true" />
              )}
              <span className="sr-only">
                {isVisible ? 'Hide password' : 'Show password'}
              </span>
            </Button>
          )}
        </div>

        {hasError ? (
          <p id={errorId} className="text-destructive text-sm">
            {errorMessage}
          </p>
        ) : description ? (
          <p id={descriptionId} className="text-muted-foreground text-sm">
            {description}
          </p>
        ) : null}
      </div>
    )
  }
)

InputPassword.displayName = 'InputPassword'

export { InputPassword }