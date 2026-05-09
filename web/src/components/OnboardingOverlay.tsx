import { useState } from 'react';

interface Props {
  open: boolean;
  onDone: () => void;
}

const STEPS = [
  {
    icon: '◎',
    iconColor: '#FF3B3B',
    title: 'CONNECT THE DOTS',
    body: 'Each color has two endpoints on the grid. Drag from one dot to draw a path to its matching partner.',
    visual: 'connect',
  },
  {
    icon: '▦',
    iconColor: '#FFD700',
    title: 'FILL THE BOARD',
    body: "The puzzle isn't solved until every cell on the grid is covered. Plan your paths to use every square.",
    visual: 'fill',
  },
  {
    icon: '✦',
    iconColor: '#2ECC71',
    title: 'HINTS & UNDO',
    body: 'Stuck? Use HINT to see a suggested move (5 per level). Made a mistake? UNDO steps back one move at a time.',
    visual: 'tools',
  },
] as const;

type VisualType = (typeof STEPS)[number]['visual'];

function StepVisual({ type }: { type: VisualType }) {
  if (type === 'connect') {
    return (
      <div className="ob-visual ob-visual--connect">
        <div className="ob-grid">
          {/* 3×3 mini grid showing a path being drawn */}
          {Array.from({ length: 9 }, (_, i) => {
            const r = Math.floor(i / 3);
            const c = i % 3;
            const isRedDot = (r === 0 && c === 0) || (r === 2 && c === 2);
            const isBlueDot = (r === 0 && c === 2) || (r === 2 && c === 0);
            const isRedPath = (r === 0 && c === 1) || (r === 1 && c === 1) || (r === 1 && c === 2);
            return (
              <div
                key={i}
                className={[
                  'ob-cell',
                  isRedDot ? 'ob-cell--red-dot' : '',
                  isBlueDot ? 'ob-cell--blue-dot' : '',
                  isRedPath ? 'ob-cell--red-path' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            );
          })}
        </div>
        <div className="ob-visual-hint">drag to draw</div>
      </div>
    );
  }

  if (type === 'fill') {
    return (
      <div className="ob-visual ob-visual--fill">
        <div className="ob-grid">
          {/* 3×3 fully filled */}
          {Array.from({ length: 9 }, (_, i) => {
            const r = Math.floor(i / 3);
            const c = i % 3;
            const colors: Record<string, string> = {
              '0,0': 'red',
              '0,1': 'red',
              '0,2': 'yellow',
              '1,0': 'red',
              '1,1': 'yellow',
              '1,2': 'yellow',
              '2,0': 'red',
              '2,1': 'yellow',
              '2,2': 'yellow',
            };
            const isDotRed = (r === 0 && c === 0) || (r === 2 && c === 0);
            const isDotYellow = (r === 0 && c === 2) || (r === 2 && c === 2);
            const color = colors[`${r},${c}`];
            return (
              <div
                key={i}
                className={[
                  'ob-cell',
                  'ob-cell--filled',
                  color ? `ob-cell--fill-${color}` : '',
                  isDotRed ? 'ob-cell--dot' : '',
                  isDotYellow ? 'ob-cell--dot ob-cell--dot-yellow' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            );
          })}
        </div>
        <div className="ob-visual-hint">every cell must be filled</div>
      </div>
    );
  }

  // tools
  return (
    <div className="ob-visual ob-visual--tools">
      <div className="ob-tools-row">
        <div className="ob-tool-card ob-tool-card--hint">
          <span className="ob-tool-label">HINT</span>
          <span className="ob-tool-badge">5</span>
          <span className="ob-tool-desc">shows next move</span>
        </div>
        <div className="ob-tool-card ob-tool-card--undo">
          <span className="ob-tool-label">UNDO</span>
          <span className="ob-tool-desc">step back one move</span>
        </div>
      </div>
    </div>
  );
}

export function OnboardingOverlay({ open, onDone }: Props) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      setStep(0);
      onDone();
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    setStep(0);
    onDone();
  };

  return (
    <div className="ob-overlay" role="dialog" aria-modal="true" aria-label="How to play">
      <div className="ob-card">
        {/* Progress dots */}
        <div className="ob-dots" role="tablist" aria-label="Tutorial progress">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === step}
              aria-label={`Step ${i + 1}`}
              className={`ob-dot ${i === step ? 'ob-dot--active' : ''} ${i < step ? 'ob-dot--done' : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        {/* Step icon */}
        <div className="ob-icon" style={{ color: current.iconColor }} aria-hidden>
          {current.icon}
        </div>

        {/* Step content */}
        <h2 className="ob-title">{current.title}</h2>
        <p className="ob-body">{current.body}</p>

        {/* Visual demonstration */}
        <StepVisual type={current.visual} />

        {/* Actions */}
        <div className="ob-actions">
          <button type="button" className="btn btn--primary ob-next-btn" onClick={next}>
            {isLast ? "LET'S PLAY" : 'NEXT'}
          </button>
          {!isLast && (
            <button type="button" className="ob-skip-btn" onClick={skip}>
              skip tutorial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
