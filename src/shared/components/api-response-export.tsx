import { useEffect, useState } from 'react';
import {
  API_RESPONSE_LOG_EVENT,
  clearApiResponseLog,
  downloadApiResponseLog,
  getApiResponseLog,
} from '../api';

export function ApiResponseExport({ floating = false }: { floating?: boolean }) {
  const [count, setCount] = useState(() => getApiResponseLog().length);

  useEffect(() => {
    const updateCount = () => setCount(getApiResponseLog().length);
    window.addEventListener(API_RESPONSE_LOG_EVENT, updateCount);
    return () => window.removeEventListener(API_RESPONSE_LOG_EVENT, updateCount);
  }, []);

  return (
    <div className={`api-response-export${floating ? ' api-response-export-floating' : ''}`}>
      <button className="button primary" type="button" disabled={count === 0} onClick={downloadApiResponseLog}>
        Descargar TXT ({count})
      </button>
      <button className="button" type="button" disabled={count === 0} onClick={clearApiResponseLog}>
        Limpiar
      </button>
    </div>
  );
}