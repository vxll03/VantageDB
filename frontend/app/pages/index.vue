<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h1 class="page-title">Projects</h1>

      <n-button type="primary" class="create-btn" ghost @click="isModalVisible = true">
        <template #icon>
          <Icon name="ph:plus-bold" />
        </template>
        Create Project
      </n-button>
    </div>

    <create-project-modal v-model:show="isModalVisible" />

    <div class="top-grid">
      <n-card class="data-card" title="Recent checks" :bordered="false">
        <div v-if="isLoadingLatest" style="display: flex; justify-content: center; padding: 20px">
          <n-spin size="small" />
        </div>

        <div v-else-if="latestSnapshots && latestSnapshots.length > 0" class="check-list">
          <div v-for="snap in latestSnapshots" :key="snap.id" class="check-item">
            <NuxtLink :to="`/projects/${snap.project_id}`" class="db-name link">
              {{ snap.project_name }}
            </NuxtLink>

            <span class="divider">|</span>
            <span class="rev-name">Revision: {{ snap.revision_id }}</span>
          </div>
        </div>

        <div v-else style="color: #727379; text-align: center; padding: 10px 0">
          No recent checks found
        </div>
      </n-card>

      <n-card class="data-card" title="Check diagram" :bordered="false">
        <div class="chart-placeholder">
          <v-chart
            v-if="!isLoadingStats"
            class="echarts-instance"
            :option="chartOption"
            autoresize
          />
          <n-spin v-else size="medium" />
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
        <span class="active-count"
          ><b>{{ projects?.length || 0 }}</b> Active Projects</span
        >
      </template>

      <div class="flat-projects-list">
        <div v-for="project in projects" :key="project.id" class="flat-card">
          <div class="card-header">
            <div class="title-group">
              <Icon
                :name="project.icon || 'ph:folder-simple-duotone'"
                size="22"
                class="project-icon"
              />
              <NuxtLink :to="`/projects/${project.id}`" class="project-name-link">
                {{ project.name }}
              </NuxtLink>
            </div>

            <n-dropdown
              :options="actionOptions"
              placement="bottom-end"
              @select="(key) => handleProjectAction(key, project.id)"
            >
              <n-button quaternary circle size="small" class="action-btn">
                <template #icon>
                  <Icon name="ph:dots-three-bold" size="20" />
                </template>
              </n-button>
            </n-dropdown>
          </div>

          <div class="card-body">
            <span class="info-tag">{{ project.snapshots_count }} snaps</span>
            <span class="info-text">{{ project.tables_count }} tables</span>
            <span class="info-text">{{ project.views_count }} views</span>
            <span class="info-text">{{ project.mat_views_count }} mat views</span>
            <span class="info-text">{{ project.triggers_count }} triggers</span>
            <span class="info-date">Created {{ formatDate(project.created_at) }}</span>
          </div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
  import { h, resolveComponent } from 'vue';
  import { useProjectsQuery } from '~/composables/useProjects';
  import { useSnapshotStatsQuery } from '~/composables/useSnapshotStats';
  import { use } from 'echarts/core';
  import { CanvasRenderer } from 'echarts/renderers';
  import { LineChart } from 'echarts/charts';
  import { GridComponent, TooltipComponent } from 'echarts/components';
  import VChart from 'vue-echarts';

  use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);

  const NuxtLink = resolveComponent('NuxtLink');

  const { data: projects, isLoading } = useProjectsQuery();
  const { data: stats, isLoading: isLoadingStats } = useSnapshotStatsQuery();
  const { data: latestSnapshots, isLoading: isLoadingLatest } = useLatestSnapshotsQuery();

  const isModalVisible = ref(false);

  const columns = [
    {
      title: 'ID',
      key: 'id',
      width: 80,
      align: 'center',
    },
    {
      title: 'Project Name',
      key: 'name',
      render(row: any) {
        return h(
          NuxtLink,
          {
            to: `/projects/${row.id}`,
            style: 'color: #11af74; text-decoration: none; font-weight: 500;',
          },
          { default: () => row.name },
        );
      },
    },
    {
      title: 'Created At',
      key: 'created_at',
      render(row: any) {
        return new Date(row.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
  ];

  const chartOption = computed(() => {
    const sourceData = stats.value || [];

    // Извлекаем массивы для осей
    const xAxisData = sourceData.map((item) => item.date);
    const seriesData = sourceData.map((item) => item.count);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1E2320',
        borderColor: '#3B3C3D',
        textStyle: { color: '#EAEBEB' },
      },
      grid: {
        left: '0%',
        right: '0%',
        top: '10px',
        bottom: '0%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#727379',
          formatter: (value: string) => {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          },
        },
      },
      yAxis: {
        type: 'value',
        splitLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        axisLabel: { color: '#727379' },
      },
      series: [
        {
          data: seriesData,
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#11af74',
            width: 3,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(17, 175, 116, 0.4)' },
                { offset: 1, color: 'rgba(17, 175, 116, 0.0)' },
              ],
            },
          },
        },
      ],
    };
  });

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderIcon = (iconName: string, color?: string) => {
    return () => h(Icon, { name: iconName, size: '18', style: color ? `color: ${color}` : '' });
  };

  // Опции меню (троеточия)
  const actionOptions = [
    {
      label: 'Edit Project',
      key: 'edit',
      icon: renderIcon('ph:pencil-simple'),
    },
    {
      label: 'Settings',
      key: 'settings',
      icon: renderIcon('ph:gear'),
    },
    {
      type: 'divider',
      key: 'd1',
    },
    {
      label: 'Delete',
      key: 'delete',
      icon: renderIcon('ph:trash', '#e88080'), // Подсветка опасного действия
    },
  ];

  // Обработчик выбора
  const handleProjectAction = (key: string, projectId: number) => {
    if (key === 'delete') {
      console.log(`Deleting project ${projectId}`);
      // Здесь будет вызов мутации удаления
    } else if (key === 'edit') {
      console.log(`Editing project ${projectId}`);
    }
  };
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

      :deep(.n-card-header) {
        border-bottom: 1px solid white;
      }
    }

    .active-count {
      color: $gray;
      font-size: $font-m;
      b {
        color: $white;
      }
    }
  }

  :deep(.main-table-card) {
    .n-card-header {
      border-bottom: 2px solid $light;
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
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .echarts-instance {
    width: 100%;
    height: 100%;
  }

  .projects-table {
    --n-th-color: transparent !important;
    --n-td-color: transparent !important;
    --n-td-color-hover: rgba(255, 255, 255, 0.03) !important;

    :deep(.n-data-table-th) {
      color: $gray;
      font-weight: normal;
      border-bottom: 1px solid $light;
    }

    :deep(.n-data-table-td) {
      color: $white;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }
  }

  .flat-projects-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .flat-card {
    background-color: #1e2320; /* $medium */
    border-radius: 8px;
    padding: 16px 20px;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(30, 35, 32, 0.8); /* Легкий ховер-эффект без теней */
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .title-group {
        display: flex;
        align-items: center;
        gap: 12px;

        .project-icon {
          color: #727379; /* $gray */
        }

        .project-name-link {
          color: #eaebeb; /* $white */
          font-size: 1.15rem;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;

          &:hover {
            color: #11af74; /* $accent */
          }
        }
      }

      .action-btn {
        color: #727379;
        &:hover {
          color: #eaebeb;
        }
      }
    }

    .card-body {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      padding-left: 34px; /* Выравнивание под текст названия, с учетом иконки */

      .info-tag {
        background-color: rgba(17, 175, 116, 0.1);
        color: #11af74;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .info-text {
        color: #eaebeb;
        font-size: 0.85rem;
        display: flex;
        align-items: center;

        &::before {
          content: '•';
          color: #3b3c3d;
          margin-right: 16px;
          margin-left: -8px;
        }
      }

      .info-date {
        color: #727379;
        font-size: 0.8rem;
        margin-left: auto; /* Прижимает дату к правому краю */
      }
    }
  }

  .check-item {
    .db-name.link {
      color: #eaebeb; /* $white */
      text-decoration: none;
      transition: color 0.2s ease;
      font-weight: 500;

      &:hover {
        color: #11af74; /* $accent */
      }
    }
  }
</style>
