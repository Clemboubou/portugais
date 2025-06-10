<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from './stores/userStore'
import NavBar from './components/common/NavBar.vue'
import { initializeDatabase } from './services/database'
import { useModuleStore } from './stores/moduleStore'

const userStore = useUserStore()
const moduleStore = useModuleStore()

onMounted(async () => {
  await initializeDatabase()
  await userStore.fetchUserProgress()
  await moduleStore.fetchModules()
  
  // Load dark mode preference
  userStore.loadDarkModePreference()
})
</script>

<template>
  <div class="app-container">
    <NavBar />
    <main>
      <router-view />
    </main>
    <footer class="app-footer">
      <p> {{ new Date().getFullYear() }} - Apprendre le Portugais</p>
    </footer>
  </div>
</template>

<style>
:root {
  --primary-color: #3D9970;
  --secondary-color: #127C56;
  --accent-color: #F9A825;
  --text-color: #333;
  --text-light: #777;
  --bg-color: #fff;
  --bg-secondary: #f5f5f5;
  --border-color: #ddd;
  --success-color: #4CAF50;
  --error-color: #F44336;
  --max-width: 1200px;
  --header-height: 60px;
  --footer-height: 60px;
  --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --radius: 8px;
  --transition: all 0.3s ease;
}

body.dark-mode {
  --primary-color: #4EAE81;
  --secondary-color: #36826B;
  --accent-color: #FBC02D;
  --text-color: #eaeaea;
  --text-light: #aaa;
  --bg-color: #121212;
  --bg-secondary: #1e1e1e;
  --border-color: #333;
  --success-color: #66BB6A;
  --error-color: #EF5350;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
  line-height: 1.6;
  transition: background-color 0.3s ease, color 0.3s ease;
}

a {
  color: var(--primary-color);
  text-decoration: none;
  transition: var(--transition);
}

a:hover {
  color: var(--secondary-color);
}

button {
  cursor: pointer;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
  padding: 2rem 1rem;
  max-width: var(--max-width);
  margin: 0 auto;
  width: 100%;
}

.app-footer {
  height: var(--footer-height);
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  color: var(--text-light);
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--radius);
  background-color: var(--primary-color);
  color: white;
  font-weight: 600;
  transition: var(--transition);
}

.btn:hover {
  background-color: var(--secondary-color);
}

.btn-outline {
  background-color: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
}

.btn-outline:hover {
  background-color: var(--primary-color);
  color: white;
}

.card {
  background-color: var(--bg-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
  transition: var(--transition);
}

.card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1rem;
}

.section-title {
  margin-bottom: 1.5rem;
  color: var(--primary-color);
  font-weight: 700;
  font-size: 1.5rem;
}

.text-center {
  text-align: center;
}

.mb-1 { margin-bottom: 0.5rem; }
.mb-2 { margin-bottom: 1rem; }
.mb-3 { margin-bottom: 1.5rem; }
.mb-4 { margin-bottom: 2rem; }

.mt-1 { margin-top: 0.5rem; }
.mt-2 { margin-top: 1rem; }
.mt-3 { margin-top: 1.5rem; }
.mt-4 { margin-top: 2rem; }

.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.gap-1 { gap: 0.5rem; }
.gap-2 { gap: 1rem; }
</style>
