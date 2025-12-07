/**
 * Composite Store - Manages composite node definitions and library
 */

import { create } from 'zustand';
import {
  CompositeDefinition,
  CompositeMetadata,
  PipelineNode,
  PipelineEdge,
} from '../types';
import { api } from '../api/endpoints';

interface CompositeStore {
  // State
  compositeLibrary: CompositeMetadata[];
  compositeCache: Map<string, CompositeDefinition>;
  editingCompositeId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadCompositeLibrary: (category?: string) => Promise<void>;
  getComposite: (compositeId: string) => Promise<CompositeDefinition | null>;
  createComposite: (
    name: string,
    nodes: PipelineNode[],
    edges: PipelineEdge[],
    externalEdges?: PipelineEdge[]
  ) => Promise<string | null>;
  createCompositeFromDefinition: (
    composite: Omit<CompositeDefinition, 'composite_id' | 'created_at' | 'updated_at'>
  ) => Promise<string | null>;
  updateComposite: (
    compositeId: string,
    updates: Partial<CompositeDefinition>
  ) => Promise<boolean>;
  deleteComposite: (compositeId: string) => Promise<boolean>;
  openCompositeForEdit: (compositeId: string) => void;
  closeCompositeEdit: () => void;
  clearError: () => void;
}

export const useCompositeStore = create<CompositeStore>((set, get) => ({
  // Initial state
  compositeLibrary: [],
  compositeCache: new Map(),
  editingCompositeId: null,
  isLoading: false,
  error: null,

  // Load composite library from backend
  loadCompositeLibrary: async (category?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.composites.getAll(category);
      set({
        compositeLibrary: response.data.composites,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Failed to load composite library:', error);
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to load composites',
      });
    }
  },

  // Get a specific composite (with caching)
  getComposite: async (compositeId: string) => {
    const { compositeCache } = get();

    // Check cache first
    if (compositeCache.has(compositeId)) {
      return compositeCache.get(compositeId)!;
    }

    try {
      const response = await api.composites.getById(compositeId);
      const composite = response.data.composite;

      // Update cache
      set((state) => ({
        compositeCache: new Map(state.compositeCache).set(compositeId, composite),
      }));

      return composite;
    } catch (error: any) {
      console.error(`Failed to get composite ${compositeId}:`, error);
      set({
        error: error.response?.data?.detail || `Failed to get composite ${compositeId}`,
      });
      return null;
    }
  },

  // Create composite from selected nodes
  createComposite: async (
    name: string,
    nodes: PipelineNode[],
    edges: PipelineEdge[],
    externalEdges?: PipelineEdge[]
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.composites.createFromNodes({
        name,
        nodes,
        edges,
        external_edges: externalEdges,
      });

      if (response.data.success) {
        const composite = response.data.composite;

        // Update cache and library
        set((state) => ({
          compositeCache: new Map(state.compositeCache).set(
            composite.composite_id,
            composite
          ),
          compositeLibrary: [
            ...state.compositeLibrary,
            {
              id: composite.composite_id,
              name: composite.name,
              category: composite.category,
              color: composite.color,
              version: composite.version,
              author: composite.author,
              input_count: composite.inputs.length,
              output_count: composite.outputs.length,
              created_at: composite.created_at,
              updated_at: composite.updated_at,
            },
          ],
          isLoading: false,
        }));

        return composite.composite_id;
      }

      set({ isLoading: false });
      return null;
    } catch (error: any) {
      console.error('Failed to create composite:', error);
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to create composite',
      });
      return null;
    }
  },

  // Create composite from full definition
  createCompositeFromDefinition: async (
    composite: Omit<CompositeDefinition, 'composite_id' | 'created_at' | 'updated_at'>
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.composites.create(composite as any);

      if (response.data.success) {
        const createdComposite = response.data.composite;

        // Update cache and library
        set((state) => ({
          compositeCache: new Map(state.compositeCache).set(
            createdComposite.composite_id,
            createdComposite
          ),
          compositeLibrary: [
            ...state.compositeLibrary,
            {
              id: createdComposite.composite_id,
              name: createdComposite.name,
              category: createdComposite.category,
              color: createdComposite.color,
              version: createdComposite.version,
              author: createdComposite.author,
              input_count: createdComposite.inputs.length,
              output_count: createdComposite.outputs.length,
              created_at: createdComposite.created_at,
              updated_at: createdComposite.updated_at,
            },
          ],
          isLoading: false,
        }));

        return createdComposite.composite_id;
      }

      set({ isLoading: false });
      return null;
    } catch (error: any) {
      console.error('Failed to create composite:', error);
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to create composite',
      });
      return null;
    }
  },

  // Update existing composite
  updateComposite: async (
    compositeId: string,
    updates: Partial<CompositeDefinition>
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.composites.update(compositeId, updates);

      if (response.data.success) {
        const updatedComposite = response.data.composite;

        // Update cache
        set((state) => {
          const newCache = new Map(state.compositeCache);
          newCache.set(compositeId, updatedComposite);

          // Update library entry
          const newLibrary = state.compositeLibrary.map((item) =>
            item.id === compositeId
              ? {
                  ...item,
                  name: updatedComposite.name,
                  category: updatedComposite.category,
                  color: updatedComposite.color,
                  version: updatedComposite.version,
                  author: updatedComposite.author,
                  input_count: updatedComposite.inputs.length,
                  output_count: updatedComposite.outputs.length,
                  updated_at: updatedComposite.updated_at,
                }
              : item
          );

          return {
            compositeCache: newCache,
            compositeLibrary: newLibrary,
            isLoading: false,
          };
        });

        return true;
      }

      set({ isLoading: false });
      return false;
    } catch (error: any) {
      console.error('Failed to update composite:', error);
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to update composite',
      });
      return false;
    }
  },

  // Delete composite
  deleteComposite: async (compositeId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.composites.delete(compositeId);

      if (response.data.success) {
        set((state) => {
          const newCache = new Map(state.compositeCache);
          newCache.delete(compositeId);

          return {
            compositeCache: newCache,
            compositeLibrary: state.compositeLibrary.filter(
              (item) => item.id !== compositeId
            ),
            editingCompositeId:
              state.editingCompositeId === compositeId
                ? null
                : state.editingCompositeId,
            isLoading: false,
          };
        });

        return true;
      }

      set({ isLoading: false });
      return false;
    } catch (error: any) {
      console.error('Failed to delete composite:', error);
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to delete composite',
      });
      return false;
    }
  },

  // Open composite for editing (new tab)
  openCompositeForEdit: (compositeId: string) => {
    set({ editingCompositeId: compositeId });
  },

  // Close composite edit
  closeCompositeEdit: () => {
    set({ editingCompositeId: null });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
