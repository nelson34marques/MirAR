import { useGameStore } from '../state/gameStore';

let stream: MediaStream | null = null;
let pending: Promise<MediaStream | null> | null = null;
let videoElement: HTMLVideoElement | null = null;

/** o <video> que mostra a câmera; usado pelo fluxo ótico */
export function setCameraVideoElement(v: HTMLVideoElement | null) {
  videoElement = v;
}
export function getCameraVideoElement(): HTMLVideoElement | null {
  return videoElement;
}

export function getCameraStream(): MediaStream | null {
  return stream;
}

/**
 * Pede acesso à câmera traseira. Idempotente: várias chamadas partilham o
 * mesmo stream. Em caso de falha o jogo continua com fundo escuro.
 */
export function startCamera(): Promise<MediaStream | null> {
  if (stream) return Promise.resolve(stream);
  if (pending) return pending;

  const store = useGameStore.getState();
  if (!navigator.mediaDevices?.getUserMedia) {
    store.setCameraStatus('error', 'Este navegador não suporta acesso à câmera.');
    return Promise.resolve(null);
  }

  store.setCameraStatus('requesting');
  pending = navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    })
    .then((s) => {
      stream = s;
      useGameStore.getState().setCameraStatus('ready');
      s.getVideoTracks()[0]?.addEventListener('ended', () => {
        stream = null;
        useGameStore.getState().setCameraStatus('error', 'A câmera foi desligada.');
      });
      return s;
    })
    .catch((err: unknown) => {
      const name = err instanceof Error ? err.name : '';
      const message =
        name === 'NotAllowedError'
          ? 'Permissão da câmera negada. Permite o acesso nas definições do navegador.'
          : name === 'NotFoundError'
            ? 'Nenhuma câmera encontrada.'
            : window.isSecureContext
              ? 'Não foi possível abrir a câmera.'
              : 'A câmera só funciona em HTTPS (ou localhost).';
      useGameStore.getState().setCameraStatus('error', message);
      return null;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function stopCamera() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  useGameStore.getState().setCameraStatus('idle');
}
