import { Euler, Quaternion, Vector3 } from 'three';
import type { SensorMode } from '../types';
import { yawOf } from '../game/runtime';
import { OpticalFlowTracker } from './opticalFlow';

type PermissionResult = 'granted' | 'denied' | 'unsupported';
/** origem das leituras de orientação */
export type OrientationSource = 'none' | 'sensor' | 'euler';

interface OrientationSensorLike extends EventTarget {
  quaternion: ArrayLike<number> | null;
  start(): void;
  stop(): void;
}
type OrientationSensorCtor = new (opts?: { frequency?: number; referenceFrame?: 'device' | 'screen' }) => OrientationSensorLike;

const DEG = Math.PI / 180;
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);
/** -PI/2 em torno de X: converte o referencial do dispositivo (ecrã para cima) para o da câmera (ecrã para trás) */
const Q_SCREEN = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

function screenAngle(): number {
  const so = (screen as Screen & { orientation?: ScreenOrientation }).orientation;
  if (so && typeof so.angle === 'number') return so.angle;
  const legacy = (window as Window & { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
}

/**
 * Converte a orientação do telemóvel em orientação de câmera e permite
 * "calibrar" para que a direção atual do telemóvel passe a ser a frente (-Z).
 *
 * Fontes, por ordem de preferência:
 * 1. `RelativeOrientationSensor` (Generic Sensor API): entrega o quaternion
 *    diretamente, sem passar por ângulos de Euler. Evita o tremor e os saltos
 *    que `deviceorientation` tem quando o telemóvel está na vertical
 *    (beta ≈ 90°, onde alpha e gamma ficam mal condicionados).
 * 2. `deviceorientation` (alpha/beta/gamma), para navegadores sem a API acima.
 *
 * Quando não há sensores (desktop), o modo "pointer" permite olhar em volta
 * arrastando o rato; o modo "camera" estima a rotação pela imagem e não aceita arrastar.
 */
export class OrientationController {
  mode: SensorMode = 'none';
  /** orientação final suavizada, consumida pela câmera */
  readonly quaternion = new Quaternion();
  /** de onde vêm as leituras atuais */
  source: OrientationSource = 'none';
  /** erro devolvido pelo RelativeOrientationSensor, se houver (diagnóstico) */
  sensorError: string | null = null;
  /** leituras recebidas do RelativeOrientationSensor (diagnóstico) */
  sensorReadings = 0;
  /** constante de suavização (1/s); maior = mais reativo, menor = mais filtrado */
  smoothing = 30;

  private readonly deviceQ = new Quaternion();
  private readonly offsetQ = new Quaternion();
  private readonly targetQ = new Quaternion();
  private readonly sensorQ = new Quaternion();
  private readonly euler = new Euler();
  private readonly screenQ = new Quaternion();
  private sensor: OrientationSensorLike | null = null;
  private lastSensorAt = 0;
  /** sem leituras do sensor durante este tempo (ms), com deviceorientation a chegar, volta aos ângulos de Euler */
  private static readonly SENSOR_STALL_MS = 1000;

  private alpha = 0;
  private beta = 0;
  private gamma = 0;
  private hasReading = false;
  private listening = false;

  pointerYaw = 0;
  pointerPitch = 0;
  /** rotação estimada pela imagem da câmera (modo 'camera') */
  readonly flow = new OpticalFlowTracker();
  /** chamado quando o modo muda sozinho (ex.: giroscópio só respondeu a meio do jogo) */
  onModeChange: ((mode: SensorMode) => void) | null = null;

  private readonly onOrientation = (e: DeviceOrientationEvent) => {
    if (this.source === 'sensor') {
      // o quaternion direto do sensor tem prioridade, a menos que tenha deixado de chegar
      if (performance.now() - this.lastSensorAt < OrientationController.SENSOR_STALL_MS) return;
      this.sensorError = 'sem leituras; a usar deviceorientation';
      this.releaseSensor();
    }
    // alguns Android sem bússola enviam alpha = null; beta/gamma chegam
    if (e.beta === null || e.gamma === null) return;
    this.alpha = e.alpha ?? 0;
    this.beta = e.beta;
    this.gamma = e.gamma;
    this.source = 'euler';
    this.hasReading = true;
  };

  private readonly onSensorReading = () => {
    const q = this.sensor?.quaternion;
    if (!q || q.length < 4 || Number.isNaN(q[0])) return;
    this.sensorQ.set(q[0], q[1], q[2], q[3]);
    this.sensorReadings += 1;
    this.lastSensorAt = performance.now();
    this.source = 'sensor';
    this.hasReading = true;
  };

  private readonly onSensorError = (ev: Event) => {
    const err = (ev as unknown as { error?: { name?: string; message?: string } }).error;
    this.sensorError = err ? `${err.name ?? 'erro'}${err.message ? `: ${err.message}` : ''}` : 'erro';
    this.releaseSensor();
    // volta a aceitar deviceorientation, se existir
    if (this.source === 'sensor') this.source = 'euler';
  };

  get ready(): boolean {
    return this.mode === 'pointer' || this.mode === 'camera' || (this.mode === 'gyro' && this.hasReading);
  }

  /** o giroscópio já entregou alguma leitura? */
  get gyroAvailable(): boolean {
    return this.hasReading;
  }

  /** ativa o modo câmera: a vista roda com a imagem do vídeo */
  enableCameraFlow(video: HTMLVideoElement) {
    this.flow.start(video);
    if (this.mode !== 'gyro') {
      this.mode = 'camera';
      this.onModeChange?.('camera');
    }
  }

  /** troca manual de modo (ecrã de pausa) */
  setMode(mode: SensorMode, video?: HTMLVideoElement | null) {
    if (mode === 'gyro') {
      if (!this.hasReading) return false;
      if (this.mode !== 'gyro') this.promoteToGyro();
      return true;
    }
    if (mode === 'camera') {
      if (!video) return false;
      this.flow.start(video);
    } else {
      this.flow.stop();
    }
    if (this.mode === 'gyro') {
      // manter a direção atual ao sair do giroscópio
      this.pointerYaw = yawOf(this.quaternion);
      const fwd = new Vector3(0, 0, -1).applyQuaternion(this.quaternion);
      this.pointerPitch = Math.asin(Math.max(-1, Math.min(1, fwd.y)));
    }
    this.mode = mode;
    this.onModeChange?.(mode);
    return true;
  }

  /** Deve ser chamado dentro de um gesto do utilizador (obrigatório no iOS). */
  async requestPermission(): Promise<PermissionResult> {
    if (typeof DeviceOrientationEvent === 'undefined') return 'unsupported';
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
    if (typeof DOE.requestPermission === 'function') {
      try {
        const r = await DOE.requestPermission();
        return r === 'granted' ? 'granted' : 'denied';
      } catch {
        return 'denied';
      }
    }
    return 'granted';
  }

  private startSensor() {
    const ctor = (window as unknown as { RelativeOrientationSensor?: OrientationSensorCtor }).RelativeOrientationSensor;
    if (typeof ctor !== 'function') {
      this.sensorError = 'API indisponível';
      return;
    }
    try {
      const s = new ctor({ frequency: 60, referenceFrame: 'device' });
      s.addEventListener('reading', this.onSensorReading);
      s.addEventListener('error', this.onSensorError);
      s.start();
      this.sensor = s;
      this.sensorError = null;
    } catch (e) {
      this.sensorError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      this.sensor = null;
    }
  }

  private releaseSensor() {
    const s = this.sensor;
    if (!s) return;
    this.sensor = null;
    s.removeEventListener('reading', this.onSensorReading);
    s.removeEventListener('error', this.onSensorError);
    try {
      s.stop();
    } catch {
      /* já parado */
    }
  }

  /**
   * Liga os sensores e espera por leituras. Se nada chegar no tempo limite
   * (desktop, permissão negada, HTTP sem TLS) cai para o modo pointer, mas
   * continua à escuta: se o sensor acordar mais tarde, troca sozinho para gyro.
   */
  async start(timeoutMs = 2500): Promise<SensorMode> {
    if (this.listening) return this.mode;
    this.hasReading = false;
    this.source = 'none';
    this.listening = true;
    this.startSensor();
    if (typeof DeviceOrientationEvent !== 'undefined') {
      window.addEventListener('deviceorientation', this.onOrientation, true);
    }
    if (this.sensor || typeof DeviceOrientationEvent !== 'undefined') {
      const ok = await new Promise<boolean>((resolve) => {
        const started = performance.now();
        const check = () => {
          if (this.hasReading) return resolve(true);
          if (performance.now() - started > timeoutMs) return resolve(false);
          setTimeout(check, 50);
        };
        check();
      });
      if (ok) {
        this.mode = 'gyro';
        return this.mode;
      }
    }
    this.mode = 'pointer';
    return this.mode;
  }

  /** troca de pointer para gyro mantendo a direção que o jogador está a ver */
  private promoteToGyro() {
    this.computeDeviceQuaternion(this.deviceQ);
    const deviceYaw = yawOf(this.deviceQ);
    this.offsetQ.setFromAxisAngle(Y_AXIS, this.pointerYaw - deviceYaw);
    this.mode = 'gyro';
    this.onModeChange?.('gyro');
  }

  private clampPitch() {
    const lim = Math.PI / 2 - 0.05;
    this.pointerPitch = Math.max(-lim, Math.min(lim, this.pointerPitch));
  }

  stop() {
    if (this.listening) {
      window.removeEventListener('deviceorientation', this.onOrientation, true);
      this.listening = false;
    }
    this.releaseSensor();
    this.flow.stop();
    this.mode = 'none';
  }

  private computeDeviceQuaternion(out: Quaternion) {
    if (this.source === 'sensor') {
      // o sensor dá a rotação dispositivo→mundo (X este, Y norte, Z cima);
      // Q_SCREEN leva para o referencial do three (Y cima, -Z frente)
      out.copy(Q_SCREEN).multiply(this.sensorQ);
    } else {
      // ordem YXZ: alpha em Y (Z do dispositivo), beta em X, -gamma em Z
      this.euler.set(this.beta * DEG, this.alpha * DEG, -this.gamma * DEG, 'YXZ');
      out.setFromEuler(this.euler);
      out.multiply(Q_SCREEN);
    }
    out.multiply(this.screenQ.setFromAxisAngle(Z_AXIS, -screenAngle() * DEG));
  }

  /** torna a direção atual a nova "frente" do jogo */
  calibrate() {
    if (this.mode === 'gyro') {
      this.computeDeviceQuaternion(this.deviceQ);
      const yaw = yawOf(this.deviceQ);
      this.offsetQ.setFromAxisAngle(Y_AXIS, -yaw);
      this.targetQ.copy(this.offsetQ).multiply(this.deviceQ);
      this.quaternion.copy(this.targetQ);
    } else {
      this.pointerYaw = 0;
      this.pointerPitch = 0;
      this.flow.consume();
      this.euler.set(0, 0, 0, 'YXZ');
      this.quaternion.setFromEuler(this.euler);
    }
  }

  /** arrastar no modo pointer (deltas em pixels). No modo câmera só a imagem move a vista. */
  drag(dx: number, dy: number, sensitivity = 0.0045) {
    if (this.mode !== 'pointer') return;
    this.pointerYaw -= dx * sensitivity;
    this.pointerPitch -= dy * sensitivity;
    this.clampPitch();
  }

  /** chamada a cada frame; dt em segundos */
  update(dt: number) {
    if ((this.mode === 'pointer' || this.mode === 'camera') && this.hasReading) {
      this.flow.stop();
      this.promoteToGyro();
    }
    if (this.mode === 'camera') {
      this.flow.update();
      const d = this.flow.consume();
      this.pointerYaw += d.yaw;
      this.pointerPitch += d.pitch;
      this.clampPitch();
    }
    if (this.mode === 'gyro') {
      if (!this.hasReading) return;
      this.computeDeviceQuaternion(this.deviceQ);
      this.targetQ.copy(this.offsetQ).multiply(this.deviceQ);
      // suavização curta: elimina tremor sem introduzir atraso perceptível
      const k = 1 - Math.exp(-dt * this.smoothing);
      this.quaternion.slerp(this.targetQ, k);
    } else if (this.mode === 'pointer' || this.mode === 'camera') {
      this.euler.set(this.pointerPitch, this.pointerYaw, 0, 'YXZ');
      this.targetQ.setFromEuler(this.euler);
      const k = 1 - Math.exp(-dt * 20);
      this.quaternion.slerp(this.targetQ, k);
    }
  }
}

export const orientation = new OrientationController();
