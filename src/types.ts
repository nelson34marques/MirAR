export type WeaponId = 'pistol' | 'rifle' | 'shotgun' | 'sniper';
export type TargetKind =
  | 'balloon'
  | 'drone'
  | 'armored'
  | 'splitter'
  | 'mini'
  | 'ghost'
  | 'bonus'
  | 'bomb'
  | 'boss'
  | 'heal'
  | 'ammo'
  | 'slow'
  | 'double';
export type PickupKind = 'heal' | 'ammo' | 'slow' | 'double';
export type TargetCategory = 'enemy' | 'bonus' | 'bomb' | 'boss' | 'pickup';
export type Phase = 'menu' | 'calibrating' | 'playing' | 'paused' | 'gameover';
export type WaveStatus = 'intro' | 'active' | 'complete';
export type SensorMode = 'gyro' | 'camera' | 'pointer' | 'none';
export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'error';
export type Lang = 'pt' | 'en';
export type Quality = 'auto' | 'high' | 'medium' | 'low';
export type QualityLevel = 'high' | 'medium' | 'low';

export interface WeaponDef {
  id: WeaponId;
  /** dispara continuamente enquanto o botão estiver pressionado */
  auto: boolean;
  magazine: number;
  damage: number;
  /** intervalo mínimo entre disparos (ms) */
  fireInterval: number;
  reloadTime: number;
  pellets: number;
  /** dispersão em radianos */
  spread: number;
  recoil: number;
  /** multiplicador de zoom (1 = sem zoom) */
  zoom: number;
  /** multiplicador do raio de acerto dos alvos (ajuda de mira) */
  aimAssist: number;
  /** onda em que a arma é desbloqueada */
  unlockWave: number;
  color: string;
}

export interface TargetDef {
  kind: TargetKind;
  category: TargetCategory;
  hp: number;
  score: number;
  size: number;
  /** raio da esfera de acerto (unidades do mundo); maior que o modelo = mira tolerante */
  hitRadius: number;
  ttl: number;
  yawSpeed: number;
  pitchAmp: number;
  color: string;
  /** ao morrer, divide-se em alvos pequenos */
  onKill?: 'split';
  /** alterna entre visível e invisível (ms); só pode ser atingido quando visível */
  blink?: { on: number; off: number };
  /** chefe: intervalo entre ataques ao jogador (ms) e dano por ataque */
  attack?: { interval: number; damage: number };
}

export interface TargetEntity {
  id: string;
  kind: TargetKind;
  hp: number;
  maxHp: number;
  /** tempo de jogo (ms) em que nasceu */
  spawnedAt: number;
  ttl: number;
  lastHitAt?: number;
  yaw: number;
  pitch: number;
  distance: number;
  yawSpeed: number;
  pitchAmp: number;
  pitchFreq: number;
  phase: number;
  /** chefe: tempo de jogo do próximo ataque */
  nextAttackAt?: number;
}

export interface WaveDef {
  index: number;
  label: string;
  objective: string;
  targetCount: number;
  spawnInterval: number;
  maxAlive: number;
  /** abertura máxima (rad) em relação à direção atual do jogador */
  yawRange: number;
  pitchRange: number;
  /** multiplicador de velocidade dos alvos */
  speedScale: number;
  /** onda de chefe: o primeiro alvo é o chefe */
  boss: boolean;
  weights: Record<TargetKind, number>;
}

export interface FloatingMessage {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  at: number;
}

/** efeitos temporários apanhados (tempo de jogo em que terminam) */
export interface ActiveEffects {
  ammoUntil: number;
  slowUntil: number;
  doubleUntil: number;
}

export type HitResult = 'hit' | 'killed' | 'bomb' | 'pickup' | 'none';
