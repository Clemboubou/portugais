<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useModuleStore } from '../stores/moduleStore';

const router = useRouter();
const moduleStore = useModuleStore();

const loading = ref(true);
const activeFilter = ref('all');
const searchQuery = ref('');

// Filters
const filters = [
  { id: 'all', name: 'Tous' },
  { id: 'inProgress', name: 'En cours' },
  { id: 'completed', name: 'Terminés' },
  { id: 'notStarted', name: 'Non commencés' }
];

// Module levels for grouping
const levels = computed(() => {
  const modulesByLevel = moduleStore.getModulesByLevel;
  return Object.keys(modulesByLevel).sort();
});

// Filtered modules based on active filter and search
const filteredModules = computed(() => {
  const query = searchQuery.value.toLowerCase();
  const modulesByLevel = moduleStore.getModulesByLevel;
  const result = {};
  
  levels.value.forEach(level => {
    let modules = [...modulesByLevel[level]];
    
    // Apply filter
    if (activeFilter.value === 'inProgress') {
      modules = modules.filter(m => m.progress > 0 && m.progress < 100);
    } else if (activeFilter.value === 'completed') {
      modules = modules.filter(m => m.completed);
    } else if (activeFilter.value === 'notStarted') {
      modules = modules.filter(m => m.progress === 0);
    }
    
    // Apply search
    if (query) {
      modules = modules.filter(m => 
        m.title.toLowerCase().includes(query) || 
        m.description.toLowerCase().includes(query) || 
        m.theme.toLowerCase().includes(query)
      );
    }
    
    if (modules.length > 0) {
      result[level] = modules;
    }
  });
  
  return result;
});

// Check if there are no results
const noResults = computed(() => {
  return Object.keys(filteredModules.value).length === 0;
});

// Calculate total progress across all modules
const totalProgress = computed(() => moduleStore.getTotalProgress);

// Navigate to a specific lesson
const goToLesson = (moduleId) => {
  router.push(`/lesson/${moduleId}`);
};

onMounted(async () => {
  await moduleStore.fetchModules();
  loading.value = false;
});
</script>

<template>
  <div class="lessons-list">
    <header class="page-header">
      <h2>Mes leçons de portugais</h2>
      <p>Explore les modules par niveau et par thème</p>
      
      <div class="progress-overview">
        <div class="progress-bar">
          <div class="progress-bar-fill" :style="{ width: `${totalProgress}%` }"></div>
        </div>
        <span>{{ totalProgress }}% complété</span>
      </div>
    </header>
    
    <div class="filter-container">
      <div class="filters">
        <button 
          v-for="filter in filters" 
          :key="filter.id"
          class="filter-button" 
          :class="{ active: activeFilter === filter.id }"
          @click="activeFilter = filter.id"
        >
          {{ filter.name }}
        </button>
      </div>
      
      <div class="search">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Rechercher une leçon..."
          class="search-input"
        />
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Chargement des leçons...</p>
    </div>
    
    <div v-else-if="noResults" class="no-results">
      <p>Aucune leçon ne correspond à vos critères.</p>
    </div>
    
    <div v-else class="modules-container">
      <div 
        v-for="level in Object.keys(filteredModules)" 
        :key="level"
        class="level-section"
      >
        <h3 class="level-title">Niveau {{ level }}</h3>
        
        <div class="modules-grid">
          <div 
            v-for="module in filteredModules[level]" 
            :key="module.id"
            class="module-card"
            :class="{ 'completed': module.completed }"
            @click="goToLesson(module.id)"
          >
            <div class="module-header">
              <h4>{{ module.title }}</h4>
              <span class="theme-tag">{{ module.theme }}</span>
            </div>
            
            <p class="module-description">{{ module.description }}</p>
            
            <div class="module-footer">
              <div class="progress-indicator">
                <div class="progress-bar">
                  <div class="progress-bar-fill" :style="{ width: `${module.progress}%` }"></div>
                </div>
                <span>{{ module.progress }}%</span>
              </div>
              
              <div class="word-count">
                <span>{{ module.wordCount }} mots</span>
              </div>
            </div>
            
            <div class="module-status">
              <span v-if="module.completed" class="status completed">Terminé</span>
              <span v-else-if="module.progress > 0" class="status in-progress">En cours</span>
              <span v-else class="status not-started">Non commencé</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lessons-list {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h2 {
  color: var(--primary-color);
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.page-header p {
  color: var(--text-light);
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.progress-overview {
  max-width: 400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-overview .progress-bar {
  flex: 1;
  height: 10px;
}

.filter-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-button {
  background-color: var(--bg-secondary);
  border: none;
  border-radius: 20px;
  padding: 0.5rem 1rem;
  font-weight: 500;
  color: var(--text-color);
  transition: all 0.2s ease;
}

.filter-button.active {
  background-color: var(--primary-color);
  color: white;
}

.search-input {
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 0.5rem 1rem;
  width: 250px;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: var(--primary-color);
}

.loading, .no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-light);
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

.level-section {
  margin-bottom: 2.5rem;
}

.level-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-color);
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
  display: inline-block;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.module-card {
  background-color: var(--bg-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  height: 100%;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.module-card.completed {
  border-left: 4px solid var(--success-color);
}

.module-header {
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.module-header h4 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.theme-tag {
  background-color: var(--accent-color);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.module-description {
  color: var(--text-light);
  font-size: 0.95rem;
  flex-grow: 1;
  margin-bottom: 1rem;
}

.module-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.progress-indicator .progress-bar {
  flex: 1;
  height: 6px;
}

.progress-indicator span {
  font-size: 0.875rem;
  color: var(--text-light);
  min-width: 40px;
  text-align: right;
}

.word-count {
  font-size: 0.875rem;
  color: var(--text-light);
}

.module-status {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
}

.status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.status.completed {
  background-color: var(--success-color);
  color: white;
}

.status.in-progress {
  background-color: var(--accent-color);
  color: white;
}

.status.not-started {
  background-color: var(--text-light);
  color: white;
}

@media (max-width: 768px) {
  .filter-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search {
    width: 100%;
  }
  
  .search-input {
    width: 100%;
  }
}
</style>
