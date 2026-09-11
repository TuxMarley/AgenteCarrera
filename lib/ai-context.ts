/** Compacta texto declarado sin cortar palabras ni enviar campos vacíos al modelo. */
export function compactText(value: string | null | undefined, maxCharacters: number) {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxCharacters) return normalized;
  const lastSpace = normalized.lastIndexOf(' ', maxCharacters);
  return normalized.slice(0, lastSpace > Math.floor(maxCharacters * .6) ? lastSpace : maxCharacters).trimEnd() + '…';
}

export function compactRecords<T>(records: T[], limit: number) {
  return records.slice(0, limit);
}
