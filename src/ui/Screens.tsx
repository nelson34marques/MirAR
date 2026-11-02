import { useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { useSettings } from '../state/settings';
import { orientation } from '../sensors/orientation';
import { getCameraVideoElement, startCamera } from '../sensors/camera';
import { sfx } from '../audio/sfx';
import { DiagnosticsPanel } from './Diagnostics';
import { formatNumber, useT } from '../i18n';
import type { SensorMode } from '../types';

const isTouchDevice = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;

async function enterFullscreen() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    /* iOS Safari não suporta */
  }
  try {
    const so = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await so.lock?.('portrait');
  } catch {
    /* só funciona em fullscreen Android */
  }
}

export function StartScreen() {
  const t = useT();
  const highScore = useGameStore((s) => s.highScore);
  const cameraStatus = useGameStore((s) => s.cameraStatus);
  const cameraError = useGameStore((s) => s.cameraError);
  const sensorMode = useGameStore((s) => s.sensorMode);
  const openSettings = useSettings((s) => s.openSettings);
  const openTutorial = useSettings((s) => s.openTutorial);
  const [busy, setBusy] = useState(false);
  const [sensorNote, setSensorNote] = useState<string | null>(null);
  const [showDiag, setShowDiag] = useState(false);

  const onStart = async () => {
    if (busy) return;
    setBusy(true);
    sfx.init();
    sfx.click();

    // tudo o que exige gesto do utilizador acontece aqui
    const perm = await orientation.requestPermission();
    useGameStore.getState().setMotionPermission(perm);
    const cameraPromise = startCamera();
    void enterFullscreen();

    let mode = orientation.mode;
    if (mode === 'none') mode = await orientation.start();
    useGameStore.getState().setSensorMode(mode);
    orientation.onModeChange = (m) => {
      useGameStore.getState().setSensorMode(m);
      if (m === 'gyro') useGameStore.getState().pushMessage(t('sensor.gyroOn'), 'good');
    };
    await cameraPromise;

    // sem giroscópio num telemóvel com câmera: a imagem da câmera passa a guiar a vista
    const video = getCameraVideoElement();
    if (mode === 'pointer' && isTouchDevice() && video && useGameStore.getState().cameraStatus === 'ready') {
      orientation.enableCameraFlow(video);
      mode = 'camera';
      useGameStore.getState().setSensorMode(mode);
    }
    if (mode === 'camera') setSensorNote(t('sensor.cameraMode'));
    else if (mode === 'pointer') setSensorNote(perm === 'denied' ? t('sensor.denied') : t('sensor.noGyro'));
    setBusy(false);
    useGameStore.getState().goToCalibration();
  };

  const howto = (['1', '2', '3', '4'] as const).map((n) => ({
    title: t(`menu.howto${n}.title`),
    text: t(`menu.howto${n}.text`),
  }));

  return (
    <div className="screen screen--menu">
      <div className="menu__glow" aria-hidden />
      <div className="menu__title">
        <span className="menu__kicker">{t('menu.kicker')}</span>
        <h1>
          MIR<span>AR</span>
        </h1>
        <p className="menu__tag">{t('menu.tag')}</p>
      </div>

      <ul className="menu__howto">
        {howto.map((h, i) => (
          <li key={i}>
            <span className="menu__step">{i + 1}</span>
            <span>
              <b>{h.title}</b> — {h.text}
            </span>
          </li>
        ))}
      </ul>

      {highScore > 0 && (
        <div className="menu__best">
          {t('menu.best')} <strong>{formatNumber(highScore)}</strong>
        </div>
      )}

      <button className="btn btn--primary btn--big" onClick={onStart} disabled={busy}>
        {busy ? t('menu.preparing') : t('menu.start')}
      </button>

      <div className="menu__status">
        {cameraStatus === 'error' && (
          <p className="menu__warn">
            {cameraError} {t('menu.cameraContinues')}
          </p>
        )}
        {sensorNote && <p className="menu__warn">{sensorNote}</p>}
        {sensorMode === 'gyro' && <p className="menu__ok">{t('menu.gyroActive')}</p>}
        {!window.isSecureContext && <p className="menu__warn">{t('menu.https')}</p>}
        <p className="menu__privacy">{t('menu.privacy')}</p>
      </div>

      <div className="menu__links">
        <button className="link" onClick={() => { sfx.click(); openTutorial(); }}>
          {t('menu.howtoLink')}
        </button>
        <button className="link" onClick={() => { sfx.click(); openSettings(); }}>
          {t('menu.settings')}
        </button>
        <button className="link" onClick={() => setShowDiag(true)}>
          {t('menu.diag')}
        </button>
      </div>
      {showDiag && <DiagnosticsPanel onClose={() => setShowDiag(false)} />}
    </div>
  );
}

export function CalibrationScreen() {
  const t = useT();
  const sensorMode = useGameStore((s) => s.sensorMode);
  const motionPermission = useGameStore((s) => s.motionPermission);
  // iOS: sem a permissão de movimento o jogo cai para o modo câmera; vale a pena insistir
  const iosDenied = motionPermission === 'denied' && sensorMode !== 'gyro';
  const onReady = () => {
    sfx.click();
    orientation.calibrate();
    useGameStore.getState().startGame();
    useGameStore
      .getState()
      .pushMessage(orientation.mode === 'gyro' ? t('calib.msgGyro') : orientation.mode === 'camera' ? t('calib.msgCamera') : t('calib.msgPointer'), 'neutral');
  };
  return (
    <div className="screen screen--calibrate" onClick={onReady}>
      <div className="calibrate__box">
        <div className="calibrate__icon">⌖</div>
        <h2>{sensorMode === 'pointer' ? t('calib.ready') : t('calib.pointForward')}</h2>
        <p>{sensorMode === 'gyro' ? t('calib.gyro') : sensorMode === 'camera' ? t('calib.camera') : t('calib.pointer')}</p>
        {iosDenied && (
          <>
            <p className="menu__warn">{t('sensor.deniedIos')}</p>
            <button
              className="btn"
              onClick={(e) => {
                e.stopPropagation();
                location.reload();
              }}
            >
              {t('sensor.reload')}
            </button>
          </>
        )}
        <button className="btn btn--primary">{t('calib.start')}</button>
      </div>
    </div>
  );
}

export function PauseScreen() {
  const t = useT();
  const resume = useGameStore((s) => s.resume);
  const endGame = useGameStore((s) => s.endGame);
  const score = useGameStore((s) => s.score);
  const wave = useGameStore((s) => s.wave);
  const sensorMode = useGameStore((s) => s.sensorMode);
  const openSettings = useSettings((s) => s.openSettings);
  const [showDiag, setShowDiag] = useState(false);

  const cycleMode = () => {
    sfx.click();
    const order: SensorMode[] = ['gyro', 'camera', 'pointer'];
    const video = getCameraVideoElement();
    const available = order.filter((m) =>
      m === 'gyro' ? orientation.gyroAvailable : m === 'camera' ? !!video && useGameStore.getState().cameraStatus === 'ready' : true,
    );
    const idx = available.indexOf(sensorMode);
    const next = available[(idx + 1) % available.length];
    if (next !== sensorMode) orientation.setMode(next, video);
  };

  return (
    <div className="screen screen--pause">
      <div className="panel">
        <h2>{t('pause.title')}</h2>
        <p className="panel__sub">
          {wave.label} · {t('pause.points', { n: formatNumber(score) })}
        </p>
        <button className="btn btn--primary" onClick={() => { sfx.click(); resume(); }}>
          {t('pause.resume')}
        </button>
        <button className="btn" onClick={cycleMode}>
          {t('pause.control', { mode: t(`mode.${sensorMode}`) })}
        </button>
        <button className="btn" onClick={() => { sfx.click(); openSettings(); }}>
          {t('menu.settings')}
        </button>
        <button className="btn btn--ghost" onClick={() => { sfx.click(); endGame(); }}>
          {t('pause.end')}
        </button>
        <button className="link" onClick={() => setShowDiag(true)}>
          {t('menu.diag')}
        </button>
      </div>
      {showDiag && <DiagnosticsPanel onClose={() => setShowDiag(false)} />}
    </div>
  );
}

export function GameOverScreen() {
  const t = useT();
  const s = useGameStore();
  const accuracy = s.shots ? Math.round((s.hits / s.shots) * 100) : 0;
  const isRecord = s.score > 0 && s.score >= s.highScore;
  const minutes = Math.floor(s.elapsed / 60);
  const seconds = Math.floor(s.elapsed % 60)
    .toString()
    .padStart(2, '0');

  const playAgain = () => {
    sfx.click();
    s.goToCalibration();
  };

  return (
    <div className="screen screen--gameover">
      <div className="panel">
        <span className={`menu__kicker ${isRecord ? 'menu__kicker--record' : ''}`}>{isRecord ? t('over.record') : t('over.title')}</span>
        <div className="gameover__score">{formatNumber(s.score)}</div>
        <dl className="gameover__stats">
          <div>
            <dt>{t('over.wave')}</dt>
            <dd>{s.wave.index}</dd>
          </div>
          <div>
            <dt>{t('over.kills')}</dt>
            <dd>{s.kills}</dd>
          </div>
          <div>
            <dt>{t('over.accuracy')}</dt>
            <dd>{accuracy}%</dd>
          </div>
          <div>
            <dt>{t('over.combo')}</dt>
            <dd>x{s.bestCombo}</dd>
          </div>
          <div>
            <dt>{t('over.time')}</dt>
            <dd>
              {minutes}:{seconds}
            </dd>
          </div>
          <div>
            <dt>{t('over.best')}</dt>
            <dd>{formatNumber(s.highScore)}</dd>
          </div>
        </dl>
        <button className="btn btn--primary" onClick={playAgain}>
          {t('over.again')}
        </button>
        <button className="btn btn--ghost" onClick={() => { sfx.click(); s.returnToMenu(); }}>
          {t('over.menu')}
        </button>
      </div>
    </div>
  );
}
