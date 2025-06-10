<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuizStore } from '../stores/quizStore';
import { useModuleStore } from '../stores/moduleStore';
import { useUserStore } from '../stores/userStore';
import { generateSpeech } from '../services/apiService';

// Router and stores
const route = useRoute();
const router = useRouter();
const quizStore = useQuizStore();
const moduleStore = useModuleStore();
const userStore = useUserStore();

// State
const moduleId = computed(() => Number(route.params.id));
const loading = ref(true);
const module = ref(null);
const quiz = ref(null);
const currentQuestionIndex = ref(0);
const selectedAnswer = ref(null);
const isAnswerCorrect = ref(false);
const hasAnswered = ref(false);
const results = ref({
  score: 0,
  total: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  completed: false
});

// Load quiz data
onMounted(async () => {
  loading.value = true;
  try {
    module.value = await moduleStore.fetchModuleById(moduleId.value);
    if (!module.value) {
      router.push('/lessons');
      return;
    }
    
    // Check if quiz exists for this module
    let quizData = await quizStore.getQuizzesByModule(moduleId.value);
    
    // If no quiz exists, generate one
    if (!quizData || quizData.length === 0) {
      await quizStore.generateQuizForModule(moduleId.value);
      quizData = await quizStore.getQuizzesByModule(moduleId.value);
    }
    
    if (quizData && quizData.length > 0) {
      quiz.value = quizData[0]; // Use the first available quiz
      results.value.total = quiz.value.questions.length;
    } else {
      console.error('Failed to load or generate quiz');
    }
  } catch (error) {
    console.error('Error loading quiz:', error);
  } finally {
    loading.value = false;
  }
});

// Computed properties
const currentQuestion = computed(() => {
  if (!quiz.value || !quiz.value.questions) return null;
  return quiz.value.questions[currentQuestionIndex.value];
});

const isLastQuestion = computed(() => {
  if (!quiz.value || !quiz.value.questions) return true;
  return currentQuestionIndex.value === quiz.value.questions.length - 1;
});

const progress = computed(() => {
  if (!quiz.value || !quiz.value.questions || quiz.value.questions.length === 0) return 0;
  return Math.round(((currentQuestionIndex.value + 1) / quiz.value.questions.length) * 100);
});

// Methods for quiz interaction
const selectAnswer = (answer) => {
  if (hasAnswered.value) return;
  
  selectedAnswer.value = answer;
  hasAnswered.value = true;
  
  // Check if answer is correct
  if (currentQuestion.value.correctAnswer === answer) {
    isAnswerCorrect.value = true;
    results.value.correctAnswers++;
    results.value.score += 10; // 10 points per correct answer
  } else {
    isAnswerCorrect.value = false;
    results.value.incorrectAnswers++;
  }
  
  // Update the quiz in the store
  quizStore.updateQuizProgress(quiz.value.id, {
    currentQuestionIndex: currentQuestionIndex.value,
    score: results.value.score
  });
};

// Play pronunciation for the current question if it's a vocabulary question
const playAudio = () => {
  if (!currentQuestion.value || currentQuestion.value.type !== 'vocabulary') return;
  
  const speakWord = generateSpeech(currentQuestion.value.question, 'pt-PT');
  speakWord();
};

// Go to the next question
const nextQuestion = () => {
  if (isLastQuestion.value) {
    completeQuiz();
    return;
  }
  
  currentQuestionIndex.value++;
  resetQuestion();
};

// Reset question state for a new question
const resetQuestion = () => {
  selectedAnswer.value = null;
  isAnswerCorrect.value = false;
  hasAnswered.value = false;
};

// Complete the quiz and calculate final score
const completeQuiz = async () => {
  results.value.completed = true;
  
  // Update final quiz status in store
  await quizStore.completeQuiz(quiz.value.id, results.value.score);
  
  // Update module progress
  await moduleStore.updateProgress(moduleId.value);
  
  // Update user stats
  await userStore.updateQuizStats({
    quizCompleted: 1,
    score: results.value.score,
    correctAnswers: results.value.correctAnswers,
    totalQuestions: results.value.total
  });
};

// Restart the quiz
const restartQuiz = async () => {
  currentQuestionIndex.value = 0;
  resetQuestion();
  
  results.value = {
    score: 0,
    total: quiz.value.questions.length,
    correctAnswers: 0,
    incorrectAnswers: 0,
    completed: false
  };
  
  // Reset quiz in store
  await quizStore.resetQuiz(quiz.value.id);
};

// Return to lesson detail
const backToLesson = () => {
  router.push(`/lesson/${moduleId.value}`);
};

// Get answer class based on selection status and correctness
const getAnswerClass = (answer) => {
  if (!hasAnswered.value) return '';
  
  if (answer === currentQuestion.value.correctAnswer) {
    return 'correct';
  } else if (answer === selectedAnswer.value) {
    return 'incorrect';
  }
  
  return '';
};
</script>

<template>
  <div class="quiz-view">
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Chargement du quiz...</p>
    </div>
    
    <template v-else-if="module && quiz">
      <!-- Quiz Header -->
      <header class="quiz-header">
        <router-link :to="`/lesson/${moduleId}`" class="back-link">
          &larr; Retour à la leçon
        </router-link>
        
        <div class="quiz-info">
          <h2>Quiz: {{ module.title }}</h2>
          <div class="progress-bar">
            <div class="progress-bar-fill" :style="{ width: `${progress}%` }"></div>
          </div>
          <div class="quiz-progress">
            <span>Question {{ currentQuestionIndex + 1 }}/{{ results.total }}</span>
            <span>Score: {{ results.score }}</span>
          </div>
        </div>
      </header>
      
      <!-- Quiz Results -->
      <div v-if="results.completed" class="quiz-results">
        <h2>Quiz terminé !</h2>
        
        <div class="results-card">
          <div class="score-circle">
            <div class="score">
              {{ Math.round((results.correctAnswers / results.total) * 100) }}%
            </div>
            <div class="score-label">Score</div>
          </div>
          
          <div class="results-stats">
            <div class="result-row">
              <span class="stat-label">Questions:</span>
              <span class="stat-value">{{ results.total }}</span>
            </div>
            <div class="result-row">
              <span class="stat-label">Réponses correctes:</span>
              <span class="stat-value correct">{{ results.correctAnswers }}</span>
            </div>
            <div class="result-row">
              <span class="stat-label">Réponses incorrectes:</span>
              <span class="stat-value incorrect">{{ results.incorrectAnswers }}</span>
            </div>
            <div class="result-row">
              <span class="stat-label">Points:</span>
              <span class="stat-value">{{ results.score }} pts</span>
            </div>
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="btn primary" @click="restartQuiz">
            Recommencer le quiz
          </button>
          <button class="btn" @click="backToLesson">
            Retour à la leçon
          </button>
        </div>
      </div>
      
      <!-- Quiz Questions -->
      <div v-else-if="currentQuestion" class="quiz-content">
        <div class="question-container">
          <!-- Question -->
          <div class="question">
            <div class="question-type" v-if="currentQuestion.type">
              {{ currentQuestion.type === 'vocabulary' ? 'Vocabulaire' : 
                 currentQuestion.type === 'grammar' ? 'Grammaire' : 
                 currentQuestion.type === 'listening' ? 'Écoute' : '' }}
            </div>
            
            <div class="question-text">
              {{ currentQuestion.question }}
              <button 
                v-if="currentQuestion.type === 'vocabulary' || currentQuestion.type === 'listening'"
                class="audio-btn"
                @click="playAudio"
              >
                🔊
              </button>
            </div>
            
            <div v-if="currentQuestion.image" class="question-image">
              <img :src="currentQuestion.image" :alt="currentQuestion.question">
            </div>
          </div>
          
          <!-- Answers -->
          <div class="answers">
            <button 
              v-for="(answer, index) in currentQuestion.answers" 
              :key="index"
              class="answer-btn"
              :class="getAnswerClass(answer)"
              @click="selectAnswer(answer)"
              :disabled="hasAnswered"
            >
              {{ answer }}
            </button>
          </div>
          
          <!-- Feedback -->
          <div v-if="hasAnswered" class="feedback" :class="{ correct: isAnswerCorrect, incorrect: !isAnswerCorrect }">
            <p v-if="isAnswerCorrect">
              <span class="feedback-icon">✔</span> Correct!
            </p>
            <p v-else>
              <span class="feedback-icon">✖</span> Incorrect. La bonne réponse est: {{ currentQuestion.correctAnswer }}
            </p>
          </div>
          
          <!-- Next Button -->
          <div v-if="hasAnswered" class="next-container">
            <button class="btn next" @click="nextQuestion">
              {{ isLastQuestion ? 'Terminer' : 'Question suivante' }} →
            </button>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else class="error-state">
        <p>Impossible de charger les questions du quiz.</p>
        <router-link :to="`/lesson/${moduleId}`" class="btn">
          Retour à la leçon
        </router-link>
      </div>
    </template>
    
    <!-- No Quiz Available -->
    <div v-else-if="!loading" class="error-state">
      <h3>Quiz non disponible</h3>
      <p>Aucun quiz n'est disponible pour cette leçon.</p>
      <router-link to="/lessons" class="btn">
        Retour aux leçons
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.quiz-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
}

.loading, .error-state {
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

.quiz-header {
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

.quiz-info h2 {
  margin-bottom: 1rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-bar-fill {
  height: 100%;
  background-color: var(--primary-color);
  transition: width 0.3s ease;
}

.quiz-progress {
  display: flex;
  justify-content: space-between;
  color: var(--text-light);
  font-size: 0.9rem;
}

/* Quiz Question Styles */
.question-container {
  background-color: var(--bg-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 2rem;
  margin-bottom: 2rem;
}

.question {
  margin-bottom: 2rem;
}

.question-type {
  display: inline-block;
  background-color: var(--primary-color);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.question-text {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.audio-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.audio-btn:hover {
  transform: scale(1.1);
}

.question-image {
  margin-top: 1rem;
  max-width: 100%;
}

.question-image img {
  max-width: 100%;
  border-radius: var(--radius);
}

.answers {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.answer-btn {
  background-color: var(--bg-secondary);
  border: none;
  border-radius: var(--radius);
  padding: 1rem;
  text-align: left;
  font-size: 1rem;
  cursor: pointer;
  transition: var(--transition);
  color: var(--text-color);
}

.answer-btn:hover:not(:disabled):not(.correct):not(.incorrect) {
  background-color: var(--border-color);
  transform: translateY(-2px);
}

.answer-btn:disabled {
  cursor: not-allowed;
}

.answer-btn.correct {
  background-color: var(--success-color);
  color: white;
}

.answer-btn.incorrect {
  background-color: var(--danger-color);
  color: white;
}

.feedback {
  margin-top: 2rem;
  padding: 1rem;
  border-radius: var(--radius);
  text-align: center;
  font-weight: 500;
}

.feedback.correct {
  background-color: rgba(var(--success-color-rgb), 0.1);
  color: var(--success-color);
}

.feedback.incorrect {
  background-color: rgba(var(--danger-color-rgb), 0.1);
  color: var(--danger-color);
}

.feedback-icon {
  margin-right: 0.5rem;
  font-weight: bold;
}

.next-container {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.btn.next {
  background-color: var(--primary-color);
  color: white;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

/* Quiz Results */
.quiz-results {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.quiz-results h2 {
  margin-bottom: 2rem;
  color: var(--primary-color);
}

.results-card {
  background-color: var(--bg-color);
  padding: 2rem;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

@media (min-width: 600px) {
  .results-card {
    flex-direction: row;
    align-items: center;
  }
}

.score-circle {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}

.score {
  font-size: 2.5rem;
  font-weight: 700;
}

.score-label {
  font-size: 1rem;
}

.results-stats {
  flex: 1;
  text-align: left;
}

.result-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.stat-label {
  color: var(--text-light);
}

.stat-value {
  font-weight: 600;
}

.stat-value.correct {
  color: var(--success-color);
}

.stat-value.incorrect {
  color: var(--danger-color);
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.btn.primary {
  background-color: var(--primary-color);
  color: white;
}

@media (max-width: 600px) {
  .question-text {
    font-size: 1.2rem;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
