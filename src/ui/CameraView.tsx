import { useEffect, useRef } from 'react';
import { useGameStore } from '../state/gameStore';
import { getCameraStream, setCameraVideoElement } from '../sensors/camera';

/** Vídeo da câmera traseira em tela cheia, por baixo da cena 3D. */
export function CameraView() {
  const status = useGameStore((s) => s.cameraStatus);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setCameraVideoElement(video.current);
    return () => setCameraVideoElement(null);
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const stream = status === 'ready' ? getCameraStream() : null;
    if (v.srcObject !== stream) {
      v.srcObject = stream;
      if (stream) void v.play().catch(() => undefined);
    }
  }, [status]);

  return (
    <div className={`camera ${status === 'ready' ? 'camera--live' : ''}`}>
      <video ref={video} autoPlay muted playsInline className="camera__video" />
      {status !== 'ready' && <div className="camera__fallback" aria-hidden />}
    </div>
  );
}
