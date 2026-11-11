import type { ReactNode } from 'react';
import { SubmitButton } from './submit-button';

export function ResourceModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  const titleId = `modal-${title.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="management-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="management-modal-heading">
          <h3 id={titleId}>{title}</h3>
          <button aria-label="Cerrar" className="modal-close" onClick={onClose} type="button">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({
  onCancel,
  saving,
  submitLabel,
  submitDisabled,
}: {
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
  submitDisabled?: boolean;
}) {
  return (
    <div className="modal-actions">
      <button className="button secondary" onClick={onCancel} type="button">Cancelar</button>
      <SubmitButton loading={saving} disabled={submitDisabled}>{submitLabel}</SubmitButton>
    </div>
  );
}
