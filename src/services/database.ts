import Dexie, { Table } from 'dexie';

// Define interfaces for our database models
export interface Vocabulary {
  id?: number;
  portuguese: string;
  french: string;
  audioUrl?: string;
  examples?: string[];
  learned: boolean;
  lastReviewed?: Date;
  reviewCount: number;
  moduleId: number;
  difficulty?: number; // 1-3 (easy, medium, hard)
}

export interface Module {
  id?: number;
  title: string;
  description: string;
  level: string; // A1, A2, B1, etc.
  theme: string;
  order: number;
  completed: boolean;
  progress: number; // 0-100
  wordCount: number;
}

export interface UserProgress {
  id?: number;
  totalLearned: number;
  totalReviewed: number;
  lastStudyDate?: Date;
  totalStudyTime: number; // in minutes
  streakDays: number;
  currentModule?: number;
}

export interface Quiz {
  id?: number;
  moduleId: number;
  type: string; // multiple-choice, fill-in-the-blank, etc.
  question: string;
  options?: string[];
  answer: string;
  completed: boolean;
}

class PortugueseAppDB extends Dexie {
  vocabulary!: Table<Vocabulary>;
  modules!: Table<Module>;
  userProgress!: Table<UserProgress>;
  quizzes!: Table<Quiz>;

  constructor() {
    super('portugueseAppDB');
    this.version(1).stores({
      vocabulary: '++id, portuguese, french, moduleId, learned',
      modules: '++id, title, level, theme, order, completed',
      userProgress: '++id',
      quizzes: '++id, moduleId, type, completed'
    });
  }
}

export const db = new PortugueseAppDB();

// Initialize default user progress if not exists
export async function initializeDatabase() {
  const userProgressCount = await db.userProgress.count();
  if (userProgressCount === 0) {
    await db.userProgress.add({
      totalLearned: 0,
      totalReviewed: 0,
      totalStudyTime: 0,
      streakDays: 0
    });
  }
}

// Helper functions to work with the database
export async function markWordAsLearned(id: number) {
  return db.vocabulary.update(id, { learned: true, lastReviewed: new Date() });
}

export async function updateModuleProgress(moduleId: number) {
  const totalWords = await db.vocabulary.where({ moduleId }).count();
  const learnedWords = await db.vocabulary.where({ moduleId, learned: true }).count();
  
  const progress = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;
  const completed = progress === 100;
  
  return db.modules.update(moduleId, { progress, completed });
}

export async function updateUserProgress() {
  const totalLearned = await db.vocabulary.where('learned').equals(true).count();
  const userProgress = await db.userProgress.toArray();
  
  if (userProgress.length > 0) {
    return db.userProgress.update(userProgress[0].id!, { totalLearned });
  }
}

export async function incrementStreakDays() {
  const userProgress = await db.userProgress.toArray();
  if (userProgress.length > 0) {
    const progress = userProgress[0];
    const today = new Date();
    const lastStudyDate = progress.lastStudyDate ? new Date(progress.lastStudyDate) : null;
    
    // Check if last study was yesterday
    if (lastStudyDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const isLastStudyYesterday = 
        lastStudyDate.getDate() === yesterday.getDate() && 
        lastStudyDate.getMonth() === yesterday.getMonth() && 
        lastStudyDate.getFullYear() === yesterday.getFullYear();
      
      if (isLastStudyYesterday) {
        return db.userProgress.update(progress.id!, { 
          streakDays: progress.streakDays + 1,
          lastStudyDate: today
        });
      }
    }
    
    // Update last study date
    return db.userProgress.update(progress.id!, { lastStudyDate: today });
  }
}
