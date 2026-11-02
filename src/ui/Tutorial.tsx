import { useState } from 'react';
import { useSettings } from '../state/settings';
import { useT } from '../i18n';
import { sfx } from '../audio/sfx';

const STEPS = ['s1', 's2', 's3', 's4'] as const;

/** Tutorial em 4 passos, mostrado na primeira vez e a pedido nas definições. */
export function TutorialScreen() {
  const t = useT();
  const close = useSettings((s) => s.closeTutorial);
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const key = STEPS[step];

  const next = () => {
    sfx.click();
    if (last) close();
    else setStep(step + 1);
  };

  return (
    <div className="screen screen--tutorial">
      <div className="panel tutorial">
        <span className="menu__kicker">{t('tut.title')}</span>
        <div className="tutorial__art" aria-hidden>
          <TutorialArt step={step} />
        </div>
        <h2>{t(`tut.${key}.title`)}</h2>
        <p className="tutorial__text">{t(`tut.${key}.text`)}</p>
        <div className="tutorial__dots">
          {STEPS.map((s, i) => (
            <button key={s} className={`tutorial__dot ${i === step ? 'tutorial__dot--on' : ''}`} onClick={() => setStep(i)} aria-label={`${i + 1}`} />
          ))}
        </div>
        <div className="tutorial__actions">
          {!last && (
            <button className="btn btn--ghost" onClick={() => { sfx.click(); close(); }}>
              {t('tut.skip')}
            </button>
          )}
          <button className="btn btn--primary" onClick={next}>
            {last ? t('tut.start') : t('tut.next')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** ilustrações em SVG inline, uma por passo */
function TutorialArt({ step }: { step: number }) {
  const stroke = '#7dd3fc';
  switch (step) {
    case 0:
      return (
        <svg viewBox="0 0 200 120" width="200" height="120">
          <rect x="70" y="10" width="60" height="100" rx="10" fill="#0b1a33" stroke={stroke} strokeWidth="2" />
          <circle cx="100" cy="60" r="22" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.7" />
          <path d="M100 60 L100 38 A22 22 0 0 1 119 49 Z" fill={stroke} opacity="0.35" />
          <circle cx="86" cy="52" r="3" fill="#4ade80" />
          <circle cx="112" cy="70" r="3" fill="#38bdf8" />
          <path d="M40 60 a60 60 0 0 1 20 -40" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <path d="M160 60 a60 60 0 0 0 -20 -40" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <path d="M60 20 l-8 -2 l3 8" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <path d="M140 20 l8 -2 l-3 8" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 200 120" width="200" height="120">
          <circle cx="100" cy="55" r="26" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="100" cy="55" r="3" fill="#fff" />
          <path d="M100 20 v12 M100 78 v12 M65 55 h12 M123 55 h12" stroke={stroke} strokeWidth="2" />
          <circle cx="100" cy="55" r="12" fill="#38bdf8" opacity="0.5" />
          <circle cx="160" cy="95" r="18" fill="#2563eb" stroke="#93c5fd" strokeWidth="2" />
          <text x="160" y="99" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff">FIRE</text>
          <path d="M40 95 m-10 0 a10 10 0 1 1 20 0" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
          <path d="M50 95 l-4 -5 l6 -1" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 200 120" width="200" height="120">
          <polygon points="60,30 70,46 88,42 82,60 96,72 78,76 74,94 60,82 46,94 42,76 24,72 38,60 32,42 50,46" fill="#f97316" opacity="0.9" />
          <polygon points="60,44 65,52 74,50 71,59 78,65 69,67 67,76 60,70 53,76 51,67 42,65 49,59 46,50 55,52" fill="#fde68a" />
          <circle cx="140" cy="50" r="18" fill="#ef4444" />
          <path d="M126 36 l28 28 M154 36 l-28 28" stroke="#fff" strokeWidth="3" />
          <rect x="30" y="104" width="140" height="8" rx="4" fill="#0b1a33" stroke={stroke} />
          <rect x="30" y="104" width="60" height="8" rx="4" fill="#22c55e" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 200 120" width="200" height="120">
          <rect x="24" y="60" width="52" height="24" rx="12" fill="#e2e8f0" opacity="0.7" />
          <circle cx="50" cy="72" r="9" fill="#34d399" />
          <path d="M50 66 v12 M44 72 h12" stroke="#fff" strokeWidth="2.5" />
          <rect x="80" y="60" width="52" height="24" rx="12" fill="#e2e8f0" opacity="0.7" />
          <circle cx="106" cy="72" r="9" fill="#38bdf8" />
          <path d="M106 66 v6 h5" stroke="#fff" strokeWidth="2.5" fill="none" />
          <polygon points="165,20 185,38 178,62 152,62 145,38" fill="#fb7185" stroke="#fff" strokeWidth="1.5" />
          <circle cx="165" cy="42" r="6" fill="#fff" />
          <rect x="140" y="70" width="50" height="6" rx="3" fill="#0b1a33" stroke="#fb7185" />
          <rect x="140" y="70" width="34" height="6" rx="3" fill="#fb7185" />
        </svg>
      );
  }
}
