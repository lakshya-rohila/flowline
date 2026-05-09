// ── Store catalog ─────────────────────────────────────────────────────────────

export type StoreCategory = 'themes' | 'hints' | 'powerups' | 'cosmetics';

export interface StoreItem {
  id: string;
  category: StoreCategory;
  name: string;
  description: string;
  price: number;          // in coins
  isFree: boolean;        // starter items are free / already owned
  isConsumable: boolean;  // consumables are bought many times (hints, undos)
  quantity?: number;      // for consumables: how many you get
  preview: {
    emoji: string;        // displayed in card
    accent: string;       // card accent color
    gradient: [string, string]; // card background gradient
  };
  badge?: string;         // "NEW" | "HOT" | "SALE" etc.
}

export const STORE_ITEMS: StoreItem[] = [

  // ── THEMES ─────────────────────────────────────────────────────────────────

  {
    id: 'theme_default',
    category: 'themes',
    name: 'Neon Dark',
    description: 'The classic Flowline look. Dark grid, vivid neon pipes.',
    price: 0,
    isFree: true,
    isConsumable: false,
    preview: { emoji: '🌑', accent: '#5EEAD4', gradient: ['#0b0b12', '#101018'] },
  },
  {
    id: 'theme_aurora',
    category: 'themes',
    name: 'Aurora',
    description: 'Dreamy purple-to-teal gradient board with soft glows.',
    price: 120,
    isFree: false,
    isConsumable: false,
    preview: { emoji: '🌌', accent: '#A855F7', gradient: ['#1a0533', '#0d2438'] },
    badge: 'HOT',
  },
  {
    id: 'theme_sunset',
    category: 'themes',
    name: 'Sunset',
    description: 'Warm orange and pink tones inspired by golden hour.',
    price: 120,
    isFree: false,
    isConsumable: false,
    preview: { emoji: '🌅', accent: '#FF8C00', gradient: ['#2d0a00', '#1a0d12'] },
  },
  {
    id: 'theme_ocean',
    category: 'themes',
    name: 'Deep Ocean',
    description: 'Cool blues and cyans. Like solving puzzles underwater.',
    price: 120,
    isFree: false,
    isConsumable: false,
    preview: { emoji: '🌊', accent: '#00CED1', gradient: ['#001428', '#001e2e'] },
  },
  {
    id: 'theme_forest',
    category: 'themes',
    name: 'Forest',
    description: 'Earthy greens. A calm natural palette for focused play.',
    price: 150,
    isFree: false,
    isConsumable: false,
    preview: { emoji: '🌿', accent: '#2ECC71', gradient: ['#051a0a', '#0a1f0e'] },
    badge: 'NEW',
  },
  {
    id: 'theme_midnight',
    category: 'themes',
    name: 'Midnight',
    description: 'Pure black grid with ultra-saturated neon pipes.',
    price: 200,
    isFree: false,
    isConsumable: false,
    preview: { emoji: '🌃', accent: '#FF3B3B', gradient: ['#000000', '#0a000a'] },
  },

  // ── HINTS ──────────────────────────────────────────────────────────────────

  {
    id: 'hints_3',
    category: 'hints',
    name: '3 Hints',
    description: 'Add 3 extra hints to your current level. Stuck? No shame.',
    price: 30,
    isFree: false,
    isConsumable: true,
    quantity: 3,
    preview: { emoji: '💡', accent: '#FFD700', gradient: ['#1a1300', '#1c1600'] },
  },
  {
    id: 'hints_10',
    category: 'hints',
    name: '10 Hints',
    description: 'A generous pack of hints. Best value for hint lovers.',
    price: 80,
    isFree: false,
    isConsumable: true,
    quantity: 10,
    preview: { emoji: '💡', accent: '#FFD700', gradient: ['#1a1300', '#1c1600'] },
    badge: 'BEST',
  },
  {
    id: 'hints_unlimited_level',
    category: 'hints',
    name: 'Unlimited Hints',
    description: 'Unlimited hints for the current level only.',
    price: 50,
    isFree: false,
    isConsumable: true,
    quantity: 999,
    preview: { emoji: '🔓', accent: '#FFD700', gradient: ['#1a1300', '#1c1600'] },
  },

  // ── POWER-UPS ──────────────────────────────────────────────────────────────

  {
    id: 'powerup_autosolve',
    category: 'powerups',
    name: 'Auto-Solve',
    description: 'Watch the puzzle solve itself step-by-step. Educational & satisfying.',
    price: 60,
    isFree: false,
    isConsumable: true,
    quantity: 1,
    preview: { emoji: '⚡', accent: '#A855F7', gradient: ['#1a0033', '#0d0020'] },
    badge: 'NEW',
  },
  {
    id: 'powerup_undo_pack',
    category: 'powerups',
    name: 'Undo Pack ×20',
    description: 'Extend your undo history to 20 moves. Never lose progress.',
    price: 40,
    isFree: false,
    isConsumable: true,
    quantity: 1,
    preview: { emoji: '↩️', accent: '#3B9EFF', gradient: ['#001428', '#001020'] },
  },
  {
    id: 'powerup_reveal_path',
    category: 'powerups',
    name: 'Reveal One Path',
    description: 'Instantly reveal the full correct path for one pipe of your choice.',
    price: 45,
    isFree: false,
    isConsumable: true,
    quantity: 1,
    preview: { emoji: '👁️', accent: '#5EEAD4', gradient: ['#001a18', '#001412'] },
  },
  {
    id: 'powerup_skip_level',
    category: 'powerups',
    name: 'Skip Level',
    description: 'Skip any level and still earn completion credit.',
    price: 100,
    isFree: false,
    isConsumable: true,
    quantity: 1,
    preview: { emoji: '⏭️', accent: '#FF69B4', gradient: ['#1a0010', '#120008'] },
  },

  // ── COSMETICS ──────────────────────────────────────────────────────────────

  {
    id: 'cosmetic_pipe_glow_off',
    category: 'cosmetics',
    name: 'No Glow',
    description: 'Clean flat pipes with no glow effect. Minimalist.',
    price: 0,
    isFree: true,
    isConsumable: false,
    preview: { emoji: '〰️', accent: '#6b7280', gradient: ['#0b0b12', '#101018'] },
  },
  {
    id: 'cosmetic_pipe_thick',
    category: 'cosmetics',
    name: 'Thick Pipes',
    description: 'Chonky pipes that fill more of each cell.',
    price: 80,
    isFree: false,
    isConsumable: false,
    preview: { emoji: '🟢', accent: '#2ECC71', gradient: ['#051a0a', '#0a1f0e'] },
  },
  {
    id: 'cosmetic_grid_dots',
    category: 'cosmetics',
    name: 'Dot Grid',
    description: 'Replace cell border lines with a subtle dot pattern.',
    price: 60,
    isFree: false,
    isConsumable: false,
    preview: { emoji: '⣿', accent: '#5EEAD4', gradient: ['#0b0b12', '#101018'] },
  },
  {
    id: 'cosmetic_confetti_rainbow',
    category: 'cosmetics',
    name: 'Rainbow Confetti',
    description: 'Solve animation explodes with rainbow confetti. So satisfying.',
    price: 100,
    isFree: false,
    isConsumable: false,
    preview: { emoji: '🎊', accent: '#FF69B4', gradient: ['#1a0010', '#120008'] },
    badge: 'HOT',
  },
  {
    id: 'cosmetic_sound_retro',
    category: 'cosmetics',
    name: 'Retro Sounds',
    description: '8-bit chiptune sound effects. Bleeps and bloops!',
    price: 90,
    isFree: false,
    isConsumable: false,
    preview: { emoji: '🎮', accent: '#FFD700', gradient: ['#1a1300', '#1c1600'] },
  },
  {
    id: 'cosmetic_sound_chill',
    category: 'cosmetics',
    name: 'Chill Sounds',
    description: 'Soft ambient tones. Perfect for late-night puzzle sessions.',
    price: 90,
    isFree: false,
    isConsumable: false,
    preview: { emoji: '🎵', accent: '#A855F7', gradient: ['#1a0033', '#0d0020'] },
  },
];

export const CATEGORY_META: Record<StoreCategory, { label: string; emoji: string; accent: string }> = {
  themes:    { label: 'Themes',    emoji: '🎨', accent: '#5EEAD4' },
  hints:     { label: 'Hints',     emoji: '💡', accent: '#FFD700' },
  powerups:  { label: 'Power-Ups', emoji: '⚡', accent: '#A855F7' },
  cosmetics: { label: 'Style',     emoji: '✨', accent: '#FF69B4' },
};

export const CATEGORIES: StoreCategory[] = ['themes', 'hints', 'powerups', 'cosmetics'];

// ── Coin earning guide ────────────────────────────────────────────────────────

export const EARN_GUIDE = [
  { emoji: '⭐', label: '3-star solve',   coins: 30 },
  { emoji: '✅', label: '2-star solve',   coins: 20 },
  { emoji: '🎯', label: 'Complete level', coins: 10 },
  { emoji: '🆕', label: 'First clear',    coins: '+15 bonus' },
  { emoji: '📐', label: 'Larger grid',    coins: '+2 per extra row' },
];
