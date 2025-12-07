/**
 * Badge Component
 *
 * Reusable badge component for status indicators, labels, and tags.
 * Follows Atomic Design principles (Atom level).
 */

import React from 'react';

export interface BadgeProps {
  /**
   * Badge variant for different visual styles
   */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

  /**
   * Badge size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Badge content
   */
  children: React.ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether to show a dot indicator
   */
  dot?: boolean;

  /**
   * Custom dot color (overrides variant color)
   */
  dotColor?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  dot = false,
  dotColor,
}) => {
  // Base styles applied to all badges
  const baseStyles = 'inline-flex items-center gap-1.5 font-medium rounded-full';

  // Variant-specific styles
  const variantStyles = {
    default: 'bg-gray-600 text-gray-200',
    primary: 'bg-primary/20 text-primary border border-primary/30',
    secondary: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    success: 'bg-success/20 text-success border border-success/30',
    warning: 'bg-warning/20 text-warning border border-warning/30',
    error: 'bg-error/20 text-error border border-error/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  };

  // Size-specific styles
  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-2.5 py-1 text-sm',
  };

  // Dot size styles
  const dotSizeStyles = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  // Dot color based on variant
  const dotColors = {
    default: 'bg-gray-400',
    primary: 'bg-primary',
    secondary: 'bg-gray-400',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    info: 'bg-blue-400',
  };

  // Combine all styles
  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <span className={combinedClassName}>
      {dot && (
        <span
          className={`${dotSizeStyles[size]} rounded-full flex-shrink-0`}
          style={dotColor ? { backgroundColor: dotColor } : undefined}
          {...(!dotColor && { className: `${dotSizeStyles[size]} ${dotColors[variant]} rounded-full flex-shrink-0` })}
        />
      )}
      {children}
    </span>
  );
};

// Export default for convenience
export default Badge;
