import type { PipeColorKey } from '../types';

export const PIPE_COLORS: Record<PipeColorKey, string> = {
  red: '#FF3B3B',
  green: '#2ECC71',
  blue: '#3B9EFF',
  yellow: '#FFD700',
  orange: '#FF8C00',
  maroon: '#D44000',
  purple: '#9B59B6',
  pink: '#FF69B4',
  cyan: '#00CED1',
  white: '#F0F0F0',
  lime: '#ADFF2F',
  teal: '#20B2AA',
};

export const UI_COLORS = {
  bg: '#07070c',
  gridBg: '#101018',
  cellBorder: '#1c1c2a',
  headerBg: '#0b0b12',
  text: '#f4f4f8',
  textDim: '#6b7280',
  accent: '#5eead4',
  accentMuted: '#2dd4bf33',
  solvedGlow: '#2ECC71',
  progressBar: '#2ECC71',
  danger: '#f87171',
} as const;

export const PIPE_COLOR_KEYS: PipeColorKey[] = [
  'red',
  'green',
  'blue',
  'yellow',
  'orange',
  'maroon',
  'purple',
  'pink',
  'cyan',
  'white',
  'lime',
  'teal',
];

export function pipeColorIndex(color: PipeColorKey): number {
  return PIPE_COLOR_KEYS.indexOf(color);
}
