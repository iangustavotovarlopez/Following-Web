interface SubmitButtonProps {
  loading?: boolean;
  disabled?: boolean;
  children: string;
}

export function SubmitButton({ loading, disabled, children }: SubmitButtonProps) {
  return (
    <button className="button primary" type="submit" disabled={loading || disabled}>
      {loading ? 'Guardando...' : children}
    </button>
  );
}
