import { defineStore } from 'pinia';
import { db, markWordAsLearned } from '../services/database';
import type { Vocabulary } from '../services/database';
import { useUserStore } from './userStore';
import { useModuleStore } from './moduleStore';
import { translateText, getExampleSentences } from '../services/apiService';

export const useVocabularyStore = defineStore('vocabulary', {
  state: () => ({
    vocabularyItems: [] as Vocabulary[],
    currentModuleVocabulary: [] as Vocabulary[],
    currentWord: null as Vocabulary | null,
    loading: false,
    error: null as string | null,
  }),
  
  getters: {
    getLearnedWords: (state) => {
      return state.vocabularyItems.filter(item => item.learned);
    },
    
    getWordsByModule: (state) => {
      return (moduleId: number) => state.vocabularyItems.filter(item => item.moduleId === moduleId);
    },
    
    getWordById: (state) => {
      return (id: number) => state.vocabularyItems.find(item => item.id === id) || null;
    },
    
    getNextWordsToReview: (state) => {
      // Sort words by last reviewed date (oldest first) and filter out words not yet learned
      return state.vocabularyItems
        .filter(item => item.learned)
        .sort((a, b) => {
          if (!a.lastReviewed) return -1;
          if (!b.lastReviewed) return 1;
          return new Date(a.lastReviewed).getTime() - new Date(b.lastReviewed).getTime();
        })
        .slice(0, 10); // Get next 10 words to review
    },
    
    getWordsToLearn: (state) => {
      return (moduleId: number) => state.vocabularyItems
        .filter(item => item.moduleId === moduleId && !item.learned);
    },
    
    getDifficultWords: (state) => {
      return state.vocabularyItems
        .filter(item => item.difficulty && item.difficulty > 2)
        .sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0));
    }
  },
  
  actions: {
    async fetchAllVocabulary() {
      this.loading = true;
      this.error = null;
      
      try {
        this.vocabularyItems = await db.vocabulary.toArray();
      } catch (error) {
        console.error('Error fetching vocabulary:', error);
        this.error = 'Failed to load vocabulary';
      } finally {
        this.loading = false;
      }
    },
    
    async fetchVocabularyByModule(moduleId: number) {
      this.loading = true;
      this.error = null;
      
      try {
        this.currentModuleVocabulary = await db.vocabulary
          .where('moduleId')
          .equals(moduleId)
          .toArray();
      } catch (error) {
        console.error(`Error fetching vocabulary for module ${moduleId}:`, error);
        this.error = `Failed to load vocabulary for module ${moduleId}`;
      } finally {
        this.loading = false;
      }
    },
    
    async addVocabularyItem(item: Omit<Vocabulary, 'id'>) {
      try {
        const id = await db.vocabulary.add(item);
        this.vocabularyItems.push({ ...item, id });
        
        // Update module word count
        const moduleStore = useModuleStore();
        const module = moduleStore.getModuleById(item.moduleId);
        if (module) {
          await moduleStore.updateModule(item.moduleId, {
            wordCount: (module.wordCount || 0) + 1
          });
        }
        
        return id;
      } catch (error) {
        console.error('Error adding vocabulary item:', error);
        return null;
      }
    },
    
    async markAsLearned(id: number) {
      try {
        await markWordAsLearned(id);
        
        // Update local state
        const index = this.vocabularyItems.findIndex(item => item.id === id);
        if (index !== -1) {
          this.vocabularyItems[index].learned = true;
          this.vocabularyItems[index].lastReviewed = new Date();
        }
        
        // Update module progress
        const moduleId = this.vocabularyItems[index].moduleId;
        const moduleStore = useModuleStore();
        await moduleStore.updateProgress(moduleId);
        
        // Update user progress
        const userStore = useUserStore();
        await userStore.fetchUserProgress();
        
        return true;
      } catch (error) {
        console.error(`Error marking word ${id} as learned:`, error);
        return false;
      }
    },
    
    async updateVocabularyItem(id: number, data: Partial<Vocabulary>) {
      try {
        await db.vocabulary.update(id, data);
        
        // Update local state
        const index = this.vocabularyItems.findIndex(item => item.id === id);
        if (index !== -1) {
          this.vocabularyItems[index] = { ...this.vocabularyItems[index], ...data };
        }
        
        return true;
      } catch (error) {
        console.error(`Error updating vocabulary item ${id}:`, error);
        return false;
      }
    },
    
    async searchVocabulary(query: string) {
      if (!query) return [];
      
      const lowerQuery = query.toLowerCase();
      
      try {
        return await db.vocabulary
          .filter(item => 
            item.portuguese.toLowerCase().includes(lowerQuery) || 
            item.french.toLowerCase().includes(lowerQuery)
          )
          .toArray();
      } catch (error) {
        console.error('Error searching vocabulary:', error);
        return [];
      }
    },
    
    async importFromAPI(portuguese: string, moduleId: number) {
      try {
        // Get translation from API
        const french = await translateText(portuguese);
        if (!french) return null;
        
        // Get examples
        const examples = await getExampleSentences(portuguese);
        const exampleSentences = examples.map(ex => ex.sourceText);
        
        // Create new vocabulary item
        const newItem: Omit<Vocabulary, 'id'> = {
          portuguese,
          french,
          moduleId,
          learned: false,
          reviewCount: 0,
          examples: exampleSentences.slice(0, 3),
          difficulty: 1
        };
        
        return this.addVocabularyItem(newItem);
      } catch (error) {
        console.error('Error importing from API:', error);
        return null;
      }
    },
    
    async bulkImport(items: Array<Omit<Vocabulary, 'id'>>) {
      try {
        const ids = await db.vocabulary.bulkAdd(
          items.map(item => ({
            ...item,
            learned: false,
            reviewCount: 0
          }))
        );
        
        // Update modules word count
        const moduleIds = [...new Set(items.map(item => item.moduleId))];
        const moduleStore = useModuleStore();
        
        for (const moduleId of moduleIds) {
          const moduleItems = items.filter(item => item.moduleId === moduleId);
          const module = moduleStore.getModuleById(moduleId);
          
          if (module) {
            await moduleStore.updateModule(moduleId, {
              wordCount: (module.wordCount || 0) + moduleItems.length
            });
          }
        }
        
        await this.fetchAllVocabulary();
        return ids;
      } catch (error) {
        console.error('Error bulk importing vocabulary:', error);
        return null;
      }
    }
  }
});
