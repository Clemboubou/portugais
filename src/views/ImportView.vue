<script setup lang="ts">
// ImportView component for importing/exporting data
</script>

<template>
  <div class="import-view">
    <h1>Import/Export</h1>
    <p>Cette page permettra d'importer et d'exporter vos données d'apprentissage.</p>
    
    <div class="feature-section">
      <h2>Fonctionnalités à venir</h2>
      <ul>
        <li>Importer des modules d'apprentissage</li>
        <li>Exporter votre progression</li>
        <li>Sauvegarder votre base de données</li>
        <li>Partager des leçons personnalisées</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.import-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.feature-section {
  background-color: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 2rem;
  margin-top: 2rem;
}

.feature-section h2 {
  margin-bottom: 1rem;
  color: var(--primary-color);
}

ul {
  padding-left: 1.5rem;
}

li {
  margin-bottom: 0.5rem;
  color: var(--text-color);
}
</style>
