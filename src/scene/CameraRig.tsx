import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { orientation } from '../sensors/orientation';
import { runtime, pitchOf, yawOf } from '../game/runtime';
import { useGameStore } from '../state/gameStore';
import { WEAPONS } from '../config/weapons';

const BASE_FOV = 68;

/** Aplica a orientação do dispositivo à câmera e gere o zoom da arma. */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;

  useFrame((_, dt) => {
    const clamped = Math.min(dt, 0.05);
    orientation.update(clamped);
    camera.quaternion.copy(orientation.quaternion);

    // recuo: inclina a câmera ligeiramente para cima e decai
    if (runtime.recoilKick > 0.0005) {
      camera.rotateX(runtime.recoilKick);
      runtime.recoilKick *= Math.exp(-clamped * 14);
    } else {
      runtime.recoilKick = 0;
    }
    if (runtime.shake > 0.0005) {
      camera.rotateZ((Math.random() - 0.5) * runtime.shake);
      camera.rotateX((Math.random() - 0.5) * runtime.shake);
      runtime.shake *= Math.exp(-clamped * 10);
    }

    camera.position.set(0, 0, 0);
    runtime.cameraQuaternion.copy(camera.quaternion);
    runtime.cameraYaw = yawOf(camera.quaternion);
    runtime.cameraPitch = pitchOf(camera.quaternion);

    const { weaponId, phase } = useGameStore.getState();
    const zoom = phase === 'playing' || phase === 'paused' ? WEAPONS[weaponId].zoom : 1;
    const targetFov = BASE_FOV / zoom;
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-clamped * 10));
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
