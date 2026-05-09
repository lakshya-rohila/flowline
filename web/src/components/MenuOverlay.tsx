import { PACKS } from '../data/levels';
import type { LevelConfig } from '../types';
import { isLevelCompleted } from '../game/storage';

export interface MenuOverlayProps {
  open: boolean;
  currentPack: string;
  currentLevelId: string;
  onClose: () => void;
  onSelectLevel: (level: LevelConfig) => void;
  onSelectPack: (packName: string) => void;
}

export function MenuOverlay({
  open,
  currentPack,
  currentLevelId,
  onClose,
  onSelectLevel,
  onSelectPack,
}: MenuOverlayProps) {
  if (!open) return null;

  const pack = PACKS.find((p) => p.name === currentPack) ?? PACKS[0];

  return (
    <div className="menu-overlay" role="dialog" aria-modal="true" aria-label="Level select">
      <div className="menu-top">
        <button type="button" className="menu-close" onClick={onClose} aria-label="Close menu">
          Close
        </button>
        <h1 className="menu-title menu-title--center">FLOWLINE</h1>
        <span className="menu-top__spacer" aria-hidden />
      </div>

      <div className="pack-tabs" role="tablist" aria-label="Packs">
        {PACKS.map((p) => {
          const locked = p.levels.length === 0;
          const active = p.name === currentPack;
          return (
            <button
              key={p.name}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={locked}
              className={`pack-tab ${active ? 'pack-tab--active' : ''} ${locked ? 'pack-tab--locked' : ''}`}
              onClick={() => !locked && onSelectPack(p.name)}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="level-grid">
        {pack.levels.map((lvl, i) => {
          const done = isLevelCompleted(lvl.id);
          const current = lvl.id === currentLevelId;
          return (
            <button
              key={lvl.id}
              type="button"
              className={`level-bubble ${done ? 'level-bubble--done' : ''} ${current ? 'level-bubble--current' : ''}`}
              onClick={() => {
                onSelectLevel(lvl);
                onClose();
              }}
            >
              <span className="level-bubble__n">{i + 1}</span>
              {done ? <span className="level-bubble__check" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
