/**
 * Theme Context - Provides theme switching and customization
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { theme as darkTheme } from '../core/config/theme';

export type ThemeMode = 'light' | 'dark' | 'custom';

// Create a mutable theme type
type MutableTheme = {
  colors: {
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      hover: string;
    };
    border: {
      default: string;
      active: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      disabled: string;
    };
    action: {
      primary: string;
      primaryHover: string;
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    dataType: {
      trigger: string;
      number: string;
      string: string;
      boolean: string;
      image: string;
      any: string;
    };
    category: {
      Motion: string;
      IO: string;
      Vision: string;
      Logic: string;
      Math: string;
      String: string;
      Array: string;
      Variable: string;
      Comment: string;
      default: string;
    };
  };
  spacing: typeof darkTheme.spacing;
  borderRadius: typeof darkTheme.borderRadius;
  fontSize: typeof darkTheme.fontSize;
  fontWeight: typeof darkTheme.fontWeight;
  shadows: typeof darkTheme.shadows;
  transitions: typeof darkTheme.transitions;
  zIndex: typeof darkTheme.zIndex;
};

// Light theme definition
const lightTheme: MutableTheme = {
  ...darkTheme,
  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f3f4f6',
      tertiary: '#e5e7eb',
      hover: '#f9fafb',
    },
    border: {
      default: '#d1d5db',
      active: '#007acc',
    },
    text: {
      primary: '#1f2937',
      secondary: '#4b5563',
      muted: '#9ca3af',
      disabled: '#d1d5db',
    },
    action: {
      primary: '#007acc',
      primaryHover: '#005a9e',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#dc2626',
      info: '#3b82f6',
    },
    dataType: {
      trigger: darkTheme.colors.dataType.trigger,
      number: darkTheme.colors.dataType.number,
      string: darkTheme.colors.dataType.string,
      boolean: darkTheme.colors.dataType.boolean,
      image: darkTheme.colors.dataType.image,
      any: darkTheme.colors.dataType.any,
    },
    category: {
      Motion: darkTheme.colors.category.Motion,
      IO: darkTheme.colors.category.IO,
      Vision: darkTheme.colors.category.Vision,
      Logic: darkTheme.colors.category.Logic,
      Math: darkTheme.colors.category.Math,
      String: darkTheme.colors.category.String,
      Array: darkTheme.colors.category.Array,
      Variable: darkTheme.colors.category.Variable,
      Comment: darkTheme.colors.category.Comment,
      default: darkTheme.colors.category.default,
    },
  },
};

interface ThemeContextValue {
  mode: ThemeMode;
  theme: MutableTheme;
  setMode: (mode: ThemeMode) => void;
  updateCustomColors: (colors: Partial<MutableTheme['colors']>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: ThemeMode;
  customColors?: Partial<MutableTheme['colors']>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialMode = 'dark',
  customColors,
}) => {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [customThemeColors, setCustomThemeColors] = useState<Partial<MutableTheme['colors']> | undefined>(
    customColors
  );

  // Get current theme colors based on mode
  const theme = React.useMemo<MutableTheme>(() => {
    if (mode === 'custom' && customThemeColors) {
      return {
        ...darkTheme,
        colors: {
          background: { ...darkTheme.colors.background, ...customThemeColors.background },
          border: { ...darkTheme.colors.border, ...customThemeColors.border },
          text: { ...darkTheme.colors.text, ...customThemeColors.text },
          action: { ...darkTheme.colors.action, ...customThemeColors.action },
          dataType: { ...darkTheme.colors.dataType, ...customThemeColors.dataType },
          category: { ...darkTheme.colors.category, ...customThemeColors.category },
        },
      } as MutableTheme;
    }
    return mode === 'light' ? lightTheme : (darkTheme as MutableTheme);
  }, [mode, customThemeColors]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);

    // Apply custom CSS variables for custom theme
    if (mode === 'custom' && customThemeColors) {
      const root = document.documentElement;
      Object.entries(customThemeColors).forEach(([category, values]) => {
        if (typeof values === 'object') {
          Object.entries(values).forEach(([key, value]) => {
            root.style.setProperty(`--color-${category}-${key}`, value as string);
          });
        }
      });
    }
  }, [mode, customThemeColors]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const updateCustomColors = (colors: Partial<MutableTheme['colors']>) => {
    setCustomThemeColors(colors);
    if (mode !== 'custom') {
      setModeState('custom');
    }
  };

  const resetTheme = () => {
    setCustomThemeColors(undefined);
    setModeState('dark');
  };

  const value: ThemeContextValue = {
    mode,
    theme,
    setMode,
    updateCustomColors,
    resetTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
