import type { ReactNode } from 'react';

export interface TableColumn<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
}

interface ApiSectionProps<T> {
  title: string;
  description: string;
  columns: TableColumn<T>[];
  rows: T[];
  loading: boolean;
  error: string | null;
  form: ReactNode;
}

export function ApiSection<T>({
  title,
  description,
  columns,
  rows,
  loading,
  error,
  form,
}: ApiSectionProps<T>) {
  return (
    <section className="resource-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">API resource</p>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
        {form}
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <div className="empty-state">Consultando API...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">No hay registros para mostrar.</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={active ? 'badge active' : 'badge inactive'}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}
