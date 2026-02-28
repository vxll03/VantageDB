import dagre from 'dagre';
import { ApiSnapshotSchema } from '~/schemas/migrations.schema';

export const useSchemaParser = () => {
  const parseSchemaToFlow = (rawData: unknown) => {
    // 1. ВАЛИДАЦИЯ ДАННЫХ
    const responseData = ApiSnapshotSchema.parse(rawData);

    const nodes: any[] = [];
    const edges: any[] = [];

    // Прямое обращение к распакованным данным
    const diff = responseData.diff_data || {};
    const tables = responseData.tables || [];

    // 2. ФОРМИРОВАНИЕ УЗЛОВ
    tables.forEach((table) => {
      let tableStatus = 'normal';
      if (diff.added_tables?.includes(table.name)) tableStatus = 'added';
      else if (diff.changed_tables?.[table.name]) tableStatus = 'changed';

      // Хелпер: достает имена из массива строк ИЛИ массива объектов
      const extractNames = (arr: any[] | undefined) =>
        arr ? arr.map((item) => (typeof item === 'string' ? item : item.name)) : [];

      const changes = diff.changed_tables?.[table.name];
      const addedColNames = extractNames(changes?.added_columns);
      const removedColNames = extractNames(changes?.removed_columns);

      // ... остальной код маппинга колонок и связей остается без изменений

      const processedColumns = table.columns.map((col) => {
        let colStatus = 'normal';
        let changeDetails: string[] = [];

        if (changes) {
          if (addedColNames.includes(col.name)) {
            colStatus = 'added';
          } else if (changes.changed_columns?.[col.name]) {
            colStatus = 'changed';
            const colDiff = changes.changed_columns[col.name];

            if (colDiff?.type)
              changeDetails.push(`Type: ${colDiff.type.old} → ${colDiff.type.new}`);
            if (colDiff?.nullable !== undefined) {
              const oldNull = colDiff.nullable.old ? 'NULL' : 'NOT NULL';
              const newNull = colDiff.nullable.new ? 'NULL' : 'NOT NULL';
              changeDetails.push(`Nullable: ${oldNull} → ${newNull}`);
            }
          }
        }
        return { ...col, status: colStatus, changeDetails };
      });

      // Добавление удаленных колонок
      removedColNames.forEach((colName: string) => {
        processedColumns.push({
          name: colName,
          type: 'REMOVED',
          status: 'removed',
          changeDetails: [],
        });
      });

      nodes.push({
        id: `table-${table.name}`,
        type: 'customTable',
        position: { x: 0, y: 0 },
        data: { label: table.name, status: tableStatus, columns: processedColumns },
      });

      // 3. ФОРМИРОВАНИЕ СВЯЗЕЙ
      if (table.foreign_keys && table.foreign_keys.length > 0) {
        table.foreign_keys.forEach((fk) => {
          fk.constrained_columns.forEach((sourceCol, index) => {
            const targetCol = fk.referred_columns[index];

            edges.push({
              id: `fk-${table.name}-${sourceCol}-${fk.referred_table}-${targetCol}`,
              source: `table-${table.name}`,
              target: `table-${fk.referred_table}`,
              type: 'smoothstep',
              sourceHandle: `${sourceCol}-source-right`,
              targetHandle: `${targetCol}-target-left`,
              animated: true,
              data: { sourceCol, targetCol },
              style: { stroke: '#11af74', strokeWidth: 2 },
            });
          });
        });
      }
    });

    // Обработка удаленных таблиц
    if (diff.removed_tables) {
      diff.removed_tables.forEach((tableName: string) => {
        nodes.push({
          id: `table-${tableName}`,
          type: 'customTable',
          position: { x: 0, y: 0 },
          data: { label: tableName, status: 'removed', columns: [] },
        });
      });
    }

    // 4. DAGRE ЛЕЙАУТ
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', ranksep: 250, nodesep: 60 });

    nodes.forEach((node) => {
      const height = (node.data.columns?.length || 0) * 36 + 40;
      g.setNode(node.id, { width: 250, height });
    });

    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    dagre.layout(g);

    nodes.forEach((node) => {
      const dagreNode = g.node(node.id);
      const height = (node.data.columns?.length || 0) * 36 + 40;
      node.position = { x: dagreNode.x - 125, y: dagreNode.y - height / 2 };
    });

    return { nodes, edges };
  };

  return { parseSchemaToFlow };
};
