import type { ReactNode } from 'react';

export function RowActions({ onEdit, onDelete, children, className }: {
  onEdit: () => void;
  onDelete: () => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`row-actions${className ? ` ${className}` : ''}`}>
      <button
        aria-label="Editar"
        className="row-action-button edit"
        onClick={onEdit}
        title="Editar"
        type="button"
      >
        <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      </button>
      <button
        aria-label="Eliminar"
        className="row-action-button delete"
        onClick={onDelete}
        title="Eliminar"
        type="button"
      >
        <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="m19 6-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
      {children}
    </div>
  );
}
