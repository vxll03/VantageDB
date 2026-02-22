import dagre from 'dagre';
import { ApiSnapshotSchema, type ApiSnapshot } from '~/schemas/migrations.schema';

export const useSchemaParser = () => {
  // Заменяем any на неизвестный тип, чтобы заставить Zod его проверить
  const parseSchemaToFlow = (rawData: unknown) => {
    
    // 1. ВАЛИДАЦИЯ ДАННЫХ
    // parse() выбросит ошибку ZodError, если структура бэкенда изменилась
    const schemaData: ApiSnapshot = ApiSnapshotSchema.parse(rawData);

    const nodes: any[] = [];
    const edges: any[] = [];
    const diff = schemaData.diff_data || {};

    // 2. ФОРМИРОВАНИЕ УЗЛОВ (Код остается прежним, но теперь он type-safe)
    schemaData.tables.forEach((table) => {
      let tableStatus = 'normal';
      if (diff.added_tables?.includes(table.name)) tableStatus = 'added';
      else if (diff.changed_tables?.[table.name]) tableStatus = 'changed';

      const processedColumns = table.columns.map((col) => {
        let colStatus = 'normal';
        let changeDetails: string[] = [];
        const changes = diff.changed_tables?.[table.name];
        
        if (changes) {
          if (changes.added_columns?.includes(col.name)) {
            colStatus = 'added';
          } else if (changes.changed_columns?.[col.name]) {
            colStatus = 'changed';
            const colDiff = changes.changed_columns[col.name];
            
            if (colDiff?.type) changeDetails.push(`Type: ${colDiff.type.old} → ${colDiff.type.new}`);
            if (colDiff?.nullable !== undefined) {
              const oldNull = colDiff.nullable.old ? 'NULL' : 'NOT NULL';
              const newNull = colDiff.nullable.new ? 'NULL' : 'NOT NULL';
              changeDetails.push(`Nullable: ${oldNull} → ${newNull}`);
            }
          }
        }
        return { ...col, status: colStatus, changeDetails };
      });

      const removedCols = diff.changed_tables?.[table.name]?.removed_columns || [];
      removedCols.forEach((colName: string) => {
        processedColumns.push({ name: colName, type: 'REMOVED', status: 'removed', changeDetails: [] });
      });

      nodes.push({
        id: `table-${table.name}`,
        type: 'customTable',
        position: { x: 0, y: 0 },
        data: { label: table.name, status: tableStatus, columns: processedColumns }
      });

      // 3. ФОРМИРОВАНИЕ СВЯЗЕЙ
      if (table.foreign_keys && table.foreign_keys.length > 0) {
        table.foreign_keys.forEach((fk) => {
          edges.push({
            id: `fk-${table.name}-${fk.target_table}`,
            source: `table-${table.name}`,
            target: `table-${fk.target_table}`,
            type: 'smoothstep',
            sourceHandle: `${fk.column}-source-right`, 
            targetHandle: `${fk.target_column}-target-left`,
            animated: true,
            data: { sourceCol: fk.column, targetCol: fk.target_column },
            style: { stroke: '#11af74', strokeWidth: 2 }
          });
        });
      }
    });

    if (diff.removed_tables) {
      diff.removed_tables.forEach((tableName: string) => {
        nodes.push({
          id: `table-${tableName}`,
          type: 'customTable',
          position: { x: 0, y: 0 },
          data: { label: tableName, status: 'removed', columns: [] }
        });
      });
    }

    // 4. DAGRE ЛЕЙАУТ (без изменений)
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