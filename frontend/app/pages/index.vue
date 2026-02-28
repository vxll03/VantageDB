<template>
  <div class="dashboard-page">
    <main-header v-model:set-show="isModalVisible" />
    <main-create-project-modal v-model:show="isModalVisible" />

    <div class="top-grid">
      <main-recent-check-card />
      <main-check-diagram-card />
    </div>

    <main-database-info-card />
  </div>
</template>

<script setup lang="ts">
  const isModalVisible = ref(false);
</script>

<style scoped lang="scss">
  .dashboard-page {
    height: calc(100vh - 64px);
    display: flex;
    flex-direction: column;
    gap: 24px;
    overflow: hidden;
  }

  .top-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    flex-shrink: 0;
    max-height: 30vh;
  }

  .data-card {
    background-color: $medium;
    border-radius: 12px;
  }
</style>
