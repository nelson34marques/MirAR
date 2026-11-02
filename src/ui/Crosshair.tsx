import { useEffect, useRef } from 'react';
import { runtime } from '../game/runtime';
import { useGameStore } from '../state/gameStore';
import { WEAPONS } from '../config/weapons';
import { TARGETS } from '../config/targets';

const CLASSES = ['crosshair--danger', 'crosshair--target', 'crosshair--pickup'];

/** Mira central. Muda de cor conforme o que está debaixo dela. */
export function Crosshair() {
  const ref = useRef<HTMLDivElement>(null);
  const weaponId = useGameStore((s) => s.weaponId);

  useEffect(() => {
    let raf = 0;
    let last = '';
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = ref.current;
      if (!el) return;
      const kind = runtime.hoverKind;
      const category = kind ? TARGETS[kind].category : null;
      const cls = category === null ? '' : category === 'bomb' ? 'crosshair--danger' : category === 'pickup' ? 'crosshair--pickup' : 'crosshair--target';
      if (cls !== last) {
        el.classList.remove(...CLASSES);
        if (cls) el.classList.add(cls);
        last = cls;
      }
      const spread = 1 + WEAPONS[useGameStore.getState().weaponId].spread * 220 + runtime.recoilKick * 25;
      el.style.setProperty('--spread', spread.toFixed(2));
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  const sniper = weaponId === 'sniper';
  return (
    <div ref={ref} className={`crosshair ${sniper ? 'crosshair--scope' : ''}`} aria-hidden>
      <span className="crosshair__dot" />
      <span className="crosshair__corner crosshair__corner--tl" />
      <span className="crosshair__corner crosshair__corner--tr" />
      <span className="crosshair__corner crosshair__corner--bl" />
      <span className="crosshair__corner crosshair__corner--br" />
      <span className="crosshair__line crosshair__line--t" />
      <span className="crosshair__line crosshair__line--b" />
      <span className="crosshair__line crosshair__line--l" />
      <span className="crosshair__line crosshair__line--r" />
      {sniper && <span className="crosshair__scope" />}
    </div>
  );
}
