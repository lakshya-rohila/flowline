import { useState } from 'react';
import tutorialConnect from '../assets/game-assets/flowline-tutorial-connect.png';
import tutorialFill from '../assets/game-assets/flowline-tutorial-fill.png';
import tutorialHintsUndo from '../assets/game-assets/flowline-tutorial-hints-undo.png';

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
  const src =
    type === 'connect'
      ? tutorialConnect
      : type === 'fill'
        ? tutorialFill
        : tutorialHintsUndo;
  const alt =
    type === 'connect'
      ? 'A red pipe connecting two matching dots.'
      : type === 'fill'
        ? 'A filled neon puzzle board showing every cell completed.'
        : 'Hint and undo tutorial graphics.';

  return (
    <div className={`ob-visual ob-visual--asset ob-visual--${type}`}>
      <img src={src} alt={alt} className="ob-visual__image" />
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
