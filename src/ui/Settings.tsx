import { useEffect, useState } from 'react';
import { useSettings } from '../state/settings';
import { useT } from '../i18n';
import { sfx } from '../audio/sfx';
import { runtime } from '../game/runtime';
import type { Lang, Quality } from '../types';

const QUALITIES: Quality[] = ['auto', 'high', 'medium', 'low'];
const LANGS: Lang[] = ['pt', 'en'];

/** Definições: som, vibração, qualidade gráfica, idioma e tutorial. */
export function SettingsScreen() {
  const t = useT();
  const s = useSettings();
  const [, tick] = useState(0);

  // a linha de desempenho atualiza a cada segundo
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const toggleSound = () => {
    const sound = !s.sound;
    s.update({ sound });
    sfx.setMuted(!sound);
    if (sound) sfx.click();
  };

  return (
    <div className="screen screen--settings">
      <div className="panel panel--settings">
        <h2>{t('set.title')}</h2>

        <div className="setting">
          <span className="setting__label">{t('set.sound')}</span>
          <button className={`switch ${s.sound ? 'switch--on' : ''}`} onClick={toggleSound} aria-pressed={s.sound}>
            <span className="switch__knob" />
            <span className="switch__text">{s.sound ? t('set.on') : t('set.off')}</span>
          </button>
        </div>

        <div className="setting">
          <span className="setting__label">{t('set.vibration')}</span>
          <button
            className={`switch ${s.vibration ? 'switch--on' : ''}`}
            onClick={() => {
              sfx.click();
              s.update({ vibration: !s.vibration });
            }}
            aria-pressed={s.vibration}
          >
            <span className="switch__knob" />
            <span className="switch__text">{s.vibration ? t('set.on') : t('set.off')}</span>
          </button>
        </div>

        <div className="setting setting--stack">
          <span className="setting__label">{t('set.quality')}</span>
          <div className="segmented">
            {QUALITIES.map((q) => (
              <button
                key={q}
                className={`segmented__item ${s.quality === q ? 'segmented__item--on' : ''}`}
                onClick={() => {
                  sfx.click();
                  s.update({ quality: q });
                }}
              >
                {t(`set.quality.${q}`)}
              </button>
            ))}
          </div>
          <span className="setting__hint">
            {t('set.fps')}: {Math.round(runtime.fps)} fps · {t(`set.quality.${runtime.qualityLevel}`)}
          </span>
        </div>

        <div className="setting setting--stack">
          <span className="setting__label">{t('set.language')}</span>
          <div className="segmented">
            {LANGS.map((l) => (
              <button
                key={l}
                className={`segmented__item ${s.language === l ? 'segmented__item--on' : ''}`}
                onClick={() => {
                  sfx.click();
                  s.update({ language: l });
                }}
              >
                {l === 'pt' ? 'Português' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn"
          onClick={() => {
            sfx.click();
            s.closeSettings();
            s.openTutorial();
          }}
        >
          {t('set.tutorial')}
        </button>
        <button className="btn btn--primary" onClick={() => { sfx.click(); s.closeSettings(); }}>
          {t('set.close')}
        </button>
      </div>
    </div>
  );
}
