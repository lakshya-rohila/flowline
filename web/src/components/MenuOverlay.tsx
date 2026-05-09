import type { CSSProperties } from 'react';
import { PACKS } from '../data/levels';
import type { LevelConfig } from '../types';
import { isLevelCompleted } from '../game/storage';

// SVG assets imported as URLs for use in <img> tags
import logoMarkUrl from '../assets/game-assets/flowline-logo-mark.svg';
import neonPanelUrl from '../assets/game-assets/flowline-neon-bg-panel.png';

// Pack emblem IDs in the sprite sheet (flowline-pack-emblems.svg)
const PACK_META: Record<string, { accent: string; label: string }> = {
  BEGINNER:     { accent: '#5EEAD4', label: 'BEG' },
  INTERMEDIATE: { accent: '#3B9EFF', label: 'INT' },
  ADVANCED:     { accent: '#FFD700', label: 'ADV' },
  EXPERT:       { accent: '#FF69B4', label: 'EXP' },
};

// Inline SVG for the solved checkmark badge (from flowline-solved-badge.svg concept)
function SolvedBadge() {
  return (
    <svg
      className="lc-badge"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" fill="#2ECC71" fillOpacity="0.18" stroke="#2ECC71" strokeWidth="1.5" />
      <path d="M7 12.5l3.5 3.5L17 9" stroke="#2ECC71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Compact mini pipe decoration on each card (3 coloured segments)
function MiniPipe({ accent }: { accent: string }) {
  return (
    <svg className="lc-pipe" viewBox="0 0 48 10" fill="none" aria-hidden="true">
      <rect x="0"  y="3" width="14" height="4" rx="2" fill={accent} fillOpacity="0.7" />
      <rect x="18" y="3" width="18" height="4" rx="2" fill={accent} fillOpacity="0.45" />
      <rect x="40" y="3" width="8"  height="4" rx="2" fill={accent} fillOpacity="0.25" />
    </svg>
  );
}

export interface MenuOverlayProps {
  open: boolean;
  currentPack: string;
  currentLevelId: string;
  coins?: number;
  onClose?: () => void;
  onSelectLevel: (level: LevelConfig) => void;
  onSelectPack: (packName: string) => void;
  onOpenStore?: () => void;
}

export function MenuOverlay({
  open,
  currentPack,
  currentLevelId,
  coins = 0,
  onClose,
  onSelectLevel,
  onSelectPack,
  onOpenStore,
}: MenuOverlayProps) {
  if (!open) return null;

  const pack     = PACKS.find((p) => p.name === currentPack) ?? PACKS[0];
  const meta     = PACK_META[pack.name] ?? PACK_META['BEGINNER'];
  const accent   = meta.accent;
  const done     = pack.levels.filter((l) => isLevelCompleted(l.id)).length;
  const total    = pack.levels.length;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const gridSize = pack.levels[0]?.size ?? 0;

  return (
    <div
      className="mo-root"
      role="dialog"
      aria-modal="true"
      aria-label="Level select"
      style={{
        '--mo-accent': accent,
        '--mo-panel': `url(${neonPanelUrl})`,
      } as CSSProperties}
    >
      {/* ── Top bar ────────────────────────────────────────────────── */}
      <header className="mo-topbar">
        {onClose ? (
          <button type="button" className="mo-close-btn" onClick={onClose} aria-label="Back to game">
            <svg viewBox="0 0 20 20" fill="none" className="mo-close-icon" aria-hidden>
              <path d="M12 4L5 10l7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        <div className="mo-brand">
          <img src={logoMarkUrl} alt="" className="mo-brand-mark" />
          <span className="mo-brand-name">FLOWLINE</span>
        </div>

        {/* Coin balance + store button */}
        <button
          type="button"
          className="mo-store-btn"
          onClick={onOpenStore}
          aria-label={`${coins} coins — open store`}
        >
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden>
            <circle cx="10" cy="10" r="9" fill="#FFD700" stroke="#B8860B" strokeWidth="1.1"/>
            <text x="10" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill="#7B5200">₣</text>
          </svg>
          <span>{coins}</span>
        </button>
      </header>

      {/* ── Hero banner ────────────────────────────────────────────── */}
      <section className="mo-hero" aria-label={`${pack.name} — ${done}/${total} complete`}>
        <div className="mo-hero-text">
          <p className="mo-hero-eyebrow">LEVEL SELECT</p>
          <h2 className="mo-hero-title" style={{ color: accent }}>{pack.name}</h2>
          <p className="mo-hero-sub">
            {done}/{total} complete
            {gridSize > 0 && <span className="mo-hero-grid-badge">{gridSize}×{gridSize}</span>}
          </p>
        </div>

        {/* Circular progress ring */}
        <div className="mo-ring" aria-hidden>
          <svg viewBox="0 0 64 64" className="mo-ring-svg">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4"/>
            <circle
              cx="32" cy="32" r="26"
              fill="none"
              stroke={accent}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '32px 32px', transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <span className="mo-ring-pct">{pct}%</span>
        </div>
      </section>

      {/* ── Pack tabs ──────────────────────────────────────────────── */}
      <nav className="mo-tabs" role="tablist" aria-label="Pack selector">
        {PACKS.map((p) => {
          const pm     = PACK_META[p.name] ?? PACK_META['BEGINNER'];
          const locked = p.levels.length === 0;
          const active = p.name === currentPack;
          return (
            <button
              key={p.name}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={locked}
              className={[
                'mo-tab',
                active ? 'mo-tab--active' : '',
                locked ? 'mo-tab--locked' : '',
              ].filter(Boolean).join(' ')}
              style={{ '--tab-accent': pm.accent } as CSSProperties}
              onClick={() => !locked && onSelectPack(p.name)}
            >
              <span className="mo-tab-dot" aria-hidden />
              {p.name}
            </button>
          );
        })}
      </nav>

      {/* ── Level grid ─────────────────────────────────────────────── */}
      <div className="mo-grid" role="list">
        {pack.levels.map((lvl, idx) => {
          const completed = isLevelCompleted(lvl.id);
          const isCurrent = lvl.id === currentLevelId;
          return (
            <button
              key={lvl.id}
              type="button"
              role="listitem"
              aria-label={`Level ${idx + 1}${completed ? ' — completed' : ''}${isCurrent ? ' — current' : ''}`}
              className={[
                'lc',
                completed ? 'lc--done' : '',
                isCurrent ? 'lc--current' : '',
              ].filter(Boolean).join(' ')}
              style={{ '--lc-accent': accent } as CSSProperties}
              onClick={() => { onSelectLevel(lvl); onClose?.(); }}
            >
              {/* Top: pack label + solved badge */}
              <div className="lc-top">
                <span className="lc-pack">{meta.label}</span>
                {completed && <SolvedBadge />}
              </div>

              {/* Middle: big level number */}
              <span className="lc-num">{String(idx + 1).padStart(2, '0')}</span>

              {/* Bottom: meta + pipe decoration */}
              <div className="lc-bottom">
                <span className="lc-meta">{lvl.size}×{lvl.size} · {lvl.optimalMoves} mv</span>
                <MiniPipe accent={accent} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
