import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { LandingScreen } from './components/LandingScreen';
import { MenuOverlay } from './components/MenuOverlay';
import { OnboardingOverlay } from './components/OnboardingOverlay';
import { SolveSheet } from './components/SolveSheet';
import { PACKS, findLevelById, getDefaultLevel } from './data/levels';
import { applyUndo, createInitialState, restartLevel } from './game/engine';
import { computeHint, getMaxHintsPerLevel, type HintVisual } from './game/hint';
import { saveLevelRecord } from './game/storage';
import type { GameState, LevelConfig } from './types';
import './App.css';

const SEEN_ONBOARDING_KEY = 'flowline_seen_onboarding_v1';

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function App() {
  // ── Screen state: 'landing' | 'onboarding' | 'game' ──────────────────────
  const [screen, setScreen] = useState<'landing' | 'onboarding' | 'game'>('landing');

  const handlePlayFromLanding = () => {
    const seen = localStorage.getItem(SEEN_ONBOARDING_KEY);
    if (seen) {
      setScreen('game');
    } else {
      setScreen('onboarding');
    }
  };

  const handleOnboardingDone = () => {
    localStorage.setItem(SEEN_ONBOARDING_KEY, '1');
    setScreen('game');
  };

  // ── Game state ────────────────────────────────────────────────────────────
  const initial = getDefaultLevel();
  const [level, setLevel] = useState<LevelConfig>(initial);
  const stateRef = useRef<GameState>(createInitialState(initial));
  const [menuOpen, setMenuOpen] = useState(false);
  const [solveOpen, setSolveOpen] = useState(false);
  const [solveStats, setSolveStats] = useState({ moves: 0, elapsedMs: 0 });
  const [hud, setHud] = useState({
    moves: 0,
    filledPercent: 0,
    elapsedMs: 0,
    canUndo: false,
    solved: false,
    allConnected: false,
  });
  const [packName, setPackName] = useState(PACKS[0].name);
  const hintRef = useRef<HintVisual | null>(null);
  const [hintsLeft, setHintsLeft] = useState(getMaxHintsPerLevel());
  const [hintStatus, setHintStatus] = useState<string | null>(null);
  const hintStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const found = findLevelById(level.id);
    if (found) setPackName(found.pack.name);
  }, [level.id]);

  useEffect(() => {
    stateRef.current = createInitialState(level);
    setSolveOpen(false);
    hintRef.current = null;
    setHintsLeft(getMaxHintsPerLevel());
  }, [level]);

  const metaLabel = useMemo(() => {
    const pack = PACKS.find((p) => p.name === packName) ?? PACKS[0];
    const idx = pack.levels.findIndex((l) => l.id === level.id);
    const displayIdx = idx >= 0 ? idx + 1 : 1;
    return `${packName} · L${displayIdx} · ${level.size}×${level.size}`;
  }, [packName, level.id, level.size]);

  const loadLevel = useCallback((next: LevelConfig) => {
    setLevel(next);
  }, []);

  const onHudTick = useCallback((s: GameState) => {
    setHud((prev) => {
      const sec = Math.floor(s.elapsedMs / 1000);
      const prevSec = Math.floor(prev.elapsedMs / 1000);
      const canUndo = s.history.length > 0;
      if (
        prev.moves === s.moves &&
        prev.filledPercent === s.filledPercent &&
        prevSec === sec &&
        prev.canUndo === canUndo &&
        prev.solved === s.solved &&
        prev.allConnected === s.allConnected
      ) {
        return prev;
      }
      return {
        moves: s.moves,
        filledPercent: s.filledPercent,
        elapsedMs: s.elapsedMs,
        canUndo,
        solved: s.solved,
        allConnected: s.allConnected,
      };
    });
  }, []);

  const onSolveAnimationComplete = useCallback(() => {
    const s = stateRef.current;
    setSolveStats({ moves: s.moves, elapsedMs: s.elapsedMs });
    setSolveOpen(true);
    saveLevelRecord(s.level.id, s.moves, s.elapsedMs);
  }, []);

  const handleUndo = () => {
    applyUndo(stateRef.current);
  };

  const handleRestart = () => {
    restartLevel(stateRef.current);
    setSolveOpen(false);
    hintRef.current = null;
    setHintsLeft(getMaxHintsPerLevel());
  };

  const showHintStatus = useCallback((msg: string) => {
    setHintStatus(msg);
    if (hintStatusTimer.current) clearTimeout(hintStatusTimer.current);
    hintStatusTimer.current = setTimeout(() => {
      setHintStatus(null);
      hintStatusTimer.current = null;
    }, 4000);
  }, []);

  const handleHint = () => {
    if (stateRef.current.solved) return;
    if (hintsLeft <= 0) {
      showHintStatus('No hints left on this level. Restart to refresh hints.');
      return;
    }
    const h = computeHint(stateRef.current);
    if (!h) {
      showHintStatus('No safe next step found — try undo or restart.');
      return;
    }
    hintRef.current = h;
    setHintsLeft((n) => n - 1);
    showHintStatus(h.caption);
  };

  const goNextLevel = () => {
    const found = findLevelById(level.id);
    if (!found) return;
    const { pack, index } = found;
    const next = pack.levels[index + 1];
    if (next) loadLevel(next);
    else setMenuOpen(true);
    setSolveOpen(false);
  };

  // Show landing or onboarding before the game
  if (screen === 'landing') {
    return (
      <>
        <LandingScreen onPlay={handlePlayFromLanding} onHowToPlay={() => setScreen('onboarding')} />
      </>
    );
  }

  if (screen === 'onboarding') {
    return (
      <OnboardingOverlay open={true} onDone={handleOnboardingDone} />
    );
  }

  return (
    <div className="app">
      <header className="header">
        <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Menu">
          <span className="icon-glyph" aria-hidden>
            ≡
          </span>
        </button>
        <span className="logo">FLOWLINE</span>
        <button type="button" className="icon-btn" onClick={handleRestart} aria-label="Restart level">
          <span className="icon-glyph" aria-hidden>
            ↺
          </span>
        </button>
      </header>

      <div className="meta-row">
        <span className="meta-row__text">{metaLabel}</span>
      </div>

      <div className="hud">
        <span>MOVES: {hud.moves}</span>
        <span>FILLED: {hud.filledPercent}%</span>
        <span>{formatTime(hud.elapsedMs)}</span>
      </div>

      <div className="hint-status" role="status" aria-live="polite">
        {hud.allConnected && !hud.solved ? (
          <span className="hint-status--fill-warning">FILL EVERY CELL</span>
        ) : hintStatus ? (
          <span>{hintStatus}</span>
        ) : null}
      </div>

      <main className="board-area">
        <GameCanvas
          stateRef={stateRef}
          hintRef={hintRef}
          levelKey={level.id}
          onHudTick={onHudTick}
          onSolveAnimationComplete={onSolveAnimationComplete}
        />
      </main>

      <footer className="footer-bar">
        <div className="progress">
          <div className="progress__track" aria-hidden>
            <div className="progress__fill" style={{ width: `${hud.filledPercent}%` }} />
          </div>
        </div>
        <div className="footer-actions">
          <button
            type="button"
            className="hint-btn"
            onClick={handleHint}
            disabled={hud.solved}
            aria-label={`Hint. ${hintsLeft} remaining.`}
          >
            HINT
            <span className="hint-btn__badge" aria-hidden>
              {hintsLeft}
            </span>
          </button>
          <button type="button" className="undo-btn" onClick={handleUndo} disabled={!hud.canUndo}>
            UNDO
          </button>
        </div>
      </footer>

      <MenuOverlay
        open={menuOpen}
        currentPack={packName}
        currentLevelId={level.id}
        onClose={() => setMenuOpen(false)}
        onSelectLevel={(lvl) => loadLevel(lvl)}
        onSelectPack={(name) => setPackName(name)}
      />

      <SolveSheet
        open={solveOpen}
        level={level}
        moves={solveStats.moves}
        elapsedMs={solveStats.elapsedMs}
        onNext={goNextLevel}
        onMenu={() => {
          setSolveOpen(false);
          setMenuOpen(true);
        }}
      />
    </div>
  );
}
