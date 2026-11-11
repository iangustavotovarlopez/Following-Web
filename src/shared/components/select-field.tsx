import type { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  emptyLabel?: string;
  containerClassName?: string;
}

export function SelectField({
  label,
  options,
  emptyLabel = 'Selecciona una opción',
  containerClassName,
  ...props
}: SelectFieldProps) {
  return (
    <label className={`field ${containerClassName ?? ''}`}>
      <span>{label}</span>
      <select {...props}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
