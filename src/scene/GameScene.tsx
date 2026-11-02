import { Canvas } from '@react-three/fiber';
import { CameraRig } from './CameraRig';
import { Targets } from './Targets';
import { Shooter } from './Shooter';
import { Weapon } from './Weapon';
import { Effects } from './Effects';
import { GameDirector } from './GameDirector';
import { PerformanceGovernor } from './Quality';
import { dprFor } from '../game/quality';

/** Canvas transparente desenhado por cima do vídeo da câmera. */
export function GameScene() {
  return (
    <Canvas
      className="scene"
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 68, near: 0.05, far: 100, position: [0, 0, 0] }}
      // a resolução do canvas 3D é gerida pelo PerformanceGovernor; o HUD é DOM e continua nítido
      dpr={dprFor('high')}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <ambientLight intensity={1.0} />
      <directionalLight position={[2, 5, 3]} intensity={1.4} />
      <PerformanceGovernor />
      <CameraRig />
      <GameDirector />
      <Targets />
      <Shooter />
      <Weapon />
      <Effects />
    </Canvas>
  );
}
