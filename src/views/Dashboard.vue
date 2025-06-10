<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { useModuleStore } from '../stores/moduleStore';
import { useVocabularyStore } from '../stores/vocabularyStore';

const router = useRouter();
const userStore = useUserStore();
const moduleStore = useModuleStore();
const vocabularyStore = useVocabularyStore();

const loading = ref(true);

const progressPercentage = computed(() => userStore.getProgressPercentage);
const streak = computed(() => userStore.getStreak);
const totalLearned = computed(() => userStore.getTotalLearned);
const studyTime = computed(() => {
  const minutes = userStore.getTotalStudyTime;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${minutes} minutes`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
});

const nextModule = computed(() => moduleStore.getNextModuleToStudy);

const recentModules = computed(() => {
  return moduleStore.getModulesSortedByOrder
    .filter(module => module.progress > 0 && module.progress < 100)
    .slice(0, 3);
});

const wordsToReview = computed(() => vocabularyStore.getNextWordsToReview.slice(0, 5));

// Function to start a specific lesson
const startLesson = (moduleId) => {
  router.push(`/lesson/${moduleId}`);
};

// Function to start flashcard review
const startReview = () => {
  router.push('/flashcards');
};

onMounted(async () => {
  // Increment streak if this is a new day
  await userStore.updateStreak();
  
  // Fetch vocabulary items for review section
  await vocabularyStore.fetchAllVocabulary();
  
  loading.value = false;
});
</script>

<template>
  <div v-if="loading" class="loading">
    <div class="loading-spinner"></div>
    <p>Chargement...</p>
  </div>
  
  <div v-else class="dashboard">
    <header class="dashboard-header">
      <h2>Bienvenue à ton apprentissage du portugais</h2>
      <p>Apprends à ton rythme, de manière organisée et efficace</p>
    </header>

    <section class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ progressPercentage }}%</div>
          <div class="stat-label">Progression globale</div>
          <div class="progress-bar">
            <div class="progress-bar-fill" :style="{ width: `${progressPercentage}%` }"></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ streak }}</div>
          <div class="stat-label">Jours consécutifs</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ totalLearned }}</div>
          <div class="stat-label">Mots appris</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ studyTime }}</div>
          <div class="stat-label">Temps d'étude</div>
        </div>
      </div>
    </section>

    <section class="next-lesson-section">
      <h3 class="section-title">Continuer l'apprentissage</h3>
      <div v-if="nextModule" class="next-lesson-card">
        <div class="next-lesson-info">
          <h4>{{ nextModule.title }}</h4>
          <p>{{ nextModule.description }}</p>
          <div class="tags">
            <span class="tag">{{ nextModule.level }}</span>
            <span class="tag">{{ nextModule.theme }}</span>
          </div>
        </div>
        <button class="btn" @click="startLesson(nextModule.id)">Commencer</button>
      </div>
      <div v-else class="complete-message">
        <h4>Félicitations !</h4>
        <p>Tu as complété toutes les leçons disponibles. Reviens bientôt pour plus de contenu !</p>
      </div>
    </section>

    <div class="two-column-section">
      <section class="progress-section">
        <h3 class="section-title">Leçons en cours</h3>
        <div v-if="recentModules.length > 0" class="module-list">
          <div v-for="module in recentModules" :key="module.id" class="module-card">
            <h4>{{ module.title }}</h4>
            <div class="progress-indicator">
              <div class="progress-bar">
                <div class="progress-bar-fill" :style="{ width: `${module.progress}%` }"></div>
              </div>
              <span>{{ module.progress }}%</span>
            </div>
            <button class="btn btn-outline" @click="startLesson(module.id)">Continuer</button>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>Aucune leçon en cours pour le moment.</p>
          <router-link to="/lessons" class="btn">Voir les leçons</router-link>
        </div>
      </section>

      <section class="review-section">
        <h3 class="section-title">Mots à réviser</h3>
        <div v-if="wordsToReview.length > 0" class="word-review-list">
          <div v-for="word in wordsToReview" :key="word.id" class="word-card">
            <div class="word-portuguese">{{ word.portuguese }}</div>
            <div class="word-french">{{ word.french }}</div>
          </div>
          <button class="btn full-width" @click="startReview">Réviser avec des flashcards</button>
        </div>
        <div v-else class="empty-state">
          <p>Pas de mots à réviser pour le moment.</p>
          <router-link to="/lessons" class="btn">Commencer une leçon</router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 2rem;
}

.dashboard-header h2 {
  color: var(--primary-color);
  font-size: 2rem;
  font-weight: 700;
}

.dashboard-header p {
  color: var(--text-light);
  font-size: 1.2rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.stats-section {
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  background-color: var(--bg-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
  text-align: center;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  color: var(--text-light);
  font-size: 0.9rem;
}

.progress-bar {
  background-color: var(--bg-secondary);
  border-radius: 10px;
  height: 8px;
  margin-top: 0.5rem;
  overflow: hidden;
  width: 100%;
}

.progress-bar-fill {
  background-color: var(--primary-color);
  height: 100%;
  transition: width 0.3s ease;
}

.next-lesson-section {
  margin-bottom: 2rem;
}

.next-lesson-card {
  background-color: var(--bg-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.next-lesson-info h4 {
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
}

.tags {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.tag {
  background-color: var(--accent-color);
  color: #fff;
  border-radius: 20px;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
}

.complete-message {
  background-color: var(--bg-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
  text-align: center;
}

.two-column-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.module-list,
.word-review-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.module-card,
.word-card {
  background-color: var(--bg-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1rem;
}

.module-card h4 {
  margin-bottom: 0.5rem;
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.progress-indicator .progress-bar {
  flex: 1;
}

.word-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
}

.word-portuguese {
  font-weight: 600;
  color: var(--primary-color);
}

.word-french {
  color: var(--text-light);
}

.full-width {
  width: 100%;
  margin-top: 1rem;
}

.empty-state {
  background-color: var(--bg-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
  text-align: center;
}

.empty-state p {
  margin-bottom: 1rem;
  color: var(--text-light);
}

@media (max-width: 992px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .two-column-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .next-lesson-card {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
}
</style>
