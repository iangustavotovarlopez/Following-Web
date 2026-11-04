interface SubmitButtonProps {
  loading?: boolean;
  children: string;
}

export function SubmitButton({ loading, children }: SubmitButtonProps) {
  return (
    <button className="button primary" type="submit" disabled={loading}>
      {loading ? 'Guardando...' : children}
    </button>
  );
}
