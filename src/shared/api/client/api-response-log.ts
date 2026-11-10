export interface ApiResponseLogEntry {
  capturedAt: string;
  method: string;
  path: string;
  status: number;
  response: unknown;
}

export const API_RESPONSE_LOG_EVENT = 'following:api-response-log';

const entries: ApiResponseLogEntry[] = [];

export function recordApiResponse(entry: ApiResponseLogEntry) {
  entries.push(entry);
  notifyChange();
}

export function getApiResponseLog() {
  return [...entries];
}

export function clearApiResponseLog() {
  entries.length = 0;
  notifyChange();
}

export function downloadApiResponseLog() {
  const contents = JSON.stringify({
    exportedAt: new Date().toISOString(),
    totalResponses: entries.length,
    responses: entries,
  }, null, 2);
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  link.href = url;
  link.download = `following-api-responses-${timestamp}.txt`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(API_RESPONSE_LOG_EVENT));
  }
}