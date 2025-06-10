<script setup lang="ts">
// ResourcesView component
</script>

<template>
  <div class="resources-view">
    <h1>Ressources</h1>
    <p>Cette page affichera les ressources d'apprentissage supplémentaires pour le portugais.</p>
    <div class="coming-soon">
      <p>Fonctionnalité à venir</p>
    </div>
  </div>
</template>

<style scoped>
.resources-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.coming-soon {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 3rem;
  margin-top: 2rem;
  color: var(--text-light);
  font-size: 1.2rem;
  text-align: center;
}
</style>
