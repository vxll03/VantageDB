<template>
  <div class="dashboard-page">
    
    <div class="page-header">
      <h1 class="page-title">Projects</h1>
      
      <n-button type="primary" class="create-btn" ghost>
        <template #icon>
          <Icon name="ph:plus-bold" />
        </template>
        Create Project
      </n-button>
    </div>

    <div class="top-grid">
      <n-card class="data-card" title="Recent checks" :bordered="false">
        <div class="check-list">
          <div v-for="i in 4" :key="i" class="check-item">
            <span class="db-name">My Test Database</span>
            <span class="divider">|</span>
            <span class="rev-name">Revision: 001</span>
          </div>
        </div>
      </n-card>

      <n-card class="data-card" title="Check diagram" :bordered="false">
        <div class="chart-placeholder">
        
        </div>
      </n-card>
    </div>

    <n-card :segmented="{ content: true }" class="data-card main-table-card" :bordered="false">
      <template #header>
        <div class="main-header">
          <Icon name="ph:database" size="20" />
          <span>Your Active Projects</span>
        </div>
      </template>
      <template #header-extra>
        <span class="active-count"><b>6</b> Active Projects</span>
      </template>
      
      <div class="table-placeholder">
         <div style="height: 1000px; color: #737573;">(Скролл-зона: добавь сюда таблицу)</div>
      </div>
    </n-card>
    
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.dashboard-page {
  height: calc(100vh - 64px); 
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow: hidden;
}

/* Шапка страницы */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;

  .page-title {
    font-size: $font-xxl;
    color: $white;
    margin: 0;
    margin-left: 10px;
  }
}

.top-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  flex-shrink: 0;
}

.data-card {
  background-color: $medium;
  border-radius: 12px;
}

.main-table-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  
  :deep(.n-card__content) {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: $light;
      border-radius: 4px;
    }
  }

  .main-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: $white;
    font-size: $font-xl;
    font-weight: 600;
  }

  .active-count {
    color: $gray;
    font-size: $font-m;
    b {
      color: $white;
    }
  }
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .check-item {
    font-size: $font-m;
    color: $gray;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    &:last-child {
      border-bottom: none;
    }

    .divider {
      margin: 0 8px;
      opacity: 0.5;
    }
  }
}

.chart-placeholder {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>