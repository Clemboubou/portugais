import { defineStore } from 'pinia';
import { db } from '../services/database';
import type { Quiz } from '../services/database';
import { useVocabularyStore } from './vocabularyStore';
import { useModuleStore } from './moduleStore';

export const useQuizStore = defineStore('quiz', {
  state: () => ({
    quizzes: [] as Quiz[],
    currentQuiz: null as Quiz | null,
    currentQuizIndex: 0,
    quizResults: [] as {questionId: number, correct: boolean}[],
    loading: false,
    error: null as string | null,
  }),
  
  getters: {
    getQuizzesByModule: (state) => {
      return (moduleId: number) => state.quizzes.filter(quiz => quiz.moduleId === moduleId);
    },
    
    getCurrentScore: (state) => {
      if (state.quizResults.length === 0) return 0;
      const correct = state.quizResults.filter(result => result.correct).length;
      return Math.round((correct / state.quizResults.length) * 100);
    },
    
    isQuizComplete: (state) => {
      return state.quizResults.length >= state.quizzes.length;
    },
    
    getNextQuestion: (state) => {
      if (state.currentQuizIndex >= state.quizzes.length) return null;
      return state.quizzes[state.currentQuizIndex];
    }
  },
  
  actions: {
    async fetchQuizzesByModule(moduleId: number) {
      this.loading = true;
      this.error = null;
      
      try {
        this.quizzes = await db.quizzes
          .where('moduleId')
          .equals(moduleId)
          .toArray();
          
        this.resetQuiz();
      } catch (error) {
        console.error(`Error fetching quizzes for module ${moduleId}:`, error);
        this.error = `Failed to load quizzes for module ${moduleId}`;
      } finally {
        this.loading = false;
      }
    },
    
    resetQuiz() {
      this.currentQuizIndex = 0;
      this.quizResults = [];
      this.currentQuiz = this.quizzes.length > 0 ? this.quizzes[0] : null;
    },
    
    nextQuestion() {
      if (this.currentQuizIndex < this.quizzes.length - 1) {
        this.currentQuizIndex++;
        this.currentQuiz = this.quizzes[this.currentQuizIndex];
        return true;
      }
      return false;
    },
    
    async submitAnswer(questionId: number, answer: string) {
      const question = this.quizzes.find(q => q.id === questionId);
      if (!question) return false;
      
      const isCorrect = answer.toLowerCase() === question.answer.toLowerCase();
      
      // Record result
      this.quizResults.push({
        questionId,
        correct: isCorrect
      });
      
      if (isCorrect) {
        // Mark question as completed in database
        await db.quizzes.update(questionId, { completed: true });
        
        // Update local state
        const index = this.quizzes.findIndex(q => q.id === questionId);
        if (index !== -1) {
          this.quizzes[index].completed = true;
        }
      }
      
      return isCorrect;
    },
    
    async generateQuizForModule(moduleId: number) {
      // First, clear existing quizzes for this module
      await db.quizzes.where('moduleId').equals(moduleId).delete();
      
      // Get vocabulary for the module
      const vocabularyStore = useVocabularyStore();
      await vocabularyStore.fetchVocabularyByModule(moduleId);
      const vocabulary = vocabularyStore.currentModuleVocabulary;
      
      if (vocabulary.length < 4) {
        this.error = 'Not enough vocabulary items to generate a quiz';
        return false;
      }
      
      // Generate different types of quiz questions
      const newQuizzes: Omit<Quiz, 'id'>[] = [];
      
      // Multiple choice (Portuguese to French)
      for (let i = 0; i < Math.min(vocabulary.length, 5); i++) {
        const correctItem = vocabulary[i];
        
        // Get 3 random incorrect options
        const incorrectOptions = vocabulary
          .filter(item => item.id !== correctItem.id)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map(item => item.french);
        
        const options = [...incorrectOptions, correctItem.french]
          .sort(() => 0.5 - Math.random());
          
        newQuizzes.push({
          moduleId,
          type: 'multiple-choice',
          question: `Traduisez: ${correctItem.portuguese}`,
          options,
          answer: correctItem.french,
          completed: false
        });
      }
      
      // Fill in the blank
      for (let i = 0; i < Math.min(vocabulary.length, 3); i++) {
        const item = vocabulary[i + 5 > vocabulary.length ? i : i + 5];
        
        newQuizzes.push({
          moduleId,
          type: 'fill-in-blank',
          question: `Complétez: ___ (${item.french})`,
          answer: item.portuguese,
          completed: false
        });
      }
      
      // Audio recognition (if examples available)
      for (let i = 0; i < Math.min(vocabulary.length, 2); i++) {
        const item = vocabulary[i + 8 > vocabulary.length ? i : i + 8];
        
        newQuizzes.push({
          moduleId,
          type: 'audio',
          question: `Écoutez et écrivez: (audio: "${item.portuguese}")`,
          answer: item.portuguese,
          completed: false
        });
      }
      
      // Save quizzes to database
      try {
        const ids = await db.quizzes.bulkAdd(newQuizzes);
        
        // Load the newly created quizzes
        await this.fetchQuizzesByModule(moduleId);
        return ids;
      } catch (error) {
        console.error('Error generating quizzes:', error);
        this.error = 'Failed to generate quizzes';
        return false;
      }
    },
    
    async completeQuiz(moduleId: number, score: number) {
      // Update module progress
      const moduleStore = useModuleStore();
      const module = moduleStore.getModuleById(moduleId);
      
      if (module && score >= 70) {
        // If score is good enough, mark module as completed
        await moduleStore.updateModule(moduleId, {
          completed: true,
          progress: 100
        });
      }
    }
  }
});
