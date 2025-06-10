<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useModuleStore } from '../stores/moduleStore';
import { useVocabularyStore } from '../stores/vocabularyStore';
import { useQuizStore } from '../stores/quizStore';
import { generateSpeech } from '../services/apiService';

const route = useRoute();
const router = useRouter();
const moduleStore = useModuleStore();
const vocabularyStore = useVocabularyStore();
const quizStore = useQuizStore();

const moduleId = computed(() => Number(route.params.id));
const module = ref(null);
const loading = ref(true);
const activeTab = ref('vocabulary');
const activeWordIndex = ref(0);
const showWordTranslation = ref(false);

// Example sentences visibility
const visibleExamples = ref({});

// Computed properties for the current word
const vocabulary = computed(() => vocabularyStore.currentModuleVocabulary);
const currentWord = computed(() => vocabulary.value[activeWordIndex.value] || null);
const hasNextWord = computed(() => activeWordIndex.value < vocabulary.value.length - 1);
const hasPreviousWord = computed(() => activeWordIndex.value > 0);

// Quiz related states
const quizAvailable = ref(false);
const quizLoading = ref(false);

// Load module data and vocabulary
onMounted(async () => {
  loading.value = true;
  try {
    module.value = await moduleStore.fetchModuleById(moduleId.value);
    if (!module.value) {
      router.push('/lessons');
      return;
    }
    
    await vocabularyStore.fetchVocabularyByModule(moduleId.value);
    
    // Check if quiz is available
    const quizzes = await quizStore.getQuizzesByModule(moduleId.value);
    quizAvailable.value = quizzes && quizzes.length > 0;
  } catch (error) {
    console.error('Error loading lesson data:', error);
  } finally {
    loading.value = false;
  }
});

// Methods for word navigation
const nextWord = () => {
  if (hasNextWord.value) {
    activeWordIndex.value++;
    showWordTranslation.value = false;
  }
};

const previousWord = () => {
  if (hasPreviousWord.value) {
    activeWordIndex.value--;
    showWordTranslation.value = false;
  }
};

// Toggle translation visibility
const toggleTranslation = () => {
  showWordTranslation.value = !showWordTranslation.value;
};

// Play pronunciation of a word
const playAudio = (word) => {
  const speakWord = generateSpeech(word, 'pt-PT');
  speakWord();
};

// Mark a word as learned
const markAsLearned = async (wordId) => {
  if (!wordId) return;
  
  await vocabularyStore.markAsLearned(wordId);
  
  // If this was the last word, update module progress
  if (!hasNextWord.value) {
    await moduleStore.updateProgress(moduleId.value);
  } else {
    // Otherwise, move to the next word
    nextWord();
  }
};

// Toggle example sentences visibility
const toggleExamples = (wordId) => {
  visibleExamples.value = {
    ...visibleExamples.value,
    [wordId]: !visibleExamples.value[wordId]
  };
};

// Generate quiz for this module
const generateQuiz = async () => {
  quizLoading.value = true;
  try {
    await quizStore.generateQuizForModule(moduleId.value);
    quizAvailable.value = true;
  } catch (error) {
    console.error('Error generating quiz:', error);
  } finally {
    quizLoading.value = false;
  }
};

// Navigate to quiz
const goToQuiz = () => {
  router.push(`/quiz/${moduleId.value}`);
};

// Navigate to flashcards for this module
const goToFlashcards = () => {
  router.push(`/flashcards/${moduleId.value}`);
};
</script>

<template>
  <div class="lesson-detail">
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Chargement de la leçon...</p>
    </div>
    
    <template v-else-if="module">
      <header class="lesson-header">
        <router-link to="/lessons" class="back-link">
          &larr; Retour aux leçons
        </router-link>
        
        <div class="lesson-info">
          <h2>{{ module.title }}</h2>
          <div class="lesson-meta">
            <span class="level">Niveau {{ module.level }}</span>
            <span class="theme">{{ module.theme }}</span>
            <span class="word-count">{{ module.wordCount || 0 }} mots</span>
          </div>
          
          <p class="lesson-description">{{ module.description }}</p>
          
          <div class="progress-bar">
            <div class="progress-bar-fill" :style="{ width: `${module.progress || 0}%` }"></div>
          </div>
          <span class="progress-text">{{ module.progress || 0 }}% complété</span>
        </div>
      </header>
      
      <div class="lesson-tabs">
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'vocabulary' }" 
          @click="activeTab = 'vocabulary'"
        >
          Vocabulaire
        </button>
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'practice' }" 
          @click="activeTab = 'practice'"
        >
          Pratique
        </button>
      </div>
      
      <div class="lesson-content">
        <!-- Vocabulary Tab -->
        <div v-if="activeTab === 'vocabulary' && vocabulary.length > 0" class="vocabulary-section">
          <!-- Word viewer for active learning -->
          <div class="word-viewer">
            <div class="navigation-controls">
              <button 
                class="nav-button" 
                :disabled="!hasPreviousWord" 
                @click="previousWord"
              >
                &larr; Précédent
              </button>
              <span class="word-counter">{{ activeWordIndex + 1 }} / {{ vocabulary.length }}</span>
              <button 
                class="nav-button" 
                :disabled="!hasNextWord" 
                @click="nextWord"
              >
                Suivant &rarr;
              </button>
            </div>
            
            <div class="current-word-card" v-if="currentWord">
              <div class="word-portuguese">
                {{ currentWord.portuguese }}
                <button class="audio-button" @click="playAudio(currentWord.portuguese)">
                  🔊
                </button>
              </div>
              
              <div class="word-translation" v-if="showWordTranslation">
                {{ currentWord.french }}
              </div>
              <button 
                class="translation-toggle" 
                @click="toggleTranslation"
              >
                {{ showWordTranslation ? 'Cacher' : 'Voir' }} la traduction
              </button>
              
              <div class="examples-section" v-if="currentWord.examples && currentWord.examples.length">
                <button 
                  class="examples-toggle" 
                  @click="toggleExamples(currentWord.id)"
                >
                  {{ visibleExamples[currentWord.id] ? 'Cacher' : 'Voir' }} les exemples
                </button>
                
                <div class="examples-list" v-if="visibleExamples[currentWord.id]">
                  <div v-for="(example, i) in currentWord.examples" :key="i" class="example-item">
                    {{ example }}
                    <button class="audio-button small" @click="playAudio(example)">
                      🔊
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="word-actions">
                <button 
                  v-if="!currentWord.learned" 
                  class="btn" 
                  @click="markAsLearned(currentWord.id)"
                >
                  J'ai appris ce mot
                </button>
                <span v-else class="learned-badge">✓ Appris</span>
              </div>
            </div>
          </div>
          
          <!-- Word list -->
          <div class="vocabulary-list">
            <h3 class="section-title">Liste de vocabulaire</h3>
            <div class="word-list">
              <div 
                v-for="(word, index) in vocabulary" 
                :key="word.id"
                class="word-list-item"
                :class="{ 'active': index === activeWordIndex, 'learned': word.learned }"
                @click="activeWordIndex = index; showWordTranslation = false;"
              >
                <div class="word-text">{{ word.portuguese }}</div>
                <span v-if="word.learned" class="mini-check">✓</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Practice Tab -->
        <div v-else-if="activeTab === 'practice'" class="practice-section">
          <div class="practice-options">
            <div class="practice-card">
              <h3>Flashcards</h3>
              <p>Révisez avec des flashcards pour mémoriser facilement</p>
              <button class="btn" @click="goToFlashcards">Démarrer les flashcards</button>
            </div>
            
            <div class="practice-card">
              <h3>Quiz</h3>
              <p>Testez vos connaissances avec un quiz interactif</p>
              <button 
                v-if="!quizAvailable && !quizLoading" 
                class="btn" 
                @click="generateQuiz"
              >
                Générer un quiz
              </button>
              <button 
                v-else-if="quizAvailable" 
                class="btn" 
                @click="goToQuiz"
              >
                Démarrer le quiz
              </button>
              <div v-else class="loading-mini">
                Génération du quiz...
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="vocabulary.length === 0" class="empty-state">
          <p>Aucun mot n'est disponible pour cette leçon pour le moment.</p>
        </div>
      </div>
    </template>
    
    <div v-else class="error-state">
      <p>Leçon introuvable. Veuillez revenir à la liste des leçons.</p>
      <router-link to="/lessons" class="btn">Retour aux leçons</router-link>
    </div>
  </div>
</template>

<style scoped>
.lesson-detail {
  max-width: 1000px;
  margin: 0 auto;
}

.loading, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
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

.lesson-header {
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

.lesson-info h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--primary-color);
}

.lesson-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.level, .theme, .word-count {
  background-color: var(--bg-secondary);
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
  color: var(--text-light);
}

.lesson-description {
  margin-bottom: 1rem;
  color: var(--text-color);
  line-height: 1.6;
}

.progress-text {
  display: block;
  margin-top: 0.5rem;
  color: var(--text-light);
  font-size: 0.9rem;
}

.lesson-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-color);
}

.tab-button {
  background: none;
  border: none;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-light);
  cursor: pointer;
  position: relative;
  transition: var(--transition);
}

.tab-button.active {
  color: var(--primary-color);
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 3px;
  background-color: var(--primary-color);
}

.vocabulary-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

.word-viewer {
  background-color: var(--bg-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.navigation-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.nav-button {
  background-color: var(--bg-secondary);
  border: none;
  border-radius: var(--radius);
  padding: 0.5rem 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-button:not(:disabled):hover {
  background-color: var(--border-color);
}

.word-counter {
  color: var(--text-light);
}

.current-word-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  border-radius: var(--radius);
  background-color: var(--bg-secondary);
  margin-bottom: 1rem;
}

.word-portuguese {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.word-translation {
  font-size: 1.5rem;
  color: var(--text-color);
  margin-bottom: 1rem;
}

.audio-button {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.4rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.audio-button:hover {
  transform: scale(1.1);
}

.audio-button.small {
  font-size: 1rem;
}

.translation-toggle, .examples-toggle {
  background-color: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: var(--transition);
  margin-bottom: 1rem;
}

.translation-toggle:hover, .examples-toggle:hover {
  background-color: var(--primary-color);
  color: white;
}

.examples-section {
  width: 100%;
  margin-bottom: 1rem;
}

.examples-list {
  margin-top: 0.5rem;
  width: 100%;
}

.example-item {
  background-color: var(--bg-color);
  padding: 0.75rem;
  border-radius: var(--radius);
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.word-actions {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.learned-badge {
  background-color: var(--success-color);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  font-weight: 500;
}

.vocabulary-list {
  background-color: var(--bg-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.word-list {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.word-list-item {
  padding: 0.75rem;
  border-radius: var(--radius);
  margin-bottom: 0.5rem;
  background-color: var(--bg-secondary);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: var(--transition);
}

.word-list-item.active {
  background-color: var(--primary-color);
  color: white;
}

.word-list-item.learned {
  border-left: 4px solid var(--success-color);
}

.mini-check {
  color: var(--success-color);
  font-weight: bold;
}

.practice-section {
  padding: 1rem 0;
}

.practice-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.practice-card {
  background-color: var(--bg-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.practice-card h3 {
  color: var(--primary-color);
  font-size: 1.5rem;
}

.loading-mini {
  color: var(--text-light);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .vocabulary-section {
    grid-template-columns: 1fr;
  }
  
  .practice-options {
    grid-template-columns: 1fr;
  }
}
</style>
