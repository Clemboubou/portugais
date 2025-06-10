import { defineStore } from 'pinia';
import { db, updateUserProgress, incrementStreakDays } from '../services/database';
import type { UserProgress } from '../services/database';

export const useUserStore = defineStore('user', {
  state: () => ({
    progress: null as UserProgress | null,
    loading: false,
    error: null as string | null,
    isDarkMode: false,
  }),
  
  getters: {
    isLoaded: (state) => !!state.progress,
    getProgressPercentage: (state) => {
      if (!state.progress) return 0;
      const { totalLearned } = state.progress;
      // Placeholder target (this could be calculated from total vocabulary)
      const targetWords = 1000;
      return Math.min(Math.round((totalLearned / targetWords) * 100), 100);
    },
    getStreak: (state) => state.progress?.streakDays || 0,
    getTotalLearned: (state) => state.progress?.totalLearned || 0,
    getTotalStudyTime: (state) => {
      if (!state.progress) return 0;
      return state.progress.totalStudyTime;
    },
  },
  
  actions: {
    async fetchUserProgress() {
      this.loading = true;
      this.error = null;
      
      try {
        const userProgress = await db.userProgress.toArray();
        this.progress = userProgress.length > 0 ? userProgress[0] : null;
      } catch (error) {
        console.error('Error fetching user progress:', error);
        this.error = 'Failed to load user progress';
      } finally {
        this.loading = false;
      }
    },
    
    async updateStudyTime(minutes: number) {
      if (!this.progress || !this.progress.id) return;
      
      try {
        const newTotal = (this.progress.totalStudyTime || 0) + minutes;
        await db.userProgress.update(this.progress.id, {
          totalStudyTime: newTotal
        });
        
        // Update local state
        this.progress.totalStudyTime = newTotal;
      } catch (error) {
        console.error('Error updating study time:', error);
      }
    },
    
    async updateStreak() {
      try {
        await incrementStreakDays();
        await this.fetchUserProgress(); // Refresh data
      } catch (error) {
        console.error('Error updating streak:', error);
      }
    },
    
    async setCurrentModule(moduleId: number) {
      if (!this.progress || !this.progress.id) return;
      
      try {
        await db.userProgress.update(this.progress.id, { currentModule: moduleId });
        this.progress.currentModule = moduleId;
      } catch (error) {
        console.error('Error setting current module:', error);
      }
    },
    
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
      localStorage.setItem('darkMode', this.isDarkMode ? 'true' : 'false');
      
      // Apply dark mode class to document body
      if (this.isDarkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    },
    
    loadDarkModePreference() {
      const savedMode = localStorage.getItem('darkMode');
      this.isDarkMode = savedMode === 'true';
      
      if (this.isDarkMode) {
        document.body.classList.add('dark-mode');
      }
    }
  }
});
