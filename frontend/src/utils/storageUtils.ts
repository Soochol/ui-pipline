/**
 * Storage Utilities - LocalStorage persistence for user preferences
 */

import { theme } from '../core/config/theme';
import { ThemeMode } from '../contexts/ThemeContext';

export interface NodeStyles {
  fontSize: 'sm' | 'md' | 'lg';
  borderRadius: 'sm' | 'md' | 'lg';
  iconSize: 'sm' | 'md' | 'lg';
}

export interface LayoutPreset {
  id: string;
  name: string;
  showNodePalette: boolean;
  showPropertiesPanel: boolean;
  showBottomPanel: boolean;
  nodePaletteWidth: number;
  propertiesPanelWidth: number;
  bottomPanelHeight: number;
  activeBottomTab: 'console' | 'devices' | 'execution' | 'metrics';
}

export type EdgeType = 'auto' | 'smoothstep' | 'bezier' | 'straight' | 'step';

export interface UserPreferences {
  theme: ThemeMode;
  customTheme?: Partial<typeof theme.colors>;
  panelSizes: {
    nodePaletteWidth: number;
    propertiesPanelWidth: number;
    bottomPanelHeight: number;
  };
  canvasSettings: {
    showMiniMap: boolean;
    snapToGrid: boolean;
    gridSize: number;
    edgeType: EdgeType;
  };
  nodeStyles: NodeStyles;
  layoutPresets?: LayoutPreset[];
}

const STORAGE_KEY = 'ui-pipeline-preferences';
const PRESETS_KEY = 'ui-pipeline-layout-presets';

export const savePreferences = (prefs: UserPreferences): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
};

export const loadPreferences = (): UserPreferences | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to load preferences:', error);
    return null;
  }
};

export const clearPreferences = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear preferences:', error);
  }
};

// Layout Presets
export const saveLayoutPresets = (presets: LayoutPreset[]): void => {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error('Failed to save layout presets:', error);
  }
};

export const loadLayoutPresets = (): LayoutPreset[] => {
  try {
    const stored = localStorage.getItem(PRESETS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load layout presets:', error);
    return [];
  }
};

// Debounce utility for auto-save
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
