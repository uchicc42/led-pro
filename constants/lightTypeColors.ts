import { supabase } from '../supabase';

// Colours for colour-coding the scope by (new) light type. Chosen to stay distinguishable
// on screen and when printed; beyond 12 types colours repeat, and the legend disambiguates.
export const LIGHT_TYPE_PALETTE = [
  '#2F6FB5', // blue
  '#2E8B57', // green
  '#E07B24', // orange
  '#7B4FB0', // purple
  '#C0392B', // red
  '#138D90', // teal
  '#C9A227', // gold
  '#C2457A', // pink
  '#8B5A2B', // brown
  '#1F3A68', // navy
  '#6B8E23', // olive
  '#5D6D7E', // slate
];

export const NO_TYPE_COLOR = '#9AA3AD';

// Light background tint for a colour, used for table rows.
export function tintOf(hex: string, amount = 0.86) {
  const n = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(n)) return '#F4F6F8';
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Gives every "new" light type without a colour the least-used palette colour and saves it,
// so a type keeps its colour from then on. Safe to call wherever light types are loaded:
// the update only applies while the colour is still empty, so two devices can't fight over it.
export async function ensureLightTypeColors<T extends { id: string; category: string; color: string | null }>(types: T[]): Promise<T[]> {
  const usage = new Map(LIGHT_TYPE_PALETTE.map(c => [c, 0]));
  types.forEach(t => { if (t.color && usage.has(t.color)) usage.set(t.color, usage.get(t.color)! + 1); });

  const result = [...types];
  for (let i = 0; i < result.length; i++) {
    const t = result[i];
    if (t.category !== 'new' || t.color) continue;
    const color = [...usage.entries()].sort((a, b) => a[1] - b[1])[0][0];
    usage.set(color, usage.get(color)! + 1);
    result[i] = { ...t, color };
    await supabase.from('light_types').update({ color }).eq('id', t.id).is('color', null);
  }
  return result;
}

// Name → colour lookup; light rows store the type name, not its id.
export function colorMap(types: { name: string; color: string | null }[]) {
  return new Map(types.filter(t => t.color).map(t => [t.name, t.color as string]));
}
