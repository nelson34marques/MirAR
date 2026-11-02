import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { runtime } from '../game/runtime';
import { useGameStore } from '../state/gameStore';
import { WEAPONS } from '../config/weapons';
import { TARGETS } from '../config/targets';
import { pickTarget } from '../game/aim';
import { sfx, vibrate } from '../audio/sfx';

const FORWARD = new Vector3();
const RIGHT = new Vector3();
const UP = new Vector3();
const dir = new Vector3();
const far = new Vector3();
/**
 * Deteta o alvo sob a mira (para colorir o crosshair) e resolve os disparos
 * pedidos pelo HUD/teclado.
 */
export function Shooter() {
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    const store = useGameStore.getState();
    const now = runtime.gameTime;
    const realNow = performance.now();
    const targets = store.targets;

    // alvo sob a mira
    camera.getWorldDirection(FORWARD);
    runtime.hoverKind = targets.length ? (pickTarget(camera.position, FORWARD, targets, now, 1)?.kind ?? null) : null;

    if (runtime.reloadRequest) {
      runtime.reloadRequest = false;
      if (store.reload(realNow)) sfx.reload(WEAPONS[store.weaponId].reloadTime / 1000);
    }

    if (store.phase !== 'playing') {
      runtime.fireTap = false;
      return;
    }

    const weapon = WEAPONS[store.weaponId];
    const wantsFire = runtime.fireTap || (runtime.fireHeld && weapon.auto);
    runtime.fireTap = false;
    if (!wantsFire) return;

    if (!store.reloading && store.ammo[store.weaponId] <= 0) {
      if (realNow - store.lastShotAt > 250) {
        sfx.empty();
        // recarga automática ao ficar sem munição
        if (store.reload(realNow)) sfx.reload(weapon.reloadTime / 1000);
      }
      return;
    }

    if (!store.fire(realNow)) return;

    sfx.shoot(store.weaponId);
    vibrate(weapon.pellets > 1 ? 30 : 12);
    runtime.recoilKick += weapon.recoil;
    runtime.flash = 1;

    RIGHT.set(1, 0, 0).applyQuaternion(camera.quaternion);
    UP.set(0, 1, 0).applyQuaternion(camera.quaternion);

    let anyHit = false;
    for (let p = 0; p < weapon.pellets; p++) {
      // dispersão circular uniforme
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * weapon.spread;
      dir.copy(FORWARD)
        .addScaledVector(RIGHT, Math.cos(angle) * radius)
        .addScaledVector(UP, Math.sin(angle) * radius)
        .normalize();

      const hit = pickTarget(camera.position, dir, useGameStore.getState().targets, now, weapon.aimAssist);
      const from = new Vector3(0.22, -0.18, -0.45).applyQuaternion(camera.quaternion).add(camera.position);
      if (hit) {
        anyHit = true;
        runtime.tracers.push({ from, to: hit.point.clone() });
        const result = useGameStore.getState().damageTarget(hit.id, weapon.damage, now);
        const def = TARGETS[hit.kind];
        if (result === 'killed') {
          if (def.category === 'boss') {
            runtime.events.push({ type: 'bossDown', position: hit.point.clone(), color: def.color });
          } else {
            runtime.bursts.push({ position: hit.point.clone(), color: def.color, count: 26 });
            if (def.category === 'bonus') sfx.bonus();
            else sfx.kill();
            vibrate([20, 30, 20]);
          }
        } else if (result === 'bomb') {
          runtime.bursts.push({ position: hit.point.clone(), color: '#f97316', count: 60 });
          runtime.shake += 0.08;
          sfx.bomb();
          vibrate([80, 40, 120]);
        } else if (result === 'hit') {
          runtime.bursts.push({ position: hit.point.clone(), color: '#ffffff', count: 8 });
          if (def.category === 'boss') sfx.bossHit();
          else sfx.hit();
        }
        // 'pickup': a explosão e o som vêm do evento gerado pelo store
      } else {
        far.copy(camera.position).addScaledVector(dir, 40);
        runtime.tracers.push({ from, to: far.clone() });
      }
    }
    if (!anyHit) useGameStore.getState().registerMiss();
  });

  return null;
}
