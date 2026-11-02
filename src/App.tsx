import { useEffect } from 'react';
import { useGameStore } from './state/gameStore';
import { useSettings } from './state/settings';
import { GameScene } from './scene/GameScene';
import { CameraView } from './ui/CameraView';
import { LookSurface } from './ui/LookSurface';
import { HUD } from './ui/HUD';
import { CalibrationScreen, GameOverScreen, PauseScreen, StartScreen } from './ui/Screens';
import { TutorialScreen } from './ui/Tutorial';
import { SettingsScreen } from './ui/Settings';
import { runtime } from './game/runtime';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const tutorialSeen = useSettings((s) => s.tutorialSeen);
  const tutorialOpen = useSettings((s) => s.tutorialOpen);
  const settingsOpen = useSettings((s) => s.settingsOpen);

  // pausa automática ao sair da aba / bloquear o ecrã
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        useGameStore.getState().pause();
        runtime.fireHeld = false;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onVisibility);
    };
  }, []);

  const inGame = phase === 'playing' || phase === 'paused';
  // na primeira vez, o tutorial aparece antes da calibração
  const showTutorial = tutorialOpen || (phase === 'calibrating' && !tutorialSeen);

  return (
    <div className={`app app--${phase}`}>
      <CameraView />
      <GameScene />
      {phase === 'playing' && <LookSurface />}
      {inGame && <HUD />}
      {phase === 'menu' && <StartScreen />}
      {phase === 'calibrating' && <CalibrationScreen />}
      {phase === 'paused' && <PauseScreen />}
      {phase === 'gameover' && <GameOverScreen />}
      {showTutorial && <TutorialScreen />}
      {settingsOpen && <SettingsScreen />}
    </div>
  );
}
