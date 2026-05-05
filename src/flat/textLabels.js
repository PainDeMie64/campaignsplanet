export function displayMapLabel(label) {
  const value = String(label);
  if (/^[A-E]\d{2}-/.test(value)) return value.replace('-', ' ');
  const seasonMatch = value.match(/^(.+?)\s+-\s+(\d{2})$/);
  if (seasonMatch) return `${seasonMatch[1]} ${seasonMatch[2]}`;
  const compactWords = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d+)/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean);
  if (!/\s/.test(value) && compactWords.length >= 2) return compactWords.join(' ');
  return value;
}
