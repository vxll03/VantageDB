import * as Diff from 'diff';

export interface DiffLine {
  type: 'added' | 'removed' | 'common';
  content: string;
}

export const generateSqlDiff = (oldSql: string | null, newSql: string | null): DiffLine[] => {
  if (!oldSql) return [{ type: 'added', content: newSql || '' }];
  if (!newSql) return [{ type: 'removed', content: oldSql || '' }];

  const diff = Diff.diffLines(oldSql, newSql);
  const result: DiffLine[] = [];

  diff.forEach((part) => {
    const lines = part.value.split('\n');

    if (lines[lines.length - 1] === '') lines.pop();

    lines.forEach((line) => {
      if (part.added) {
        result.push({ type: 'added', content: `+ ${line}` });
      } else if (part.removed) {
        result.push({ type: 'removed', content: `- ${line}` });
      } else {
        result.push({ type: 'common', content: `  ${line}` });
      }
    });
  });

  return result;
};
