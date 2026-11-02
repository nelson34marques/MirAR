import { useEffect, useRef } from 'react';
import { runtime, angleDelta } from '../game/runtime';
import { useGameStore } from '../state/gameStore';
import { SPAWN_DISTANCE_MAX, SPAWN_DISTANCE_MIN, TARGETS } from '../config/targets';
import { isTargetVisible, targetYaw } from '../game/targetMotion';

const SIZE = 120;
const FOV = (68 * Math.PI) / 180;

/**
 * Radar circular: o jogador está no centro a olhar para cima; cada ponto é um
 * alvo na sua direção relativa. Desenhado em canvas 2D fora do ciclo do React,
 * a 30 fps.
 */
export function Radar() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = SIZE * dpr;
    c.height = SIZE * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    let raf = 0;
    let lastDraw = 0;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const R = SIZE / 2 - 4;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const realNow = performance.now();
      if (realNow - lastDraw < 30) return;
      lastDraw = realNow;
      const now = runtime.gameTime;
      const { targets } = useGameStore.getState();
      ctx.clearRect(0, 0, SIZE, SIZE);

      // fundo
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 14, 32, 0.62)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // anéis e cruz
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - R, cy);
      ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R);
      ctx.lineTo(cx, cy + R);
      ctx.stroke();

      // campo de visão
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, -Math.PI / 2 - FOV / 2, -Math.PI / 2 + FOV / 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.fill();

      // varrimento
      const sweep = (realNow / 1500) % (Math.PI * 2);
      const grad = ctx.createConicGradient ? ctx.createConicGradient(sweep, cx, cy) : null;
      if (grad) {
        grad.addColorStop(0, 'rgba(56,189,248,0.4)');
        grad.addColorStop(0.15, 'rgba(56,189,248,0)');
        grad.addColorStop(1, 'rgba(56,189,248,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // alvos
      const span = SPAWN_DISTANCE_MAX - SPAWN_DISTANCE_MIN;
      for (const t of targets) {
        const def = TARGETS[t.kind];
        const rel = angleDelta(targetYaw(t, now), runtime.cameraYaw);
        const dist = (t.distance - SPAWN_DISTANCE_MIN + 1) / (span + 2); // ~0.2..0.8
        const r = R * (0.3 + Math.min(0.65, dist * 0.6));
        // rel > 0 = esquerda do jogador
        const x = cx - Math.sin(rel) * r;
        const y = cy - Math.cos(rel) * r;
        const visible = isTargetVisible(t, now);
        ctx.globalAlpha = visible ? 1 : 0.35;

        if (def.category === 'boss') {
          const pulse = 0.5 + 0.5 * Math.sin(realNow / 150);
          ctx.strokeStyle = def.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 7 + pulse * 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = def.color;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          continue;
        }

        // halo desenhado como círculo maior: shadowBlur é caro em canvas no telemóvel
        ctx.globalAlpha *= 0.35;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = def.color;
        ctx.fill();
        ctx.globalAlpha = visible ? 1 : 0.35;

        if (def.category === 'pickup') {
          // losango
          ctx.beginPath();
          ctx.moveTo(x, y - 5);
          ctx.lineTo(x + 5, y);
          ctx.lineTo(x, y + 5);
          ctx.lineTo(x - 5, y);
          ctx.closePath();
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = def.color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, def.category === 'bonus' || t.kind === 'mini' ? 3 : 4, 0, Math.PI * 2);
          ctx.fillStyle = def.color;
          ctx.fill();
          if (def.category === 'bomb') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x - 3, y - 3);
            ctx.lineTo(x + 3, y + 3);
            ctx.moveTo(x + 3, y - 3);
            ctx.lineTo(x - 3, y + 3);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }

      // jogador
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx - 4, cy + 4);
      ctx.lineTo(cx + 4, cy + 4);
      ctx.closePath();
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvas} className="radar" style={{ width: SIZE, height: SIZE }} aria-label="Radar" />;
}
