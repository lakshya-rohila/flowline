// ── Achievement definitions ───────────────────────────────────────────────────

export type AchievementId =
  | 'first_solve'
  | 'speed_demon'
  | 'perfectionist'
  | 'persistent'
  | 'big_brain'
  | 'marathon'
  | 'quick_learner'
  | 'master_solver'
  | 'pack_champion_flow'
  | 'pack_champion_zen'
  | 'pack_champion_pro'
  | 'pack_champion_master'
  | 'coin_collector'
  | 'no_mistakes';

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  icon: string; // Icon identifier for StoreIcon
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: number; // Target value to unlock
  hidden?: boolean; // Don't show until unlocked
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Getting Started ──
  {
    id: 'first_solve',
    name: 'First Steps',
    description: 'Complete your first puzzle',
    icon: 'star',
    tier: 'bronze',
    requirement: 1,
  },
  {
    id: 'quick_learner',
    name: 'Quick Learner',
    description: 'Solve 10 puzzles',
    icon: 'target',
    tier: 'bronze',
    requirement: 10,
  },

  // ── Speed ──
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Solve 10 puzzles in under 30 seconds each',
    icon: 'zap',
    tier: 'silver',
    requirement: 10,
  },

  // ── Perfection ──
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Get 3 stars on 50 levels',
    icon: 'stars',
    tier: 'gold',
    requirement: 50,
  },
  {
    id: 'no_mistakes',
    name: 'Flawless',
    description: 'Complete 5 levels without using undo',
    icon: 'check',
    tier: 'silver',
    requirement: 5,
  },

  // ── Persistence ──
  {
    id: 'persistent',
    name: 'Persistent',
    description: 'Use undo 100 times',
    icon: 'undo',
    tier: 'bronze',
    requirement: 100,
  },
  {
    id: 'big_brain',
    name: 'Big Brain',
    description: 'Complete 20 levels without using hints',
    icon: 'lightbulb',
    tier: 'gold',
    requirement: 20,
  },

  // ── Volume ──
  {
    id: 'marathon',
    name: 'Marathon Runner',
    description: 'Solve 100 puzzles',
    icon: 'trophy',
    tier: 'platinum',
    requirement: 100,
  },
  {
    id: 'master_solver',
    name: 'Master Solver',
    description: 'Solve 500 puzzles',
    icon: 'trophy',
    tier: 'platinum',
    requirement: 500,
    hidden: true,
  },

  // ── Pack Completion ──
  {
    id: 'pack_champion_flow',
    name: 'Flow Champion',
    description: 'Complete all Flow pack levels',
    icon: 'medal',
    tier: 'silver',
    requirement: 1, // 1 = completed all
  },
  {
    id: 'pack_champion_zen',
    name: 'Zen Master',
    description: 'Complete all Zen pack levels',
    icon: 'medal',
    tier: 'silver',
    requirement: 1,
  },
  {
    id: 'pack_champion_pro',
    name: 'Pro Champion',
    description: 'Complete all Pro pack levels',
    icon: 'medal',
    tier: 'gold',
    requirement: 1,
  },
  {
    id: 'pack_champion_master',
    name: 'Ultimate Master',
    description: 'Complete all Master pack levels',
    icon: 'medal',
    tier: 'gold',
    requirement: 1,
  },

  // ── Economy ──
  {
    id: 'coin_collector',
    name: 'Coin Collector',
    description: 'Earn 1000 total coins',
    icon: 'coin',
    tier: 'silver',
    requirement: 1000,
  },
];

// Achievement tier colors
export const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
} as const;

export const TIER_LABELS = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
} as const;
