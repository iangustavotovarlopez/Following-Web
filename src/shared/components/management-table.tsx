import { Fragment, type ReactNode } from 'react';
import type { TableColumn } from './api-section';

export function ManagementTable<T>({
  columns,
  rows,
  loading,
  error,
  rowKey,
  emptyMessage,
  renderExpandedRow,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  loading: boolean;
  error: string | null;
  rowKey: (item: T) => string | number;
  emptyMessage: string;
  renderExpandedRow?: (item: T) => ReactNode;
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
          {rows.map((row) => {
            const expandedRow = renderExpandedRow?.(row);
            return (
              <Fragment key={rowKey(row)}>
                <tr>
                  {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
                </tr>
                {expandedRow && (
                  <tr className="management-expanded-row">
                    <td colSpan={columns.length}>{expandedRow}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
