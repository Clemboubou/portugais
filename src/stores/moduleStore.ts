import { defineStore } from 'pinia';
import { db, updateModuleProgress } from '../services/database';
import type { Module } from '../services/database';

export const useModuleStore = defineStore('modules', {
  state: () => ({
    modules: [] as Module[],
    currentModule: null as Module | null,
    loading: false,
    error: null as string | null,
  }),
  
  getters: {
    getModulesSortedByOrder: (state) => {
      return [...state.modules].sort((a, b) => a.order - b.order);
    },
    
    getModulesByLevel: (state) => {
      const modulesByLevel: Record<string, Module[]> = {};
      
      state.modules.forEach(module => {
        if (!modulesByLevel[module.level]) {
          modulesByLevel[module.level] = [];
        }
        modulesByLevel[module.level].push(module);
      });
      
      // Sort modules within each level by order
      Object.keys(modulesByLevel).forEach(level => {
        modulesByLevel[level].sort((a, b) => a.order - b.order);
      });
      
      return modulesByLevel;
    },
    
    getModuleById: (state) => {
      return (id: number) => state.modules.find(m => m.id === id) || null;
    },
    
    getCompletedModules: (state) => {
      return state.modules.filter(m => m.completed);
    },
    
    getTotalProgress: (state) => {
      if (state.modules.length === 0) return 0;
      
      const totalProgress = state.modules.reduce((sum, module) => sum + module.progress, 0);
      return Math.round(totalProgress / state.modules.length);
    },
    
    getNextModuleToStudy: (state) => {
      // Find first incomplete module
      return state.modules
        .sort((a, b) => a.order - b.order)
        .find(m => m.progress < 100) || null;
    }
  },
  
  actions: {
    async fetchModules() {
      this.loading = true;
      this.error = null;
      
      try {
        this.modules = await db.modules.toArray();
      } catch (error) {
        console.error('Error fetching modules:', error);
        this.error = 'Failed to load modules';
      } finally {
        this.loading = false;
      }
    },
    
    async fetchModuleById(id: number) {
      try {
        const module = await db.modules.get(id);
        if (module) {
          this.currentModule = module;
        }
        return module;
      } catch (error) {
        console.error(`Error fetching module ${id}:`, error);
        return null;
      }
    },
    
    async addModule(module: Omit<Module, 'id'>) {
      try {
        const id = await db.modules.add(module);
        this.modules.push({ ...module, id });
        return id;
      } catch (error) {
        console.error('Error adding module:', error);
        return null;
      }
    },
    
    async updateModule(id: number, data: Partial<Module>) {
      try {
        await db.modules.update(id, data);
        
        // Update local state
        const index = this.modules.findIndex(m => m.id === id);
        if (index !== -1) {
          this.modules[index] = { ...this.modules[index], ...data };
        }
        
        return true;
      } catch (error) {
        console.error(`Error updating module ${id}:`, error);
        return false;
      }
    },
    
    async updateProgress(moduleId: number) {
      try {
        await updateModuleProgress(moduleId);
        
        // Refresh modules data
        await this.fetchModules();
        
        return true;
      } catch (error) {
        console.error(`Error updating module ${moduleId} progress:`, error);
        return false;
      }
    },
    
    async setCurrentModule(moduleId: number) {
      return this.fetchModuleById(moduleId);
    }
  }
});
