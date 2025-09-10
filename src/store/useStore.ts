import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Extraction, ExportJob } from '../../shared/types.js';
import { auth, api } from '../lib/supabase.js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface ExtractionState {
  extractions: Extraction[];
  currentExtraction: Extraction | null;
  isExtracting: boolean;
  extractionError: string | null;
}

interface ExportState {
  exportJobs: ExportJob[];
  isExporting: boolean;
  exportError: string | null;
}

interface AppState extends AuthState, ExtractionState, ExportState {
  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearAuthError: () => void;

  // Extraction actions
  extractVideo: (videoUrl: string, language?: string) => Promise<void>;
  getExtractions: () => Promise<void>;
  getExtraction: (id: string) => Promise<void>;
  deleteExtraction: (id: string) => Promise<void>;
  clearExtractionError: () => void;

  // Export actions
  exportTranscript: (extractionId: string, format: string) => Promise<void>;
  getExportHistory: () => Promise<void>;
  clearExportError: () => void;

  // UI state
  setCurrentExtraction: (extraction: Extraction | null) => void;
}

export const useStore = create<AppState>()(persist(
  (set, get) => ({
    // Initial state
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    extractions: [],
    currentExtraction: null,
    isExtracting: false,
    extractionError: null,
    exportJobs: [],
    isExporting: false,
    exportError: null,

    // Auth actions
    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.call('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        
        set({ 
          user: response.user, 
          isAuthenticated: true, 
          isLoading: false 
        });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Login failed', 
          isLoading: false 
        });
        throw error;
      }
    },

    register: async (email: string, password: string, fullName: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.call('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, full_name: fullName })
        });
        
        set({ 
          user: response.user, 
          isAuthenticated: true, 
          isLoading: false 
        });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Registration failed', 
          isLoading: false 
        });
        throw error;
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        await api.call('/api/auth/logout', { method: 'POST' });
        await auth.signOut();
        
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          extractions: [],
          currentExtraction: null,
          exportJobs: []
        });
      } catch (error) {
        console.error('Logout error:', error);
        // Force logout even if API call fails
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          extractions: [],
          currentExtraction: null,
          exportJobs: []
        });
      }
    },

    checkAuth: async () => {
      set({ isLoading: true });
      try {
        const response = await api.call('/api/auth/me');
        set({ 
          user: response.user, 
          isAuthenticated: true, 
          isLoading: false 
        });
      } catch (error) {
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      }
    },

    clearAuthError: () => set({ error: null }),

    // Extraction actions
    extractVideo: async (videoUrl: string, language = 'auto') => {
      set({ isExtracting: true, extractionError: null });
      try {
        const response = await api.call('/api/extract/video', {
          method: 'POST',
          body: JSON.stringify({ video_url: videoUrl, language })
        });
        
        const { extractions } = get();
        set({ 
          extractions: [response.extraction, ...extractions],
          currentExtraction: response.extraction,
          isExtracting: false 
        });
      } catch (error) {
        set({ 
          extractionError: error instanceof Error ? error.message : 'Extraction failed', 
          isExtracting: false 
        });
        throw error;
      }
    },

    getExtractions: async () => {
      try {
        const response = await api.call('/api/extract');
        set({ extractions: response.extractions });
      } catch (error) {
        set({ 
          extractionError: error instanceof Error ? error.message : 'Failed to fetch extractions' 
        });
      }
    },

    getExtraction: async (id: string) => {
      try {
        const response = await api.call(`/api/extract/${id}`);
        set({ currentExtraction: response.extraction });
      } catch (error) {
        set({ 
          extractionError: error instanceof Error ? error.message : 'Failed to fetch extraction' 
        });
      }
    },

    deleteExtraction: async (id: string) => {
      try {
        await api.call(`/api/extract/${id}`, { method: 'DELETE' });
        const { extractions } = get();
        set({ 
          extractions: extractions.filter(e => e.id !== id),
          currentExtraction: get().currentExtraction?.id === id ? null : get().currentExtraction
        });
      } catch (error) {
        set({ 
          extractionError: error instanceof Error ? error.message : 'Failed to delete extraction' 
        });
        throw error;
      }
    },

    clearExtractionError: () => set({ extractionError: null }),

    // Export actions
    exportTranscript: async (extractionId: string, format: string) => {
      set({ isExporting: true, exportError: null });
      try {
        const response = await api.call('/api/export/transcript', {
          method: 'POST',
          body: JSON.stringify({ extraction_id: extractionId, format })
        });
        
        // Create a blob and download the file
        const blob = new Blob([response], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript_${extractionId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        set({ isExporting: false });
      } catch (error) {
        set({ 
          exportError: error instanceof Error ? error.message : 'Export failed', 
          isExporting: false 
        });
        throw error;
      }
    },

    getExportHistory: async () => {
      try {
        const response = await api.call('/api/export/history');
        set({ exportJobs: response.export_jobs });
      } catch (error) {
        set({ 
          exportError: error instanceof Error ? error.message : 'Failed to fetch export history' 
        });
      }
    },

    clearExportError: () => set({ exportError: null }),

    // UI actions
    setCurrentExtraction: (extraction: Extraction | null) => {
      set({ currentExtraction: extraction });
    }
  }),
  {
    name: 'video-transcript-store',
    partialize: (state) => ({ 
      user: state.user, 
      isAuthenticated: state.isAuthenticated 
    })
  }
));

export default useStore;