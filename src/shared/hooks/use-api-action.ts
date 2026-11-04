import { useState } from 'react';

export function useApiAction<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);

  async function execute(action: () => Promise<T | null>) {
    setLoading(true);
    setError(null);
    try {
      const value = await action();
      setResult(value);
      return value;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'La operación falló';
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, result, execute };
}
