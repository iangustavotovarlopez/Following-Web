export function localDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function validDeliverableUrl(value: string) {
  try {
    const url = new URL(value);
    return value.length <= 2048 && !/\s/.test(value) && ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch (cause) {
    if (cause instanceof TypeError) return false;
    throw cause;
  }
}
