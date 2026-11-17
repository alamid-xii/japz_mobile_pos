export function modifierText(modifiers?: Record<string, unknown> | null) {
  return modifiers ? Object.values(modifiers).flatMap(value => Array.isArray(value) ? value : [value]).filter(value => typeof value === 'string' || typeof value === 'number').join(' · ') : '';
}
