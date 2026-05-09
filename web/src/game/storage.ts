// ── Progress storage ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'flowline_progress_v2';

export interface LevelRecord {
  moves: number;
  timeMs: number;
  ts: number;
}

export type ProgressMap = Record<string, LevelRecord>;

export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressMap;
  } catch {
    return {};
  }
}

export function saveLevelRecord(levelId: string, moves: number, timeMs: number): void {
  const data = loadProgress();
  const prev = data[levelId];
  const next = { moves, timeMs, ts: Date.now() };
  if (!prev || moves < prev.moves || (moves === prev.moves && timeMs < prev.timeMs)) {
    data[levelId] = next;
  } else {
    data[levelId] = { ...prev, ts: Date.now() };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getLevelRecord(levelId: string): LevelRecord | null {
  return loadProgress()[levelId] ?? null;
}

export function isLevelCompleted(levelId: string): boolean {
  return !!getLevelRecord(levelId);
}

// ── Coin economy ──────────────────────────────────────────────────────────────

const COIN_KEY     = 'flowline_coins_v1';
const OWNED_KEY    = 'flowline_owned_v1';
const EQUIPPED_KEY = 'flowline_equipped_v1';

export function getCoins(): number {
  try { return parseInt(localStorage.getItem(COIN_KEY) ?? '0', 10) || 0; }
  catch { return 0; }
}

export function addCoins(amount: number): number {
  const next = getCoins() + amount;
  try { localStorage.setItem(COIN_KEY, String(next)); } catch { /* ignore */ }
  return next;
}

export function spendCoins(amount: number): boolean {
  const current = getCoins();
  if (current < amount) return false;
  try { localStorage.setItem(COIN_KEY, String(current - amount)); } catch { /* ignore */ }
  return true;
}

// ── Owned items ───────────────────────────────────────────────────────────────

export function getOwnedItems(): Set<string> {
  try {
    const raw = localStorage.getItem(OWNED_KEY);
    return new Set(raw ? JSON.parse(raw) as string[] : []);
  } catch { return new Set(); }
}

export function addOwnedItem(itemId: string): void {
  const owned = getOwnedItems();
  owned.add(itemId);
  try { localStorage.setItem(OWNED_KEY, JSON.stringify([...owned])); } catch { /* ignore */ }
}

export function isOwned(itemId: string): boolean {
  return getOwnedItems().has(itemId);
}

// ── Equipped items (one slot per category) ────────────────────────────────────

export type EquippedMap = Record<string, string>; // category → itemId

export function getEquipped(): EquippedMap {
  try {
    const raw = localStorage.getItem(EQUIPPED_KEY);
    return raw ? JSON.parse(raw) as EquippedMap : {};
  } catch { return {}; }
}

export function equip(category: string, itemId: string): void {
  const eq = getEquipped();
  eq[category] = itemId;
  try { localStorage.setItem(EQUIPPED_KEY, JSON.stringify(eq)); } catch { /* ignore */ }
}

export function getEquippedItem(category: string): string | null {
  return getEquipped()[category] ?? null;
}

// ── Coin reward formula ───────────────────────────────────────────────────────

/**
 * Calculate coins earned for solving a level.
 *
 * Base reward:
 *   - Completing any level: 10 coins
 *   - 3-star (optimal): +20 bonus = 30 total
 *   - 2-star (≤ 1.5× optimal): +10 bonus = 20 total
 *   - 1-star: 10 base
 *   - First-time completion bonus: +15
 *   - Grid size bonus: +2 per extra cell beyond 5×5
 *
 * @returns { coins, isFirstTime, stars }
 */
export function computeLevelReward(
  levelId: string,
  gridSize: number,
  moves: number,
  optimalMoves: number,
): { coins: number; isFirstTime: boolean; stars: number } {
  const wasCompleted = isLevelCompleted(levelId);
  const stars =
    moves <= optimalMoves ? 3 :
    moves <= Math.ceil(optimalMoves * 1.5) ? 2 : 1;

  const base        = 10;
  const starBonus   = stars === 3 ? 20 : stars === 2 ? 10 : 0;
  const firstBonus  = wasCompleted ? 0 : 15;
  const sizeBonus   = Math.max(0, (gridSize - 5)) * 2;

  const coins = base + starBonus + firstBonus + sizeBonus;
  return { coins, isFirstTime: !wasCompleted, stars };
}

// ── Statistics tracking ───────────────────────────────────────────────────────

const STATS_KEY = 'flowline_stats_v1';

export interface GameStats {
  totalPuzzlesSolved: number;
  totalPlayTimeMs: number;
  totalMoves: number;
  totalUndos: number;
  totalHintsUsed: number;
  totalCoinsEarned: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  fastSolvesUnder30s: number;     // For Speed Demon achievement
  levelsWithoutHints: number;     // For Big Brain achievement
  levelsWithoutUndo: number;      // For Flawless achievement
  currentNoUndoStreak: number;
  currentNoHintStreak: number;
  bestSolveTimeMs: number;
  firstPlayDate: number;
  lastPlayDate: number;
}

const DEFAULT_STATS: GameStats = {
  totalPuzzlesSolved: 0,
  totalPlayTimeMs: 0,
  totalMoves: 0,
  totalUndos: 0,
  totalHintsUsed: 0,
  totalCoinsEarned: 0,
  threeStarCount: 0,
  twoStarCount: 0,
  oneStarCount: 0,
  fastSolvesUnder30s: 0,
  levelsWithoutHints: 0,
  levelsWithoutUndo: 0,
  currentNoUndoStreak: 0,
  currentNoHintStreak: 0,
  bestSolveTimeMs: 0,
  firstPlayDate: Date.now(),
  lastPlayDate: Date.now(),
};

export function getStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    return { ...DEFAULT_STATS, ...JSON.parse(raw) } as GameStats;
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

export function recordSolve(
  timeMs: number,
  moves: number,
  stars: number,
  coinsEarned: number,
  hintsUsed: number,
  undosUsed: number,
): void {
  const stats = getStats();

  stats.totalPuzzlesSolved++;
  stats.totalPlayTimeMs += timeMs;
  stats.totalMoves += moves;
  stats.totalCoinsEarned += coinsEarned;
  stats.lastPlayDate = Date.now();

  // Star counts
  if (stars === 3) stats.threeStarCount++;
  else if (stars === 2) stats.twoStarCount++;
  else stats.oneStarCount++;

  // Speed tracking
  if (timeMs < 30000) stats.fastSolvesUnder30s++;

  // Best time
  if (stats.bestSolveTimeMs === 0 || timeMs < stats.bestSolveTimeMs) {
    stats.bestSolveTimeMs = timeMs;
  }

  // No-hint streak
  if (hintsUsed === 0) {
    stats.currentNoHintStreak++;
    stats.levelsWithoutHints++;
  } else {
    stats.currentNoHintStreak = 0;
  }

  // No-undo streak
  if (undosUsed === 0) {
    stats.currentNoUndoStreak++;
    stats.levelsWithoutUndo++;
  } else {
    stats.currentNoUndoStreak = 0;
  }

  saveStats(stats);
  checkAchievements(stats);
}

export function recordUndo(): void {
  const stats = getStats();
  stats.totalUndos++;
  saveStats(stats);
  checkAchievements(stats);
}

export function recordHintUsed(): void {
  const stats = getStats();
  stats.totalHintsUsed++;
  saveStats(stats);
}

// ── Achievement tracking ──────────────────────────────────────────────────────

const ACHIEVEMENTS_KEY = 'flowline_achievements_v1';
const ACHIEVEMENT_QUEUE_KEY = 'flowline_achievement_queue_v1';

export type UnlockedAchievements = Record<string, number>; // achievementId → timestamp

export function getUnlockedAchievements(): UnlockedAchievements {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? JSON.parse(raw) as UnlockedAchievements : {};
  } catch {
    return {};
  }
}

export function isAchievementUnlocked(achievementId: string): boolean {
  return !!getUnlockedAchievements()[achievementId];
}

function unlockAchievement(achievementId: string): void {
  const unlocked = getUnlockedAchievements();
  if (unlocked[achievementId]) return; // Already unlocked

  unlocked[achievementId] = Date.now();
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));

    // Add to queue for notification
    const queue = getAchievementQueue();
    queue.push(achievementId);
    localStorage.setItem(ACHIEVEMENT_QUEUE_KEY, JSON.stringify(queue));
  } catch { /* ignore */ }
}

export function getAchievementQueue(): string[] {
  try {
    const raw = localStorage.getItem(ACHIEVEMENT_QUEUE_KEY);
    return raw ? JSON.parse(raw) as string[] : [];
  } catch {
    return [];
  }
}

export function clearAchievementQueue(): void {
  try {
    localStorage.setItem(ACHIEVEMENT_QUEUE_KEY, JSON.stringify([]));
  } catch { /* ignore */ }
}

function checkAchievements(stats: GameStats): void {
  const progress = loadProgress();
  const totalCoins = stats.totalCoinsEarned;

  // First solve
  if (stats.totalPuzzlesSolved >= 1) unlockAchievement('first_solve');

  // Quick learner
  if (stats.totalPuzzlesSolved >= 10) unlockAchievement('quick_learner');

  // Speed Demon
  if (stats.fastSolvesUnder30s >= 10) unlockAchievement('speed_demon');

  // Perfectionist
  if (stats.threeStarCount >= 50) unlockAchievement('perfectionist');

  // Persistent
  if (stats.totalUndos >= 100) unlockAchievement('persistent');

  // Big Brain
  if (stats.levelsWithoutHints >= 20) unlockAchievement('big_brain');

  // No mistakes (flawless)
  if (stats.levelsWithoutUndo >= 5) unlockAchievement('no_mistakes');

  // Marathon
  if (stats.totalPuzzlesSolved >= 100) unlockAchievement('marathon');

  // Master Solver
  if (stats.totalPuzzlesSolved >= 500) unlockAchievement('master_solver');

  // Coin Collector
  if (totalCoins >= 1000) unlockAchievement('coin_collector');

  // Pack completion (check if all levels in pack are completed)
  checkPackCompletion(progress);
}

function checkPackCompletion(progress: ProgressMap): void {
  // This will be implemented when we check against actual level packs
  // For now, we'll just track if certain level ranges are complete
  const completed = Object.keys(progress);

  // Count levels per pack (assuming pack prefixes like "flow_", "zen_", etc.)
  const flowLevels = completed.filter(id => id.startsWith('flow_')).length;
  const zenLevels = completed.filter(id => id.startsWith('zen_')).length;
  const proLevels = completed.filter(id => id.startsWith('pro_')).length;
  const masterLevels = completed.filter(id => id.startsWith('master_')).length;

  // Unlock pack achievements (these numbers should match actual pack sizes)
  if (flowLevels >= 20) unlockAchievement('pack_champion_flow');
  if (zenLevels >= 20) unlockAchievement('pack_champion_zen');
  if (proLevels >= 25) unlockAchievement('pack_champion_pro');
  if (masterLevels >= 30) unlockAchievement('pack_champion_master');
}
