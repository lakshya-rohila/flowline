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
