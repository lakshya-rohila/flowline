import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { LandingScreen } from './components/LandingScreen';
import { MenuOverlay } from './components/MenuOverlay';
import { OnboardingOverlay } from './components/OnboardingOverlay';
import { SolveSheet } from './components/SolveSheet';
import { StoreScreen } from './components/StoreScreen';
import { PACKS, findLevelById, getDefaultLevel } from './data/levels';
import { applyUndo, createInitialState, restartLevel } from './game/engine';
import { computeHint, getMaxHintsPerLevel, type HintVisual } from './game/hint';
import { addCoins, computeLevelReward, getCoins, saveLevelRecord } from './game/storage';
import type { GameState, LevelConfig } from './types';
import logoMarkUrl from './assets/game-assets/flowline-logo-mark.svg';
import './App.css';

// ── Persistence keys ─────────────────────────────────────────────────────────
const SEEN_ONBOARDING_KEY = 'flowline_seen_onboarding_v1';
const LAST_LEVEL_KEY      = 'flowline_last_level_v1';
const LAST_SCREEN_KEY     = 'flowline_last_screen_v1'; // 'menu' | 'game'

// ── Correct app flow ─────────────────────────────────────────────────────────
//
//  ALWAYS start at landing on every fresh page load.
//  Landing is the "splash screen" — it animates in, then the user taps PLAY NOW.
//
//  First visit:
//    landing → onboarding → menu → (select level) → game
//
//  Return visit (onboarding seen, was playing):
//    landing → (PLAY NOW skips onboarding) → game  (resumes last level)
//
//  Return visit (onboarding seen, was on menu):
//    landing → (PLAY NOW) → menu
//
//  The landing screen is ALWAYS shown on hard refresh / cold load.
//  Only within the same JS session (tab not closed) does state persist.

type Screen = 'landing' | 'onboarding' | 'menu' | 'game' | 'store';

function getInitialLevel(): LevelConfig {
  try {
    const id = localStorage.getItem(LAST_LEVEL_KEY);
    if (id) {
      const found = findLevelById(id);
      if (found) return found.level;
    }
  } catch { /* ignore */ }
  return getDefaultLevel();
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // Landing is ALWAYS the first screen — never skip it on cold load
  const [screen, setScreen] = useState<Screen>('landing');

  // Persist screen so the ≡ / Back navigation restores correctly within session
  const goTo = useCallback((s: Screen) => {
    setScreen(s);
    try { localStorage.setItem(LAST_SCREEN_KEY, s); } catch { /* ignore */ }
  }, []);

  // ── Landing handlers ───────────────────────────────────────────────────────
  const handlePlayFromLanding = () => {
    const seen = localStorage.getItem(SEEN_ONBOARDING_KEY);
    if (!seen) {
      goTo('onboarding');   // first ever visit → tutorial
      return;
    }
    // Returning user — resume where they left off
    const lastScreen = localStorage.getItem(LAST_SCREEN_KEY);
    const lastLevel  = localStorage.getItem(LAST_LEVEL_KEY);
    if (lastScreen === 'game' && lastLevel) {
      goTo('game');          // had an active game → jump straight back
    } else {
      goTo('menu');          // default → level select
    }
  };

  const handleOnboardingDone = () => {
    localStorage.setItem(SEEN_ONBOARDING_KEY, '1');
    goTo('menu');            // tutorial done → level select
  };

  // ── Coin balance (refreshed when store closes) ─────────────────────────────
  const [coins, setCoins] = useState(getCoins);
  const refreshCoins = useCallback(() => setCoins(getCoins()), []);

  // ── Game state ─────────────────────────────────────────────────────────────
  const initial = getInitialLevel();
  const [level, setLevel] = useState<LevelConfig>(initial);
  const stateRef   = useRef<GameState>(createInitialState(initial));
  const [solveOpen, setSolveOpen] = useState(false);
  const [solveStats, setSolveStats] = useState({ moves: 0, elapsedMs: 0, coinsEarned: 0, stars: 1 });
  const [hud, setHud] = useState({
    moves: 0,
    filledPercent: 0,
    elapsedMs: 0,
    canUndo: false,
    solved: false,
    allConnected: false,
  });
  const [packName, setPackName] = useState(() => {
    // Initialise pack tab to match the persisted level
    const found = findLevelById(initial.id);
    return found ? found.pack.name : PACKS[0].name;
  });
  const hintRef          = useRef<HintVisual | null>(null);
  const [hintsLeft, setHintsLeft] = useState(getMaxHintsPerLevel());
  const [hintStatus, setHintStatus] = useState<string | null>(null);
  const hintStatusTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist current level id whenever it changes
  useEffect(() => {
    try { localStorage.setItem(LAST_LEVEL_KEY, level.id); } catch { /* ignore */ }
  }, [level.id]);

  // Sync pack name whenever level changes (e.g. via next-level)
  useEffect(() => {
    const found = findLevelById(level.id);
    if (found) setPackName(found.pack.name);
  }, [level.id]);

  // Reset game state whenever the level changes
  useEffect(() => {
    stateRef.current = createInitialState(level);
    setSolveOpen(false);
    hintRef.current = null;
    setHintsLeft(getMaxHintsPerLevel());
  }, [level]);

  const metaLabel = useMemo(() => {
    const pack = PACKS.find((p) => p.name === packName) ?? PACKS[0];
    const idx  = pack.levels.findIndex((l) => l.id === level.id);
    return `${packName} · L${idx >= 0 ? idx + 1 : 1} · ${level.size}×${level.size}`;
  }, [packName, level.id, level.size]);

  // ── Level loading ──────────────────────────────────────────────────────────
  const loadLevel = useCallback((next: LevelConfig) => {
    setLevel(next);
    goTo('game');  // always navigate to game screen when a level is chosen
  }, [goTo]);

  // ── HUD tick (runs every rAF frame) ───────────────────────────────────────
  const onHudTick = useCallback((s: GameState) => {
    setHud((prev) => {
      const sec      = Math.floor(s.elapsedMs / 1000);
      const prevSec  = Math.floor(prev.elapsedMs / 1000);
      const canUndo  = s.history.length > 0;
      if (
        prev.moves        === s.moves &&
        prev.filledPercent=== s.filledPercent &&
        prevSec           === sec &&
        prev.canUndo      === canUndo &&
        prev.solved       === s.solved &&
        prev.allConnected === s.allConnected
      ) return prev;
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

  // ── Solve ──────────────────────────────────────────────────────────────────
  const onSolveAnimationComplete = useCallback(() => {
    const s = stateRef.current;
    // Compute and award coins BEFORE saving the record (so isFirstTime is correct)
    const { coins: earned, stars } = computeLevelReward(
      s.level.id,
      s.level.size,
      s.moves,
      s.level.optimalMoves,
    );
    addCoins(earned);
    setCoins(getCoins());
    saveLevelRecord(s.level.id, s.moves, s.elapsedMs);
    setSolveStats({ moves: s.moves, elapsedMs: s.elapsedMs, coinsEarned: earned, stars });
    setSolveOpen(true);
  }, []);

  // ── Game controls ──────────────────────────────────────────────────────────
  const handleUndo = () => { applyUndo(stateRef.current); };

  const handleRestart = () => {
    restartLevel(stateRef.current);
    setSolveOpen(false);
    hintRef.current  = null;
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
    if (!found) { setSolveOpen(false); goTo('menu'); return; }
    const { pack, index } = found;
    const next = pack.levels[index + 1];
    if (next) {
      loadLevel(next);  // loads level AND navigates to game
    } else {
      setSolveOpen(false);
      goTo('menu');     // end of pack → back to menu
    }
    setSolveOpen(false);
  };

  // ── Screen routing ─────────────────────────────────────────────────────────

  if (screen === 'landing') {
    return (
      <LandingScreen
        onPlay={handlePlayFromLanding}
        onHowToPlay={() => goTo('onboarding')}
      />
    );
  }

  if (screen === 'onboarding') {
    return (
      <OnboardingOverlay
        open={true}
        onDone={handleOnboardingDone}
      />
    );
  }

  if (screen === 'menu') {
    let canGoBack = false;
    try { canGoBack = localStorage.getItem(LAST_SCREEN_KEY) === 'game'; } catch { /* ignore */ }

    return (
      <MenuOverlay
        open={true}
        currentPack={packName}
        currentLevelId={level.id}
        coins={coins}
        onClose={canGoBack ? () => goTo('game') : undefined}
        onSelectLevel={(lvl) => loadLevel(lvl)}
        onSelectPack={(name) => setPackName(name)}
        onOpenStore={() => goTo('store')}
      />
    );
  }

  if (screen === 'store') {
    return (
      <StoreScreen
        onClose={() => {
          refreshCoins();
          // Return to wherever they came from
          const last = localStorage.getItem(LAST_SCREEN_KEY);
          goTo(last === 'game' ? 'game' : 'menu');
        }}
      />
    );
  }

  // Derived display values
  const packIdx    = PACKS.findIndex((p) => p.name === packName);
  const packAccent = (['#5EEAD4','#3B9EFF','#FFD700','#FF69B4'] as const)[Math.max(0, packIdx)] ?? '#5EEAD4';

  const hasToast = (hud.allConnected && !hud.solved) || !!hintStatus;
  const toastText = hud.allConnected && !hud.solved ? 'FILL EVERY CELL' : hintStatus ?? '';
  const toastWarn = hud.allConnected && !hud.solved;

  // ── Game screen ────────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="gs-header">
        <button
          type="button"
          className="gs-icon-btn"
          onClick={() => goTo('menu')}
          aria-label="Level select"
        >
          {/* Hamburger */}
          <svg viewBox="0 0 22 22" fill="none" className="gs-icon-svg" aria-hidden>
            <rect x="3" y="5.5" width="16" height="1.8" rx="0.9" fill="currentColor"/>
            <rect x="3" y="10.1" width="16" height="1.8" rx="0.9" fill="currentColor"/>
            <rect x="3" y="14.7" width="10" height="1.8" rx="0.9" fill="currentColor"/>
          </svg>
        </button>

        <div className="gs-brand">
          <img src={logoMarkUrl} alt="" className="gs-brand-mark" aria-hidden />
          <span className="gs-brand-name">FLOWLINE</span>
        </div>

        {/* Right side: coin balance pill + restart */}
        <div className="gs-header-end">
          <button
            type="button"
            className="gs-coin-pill"
            onClick={() => goTo('store')}
            aria-label={`${coins} coins — open store`}
          >
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden>
              <circle cx="10" cy="10" r="9" fill="#FFD700" stroke="#B8860B" strokeWidth="1.2"/>
              <text x="10" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill="#7B5200">₣</text>
            </svg>
            <span>{coins}</span>
          </button>
          <button
            type="button"
            className="gs-icon-btn"
            onClick={handleRestart}
            aria-label="Restart level"
          >
            <svg viewBox="0 0 22 22" fill="none" className="gs-icon-svg" aria-hidden>
              <path d="M4.5 11a6.5 6.5 0 1 0 1.2-3.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
              <path d="M4.5 4.5v3.5H8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Stat strip ── */}
      <div className="gs-stats" style={{ '--pack-accent': packAccent } as React.CSSProperties}>
        {/* Pack + level badge */}
        <div className="gs-stat gs-stat--level">
          <span className="gs-stat-label">LEVEL</span>
          <span className="gs-stat-value gs-stat-value--accent">{metaLabel.split(' · ')[1]}</span>
        </div>

        {/* Circular progress */}
        <div className="gs-progress-wrap" aria-label={`${hud.filledPercent}% filled`}>
          <svg viewBox="0 0 48 48" className="gs-progress-ring" aria-hidden>
            <circle cx="24" cy="24" r="19" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
            <circle
              cx="24" cy="24" r="19"
              fill="none"
              stroke={packAccent}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 19}`}
              strokeDashoffset={`${2 * Math.PI * 19 * (1 - hud.filledPercent / 100)}`}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '24px 24px', transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <span className="gs-progress-pct">{hud.filledPercent}%</span>
        </div>

        {/* Moves */}
        <div className="gs-stat">
          <span className="gs-stat-label">MOVES</span>
          <span className="gs-stat-value">{hud.moves}</span>
        </div>

        {/* Time */}
        <div className="gs-stat">
          <span className="gs-stat-label">TIME</span>
          <span className="gs-stat-value">{formatTime(hud.elapsedMs)}</span>
        </div>
      </div>

      {/* ── Toast notification ── */}
      <div
        className={`gs-toast ${hasToast ? 'gs-toast--visible' : ''} ${toastWarn ? 'gs-toast--warn' : ''}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toastWarn ? (
          <svg viewBox="0 0 16 16" fill="none" className="gs-toast-icon" aria-hidden>
            <path d="M8 3v5M8 10.5v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M1.5 13.5L8 2l6.5 11.5H1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="none" className="gs-toast-icon" aria-hidden>
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 7v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="8" cy="5" r="0.8" fill="currentColor"/>
          </svg>
        )}
        <span className="gs-toast-text">{toastText}</span>
      </div>

      {/* ── Board ── */}
      <main className="board-area">
        <GameCanvas
          stateRef={stateRef}
          hintRef={hintRef}
          levelKey={level.id}
          onHudTick={onHudTick}
          onSolveAnimationComplete={onSolveAnimationComplete}
        />
      </main>

      {/* ── Bottom action sheet ── */}
      <footer className="gs-footer">
        {/* Progress bar */}
        <div className="gs-fill-bar" aria-hidden>
          <div
            className="gs-fill-bar__fill"
            style={{
              width: `${hud.filledPercent}%`,
              background: `linear-gradient(90deg, ${packAccent}88, ${packAccent})`,
            }}
          />
        </div>

        {/* Action buttons */}
        <div className="gs-actions">
          {/* Hint */}
          <button
            type="button"
            className="gs-action-btn gs-action-btn--hint"
            onClick={handleHint}
            disabled={hud.solved}
            aria-label={`Get hint — ${hintsLeft} remaining`}
            style={{ '--btn-accent': packAccent } as React.CSSProperties}
          >
            <svg viewBox="0 0 24 24" fill="none" className="gs-action-icon" aria-hidden>
              <path d="M12 2a7 7 0 0 1 3.5 13.07V17a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-1.93A7 7 0 0 1 12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M9.5 21h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span className="gs-action-label">HINT</span>
            <span className="gs-action-badge" aria-hidden>{hintsLeft}</span>
          </button>

          {/* Undo */}
          <button
            type="button"
            className="gs-action-btn gs-action-btn--undo"
            onClick={handleUndo}
            disabled={!hud.canUndo}
            aria-label="Undo last move"
          >
            <svg viewBox="0 0 24 24" fill="none" className="gs-action-icon" aria-hidden>
              <path d="M4 8h10a5 5 0 0 1 0 10H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 5L4 8l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="gs-action-label">UNDO</span>
          </button>
        </div>
      </footer>

      <SolveSheet
        open={solveOpen}
        level={level}
        moves={solveStats.moves}
        elapsedMs={solveStats.elapsedMs}
        coinsEarned={solveStats.coinsEarned}
        stars={solveStats.stars}
        onNext={goNextLevel}
        onMenu={() => { setSolveOpen(false); goTo('menu'); }}
      />
    </div>
  );
}
