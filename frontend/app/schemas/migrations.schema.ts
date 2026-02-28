import { z } from 'zod';

export const ColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  default: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  nullable: z.boolean().optional(),
});

export const ForeignKeySchema = z.object({
  constrained_columns: z.array(z.string()),
  referred_table: z.string(),
  referred_columns: z.array(z.string()),
});

export const TableSchema = z.object({
  name: z.string(),
  columns: z.array(ColumnSchema),
  primary_key: z.array(z.string()),
  foreign_keys: z.array(ForeignKeySchema),
});

export const ChangeDetailSchema = z.object({
  old: z.union([z.string(), z.boolean(), z.number(), z.null()]).optional(),
  new: z.union([z.string(), z.boolean(), z.number(), z.null()]).optional(),
});

export const ColumnDiffSchema = z.object({
  type: ChangeDetailSchema.optional(),
  nullable: ChangeDetailSchema.optional(),
  default: ChangeDetailSchema.optional(),
});

export const TableDiffSchema = z.object({
  added_columns: z.array(ColumnSchema).optional(),
  removed_columns: z.array(z.string()).optional(),
  changed_columns: z.record(z.string(), ColumnDiffSchema).optional(),
});

export const DiffDataSchema = z.object({
  added_tables: z.array(z.string()).optional(),
  removed_tables: z.array(z.string()).optional(),
  changed_tables: z.record(z.string(), TableDiffSchema).optional(),
});

export const ApiSnapshotSchema = z.object({
  tables: z.array(TableSchema),
  diff_data: DiffDataSchema.nullable().optional(),
});

export type SchemaColumn = z.infer<typeof ColumnSchema>;
export type SchemaTable = z.infer<typeof TableSchema>;
export type DiffData = z.infer<typeof DiffDataSchema>;
export type ApiSnapshot = z.infer<typeof ApiSnapshotSchema>;
