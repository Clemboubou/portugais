<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '../../stores/userStore';

const userStore = useUserStore();

const menuOpen = ref(false);

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
};

const toggleDarkMode = () => {
  userStore.toggleDarkMode();
};
</script>

<template>
  <nav class="navbar">
    <div class="container navbar-container">
      <div class="navbar-brand">
        <router-link to="/">
          <h1>Apprendre le Portugais</h1>
        </router-link>
      </div>

      <button class="menu-toggle" @click="toggleMenu">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div class="navbar-menu" :class="{ 'is-active': menuOpen }">
        <div class="navbar-items">
          <router-link to="/" class="navbar-item" @click="menuOpen = false">
            Tableau de bord
          </router-link>
          <router-link to="/lessons" class="navbar-item" @click="menuOpen = false">
            Leçons
          </router-link>
          <router-link to="/flashcards" class="navbar-item" @click="menuOpen = false">
            Révision
          </router-link>
          <router-link to="/resources" class="navbar-item" @click="menuOpen = false">
            Ressources
          </router-link>
          <router-link to="/import" class="navbar-item" @click="menuOpen = false">
            Importer
          </router-link>
          <button class="dark-mode-toggle" @click="toggleDarkMode">
            <i class="icon" :class="userStore.isDarkMode ? 'icon-sun' : 'icon-moon'"></i>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  background-color: var(--primary-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: var(--header-height);
  padding: 0 1rem;
}

.navbar-brand h1 {
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.navbar-menu {
  display: flex;
  align-items: center;
}

.navbar-items {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.navbar-item {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  padding: 0.5rem 0;
  position: relative;
}

.navbar-item:hover,
.navbar-item.router-link-active {
  color: white;
}

.navbar-item.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 3px;
  background-color: var(--accent-color);
  border-radius: 4px 4px 0 0;
}

.dark-mode-toggle {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark-mode-toggle:hover {
  color: white;
}

.icon {
  display: inline-block;
  width: 24px;
  height: 24px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.icon-moon {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' /%3E%3C/svg%3E");
}

.icon-sun {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' /%3E%3C/svg%3E");
}

.menu-toggle {
  display: none;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
}

.menu-toggle span {
  display: block;
  width: 25px;
  height: 3px;
  margin: 5px auto;
  background-color: white;
  border-radius: 3px;
  transition: all 0.3s ease-in-out;
}

@media (max-width: 768px) {
  .menu-toggle {
    display: block;
  }

  .navbar-menu {
    position: fixed;
    top: var(--header-height);
    left: 0;
    right: 0;
    background-color: var(--primary-color);
    height: 0;
    overflow: hidden;
    transition: height 0.3s ease;
    flex-direction: column;
    align-items: stretch;
  }

  .navbar-menu.is-active {
    height: auto;
    padding-bottom: 1rem;
  }

  .navbar-items {
    flex-direction: column;
    align-items: flex-start;
    padding: 0 1rem;
  }
  
  .navbar-item {
    width: 100%;
    padding: 0.75rem 0;
  }
  
  .navbar-item.router-link-active::after {
    bottom: 0;
  }
  
  .dark-mode-toggle {
    margin-top: 0.5rem;
    align-self: flex-start;
    padding-left: 0;
  }
}
</style>
