/**
 * Centralized Theme Configuration
 *
 * This file contains all design tokens (colors, spacing, typography, etc.)
 * used throughout the application. It serves as a single source of truth
 * for the design system.
 */

export const theme = {
  /**
   * Color Palette
   */
  colors: {
    // Background colors
    background: {
      primary: '#1e1e1e',
      secondary: '#252526',
      tertiary: '#2d2d2d',
      hover: '#2a2d2e',
    },

    // Border colors
    border: {
      default: '#3e3e42',
      active: '#007acc',
    },

    // Text colors
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
      muted: '#888888',
      disabled: '#6b7280',
    },

    // Action/State colors
    action: {
      primary: '#007acc',
      primaryHover: '#005a9e',
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#ef4444',
      info: '#4a9eff',
    },

    // Data type colors (for pins)
    dataType: {
      trigger: '#ffffff',
      number: '#4a9eff',
      string: '#ffd700',
      boolean: '#4ade80',
      image: '#ef4444',
      any: '#888888',
    },

    // Category colors (for node headers)
    category: {
      Motion: '#007acc',
      IO: '#4ade80',
      Vision: '#ef4444',
      Logic: '#fbbf24',
      Math: '#a855f7',
      String: '#f97316',
      Array: '#06b6d4',
      Variable: '#64748b',
      Comment: '#475569',
      default: '#6b7280',
    },
  },

  /**
   * Spacing Scale
   */
  spacing: {
    // Standard spacing
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px

    // Custom spacing for specific components
    pinVerticalSpacing: '28px',
    pinBaseOffset: '28px',
    pinHeight: '12px',
    pinWidth: '12px',

    // Panel dimensions
    panelMinWidth: '200px',
    panelMaxWidth: '500px',
    panelDefaultWidth: '300px',
    headerHeight: '48px',
    toolbarHeight: '40px',
  },

  /**
   * Border Radius
   */
  borderRadius: {
    none: '0',
    sm: '0.25rem',    // 4px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    full: '9999px',
  },

  /**
   * Font Sizes
   */
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
  },

  /**
   * Font Weights
   */
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  /**
   * Shadows
   */
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    primary: '0 0 15px rgba(0, 122, 204, 0.5)',
  },

  /**
   * Transitions
   */
  transitions: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
  },

  /**
   * Z-Index Scale
   */
  zIndex: {
    base: 0,
    dropdown: 1000,
    modal: 2000,
    tooltip: 3000,
    toast: 4000,
  },
} as const;

// Type exports for TypeScript autocomplete
export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type DataType = keyof typeof theme.colors.dataType;
export type Category = keyof typeof theme.colors.category;
