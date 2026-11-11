import type { TableColumn } from './api-section';

export function ManagementTable<T>({
  columns,
  rows,
  loading,
  error,
  rowKey,
  emptyMessage,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  loading: boolean;
  error: string | null;
  rowKey: (item: T) => string | number;
  emptyMessage: string;
}) {
  if (error) return <div className="alert error">{error}</div>;
  if (loading) return <div className="empty-state">Consultando API...</div>;
  if (rows.length === 0) return <div className="empty-state">{emptyMessage}</div>;
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
