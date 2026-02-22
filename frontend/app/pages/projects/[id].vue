<template>
  <div class="schema-page">
    <div class="timeline-container">
      <n-spin :show="isLoadingSnapshots" size="small">
        <n-scrollbar x-scrollable>
          <div class="timeline-track">
            <div
              v-for="snap in snapshots"
              :key="snap.revision_id"
              :class="['timeline-item', { active: selectedRevision === snap.revision_id }]"
              @click="selectRevision(snap.id)"
            >
              <div class="dot-wrapper">
                <div class="dot"></div>
                <div class="line" v-if="snap !== snapshots[snapshots.length - 1]"></div>
              </div>
              <div class="label">{{ snap.revision_id }}</div>
              <div class="date">{{ formatDate(snap.created_at) }}</div>
            </div>

            <div v-if="!snapshots?.length && !isLoadingSnapshots" class="no-data">
              No snapshots found for this project.
            </div>
          </div>
        </n-scrollbar>
      </n-spin>
    </div>

    <div class="canvas-wrapper">
      <n-spin :show="isLoadingDetails" class="canvas-spinner">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :default-viewport="{ zoom: 1.2 }"
          :min-zoom="0.2"
          :max-zoom="4"
          fit-view-on-init
          class="db-canvas"
        >
          <template #node-customTable="{ data }">
            <n-card
              :class="['table-node', `status-${data.status}`]"
              :title="data.label"
              size="small"
              :bordered="true"
            >
              <div v-if="data.status === 'removed'" class="removed-placeholder">Table Dropped</div>

              <div class="columns-list">
                <n-tooltip
                  v-for="col in data.columns"
                  :key="col.name"
                  :disabled="col.status !== 'changed' || !col.changeDetails?.length"
                  placement="right"
                  trigger="hover"
                >
                  <template #trigger>
                    <div :class="['column-row', `status-${col.status}`]">
                      <Handle
                        type="target"
                        :position="Position.Left"
                        :id="col.name + '-target-left'"
                        class="custom-handle"
                      />
                      <Handle
                        type="source"
                        :position="Position.Left"
                        :id="col.name + '-source-left'"
                        class="custom-handle"
                      />

                      <span class="col-name">{{ col.name }}</span>
                      <span class="col-type">{{ col.type }}</span>

                      <Handle
                        type="target"
                        :position="Position.Right"
                        :id="col.name + '-target-right'"
                        class="custom-handle"
                      />
                      <Handle
                        type="source"
                        :position="Position.Right"
                        :id="col.name + '-source-right'"
                        class="custom-handle"
                      />
                    </div>
                  </template>

                  <div class="diff-tooltip">
                    <div v-for="(line, idx) in col.changeDetails" :key="idx" class="diff-line">
                      {{ line }}
                    </div>
                  </div>
                </n-tooltip>
              </div>
            </n-card>
          </template>

          <Panel position="top-right">
            <n-button-group>
              <n-button @click="zoomIn">
                <template #icon><Icon name="ph:magnifying-glass-plus" /></template>
              </n-button>
              <n-button @click="zoomOut">
                <template #icon><Icon name="ph:magnifying-glass-minus" /></template>
              </n-button>
              <n-button @click="fitView">
                <template #icon><Icon name="ph:corners-out" /></template>
              </n-button>
            </n-button-group>
          </Panel>
        </VueFlow>
      </n-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
  import '@vue-flow/core/dist/style.css';
  import '@vue-flow/core/dist/theme-default.css';

  import { ref, watch, computed, onMounted } from 'vue';
  import { useRoute } from 'vue-router';
  import { useQuery } from '@tanstack/vue-query';
  import { VueFlow, Panel, useVueFlow, Handle, Position } from '@vue-flow/core';
  import { Icon } from '#components';
  import { apiClient } from '~/utils/apiClient';

  // --- ИНИЦИАЛИЗАЦИЯ ---
  const route = useRoute();
  const projectId = route.params.id as string;

  const { parseSchemaToFlow } = useSchemaParser();
  const { zoomIn, zoomOut, fitView, onNodeDrag } = useVueFlow();

  const nodes = ref<any[]>([]);
  const edges = ref<any[]>([]);
  const selectedRevision = ref<string | null>(null);

  // Хелпер даты
  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // --- ЗАПРОСЫ К API ---

  // 1. Получаем список всех снапшотов проекта
  const { data: snapshots, isLoading: isLoadingSnapshots } = useQuery({
    queryKey: ['snapshots', projectId],
    queryFn: async () => await apiClient(`/snapshots/${projectId}`),
  });

  // Авто-выбор последней ревизии при первой загрузке списка
  watch(snapshots, (newSnaps) => {
    if (newSnaps && newSnaps.length > 0 && !selectedRevision.value) {
      selectedRevision.value = newSnaps[0].id;
    }
  });

  // 2. Получаем детали выбранной ревизии (срабатывает автоматически при изменении selectedRevision)
  const { data: currentSchemaData, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['snapshot-details', projectId, selectedRevision],
    queryFn: async () => await apiClient(`/snapshots/${projectId}/${selectedRevision.value}`),
    enabled: computed(() => !!selectedRevision.value), // Не запускать без ревизии
  });

  // --- ЛОГИКА ОТРИСОВКИ ---

  // Перерисовываем канвас, когда приходят новые детальные данные
  watch(currentSchemaData, (newData) => {
    if (newData) {
      // Собираем объект в том виде, который ожидает твой useSchemaParser:
      // Берем таблицы из schema_data и прикрепляем diff_data
      const payloadForParser = {
        ...newData.schema_data, // разворачиваем { tables: [...], views: [...] }
        diff_data: newData.diff_data || {},
      };

      try {
        const flowData = parseSchemaToFlow(payloadForParser);
        nodes.value = flowData.nodes;
        edges.value = flowData.edges;

        setTimeout(() => {
          updateHandles();
          fitView();
        }, 50);
      } catch (e) {
        console.error('Schema parsing error:', e);
      }
    }
  });

  const selectRevision = (revId: string) => {
    if (selectedRevision.value !== revId) {
      selectedRevision.value = revId;
      nodes.value = []; // Очищаем канвас на время загрузки новой схемы
      edges.value = [];
    }
  };

  const updateHandles = () => {
    edges.value.forEach((edge) => {
      const sNode = nodes.value.find((n) => n.id === edge.source);
      const tNode = nodes.value.find((n) => n.id === edge.target);

      if (sNode && tNode) {
        if (sNode.position.x > tNode.position.x) {
          edge.sourceHandle = `${edge.data.sourceCol}-source-left`;
          edge.targetHandle = `${edge.data.targetCol}-target-right`;
        } else {
          edge.sourceHandle = `${edge.data.sourceCol}-source-right`;
          edge.targetHandle = `${edge.data.targetCol}-target-left`;
        }
      }
    });
  };

  onNodeDrag(updateHandles);
</script>

<style scoped lang="scss">
  .schema-page {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 64px);
    width: 100%;
    background-color: #080c09; /* $dark */
  }

  /* === СТИЛИ ТАЙМЛАЙНА === */
  .timeline-container {
    flex: 0 0 auto;
    padding: 16px 24px;
    background-color: #1e2320; /* $medium */
    border-bottom: 1px solid #3b3c3d; /* $light */
  }

  .timeline-track {
    display: flex;
    align-items: center;
    min-width: min-content;
    padding-bottom: 8px; /* Место под скроллбар */
  }

  .timeline-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 120px;
    cursor: pointer;
    opacity: 0.6;
    transition: all 0.2s ease;

    &:hover {
      opacity: 0.9;
    }

    &.active {
      opacity: 1;
      .dot {
        background-color: #11af74; /* $accent */
        box-shadow: 0 0 8px rgba(17, 175, 116, 0.6);
        border-color: #11af74;
      }
      .label {
        color: #eaebeb;
        font-weight: bold;
      }
    }

    .dot-wrapper {
      display: flex;
      align-items: center;
      width: 100%;
      margin-bottom: 8px;

      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: #3b3c3d;
        border: 2px solid #080c09;
        z-index: 2;
        transition: all 0.2s ease;
      }

      .line {
        flex: 1;
        height: 2px;
        background-color: #3b3c3d;
        margin-left: -2px; /* Заходит под точку */
        z-index: 1;
      }
    }

    .label {
      color: #727379; /* $gray */
      font-size: 0.85rem;
      margin-bottom: 2px;
    }

    .date {
      color: #727379;
      font-size: 0.7rem;
    }
  }

  .no-data {
    color: #727379;
    font-size: 0.9rem;
    font-style: italic;
  }

  /* === СТИЛИ КАНВАСА === */
  .canvas-wrapper {
    flex: 1 1 auto;
    position: relative;

    .canvas-spinner {
      height: 100%;
      :deep(.n-spin-content) {
        height: 100%;
      }
    }
  }

  .db-canvas {
    width: 100%;
    height: 100%;
  }

  /* ... Твои старые стили для узлов и колонок остаются без изменений ... */
  .table-node {
    width: 250px;
    background-color: #1e2320;
    border: 1px solid #3b3c3d;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    user-select: none;

    :deep(.n-card-header) {
      padding: 8px 12px;
      background-color: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid #3b3c3d;
    }

    :deep(.n-card-header__main) {
      font-size: 0.9rem;
      color: #eaebeb;
      font-weight: 600;
    }

    :deep(.n-card__content) {
      padding: 0;
    }
  }

  .columns-list {
    display: flex;
    flex-direction: column;
  }
  .column-row {
    position: relative;
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    font-size: 0.8rem;
    &:last-child {
      border-bottom: none;
    }
    .col-name {
      color: #eaebeb;
    }
    .col-type {
      color: #727379;
      font-size: 0.75rem;
    }
  }

  .custom-handle {
    opacity: 0 !important;
    width: 1px;
    height: 1px;
    border: none;
    background: transparent;
    &.vue-flow__handle-left {
      left: 0;
    }
    &.vue-flow__handle-right {
      right: 0;
    }
  }

  .table-node {
    &.status-added {
      border-color: rgba(17, 175, 116, 0.5);
      box-shadow: 0 0 15px rgba(17, 175, 116, 0.1);
    }
    &.status-removed {
      border-color: rgba(208, 48, 80, 0.5);
      opacity: 0.7;
      :deep(.n-card-header__main) {
        text-decoration: line-through;
        color: #d03050;
      }
    }
    &.status-changed {
      border-color: rgba(32, 128, 240, 0.4);
    }
  }

  .removed-placeholder {
    padding: 12px;
    text-align: center;
    color: #d03050;
    font-size: 0.75rem;
    font-weight: bold;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .column-row {
    &.status-added {
      background-color: rgba(17, 175, 116, 0.15);
    }
    &.status-removed {
      background-color: rgba(208, 48, 80, 0.15);
      .col-name,
      .col-type {
        text-decoration: line-through;
        opacity: 0.6;
      }
    }
    &.status-changed {
      background-color: rgba(32, 128, 240, 0.15);
    }
  }
</style>
