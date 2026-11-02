import { create } from 'zustand';
import type {
  ActiveEffects,
  CameraStatus,
  FloatingMessage,
  HitResult,
  Phase,
  PickupKind,
  SensorMode,
  TargetEntity,
  WaveDef,
  WaveStatus,
  WeaponId,
} from '../types';
import { WEAPONS, WEAPON_ORDER } from '../config/weapons';
import {
  AMMO_DURATION,
  BOMB_PENALTY,
  BOSS_ESCAPE_PENALTY,
  bossAttackInterval,
  DOUBLE_DURATION,
  escapePenalty,
  HEAL_AMOUNT,
  MAX_HEALTH,
  PICKUP_DROP_CHANCE,
  PICKUP_KINDS,
  PICKUP_MIN_INTERVAL,
  SLOW_DURATION,
  SLOW_TIME_SCALE,
  TARGETS,
} from '../config/targets';
import { makeWave, WAVE_COMPLETE_MS, WAVE_INTRO_MS } from '../config/waves';
import { runtime } from '../game/runtime';
import { gameRandom, spawnMinis, spawnPickup } from '../game/spawn';
import { targetPitch, targetYaw } from '../game/targetMotion';
import { t } from '../i18n';

const HIGHSCORE_KEY = 'ar-shooter:highscore';
const MESSAGE_TTL = 1600;

function loadHighScore(): number {
  try {
    return Number(localStorage.getItem(HIGHSCORE_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(v: number) {
  try {
    localStorage.setItem(HIGHSCORE_KEY, String(v));
  } catch {
    /* armazenamento indisponível */
  }
}

function fullAmmo(): Record<WeaponId, number> {
  return {
    pistol: WEAPONS.pistol.magazine,
    rifle: WEAPONS.rifle.magazine,
    shotgun: WEAPONS.shotgun.magazine,
    sniper: WEAPONS.sniper.magazine,
  };
}

const noEffects = (): ActiveEffects => ({ ammoUntil: 0, slowUntil: 0, doubleUntil: 0 });

let messageId = 0;
function msg(text: string, tone: FloatingMessage['tone'], at: number): FloatingMessage {
  messageId += 1;
  return { id: messageId, text, tone, at };
}

export interface GameState {
  phase: Phase;
  sensorMode: SensorMode;
  /** resultado do pedido de permissão de movimento (iOS pergunta; outros concedem) */
  motionPermission: 'unknown' | 'granted' | 'denied' | 'unsupported';
  cameraStatus: CameraStatus;
  cameraError: string | null;

  score: number;
  highScore: number;
  combo: number;
  bestCombo: number;
  health: number;
  kills: number;
  shots: number;
  hits: number;
  elapsed: number;

  wave: WaveDef;
  waveStatus: WaveStatus;
  /** tempo de jogo em que o estado da onda muda */
  waveStatusUntil: number;
  waveKills: number;
  waveSpawned: number;
  /** alvos desta onda já resolvidos (abatidos, explodidos ou bombas) */
  waveResolved: number;
  /** tempo de jogo do último dano sofrido (flash vermelho no HUD) */
  lastDamageAt: number;

  weaponId: WeaponId;
  ammo: Record<WeaponId, number>;
  reloading: boolean;
  /** tempo real (performance.now) */
  reloadEndsAt: number;
  lastShotAt: number;

  effects: ActiveEffects;
  lastPickupAt: number;

  targets: TargetEntity[];
  messages: FloatingMessage[];

  setSensorMode: (m: SensorMode) => void;
  setMotionPermission: (p: GameState['motionPermission']) => void;
  setCameraStatus: (s: CameraStatus, error?: string | null) => void;

  goToCalibration: () => void;
  startGame: () => void;
  pause: () => void;
  resume: () => void;
  endGame: () => void;
  returnToMenu: () => void;

  /** avança o jogo: `now` é tempo de jogo (ms), `dt` segundos reais, `realNow` performance.now() */
  tick: (now: number, dt: number, realNow: number) => void;
  addTarget: (t: TargetEntity) => void;
  damageTarget: (id: string, damage: number, now: number) => HitResult;
  fire: (realNow: number) => boolean;
  registerMiss: () => void;
  reload: (realNow: number) => boolean;
  selectWeapon: (id: WeaponId) => void;
  pushMessage: (text: string, tone?: FloatingMessage['tone']) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'menu',
  sensorMode: 'none',
  motionPermission: 'unknown',
  cameraStatus: 'idle',
  cameraError: null,

  score: 0,
  highScore: loadHighScore(),
  combo: 0,
  bestCombo: 0,
  health: MAX_HEALTH,
  kills: 0,
  shots: 0,
  hits: 0,
  elapsed: 0,

  wave: makeWave(1),
  waveStatus: 'intro',
  waveStatusUntil: 0,
  waveKills: 0,
  waveSpawned: 0,
  waveResolved: 0,
  lastDamageAt: 0,

  weaponId: 'pistol',
  ammo: fullAmmo(),
  reloading: false,
  reloadEndsAt: 0,
  lastShotAt: 0,

  effects: noEffects(),
  lastPickupAt: -Infinity,

  targets: [],
  messages: [],

  setSensorMode: (sensorMode) => set({ sensorMode }),
  setMotionPermission: (motionPermission) => set({ motionPermission }),
  setCameraStatus: (cameraStatus, error = null) => set({ cameraStatus, cameraError: error }),

  goToCalibration: () => set({ phase: 'calibrating' }),

  startGame: () => {
    runtime.elapsed = 0;
    runtime.gameTime = 0;
    runtime.timeScale = 1;
    set({
      phase: 'playing',
      score: 0,
      combo: 0,
      bestCombo: 0,
      health: MAX_HEALTH,
      kills: 0,
      shots: 0,
      hits: 0,
      elapsed: 0,
      wave: makeWave(1),
      waveStatus: 'intro',
      waveStatusUntil: WAVE_INTRO_MS,
      waveKills: 0,
      waveSpawned: 0,
      waveResolved: 0,
      lastDamageAt: 0,
      weaponId: 'pistol',
      ammo: fullAmmo(),
      reloading: false,
      reloadEndsAt: 0,
      lastShotAt: 0,
      effects: noEffects(),
      lastPickupAt: -Infinity,
      targets: [],
      messages: [],
    });
  },

  pause: () => {
    if (get().phase === 'playing') set({ phase: 'paused', elapsed: runtime.elapsed });
  },
  resume: () => {
    if (get().phase === 'paused') set({ phase: 'playing' });
  },

  endGame: () => {
    const { score, highScore } = get();
    const best = Math.max(score, highScore);
    if (best > highScore) saveHighScore(best);
    runtime.timeScale = 1;
    set({ phase: 'gameover', highScore: best, targets: [], elapsed: runtime.elapsed });
  },

  returnToMenu: () => set({ phase: 'menu', targets: [], messages: [] }),

  tick: (now, dt, realNow) => {
    const s = get();
    if (s.phase !== 'playing') return;

    // Só escreve no store quando algo muda de facto: cada set() faz o HUD
    // (React) voltar a renderizar, o que a 60 fps pesa muito no telemóvel.
    const patch: Partial<GameState> = {};
    let changed = false;

    runtime.elapsed += dt;
    if (Math.floor(runtime.elapsed) !== Math.floor(s.elapsed)) {
      patch.elapsed = runtime.elapsed;
      changed = true;
    }
    runtime.timeScale = s.effects.slowUntil > now ? SLOW_TIME_SCALE : 1;

    let health = s.health;
    let combo = s.combo;
    let messages = s.messages;
    let messagesChanged = false;
    const say = (text: string, tone: FloatingMessage['tone']) => {
      messages = [...messages, msg(text, tone, now)];
      messagesChanged = true;
    };
    if (messages.length && messages.some((m) => now - m.at >= MESSAGE_TTL)) {
      messages = messages.filter((m) => now - m.at < MESSAGE_TTL);
      messagesChanged = true;
    }

    let waveResolved = s.waveResolved;
    let targets = s.targets;
    let targetsChanged = false;

    // alvos cujo tempo acabou
    const escaped = targets.filter((e) => now - e.spawnedAt >= e.ttl);
    if (escaped.length) {
      targets = targets.filter((e) => now - e.spawnedAt < e.ttl);
      targetsChanged = true;
      for (const e of escaped) {
        const def = TARGETS[e.kind];
        if (def.category === 'pickup') continue; // cápsulas desaparecem sem consequências
        waveResolved += 1;
        if (def.category === 'enemy' || def.category === 'boss') {
          // o alvo não foi abatido a tempo: explode contra o jogador
          const penalty = def.category === 'boss' ? BOSS_ESCAPE_PENALTY : escapePenalty(s.wave.index);
          health -= penalty;
          combo = 0;
          patch.lastDamageAt = now;
          const pos = runtime.targetPositions.get(e.id);
          if (pos) runtime.events.push({ type: 'attack', position: pos.clone(), color: def.color });
          say(t('msg.exploded', { name: t(`target.${e.kind}`), n: penalty }), 'bad');
        }
      }
    }

    // ataques do chefe
    for (let i = 0; i < targets.length; i++) {
      const e = targets[i];
      const def = TARGETS[e.kind];
      if (!def.attack || e.nextAttackAt === undefined || now < e.nextAttackAt) continue;
      const level = Math.max(1, Math.floor(s.wave.index / 5));
      const damage = def.attack.damage + (level - 1) * 2;
      health -= damage;
      combo = 0;
      patch.lastDamageAt = now;
      const pos = runtime.targetPositions.get(e.id);
      if (pos) runtime.events.push({ type: 'bossAttack', position: pos.clone(), color: def.color });
      say(t('msg.bossAttack', { n: damage }), 'bad');
      if (!targetsChanged) targets = [...targets];
      targetsChanged = true;
      targets[i] = { ...e, nextAttackAt: now + bossAttackInterval(s.wave.index) };
    }

    if (targetsChanged) {
      patch.targets = targets;
      changed = true;
    }
    if (waveResolved !== s.waveResolved) {
      patch.waveResolved = waveResolved;
      changed = true;
    }

    if (s.reloading && realNow >= s.reloadEndsAt) {
      patch.reloading = false;
      patch.ammo = { ...s.ammo, [s.weaponId]: WEAPONS[s.weaponId].magazine };
      changed = true;
    }

    const hostilesAlive = targets.some((e) => TARGETS[e.kind].category !== 'pickup');
    if (s.waveStatus === 'intro' && now >= s.waveStatusUntil) {
      patch.waveStatus = 'active';
      changed = true;
    } else if (s.waveStatus === 'active' && s.waveSpawned >= s.wave.targetCount && !hostilesAlive) {
      // todos os alvos previstos nasceram e já nenhum está no ar: onda concluída
      patch.waveStatus = 'complete';
      patch.waveStatusUntil = now + WAVE_COMPLETE_MS;
      const bonus = (s.wave.boss ? 300 : 100) * s.wave.index;
      patch.score = s.score + bonus;
      say(t('msg.waveDone', { n: bonus }), 'good');
      changed = true;
    } else if (s.waveStatus === 'complete' && now >= s.waveStatusUntil) {
      const next = makeWave(s.wave.index + 1);
      patch.wave = next;
      patch.waveStatus = 'intro';
      patch.waveStatusUntil = now + WAVE_INTRO_MS;
      patch.waveKills = 0;
      patch.waveSpawned = 0;
      patch.waveResolved = 0;
      health = Math.min(MAX_HEALTH, Math.max(0, health) + 15);
      const newlyUnlocked = WEAPON_ORDER.find((id) => WEAPONS[id].unlockWave === next.index);
      if (newlyUnlocked) say(t('msg.newWeapon', { name: t(`weapon.${newlyUnlocked}`) }), 'good');
      changed = true;
    }

    health = Math.max(0, health);
    if (health !== s.health) {
      patch.health = health;
      changed = true;
    }
    if (combo !== s.combo) {
      patch.combo = combo;
      changed = true;
    }
    if (messagesChanged) {
      patch.messages = messages;
      changed = true;
    }
    if (changed) set(patch);

    if (health <= 0) get().endGame();
  },

  addTarget: (e) => set((s) => ({ targets: [...s.targets, e], waveSpawned: s.waveSpawned + 1 })),

  damageTarget: (id, damage, now) => {
    const s = get();
    const target = s.targets.find((e) => e.id === id);
    if (!target) return 'none';
    const def = TARGETS[target.kind];

    if (def.category === 'bomb') {
      const health = Math.max(0, s.health - BOMB_PENALTY);
      set({
        targets: s.targets.filter((e) => e.id !== id),
        health,
        lastDamageAt: now,
        waveResolved: s.waveResolved + 1,
        score: Math.max(0, s.score + def.score),
        combo: 0,
        hits: s.hits + 1,
        messages: [...s.messages, msg(t('msg.bomb', { score: def.score, n: BOMB_PENALTY }), 'bad', now)],
      });
      if (health <= 0) get().endGame();
      return 'bomb';
    }

    if (def.category === 'pickup') {
      const kind = target.kind as PickupKind;
      const effects = { ...s.effects };
      let health = s.health;
      let text = '';
      switch (kind) {
        case 'heal':
          health = Math.min(MAX_HEALTH, health + HEAL_AMOUNT);
          text = t('msg.heal', { n: HEAL_AMOUNT });
          break;
        case 'ammo':
          effects.ammoUntil = now + AMMO_DURATION;
          text = t('msg.ammo');
          break;
        case 'slow':
          effects.slowUntil = now + SLOW_DURATION;
          runtime.timeScale = SLOW_TIME_SCALE;
          text = t('msg.slow');
          break;
        case 'double':
          effects.doubleUntil = now + DOUBLE_DURATION;
          text = t('msg.double');
          break;
      }
      const pos = runtime.targetPositions.get(id);
      if (pos) runtime.events.push({ type: 'pickup', position: pos.clone(), color: def.color });
      set({
        targets: s.targets.filter((e) => e.id !== id),
        health,
        effects,
        hits: s.hits + 1,
        messages: [...s.messages, msg(text, 'good', now)],
      });
      return 'pickup';
    }

    const hp = target.hp - damage;
    if (hp > 0) {
      set({
        targets: s.targets.map((e) => (e.id === id ? { ...e, hp, lastHitAt: now } : e)),
        hits: s.hits + 1,
      });
      return 'hit';
    }

    // abate
    const combo = s.combo + 1;
    const multiplier = (1 + Math.min(4, Math.floor(combo / 5)) * 0.5) * (s.effects.doubleUntil > now ? 2 : 1);
    const gained = Math.round(def.score * multiplier);
    let targets = s.targets.filter((e) => e.id !== id);
    let waveSpawned = s.waveSpawned;
    let lastPickupAt = s.lastPickupAt;
    const messages = [...s.messages];

    if (def.onKill === 'split') {
      const minis = spawnMinis(target, now, 2, s.wave.speedScale);
      targets = [...targets, ...minis];
      waveSpawned += minis.length;
    }
    if (def.category === 'boss') {
      messages.push(msg(t('msg.bossDown', { n: gained }), 'good', now));
    } else {
      messages.push(msg(multiplier > 1 ? `+${gained}  x${multiplier}` : `+${gained}`, 'good', now));
    }
    // cápsula de power-up
    if ((def.category === 'enemy' || def.category === 'boss') && now - lastPickupAt >= PICKUP_MIN_INTERVAL && gameRandom.next() < PICKUP_DROP_CHANCE) {
      const kind = PICKUP_KINDS[Math.floor(gameRandom.next() * PICKUP_KINDS.length)];
      targets.push(spawnPickup(kind, targetYaw(target, now), targetPitch(target, now), target.distance, now));
      lastPickupAt = now;
    }

    set({
      targets,
      waveSpawned,
      lastPickupAt,
      score: s.score + gained,
      combo,
      bestCombo: Math.max(s.bestCombo, combo),
      kills: s.kills + 1,
      hits: s.hits + 1,
      waveKills: s.waveStatus === 'active' ? s.waveKills + 1 : s.waveKills,
      waveResolved: s.waveResolved + 1,
      messages,
    });
    return 'killed';
  },

  fire: (realNow) => {
    const s = get();
    if (s.phase !== 'playing' || s.reloading) return false;
    const def = WEAPONS[s.weaponId];
    if (realNow - s.lastShotAt < def.fireInterval) return false;
    if (s.ammo[s.weaponId] <= 0) return false;
    const infinite = s.effects.ammoUntil > runtime.gameTime;
    set({
      ammo: infinite ? s.ammo : { ...s.ammo, [s.weaponId]: s.ammo[s.weaponId] - 1 },
      lastShotAt: realNow,
      shots: s.shots + 1,
    });
    return true;
  },

  registerMiss: () => set((s) => (s.combo === 0 ? {} : { combo: 0 })),

  reload: (realNow) => {
    const s = get();
    if (s.phase !== 'playing' || s.reloading) return false;
    const def = WEAPONS[s.weaponId];
    if (s.ammo[s.weaponId] >= def.magazine) return false;
    set({ reloading: true, reloadEndsAt: realNow + def.reloadTime });
    return true;
  },

  selectWeapon: (id) => {
    const s = get();
    if (s.weaponId === id || s.reloading) return;
    if (WEAPONS[id].unlockWave > s.wave.index) return;
    set({ weaponId: id });
  },

  pushMessage: (text, tone = 'neutral') => set((s) => ({ messages: [...s.messages, msg(text, tone, runtime.gameTime)] })),
}));

export function unlockedWeapons(waveIndex: number): WeaponId[] {
  return WEAPON_ORDER.filter((id) => WEAPONS[id].unlockWave <= waveIndex);
}
