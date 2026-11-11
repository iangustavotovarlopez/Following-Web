import { useState, type FormEvent } from 'react';
import { Field } from './field';

export interface CatalogFilterValues {
  code?: string;
  name?: string;
}

export function CatalogFilters({
  onApply,
  onClear,
  showCode = true,
}: {
  onApply: (filters: CatalogFilterValues) => void;
  onClear?: () => void;
  showCode?: boolean;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if ((showCode && trimmedCode.length > 0 && trimmedCode.length < 3)
      || (trimmedName.length > 0 && trimmedName.length < 3)) {
      setError('Ingresa al menos 3 caracteres para filtrar.');
      return;
    }

    setError(null);
    onApply({
      ...(showCode && trimmedCode ? { code: trimmedCode } : {}),
      ...(trimmedName ? { name: trimmedName } : {}),
    });
  }

  function clear() {
    setCode('');
    setName('');
    setError(null);
    onApply({});
    onClear?.();
  }

  return (
    <form className="catalog-filter-form" onSubmit={submit}>
      {showCode && <Field label="Filtrar por código" value={code} onChange={(event) => setCode(event.target.value)} />}
      <Field label="Filtrar por nombre" value={name} onChange={(event) => setName(event.target.value)} />
      <div className="management-filter-actions">
        <button className="button primary" type="submit">Filtrar</button>
        <button className="button secondary" type="button" onClick={clear}>Limpiar</button>
      </div>
      {error && <span className="form-error catalog-filter-error">{error}</span>}
    </form>
  );
}
