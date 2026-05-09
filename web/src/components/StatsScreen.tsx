import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { getStats, getUnlockedAchievements, loadProgress } from '../game/storage';
import { ACHIEVEMENTS, TIER_COLORS, TIER_LABELS, type Achievement } from '../data/achievements';
import { StoreIcon } from './StoreIcon';
import logoMarkUrl from '../assets/game-assets/flowline-logo-mark.svg';

export interface StatsScreenProps {
  onClose: () => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatDate(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Achievement Card ──────────────────────────────────────────────────────────

function AchievementCard({ achievement, unlocked }: { achievement: Achievement; unlocked: boolean }) {
  const tierColor = TIER_COLORS[achievement.tier];
  const isHidden = achievement.hidden && !unlocked;

  return (
    <div
      className={`ach-card ${unlocked ? 'ach-card--unlocked' : 'ach-card--locked'} ${isHidden ? 'ach-card--hidden' : ''}`}
      style={{ '--ach-color': tierColor } as CSSProperties}
    >
      {/* Icon */}
      <div className="ach-icon-wrap">
        <StoreIcon name={isHidden ? 'lock' : achievement.icon} className="ach-icon" />
        {unlocked && <div className="ach-glow" />}
      </div>

      {/* Info */}
      <div className="ach-info">
        <p className="ach-name">{isHidden ? '???' : achievement.name}</p>
        <p className="ach-desc">{isHidden ? 'Hidden achievement' : achievement.description}</p>
        {unlocked && (
          <span className="ach-tier" style={{ color: tierColor }}>
            {TIER_LABELS[achievement.tier]}
          </span>
        )}
      </div>

      {/* Checkmark */}
      {unlocked && (
        <div className="ach-check">
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <circle cx="8" cy="8" r="7" fill={tierColor} opacity="0.2" stroke={tierColor} strokeWidth="1.5"/>
            <path d="M5 8l2 2 4-4" stroke={tierColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color } as CSSProperties}>
      <div className="stat-icon-wrap">
        <StoreIcon name={icon} className="stat-icon" />
      </div>
      <div className="stat-info">
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function StatsScreen({ onClose }: StatsScreenProps) {
  const stats = getStats();
  const progress = loadProgress();
  const unlocked = getUnlockedAchievements();

  const unlockedCount = Object.keys(unlocked).length;
  const totalAchievements = ACHIEVEMENTS.filter(a => !a.hidden).length + ACHIEVEMENTS.filter(a => a.hidden).length;

  const avgMoves = stats.totalPuzzlesSolved > 0
    ? Math.round(stats.totalMoves / stats.totalPuzzlesSolved)
    : 0;

  const completionRate = stats.totalPuzzlesSolved > 0
    ? Math.round((stats.threeStarCount / stats.totalPuzzlesSolved) * 100)
    : 0;

  // Sort achievements: unlocked first, then by tier
  const sortedAchievements = useMemo(() => {
    return [...ACHIEVEMENTS].sort((a, b) => {
      const aUnlocked = !!unlocked[a.id];
      const bUnlocked = !!unlocked[b.id];
      if (aUnlocked && !bUnlocked) return -1;
      if (!aUnlocked && bUnlocked) return 1;

      const tierOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
      return tierOrder[a.tier] - tierOrder[b.tier];
    });
  }, [unlocked]);

  return (
    <div className="stats-root">
      {/* ── Topbar ── */}
      <header className="stats-topbar">
        <button type="button" className="stats-back" onClick={onClose} aria-label="Back">
          <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden>
            <path d="M13 4L6 10l7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="stats-brand">
          <img src={logoMarkUrl} alt="" className="stats-brand-mark" aria-hidden />
          <span className="stats-brand-name">STATS</span>
        </div>

        <div style={{ width: 40 }} />
      </header>

      <div className="stats-scroll">
        {/* ── Overview ── */}
        <section className="stats-section">
          <h2 className="stats-heading">
            <StoreIcon name="chart" className="stats-heading-icon" />
            Overview
          </h2>

          <div className="stats-grid">
            <StatCard
              icon="target"
              label="Puzzles Solved"
              value={stats.totalPuzzlesSolved}
              color="#5EEAD4"
            />
            <StatCard
              icon="clock"
              label="Time Played"
              value={formatTime(stats.totalPlayTimeMs)}
              color="#3B9EFF"
            />
            <StatCard
              icon="star"
              label="3-Star Solves"
              value={stats.threeStarCount}
              color="#FFD700"
            />
            <StatCard
              icon="coin"
              label="Total Coins"
              value={stats.totalCoinsEarned}
              color="#FFD700"
            />
            <StatCard
              icon="zap"
              label="Avg Moves"
              value={avgMoves}
              color="#A855F7"
            />
            <StatCard
              icon="check"
              label="Best Time"
              value={stats.bestSolveTimeMs ? formatTime(stats.bestSolveTimeMs) : '—'}
              color="#2ECC71"
            />
          </div>
        </section>

        {/* ── Performance ── */}
        <section className="stats-section">
          <h2 className="stats-heading">
            <StoreIcon name="trophy" className="stats-heading-icon" />
            Performance
          </h2>

          <div className="stats-bars">
            {/* 3-Star Rate */}
            <div className="stat-bar-row">
              <span className="stat-bar-label">3-Star Rate</span>
              <div className="stat-bar-track">
                <div className="stat-bar-fill" style={{ width: `${completionRate}%`, background: '#FFD700' }} />
              </div>
              <span className="stat-bar-value">{completionRate}%</span>
            </div>

            {/* Levels Completed */}
            <div className="stat-bar-row">
              <span className="stat-bar-label">Levels Unlocked</span>
              <div className="stat-bar-track">
                <div className="stat-bar-fill" style={{ width: `${Math.min((Object.keys(progress).length / 95) * 100, 100)}%`, background: '#5EEAD4' }} />
              </div>
              <span className="stat-bar-value">{Object.keys(progress).length}/95</span>
            </div>

            {/* Achievements */}
            <div className="stat-bar-row">
              <span className="stat-bar-label">Achievements</span>
              <div className="stat-bar-track">
                <div className="stat-bar-fill" style={{ width: `${(unlockedCount / totalAchievements) * 100}%`, background: '#A855F7' }} />
              </div>
              <span className="stat-bar-value">{unlockedCount}/{totalAchievements}</span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="stats-mini-grid">
            <div className="stat-mini">
              <span className="stat-mini-label">Fast Solves</span>
              <span className="stat-mini-value">{stats.fastSolvesUnder30s}</span>
            </div>
            <div className="stat-mini">
              <span className="stat-mini-label">No-Hint Streak</span>
              <span className="stat-mini-value">{stats.currentNoHintStreak}</span>
            </div>
            <div className="stat-mini">
              <span className="stat-mini-label">Total Undos</span>
              <span className="stat-mini-value">{stats.totalUndos}</span>
            </div>
            <div className="stat-mini">
              <span className="stat-mini-label">Hints Used</span>
              <span className="stat-mini-value">{stats.totalHintsUsed}</span>
            </div>
          </div>
        </section>

        {/* ── Achievements ── */}
        <section className="stats-section">
          <h2 className="stats-heading">
            <StoreIcon name="medal" className="stats-heading-icon" />
            Achievements
            <span className="stats-count">{unlockedCount}/{totalAchievements}</span>
          </h2>

          <div className="ach-grid">
            {sortedAchievements.map((ach) => (
              <AchievementCard
                key={ach.id}
                achievement={ach}
                unlocked={!!unlocked[ach.id]}
              />
            ))}
          </div>
        </section>

        {/* ── Footer info ── */}
        <div className="stats-footer">
          <p className="stats-footer-text">
            Playing since {formatDate(stats.firstPlayDate)}
          </p>
          <p className="stats-footer-text">
            Last played {formatDate(stats.lastPlayDate)}
          </p>
        </div>
      </div>
    </div>
  );
}
