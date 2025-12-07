/**
 * Button Component
 *
 * Reusable button component with consistent styling across the application.
 * Follows Atomic Design principles (Atom level).
 */

import React from 'react';

export interface ButtonProps {
  /**
   * Button variant for different visual styles
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning';

  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;

  /**
   * Whether the button is in loading state
   */
  loading?: boolean;

  /**
   * Button type attribute
   */
  type?: 'button' | 'submit' | 'reset';

  /**
   * Click handler
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * Button content
   */
  children: React.ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Full width button
   */
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  children,
  className = '',
  fullWidth = false,
}) => {
  // Base styles applied to all buttons
  const baseStyles = 'rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-darkbg disabled:opacity-50 disabled:cursor-not-allowed';

  // Variant-specific styles
  const variantStyles = {
    primary: 'bg-primary hover:bg-primaryhover text-white focus:ring-primary',
    secondary: 'bg-gray-600 hover:bg-gray-500 text-white focus:ring-gray-500',
    danger: 'bg-error hover:bg-red-600 text-white focus:ring-error',
    ghost: 'bg-transparent hover:bg-darkhover text-gray-200 focus:ring-gray-500',
    success: 'bg-success hover:bg-green-600 text-white focus:ring-success',
    warning: 'bg-warning hover:bg-yellow-600 text-white focus:ring-warning',
  };

  // Size-specific styles
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';

  // Combine all styles
  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${widthStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      type={type}
      className={combinedClassName}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

// Export default for convenience
export default Button;
