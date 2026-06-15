export function formatPrepTime(min: number, max: number): string {
  if (min === max) return `${min} min`;
  return `${min}–${max} min`;
}
