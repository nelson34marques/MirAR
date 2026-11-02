import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Object3D,
  Vector3,
} from 'three';
import { runtime } from '../game/runtime';

const MAX_PARTICLES = 400;

interface Particle {
  pos: Vector3;
  vel: Vector3;
  life: number;
  maxLife: number;
  color: Color;
  size: number;
}

interface TracerObj {
  line: Line;
  life: number;
}

/** Partículas de impacto e tracers dos disparos. */
export function Effects() {
  const mesh = useRef<InstancedMesh>(null);
  const tracerGroup = useRef<Group>(null);
  const particles = useRef<Particle[]>([]);
  const tracers = useRef<TracerObj[]>([]);
  const dummy = useMemo(() => new Object3D(), []);
  const colorTmp = useMemo(() => new Color(), []);
  const gravity = useMemo(() => new Vector3(0, -3.5, 0), []);

  useFrame((_, dt) => {
    const clamped = Math.min(dt, 0.05);

    // novas explosões
    while (runtime.bursts.length) {
      const b = runtime.bursts.pop()!;
      const base = new Color(b.color);
      const cap = Math.min(MAX_PARTICLES, runtime.particleCap);
      for (let i = 0; i < b.count && particles.current.length < cap; i++) {
        const vel = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .normalize()
          .multiplyScalar(1.5 + Math.random() * 3.5);
        particles.current.push({
          pos: b.position.clone(),
          vel,
          life: 0,
          maxLife: 0.45 + Math.random() * 0.5,
          color: base.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.25),
          size: 0.04 + Math.random() * 0.08,
        });
      }
    }

    // novos tracers
    while (runtime.tracers.length) {
      const t = runtime.tracers.pop()!;
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute([...t.from.toArray(), ...t.to.toArray()], 3));
      const mat = new LineBasicMaterial({ color: '#ffe8a3', transparent: true, opacity: 0.9, blending: AdditiveBlending });
      const line = new Line(geo, mat);
      tracerGroup.current?.add(line);
      tracers.current.push({ line, life: 0 });
    }

    // atualiza partículas
    const list = particles.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life += clamped;
      if (p.life >= p.maxLife) {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      p.vel.addScaledVector(gravity, clamped);
      p.vel.multiplyScalar(1 - clamped * 1.8);
      p.pos.addScaledVector(p.vel, clamped);
    }

    const m = mesh.current;
    if (m) {
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const k = 1 - p.life / p.maxLife;
        dummy.position.copy(p.pos);
        dummy.scale.setScalar(p.size * (0.4 + k));
        dummy.rotation.set(p.life * 6, p.life * 4, 0);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        colorTmp.copy(p.color).multiplyScalar(0.6 + k * 1.2);
        m.setColorAt(i, colorTmp);
      }
      m.count = list.length;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }

    // tracers desvanecem em ~90 ms
    for (let i = tracers.current.length - 1; i >= 0; i--) {
      const t = tracers.current[i];
      t.life += clamped;
      const mat = t.line.material as LineBasicMaterial;
      mat.opacity = Math.max(0, 0.9 - t.life * 10);
      if (t.life > 0.09) {
        tracerGroup.current?.remove(t.line);
        t.line.geometry.dispose();
        mat.dispose();
        tracers.current.splice(i, 1);
      }
    }
  });

  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <group ref={tracerGroup} />
    </>
  );
}
