/**
 * Modal Component
 *
 * Reusable modal/dialog component with backdrop and animations.
 * Follows Atomic Design principles (Organism level).
 */

import React, { useEffect } from 'react';
import { Button } from '../atoms/Button';

export interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when modal should close
   */
  onClose: () => void;

  /**
   * Modal title
   */
  title?: React.ReactNode;

  /**
   * Modal content
   */
  children: React.ReactNode;

  /**
   * Footer content (buttons, actions, etc.)
   */
  footer?: React.ReactNode;

  /**
   * Modal size
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  /**
   * Whether clicking backdrop closes modal
   */
  closeOnBackdropClick?: boolean;

  /**
   * Whether pressing ESC closes modal
   */
  closeOnEscape?: boolean;

  /**
   * Whether to show close button
   */
  showCloseButton?: boolean;

  /**
   * Additional CSS classes for modal content
   */
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}) => {
  // Handle ESC key press
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Don't render if not open
  if (!isOpen) return null;

  // Size styles
  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`
          ${sizeStyles[size]}
          w-full
          bg-darkpanel
          border border-darkborder
          rounded-lg
          shadow-xl
          flex flex-col
          max-h-[90vh]
          animate-fadeIn
          ${className}
        `.trim().replace(/\s+/g, ' ')}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-darkborder">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-auto text-gray-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-darkborder bg-darkbg/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Convenience component for modal footer with standard button layout
export const ModalFooter: React.FC<{
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelText?: string;
  confirmText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}> = ({
  onCancel,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  confirmVariant = 'primary',
  isLoading = false,
  disabled = false,
  children,
}) => {
  if (children) {
    return <>{children}</>;
  }

  return (
    <div className="flex gap-2 justify-end">
      {onCancel && (
        <Button variant="secondary" onClick={onCancel} disabled={isLoading || disabled}>
          {cancelText}
        </Button>
      )}
      {onConfirm && (
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          loading={isLoading}
          disabled={isLoading || disabled}
        >
          {confirmText}
        </Button>
      )}
    </div>
  );
};

// Export default for convenience
export default Modal;
