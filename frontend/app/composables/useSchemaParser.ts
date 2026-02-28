import dagre from 'dagre';
import type { Node, Edge } from '@vue-flow/core';
import type { SnapshotDetails } from '~/schemas/snapshots.schema';

export interface ColumnNodeData {
  name: string;
  type: string;
  status: 'normal' | 'added' | 'removed' | 'changed';
  changeDetails: string[];
}

export interface TableNodeData {
  label: string;
  status: 'normal' | 'added' | 'removed' | 'changed';
  columns: ColumnNodeData[];
}

export interface ViewNodeData {
  label: string;
  type: 'view' | 'materialized_view';
  status: 'normal' | 'added' | 'removed' | 'changed';
  definition?: string;
  oldDefinition?: string;
}

export const useSchemaParser = () => {
  const parseSchemaToFlow = (snapshot: SnapshotDetails | null | undefined) => {
    const nodes: Node<TableNodeData>[] = [];
    const edges: Edge[] = [];

    if (!snapshot || !snapshot.schema_data) {
      return { nodes, edges };
    }

    const tables = snapshot.schema_data.tables;
    const diff = snapshot.diff_data || { added_tables: [], removed_tables: [], changed_tables: {} };

    const extractNames = (arr: unknown[] | undefined): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr.map((item) => (typeof item === 'string' ? item : item?.name || ''));
    };

    tables.forEach((table) => {
      let tableStatus: TableNodeData['status'] = 'normal';
      if (diff.added_tables?.includes(table.name)) tableStatus = 'added';
      else if (diff.changed_tables?.[table.name]) tableStatus = 'changed';

      const changes = diff.changed_tables?.[table.name] || {};
      const addedColNames = extractNames(changes.added_columns);
      const removedColNames = extractNames(changes.removed_columns);

      const processedColumns: ColumnNodeData[] = table.columns.map((col) => {
        let colStatus: ColumnNodeData['status'] = 'normal';
        const changeDetails: string[] = [];

        if (addedColNames.includes(col.name)) {
          colStatus = 'added';
        } else if (changes.changed_columns?.[col.name]) {
          colStatus = 'changed';
          const colDiff = changes.changed_columns[col.name];

          if (colDiff?.type) {
            changeDetails.push(`Type: ${colDiff.type.old} → ${colDiff.type.new}`);
          }
          if (colDiff?.nullable !== undefined) {
            const oldNull = colDiff.nullable.old ? 'NULL' : 'NOT NULL';
            const newNull = colDiff.nullable.new ? 'NULL' : 'NOT NULL';
            changeDetails.push(`Nullable: ${oldNull} → ${newNull}`);
          }
        }
        return { ...col, status: colStatus, changeDetails };
      });

      removedColNames.forEach((colName) => {
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

  const parseViewsToFlow = (snapshot: SnapshotDetails | null | undefined) => {
    const nodes: Node<ViewNodeData>[] = [];
    const edges: Edge[] = [];

    if (!snapshot || !snapshot.views_data) return { nodes, edges };

    const views = snapshot.views_data.views || [];
    const matViews = snapshot.views_data.materialized_views || [];
    const diff = snapshot.views_diff_data || {
      views: { added: [], removed: [], changed: {} },
      materialized_views: { added: [], removed: [], changed: {} },
    };

    const processViewList = (list: any[], diffData: any, type: 'view' | 'materialized_view') => {
      const safeDiff = diffData || { added: [], removed: [], changed: {} };
      const addedList = safeDiff.added || [];
      const changedDict = safeDiff.changed || {};
      const removedList = safeDiff.removed || [];

      list.forEach((v) => {
        let status: ViewNodeData['status'] = 'normal';
        let oldDefinition: string | undefined = undefined;

        if (addedList.find((a: any) => a.name === v.name)) {
          status = 'added';
        } else if (changedDict[v.name]) {
          status = 'changed';
          oldDefinition = changedDict[v.name].old;
        }

        nodes.push({
          id: `view-${v.name}`,
          type: 'customView',
          position: { x: 0, y: 0 },
          data: {
            label: v.name,
            status,
            type,
            definition: v.definition,
            oldDefinition,
          },
        });
      });

      // 3. Обработка удаленных элементов
      removedList.forEach((name: string) => {
        nodes.push({
          id: `view-${name}`,
          type: 'customView',
          position: { x: 0, y: 0 },
          data: { label: name, status: 'removed', type },
        });
      });
    };

    processViewList(views, diff.views, 'view');
    processViewList(matViews, diff.materialized_views, 'materialized_view');

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 60 });

    nodes.forEach((node) => {
      g.setNode(node.id, { width: 300, height: 100 });
    });

    dagre.layout(g);

    nodes.forEach((node) => {
      const dagreNode = g.node(node.id);
      node.position = { x: dagreNode.x - 150, y: dagreNode.y - 50 };
    });

    return { nodes, edges };
  };

  return { parseSchemaToFlow, parseViewsToFlow };
};
