<template>
  <div class="schema-page">
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
  </div>
</template>

<script setup lang="ts">
  import '@vue-flow/core/dist/style.css';
  import '@vue-flow/core/dist/theme-default.css';

  import { ref, onMounted } from 'vue';
  import { VueFlow, Panel, useVueFlow, Handle, Position } from '@vue-flow/core';
  import { Icon } from '#components';

  const { parseSchemaToFlow } = useSchemaParser();

  const { zoomIn, zoomOut, fitView, onNodeDrag } = useVueFlow();

  const nodes = ref<any[]>([]);
  const edges = ref<any[]>([]);

  const mockApiResponse = {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'email', type: 'VARCHAR(255)' },
          { name: 'password_hash', type: 'VARCHAR(255)' }, // Изменен тип
          { name: 'phone', type: 'VARCHAR(20)' }, // Добавлена
          { name: 'created_at', type: 'TIMESTAMP' },
          // Удалена: fax
        ],
        primary_key: ['id'],
        foreign_keys: [],
      },
      {
        name: 'roles',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'name', type: 'VARCHAR(50)' },
        ],
        primary_key: ['id'],
        foreign_keys: [],
      },
      {
        name: 'user_roles',
        columns: [
          { name: 'user_id', type: 'INTEGER' },
          { name: 'role_id', type: 'INTEGER' },
        ],
        primary_key: ['user_id', 'role_id'],
        foreign_keys: [
          { column: 'user_id', target_table: 'users', target_column: 'id' },
          { column: 'role_id', target_table: 'roles', target_column: 'id' },
        ],
      },
      {
        name: 'categories',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'parent_id', type: 'INTEGER' },
          { name: 'name', type: 'VARCHAR(100)' },
        ],
        primary_key: ['id'],
        foreign_keys: [
          { column: 'parent_id', target_table: 'categories', target_column: 'id' }, // Self-referencing
        ],
      },
      {
        name: 'products',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'sku', type: 'VARCHAR(50)' },
          { name: 'price', type: 'DECIMAL(10,2)' },
          { name: 'stock', type: 'INTEGER' },
        ],
        primary_key: ['id'],
        foreign_keys: [],
      },
      {
        name: 'product_categories',
        columns: [
          { name: 'product_id', type: 'INTEGER' },
          { name: 'category_id', type: 'INTEGER' },
        ],
        primary_key: ['product_id', 'category_id'],
        foreign_keys: [
          { column: 'product_id', target_table: 'products', target_column: 'id' },
          { column: 'category_id', target_table: 'categories', target_column: 'id' },
        ],
      },
      {
        name: 'product_reviews', // Новая таблица
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'product_id', type: 'INTEGER' },
          { name: 'user_id', type: 'INTEGER' },
          { name: 'rating', type: 'INTEGER' },
          { name: 'comment', type: 'TEXT' },
        ],
        primary_key: ['id'],
        foreign_keys: [
          { column: 'product_id', target_table: 'products', target_column: 'id' },
          { column: 'user_id', target_table: 'users', target_column: 'id' },
        ],
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'user_id', type: 'INTEGER' },
          { name: 'status', type: 'VARCHAR(30)' }, // Изменен nullable
          { name: 'tracking_number', type: 'VARCHAR(100)' }, // Добавлена
          { name: 'total_amount', type: 'DECIMAL(12,2)' },
        ],
        primary_key: ['id'],
        foreign_keys: [{ column: 'user_id', target_table: 'users', target_column: 'id' }],
      },
      {
        name: 'order_items',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'order_id', type: 'INTEGER' },
          { name: 'product_id', type: 'INTEGER' },
          { name: 'quantity', type: 'INTEGER' },
          { name: 'price_at_time', type: 'DECIMAL(10,2)' },
        ],
        primary_key: ['id'],
        foreign_keys: [
          { column: 'order_id', target_table: 'orders', target_column: 'id' },
          { column: 'product_id', target_table: 'products', target_column: 'id' },
        ],
      },
      {
        name: 'shipping_addresses',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'user_id', type: 'INTEGER' },
          { name: 'country', type: 'VARCHAR(100)' },
          { name: 'city', type: 'VARCHAR(100)' },
          { name: 'address_line', type: 'VARCHAR(255)' },
        ],
        primary_key: ['id'],
        foreign_keys: [{ column: 'user_id', target_table: 'users', target_column: 'id' }],
      },
      {
        name: 'invoices',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'order_id', type: 'INTEGER' },
          { name: 'issued_at', type: 'TIMESTAMP' },
          { name: 'is_paid', type: 'BOOLEAN' },
        ],
        primary_key: ['id'],
        foreign_keys: [{ column: 'order_id', target_table: 'orders', target_column: 'id' }],
      },
      {
        name: 'payments',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'invoice_id', type: 'INTEGER' },
          { name: 'amount', type: 'DECIMAL(12,2)' },
          { name: 'provider', type: 'VARCHAR(50)' },
        ],
        primary_key: ['id'],
        foreign_keys: [{ column: 'invoice_id', target_table: 'invoices', target_column: 'id' }],
      },
      {
        name: 'warehouses',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'location', type: 'VARCHAR(255)' },
        ],
        primary_key: ['id'],
        foreign_keys: [],
      },
      {
        name: 'inventory',
        columns: [
          { name: 'warehouse_id', type: 'INTEGER' },
          { name: 'product_id', type: 'INTEGER' },
          { name: 'quantity', type: 'INTEGER' },
        ],
        primary_key: ['warehouse_id', 'product_id'],
        foreign_keys: [
          { column: 'warehouse_id', target_table: 'warehouses', target_column: 'id' },
          { column: 'product_id', target_table: 'products', target_column: 'id' },
        ],
      },
    ],
    diff_data: {
      added_tables: ['product_reviews'],
      removed_tables: ['legacy_wishlists', 'old_tracking_logs'],
      changed_tables: {
        users: {
          added_columns: ['phone'],
          removed_columns: ['fax'],
          changed_columns: {
            password_hash: {
              type: {
                old: 'VARCHAR(128)',
                new: 'VARCHAR(255)',
              },
            },
          },
        },
        orders: {
          added_columns: ['tracking_number'],
          changed_columns: {
            status: {
              nullable: {
                old: false,
                new: true,
              },
            },
          },
        },
      },
    },
  };

  const loadSchema = () => {
    const flowData = parseSchemaToFlow(mockApiResponse);
    nodes.value = flowData.nodes;
    edges.value = flowData.edges;
  };

  // --- Пересчет ручек (Тот самый метод из прошлого шага) ---
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

  onMounted(() => {
    loadSchema();
    setTimeout(() => {
      updateHandles();
      fitView();
    }, 50);
  });
</script>

<style scoped lang="scss">
  .schema-page {
    height: calc(100vh - 64px);
    width: 100%;
    background-color: #080c09;
  }

  .db-canvas {
    width: 100%;
    height: 100%;
    // background: white;
  }

  .table-node {
    width: 250px;
    background-color: $medium;
    border: 1px solid $light;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    user-select: none;

    :deep(.n-card-header) {
      padding: 8px 12px;
      background-color: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid $light;
    }

    :deep(.n-card-header__main) {
      font-size: $font-m;
      color: $white;
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
    font-size: $font-s;

    &:last-child {
      border-bottom: none;
    }

    .col-name {
      color: $white;
    }
    .col-type {
      color: $gray;
      font-size: $font-xs;
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
      border-color: rgba(17, 175, 116, 0.5); /* $accent */
      box-shadow: 0 0 15px rgba(17, 175, 116, 0.1);
    }
    &.status-removed {
      border-color: rgba(208, 48, 80, 0.5); /* Красный */
      opacity: 0.7;

      :deep(.n-card-header__main) {
        text-decoration: line-through;
        color: #d03050;
      }
    }
    &.status-changed {
      border-color: rgba(32, 128, 240, 0.4); /* Синий */
    }
  }

  .removed-placeholder {
    padding: 12px;
    text-align: center;
    color: #d03050;
    font-size: $font-xs;
    font-weight: bold;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* --- Цветовые статусы колонок (Пастельные заливки) --- */
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
