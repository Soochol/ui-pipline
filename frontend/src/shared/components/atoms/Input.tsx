/**
 * Input Component
 *
 * Reusable input component with consistent styling across the application.
 * Follows Atomic Design principles (Atom level).
 */

import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Input variant for different visual styles
   */
  variant?: 'default' | 'error' | 'success';

  /**
   * Input size
   */
  inputSize?: 'sm' | 'md' | 'lg';

  /**
   * Label text
   */
  label?: string;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Helper text to display below input
   */
  helperText?: string;

  /**
   * Whether the input is required
   */
  required?: boolean;

  /**
   * Full width input
   */
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  variant = 'default',
  inputSize = 'md',
  label,
  error,
  helperText,
  required = false,
  fullWidth = false,
  className = '',
  disabled = false,
  onKeyDown,
  ...props
}) => {
  // Determine variant based on error prop
  const effectiveVariant = error ? 'error' : variant;

  // Base styles applied to all inputs
  const baseStyles = 'bg-darkbg border rounded text-white placeholder-gray-500 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  // Variant-specific styles
  const variantStyles = {
    default: 'border-darkborder focus:border-primary',
    error: 'border-error focus:border-error',
    success: 'border-success focus:border-success',
  };

  // Size-specific styles
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base',
  };

  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';

  // Combine all styles
  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[effectiveVariant]}
    ${sizeStyles[inputSize]}
    ${widthStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {/* Label */}
      {label && (
        <label className="block text-xs text-gray-400 mb-1">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}

      {/* Input */}
      <input
        {...props}
        className={combinedClassName}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? 'input-error' : helperText ? 'input-helper' : undefined}
        onKeyDown={(e) => {
          e.stopPropagation(); // 키보드 이벤트 전파 차단 (캔버스 선택 해제 방지)
          onKeyDown?.(e);
        }}
      />

      {/* Error Message */}
      {error && (
        <p id="input-error" className="text-xs text-error mt-1">
          {error}
        </p>
      )}

      {/* Helper Text */}
      {!error && helperText && (
        <p id="input-helper" className="text-xs text-gray-500 mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
};

// Export default for convenience
export default Input;
