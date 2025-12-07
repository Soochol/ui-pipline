/**
 * UI Store - Manages UI state (panels, modals, etc.)
 */

import { create } from 'zustand';
import { ConsoleLog } from '../types';
import { ThemeMode } from '../contexts/ThemeContext';
import { NodeStyles, LayoutPreset, EdgeType, savePreferences, loadPreferences, debounce, saveLayoutPresets, loadLayoutPresets } from '../utils/storageUtils';

interface UIStore {
  // Panel visibility
  showNodePalette: boolean;
  showPropertiesPanel: boolean;
  showBottomPanel: boolean;
  showSearchPanel: boolean;

  // Panel sizes
  nodePaletteWidth: number;
  propertiesPanelWidth: number;
  bottomPanelHeight: number;

  // Bottom panel tabs
  activeBottomTab: 'console' | 'devices' | 'execution' | 'metrics';

  // Console logs
  consoleLogs: ConsoleLog[];

  // Modal state
  showNewTabModal: boolean;
  showDeviceCreateModal: boolean;

  // Canvas settings
  showMiniMap: boolean;
  snapToGrid: boolean;
  gridSize: number;
  edgeType: EdgeType;

  // Theme
  themeMode: ThemeMode;
  nodeStyles: NodeStyles;

  // Layout Presets
  layoutPresets: LayoutPreset[];

  // Actions
  toggleNodePalette: () => void;
  togglePropertiesPanel: () => void;
  toggleBottomPanel: () => void;
  toggleSearchPanel: () => void;

  setNodePaletteWidth: (width: number) => void;
  setPropertiesPanelWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;

  setActiveBottomTab: (tab: 'console' | 'devices' | 'execution' | 'metrics') => void;

  addConsoleLog: (log: Omit<ConsoleLog, 'id' | 'timestamp'>) => void;
  clearConsoleLogs: () => void;

  setShowNewTabModal: (show: boolean) => void;
  setShowDeviceCreateModal: (show: boolean) => void;

  toggleMiniMap: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  setEdgeType: (type: EdgeType) => void;

  // Theme actions
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setNodeStyles: (styles: Partial<NodeStyles>) => void;

  // Layout Preset actions
  saveLayoutPreset: (name: string) => void;
  loadLayoutPreset: (id: string) => void;
  deleteLayoutPreset: (id: string) => void;
}

// Load initial preferences
const initialPrefs = loadPreferences();

// Debounced save function
const debouncedSave = debounce((state: UIStore) => {
  savePreferences({
    theme: state.themeMode,
    panelSizes: {
      nodePaletteWidth: state.nodePaletteWidth,
      propertiesPanelWidth: state.propertiesPanelWidth,
      bottomPanelHeight: state.bottomPanelHeight,
    },
    canvasSettings: {
      showMiniMap: state.showMiniMap,
      snapToGrid: state.snapToGrid,
      gridSize: state.gridSize,
      edgeType: state.edgeType,
    },
    nodeStyles: state.nodeStyles,
  });
}, 1000);

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state (with localStorage defaults)
  showNodePalette: true,
  showPropertiesPanel: true,
  showBottomPanel: true,
  showSearchPanel: false,

  nodePaletteWidth: initialPrefs?.panelSizes.nodePaletteWidth ?? 280,
  propertiesPanelWidth: initialPrefs?.panelSizes.propertiesPanelWidth ?? 320,
  bottomPanelHeight: initialPrefs?.panelSizes.bottomPanelHeight ?? 200,

  activeBottomTab: 'console',

  consoleLogs: [],

  showNewTabModal: false,
  showDeviceCreateModal: false,

  showMiniMap: initialPrefs?.canvasSettings.showMiniMap ?? true,
  snapToGrid: initialPrefs?.canvasSettings.snapToGrid ?? false,
  gridSize: initialPrefs?.canvasSettings.gridSize ?? 16,
  edgeType: initialPrefs?.canvasSettings.edgeType ?? 'auto',

  themeMode: initialPrefs?.theme ?? 'dark',
  nodeStyles: initialPrefs?.nodeStyles ?? { fontSize: 'md', borderRadius: 'md', iconSize: 'md' },

  layoutPresets: loadLayoutPresets(),

  // Actions
  toggleNodePalette: () =>
    set((state) => ({ showNodePalette: !state.showNodePalette })),

  togglePropertiesPanel: () =>
    set((state) => ({ showPropertiesPanel: !state.showPropertiesPanel })),

  toggleBottomPanel: () =>
    set((state) => ({ showBottomPanel: !state.showBottomPanel })),

  toggleSearchPanel: () =>
    set((state) => ({ showSearchPanel: !state.showSearchPanel })),

  setNodePaletteWidth: (width) => {
    set({ nodePaletteWidth: width });
    debouncedSave(get());
  },

  setPropertiesPanelWidth: (width) => {
    set({ propertiesPanelWidth: width });
    debouncedSave(get());
  },

  setBottomPanelHeight: (height) => {
    set({ bottomPanelHeight: height });
    debouncedSave(get());
  },

  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),

  addConsoleLog: (log) =>
    set((state) => ({
      consoleLogs: [
        ...state.consoleLogs,
        {
          ...log,
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: new Date()
        }
      ]
    })),

  clearConsoleLogs: () => set({ consoleLogs: [] }),

  setShowNewTabModal: (show) => set({ showNewTabModal: show }),

  setShowDeviceCreateModal: (show) => set({ showDeviceCreateModal: show }),

  toggleMiniMap: () => {
    set((state) => ({ showMiniMap: !state.showMiniMap }));
    debouncedSave(get());
  },

  toggleSnapToGrid: () => {
    set((state) => ({ snapToGrid: !state.snapToGrid }));
    debouncedSave(get());
  },

  setGridSize: (size) => {
    set({ gridSize: size });
    debouncedSave(get());
  },

  setEdgeType: (type) => {
    set({ edgeType: type });
    debouncedSave(get());
  },

  // Theme actions
  setThemeMode: (mode) => {
    set({ themeMode: mode });
    debouncedSave(get());
  },

  toggleTheme: () => {
    set((state) => ({
      themeMode: state.themeMode === 'dark' ? 'light' : 'dark'
    }));
    debouncedSave(get());
  },

  setNodeStyles: (styles) => {
    set((state) => ({
      nodeStyles: { ...state.nodeStyles, ...styles }
    }));
    debouncedSave(get());
  },

  // Layout Preset actions
  saveLayoutPreset: (name) => {
    const state = get();
    const newPreset: LayoutPreset = {
      id: `preset_${Date.now()}`,
      name,
      showNodePalette: state.showNodePalette,
      showPropertiesPanel: state.showPropertiesPanel,
      showBottomPanel: state.showBottomPanel,
      nodePaletteWidth: state.nodePaletteWidth,
      propertiesPanelWidth: state.propertiesPanelWidth,
      bottomPanelHeight: state.bottomPanelHeight,
      activeBottomTab: state.activeBottomTab,
    };
    const updatedPresets = [...state.layoutPresets, newPreset];
    set({ layoutPresets: updatedPresets });
    saveLayoutPresets(updatedPresets);
  },

  loadLayoutPreset: (id) => {
    const state = get();
    const preset = state.layoutPresets.find((p) => p.id === id);
    if (preset) {
      set({
        showNodePalette: preset.showNodePalette,
        showPropertiesPanel: preset.showPropertiesPanel,
        showBottomPanel: preset.showBottomPanel,
        nodePaletteWidth: preset.nodePaletteWidth,
        propertiesPanelWidth: preset.propertiesPanelWidth,
        bottomPanelHeight: preset.bottomPanelHeight,
        activeBottomTab: preset.activeBottomTab,
      });
      debouncedSave(get());
    }
  },

  deleteLayoutPreset: (id) => {
    const state = get();
    const updatedPresets = state.layoutPresets.filter((p) => p.id !== id);
    set({ layoutPresets: updatedPresets });
    saveLayoutPresets(updatedPresets);
  },
}));
