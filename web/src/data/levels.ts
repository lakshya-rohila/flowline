import type { LevelConfig } from '../types';
import beginnerRaw from './levels/beginner.json';
import intermediateRaw from './levels/intermediate.json';
import advancedRaw from './levels/advanced.json';
import expertRaw from './levels/expert.json';

export interface Pack {
  name: string;
  levels: LevelConfig[];
}

export const PACKS: Pack[] = [
  { name: 'BEGINNER',     levels: beginnerRaw     as LevelConfig[] },
  { name: 'INTERMEDIATE', levels: intermediateRaw  as LevelConfig[] },
  { name: 'ADVANCED',     levels: advancedRaw      as LevelConfig[] },
  { name: 'EXPERT',       levels: expertRaw        as LevelConfig[] },
];

export function findLevelById(id: string): { pack: Pack; level: LevelConfig; index: number } | null {
  for (const pack of PACKS) {
    const index = pack.levels.findIndex((l) => l.id === id);
    if (index !== -1) return { pack, level: pack.levels[index], index };
  }
  return null;
}

export function getDefaultLevel(): LevelConfig {
  return PACKS[0].levels[0];
}
