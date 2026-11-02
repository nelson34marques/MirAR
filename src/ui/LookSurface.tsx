import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { orientation } from '../sensors/orientation';
import { runtime } from '../game/runtime';
import { useGameStore } from '../state/gameStore';
import { WEAPON_ORDER } from '../config/weapons';

const TAP_TOLERANCE = 10;

/**
 * Camada invisível sobre a cena que converte gestos em ações:
 * - modo giroscópio: tocar/segurar = disparar
 * - modo câmera: igual ao giroscópio (só a câmera move a vista; arrastar não faz nada)
 * - modo pointer (sem sensores nem câmera): arrastar = olhar, toque curto = disparar
 * - teclado: espaço dispara, R recarrega, 1-4 troca de arma, Esc pausa
 */
export function LookSurface() {
  const sensorMode = useGameStore((s) => s.sensorMode);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const last = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = useGameStore.getState();
      if (e.repeat) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          runtime.fireTap = true;
          runtime.fireHeld = true;
          break;
        case 'KeyR':
          runtime.reloadRequest = true;
          break;
        case 'Escape':
          if (s.phase === 'playing') s.pause();
          else if (s.phase === 'paused') s.resume();
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4': {
          const idx = Number(e.code.slice(-1)) - 1;
          s.selectWeapon(WEAPON_ORDER[idx]);
          break;
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') runtime.fireHeld = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (start.current) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    last.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (sensorMode === 'gyro' || sensorMode === 'camera') {
      runtime.fireTap = true;
      runtime.fireHeld = true;
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const st = start.current;
    if (!st || st.id !== e.pointerId) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (!moved.current && Math.hypot(dx, dy) > TAP_TOLERANCE) moved.current = true;
    if (sensorMode === 'pointer') {
      // deltas calculados à mão: movementX/Y não é fiável em todos os navegadores
      orientation.drag(e.clientX - last.current.x, e.clientY - last.current.y);
    }
    last.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const st = start.current;
    if (!st || st.id !== e.pointerId) return;
    start.current = null;
    if (sensorMode === 'gyro' || sensorMode === 'camera') {
      runtime.fireHeld = false;
    } else if (!moved.current) {
      runtime.fireTap = true;
    }
  };

  return (
    <div
      className="look-surface"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
