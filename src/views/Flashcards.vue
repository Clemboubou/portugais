<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useVocabularyStore } from '../stores/vocabularyStore';
import { useModuleStore } from '../stores/moduleStore';
import { useUserStore } from '../stores/userStore';
import { generateSpeech } from '../services/apiService';

// Router and stores
const route = useRoute();
const router = useRouter();
const vocabularyStore = useVocabularyStore();
const moduleStore = useModuleStore();
const userStore = useUserStore();

// State variables
const moduleId = computed(() => Number(route.params.id));
const loading = ref(true);
const module = ref(null);
const vocabulary = ref([]);
const currentIndex = ref(0);
const isFlipped = ref(false);
const reviewSession = ref({
  total: 0,
  correct: 0,
  incorrect: 0,
  remaining: 0,
  completed: false
});

// Track words status for SRS
const knownWords = ref(new Set());
const unknownWords = ref(new Set());

// Load flashcard data
onMounted(async () => {
  loading.value = true;
  try {
    // Load module data
    module.value = await moduleStore.fetchModuleById(moduleId.value);
    if (!module.value) {
      router.push('/lessons');
      return;
    }

    // Load vocabulary for this module
    const words = await vocabularyStore.fetchVocabularyByModule(moduleId.value);
    
    // Filter words that need review (either not learned or due for review)
    vocabulary.value = words.filter(word => {
      return !word.learned || (word.nextReview && new Date(word.nextReview) <= new Date());
    });
    
    // Set up review session
    reviewSession.value = {
      total: vocabulary.value.length,
      correct: 0,
      incorrect: 0,
      remaining: vocabulary.value.length,
      completed: false
    };
    
    // Shuffle vocabulary for review
    shuffleVocabulary();
  } catch (error) {
    console.error('Error loading flashcards:', error);
  } finally {
    loading.value = false;
  }
});

// Methods
const shuffleVocabulary = () => {
  // Fisher-Yates shuffle algorithm
  for (let i = vocabulary.value.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vocabulary.value[i], vocabulary.value[j]] = [vocabulary.value[j], vocabulary.value[i]];
  }
};

const currentWord = computed(() => vocabulary.value[currentIndex.value] || null);

const flip = () => {
  isFlipped.value = !isFlipped.value;
};

const playAudio = () => {
  if (!currentWord.value) return;
  const speakWord = generateSpeech(currentWord.value.portuguese, 'pt-PT');
  speakWord();
};

// Mark current word as known/unknown for spaced repetition
const markAsKnown = async () => {
  if (!currentWord.value) return;
  
  knownWords.value.add(currentWord.value.id);
  if (unknownWords.value.has(currentWord.value.id)) {
    unknownWords.value.delete(currentWord.value.id);
  }
  
  reviewSession.value.correct++;
  reviewSession.value.remaining--;
  
  // Update word in database with longer review interval
  await vocabularyStore.updateReviewStatus(currentWord.value.id, true);
  
  nextCard();
};

const markAsUnknown = async () => {
  if (!currentWord.value) return;
  
  unknownWords.value.add(currentWord.value.id);
  if (knownWords.value.has(currentWord.value.id)) {
    knownWords.value.delete(currentWord.value.id);
  }
  
  reviewSession.value.incorrect++;
  reviewSession.value.remaining--;
  
  // Update word in database with shorter review interval
  await vocabularyStore.updateReviewStatus(currentWord.value.id, false);
  
  nextCard();
};

// Navigate to next card
const nextCard = () => {
  if (currentIndex.value < vocabulary.value.length - 1) {
    currentIndex.value++;
    isFlipped.value = false;
  } else {
    // End of review session
    finishReview();
  }
};

// Finish the review session
const finishReview = async () => {
  reviewSession.value.completed = true;
  
  // Update module progress
  await moduleStore.updateProgress(moduleId.value);
  
  // Update user stats
  await userStore.updateReviewStats({
    reviewedWords: reviewSession.value.total,
    correctAnswers: reviewSession.value.correct,
    incorrectAnswers: reviewSession.value.incorrect
  });
};

// Return to lesson detail
const backToLesson = () => {
  router.push(`/lesson/${moduleId.value}`);
};

// Restart the review session
const restartSession = () => {
  // Reset session stats
  currentIndex.value = 0;
  isFlipped.value = false;
  knownWords.value = new Set();
  unknownWords.value = new Set();
  
  reviewSession.value = {
    total: vocabulary.value.length,
    correct: 0,
    incorrect: 0,
    remaining: vocabulary.value.length,
    completed: false
  };
  
  // Reshuffle cards
  shuffleVocabulary();
};

// Compute progress percentage
const progressPercentage = computed(() => {
  if (reviewSession.value.total === 0) return 0;
  return Math.round(((reviewSession.value.total - reviewSession.value.remaining) / reviewSession.value.total) * 100);
});
</script>

<template>
  <div class="flashcards-view">
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Chargement des flashcards...</p>
    </div>
    
    <template v-else-if="module && vocabulary.length > 0">
      <header class="flashcards-header">
        <router-link :to="`/lesson/${moduleId}`" class="back-link">
          &larr; Retour à la leçon
        </router-link>
        
        <div class="module-info">
          <h2>Flashcards: {{ module.title }}</h2>
          <div class="stats">
            <span class="card-count">{{ vocabulary.length }} cartes</span>
            <span class="progress">{{ progressPercentage }}% complété</span>
          </div>
        </div>
        
        <div class="progress-bar">
          <div class="progress-bar-fill" :style="{ width: `${progressPercentage}%` }"></div>
        </div>
      </header>
      
      <!-- Review Session Results -->
      <div v-if="reviewSession.completed" class="review-complete">
        <h2>Session terminée !</h2>
        
        <div class="results">
          <div class="result-item">
            <span class="result-label">Total :</span>
            <span class="result-value">{{ reviewSession.total }}</span>
          </div>
          
          <div class="result-item correct">
            <span class="result-label">Correct :</span>
            <span class="result-value">{{ reviewSession.correct }}</span>
          </div>
          
          <div class="result-item incorrect">
            <span class="result-label">Incorrect :</span>
            <span class="result-value">{{ reviewSession.incorrect }}</span>
          </div>
          
          <div class="result-item percentage">
            <span class="result-label">Score :</span>
            <span class="result-value">{{ Math.round((reviewSession.correct / reviewSession.total) * 100) }}%</span>
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="btn primary" @click="restartSession">Recommencer</button>
          <button class="btn" @click="backToLesson">Retour à la leçon</button>
        </div>
      </div>
      
      <!-- Flashcard Review -->
      <div v-else class="flashcard-container">
        <!-- Flashcard -->
        <div 
          class="flashcard" 
          :class="{ flipped: isFlipped }" 
          @click="flip"
          v-if="currentWord"
        >
          <div class="card-front">
            <span class="word">{{ currentWord.portuguese }}</span>
            <button class="audio-btn" @click.stop="playAudio">
              🔊
            </button>
          </div>
          
          <div class="card-back">
            <span class="translation">{{ currentWord.french }}</span>
            <div v-if="currentWord.examples && currentWord.examples.length > 0" class="examples">
              <h4>Exemples:</h4>
              <p v-for="(example, i) in currentWord.examples.slice(0, 2)" :key="i">
                {{ example }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Navigation Controls -->
        <div class="controls">
          <div class="hint">
            {{ isFlipped ? 'Cliquez sur les boutons ci-dessous' : 'Cliquez sur la carte pour voir la traduction' }}
          </div>
          
          <div class="nav-buttons" v-if="isFlipped">
            <button class="btn know" @click="markAsKnown">Je connais</button>
            <button class="btn unknown" @click="markAsUnknown">À revoir</button>
          </div>
          
          <div class="counter">
            {{ currentIndex + 1 }} / {{ vocabulary.length }}
          </div>
        </div>
      </div>
    </template>
    
    <!-- Empty State -->
    <div v-else-if="!loading" class="empty-state">
      <h3>Pas de cartes à réviser</h3>
      <p>Tous les mots de cette leçon ont été appris et ne nécessitent pas de révision pour le moment.</p>
      <router-link :to="`/lesson/${moduleId}`" class="btn">
        Retour à la leçon
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.flashcards-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
}

.loading, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  text-align: center;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.flashcards-header {
  margin-bottom: 2rem;
}

.back-link {
  display: inline-block;
  margin-bottom: 1rem;
  color: var(--text-light);
  transition: var(--transition);
}

.back-link:hover {
  color: var(--primary-color);
}

.module-info h2 {
  margin-bottom: 0.5rem;
}

.stats {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  color: var(--text-light);
  font-size: 0.9rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background-color: var(--primary-color);
  transition: width 0.3s ease;
}

/* Flashcard styling */
.flashcard-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin-top: 2rem;
}

.flashcard {
  width: 100%;
  max-width: 450px;
  height: 280px;
  position: relative;
  perspective: 1500px;
  cursor: pointer;
  margin: 0 auto;
}

.card-front, .card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  box-shadow: var(--shadow);
  transition: transform 0.6s;
  overflow: hidden;
}

.card-front {
  background-color: var(--primary-color);
  color: white;
  transform: rotateY(0deg);
  z-index: 2;
}

.card-back {
  background-color: var(--bg-secondary);
  transform: rotateY(-180deg);
  color: var(--text-color);
}

.flashcard.flipped .card-front {
  transform: rotateY(180deg);
}

.flashcard.flipped .card-back {
  transform: rotateY(0deg);
  z-index: 3;
}

.word {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-align: center;
}

.translation {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-align: center;
  color: var(--primary-color);
}

.audio-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: var(--transition);
}

.audio-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.examples {
  margin-top: 1rem;
  width: 100%;
  font-size: 0.9rem;
}

.examples h4 {
  margin-bottom: 0.5rem;
  color: var(--text-light);
  font-weight: 500;
}

.examples p {
  background-color: var(--bg-color);
  padding: 0.5rem;
  border-radius: var(--radius);
  margin-bottom: 0.5rem;
}

/* Controls */
.controls {
  width: 100%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.hint {
  color: var(--text-light);
  font-size: 0.9rem;
  font-style: italic;
}

.nav-buttons {
  display: flex;
  gap: 1rem;
  width: 100%;
  justify-content: space-between;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.btn.know {
  background-color: var(--success-color);
  color: white;
}

.btn.unknown {
  background-color: var(--danger-color);
  color: white;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.counter {
  color: var(--text-light);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

/* Review Complete */
.review-complete {
  text-align: center;
  margin: 3rem auto;
  max-width: 500px;
  background-color: var(--bg-color);
  padding: 2rem;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.review-complete h2 {
  color: var(--primary-color);
  margin-bottom: 1.5rem;
}

.results {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.result-item {
  background-color: var(--bg-secondary);
  padding: 1rem;
  border-radius: var(--radius);
  text-align: left;
}

.result-label {
  display: block;
  color: var(--text-light);
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
}

.result-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.result-item.correct .result-value {
  color: var(--success-color);
}

.result-item.incorrect .result-value {
  color: var(--danger-color);
}

.result-item.percentage .result-value {
  color: var(--primary-color);
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn.primary {
  background-color: var(--primary-color);
  color: white;
}

@media (max-width: 600px) {
  .flashcard {
    height: 220px;
  }
  
  .word {
    font-size: 1.8rem;
  }
  
  .translation {
    font-size: 1.5rem;
  }
  
  .results {
    grid-template-columns: 1fr;
  }
}
</style>
