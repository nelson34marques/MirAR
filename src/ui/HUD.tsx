import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useGameStore, unlockedWeapons } from '../state/gameStore';
import { WEAPONS, WEAPON_ORDER } from '../config/weapons';
import { AMMO_DURATION, DOUBLE_DURATION, MAX_HEALTH, SLOW_DURATION } from '../config/targets';
import { runtime } from '../game/runtime';
import { sfx } from '../audio/sfx';
import { formatNumber, useT } from '../i18n';
import { Radar } from './Radar';
import { Crosshair } from './Crosshair';

/** volta a renderizar periodicamente enquanto houver efeitos ativos (contagem decrescente) */
function useEffectsClock() {
  const effects = useGameStore((s) => s.effects);
  const [, force] = useState(0);
  const now = runtime.gameTime;
  const anyActive = effects.ammoUntil > now || effects.slowUntil > now || effects.doubleUntil > now;
  useEffect(() => {
    if (!anyActive) return;
    const id = setInterval(() => force((n) => n + 1), 200);
    return () => clearInterval(id);
  }, [anyActive, effects]);
  return effects;
}

export function HUD() {
  const t = useT();
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const health = useGameStore((s) => s.health);
  const wave = useGameStore((s) => s.wave);
  const waveStatus = useGameStore((s) => s.waveStatus);
  const waveResolved = useGameStore((s) => s.waveResolved);
  const lastDamageAt = useGameStore((s) => s.lastDamageAt);
  const weaponId = useGameStore((s) => s.weaponId);
  const ammo = useGameStore((s) => s.ammo[s.weaponId]);
  const reloading = useGameStore((s) => s.reloading);
  const messages = useGameStore((s) => s.messages);
  const boss = useGameStore((s) => s.targets.find((e) => e.kind === 'boss'));
  const pause = useGameStore((s) => s.pause);
  const selectWeapon = useGameStore((s) => s.selectWeapon);
  const effects = useEffectsClock();
  const weapon = WEAPONS[weaponId];
  const unlocked = unlockedWeapons(wave.index);
  const now = runtime.gameTime;
  const infiniteAmmo = effects.ammoUntil > now;

  const lowHealthPulse = health <= 30;
  const progress = Math.min(100, (waveResolved / wave.targetCount) * 100);

  return (
    <div className="hud">
      <Crosshair />
      <ReloadRing />
      {lastDamageAt > 0 && <div key={lastDamageAt} className="hud__damage" aria-hidden />}
      {effects.slowUntil > now && <div className="hud__slowmo" aria-hidden />}

      <div className="hud__top">
        <div className="hud__score hud__card">
          <div className="hud__label">{t('hud.points')}</div>
          <div className="hud__value">{formatNumber(score)}</div>
          {combo >= 3 && <div className="hud__combo">{t('hud.combo', { n: combo })}</div>}
        </div>

        <div className="hud__wave hud__card">
          <div className="hud__label">{wave.label}</div>
          <div className="hud__progress">
            <div className="hud__progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="hud__objective">{t('hud.targets', { a: Math.min(waveResolved, wave.targetCount), b: wave.targetCount })}</div>
        </div>

        <Radar />
      </div>

      <div className={`hud__health ${lowHealthPulse ? 'hud__health--low' : ''}`}>
        <div className="hud__health-bar" style={{ width: `${(health / MAX_HEALTH) * 100}%` }} />
      </div>

      {boss && (
        <div className="hud__boss">
          <span className="hud__boss-label">{t('hud.boss')}</span>
          <div className="hud__boss-bar">
            <div className="hud__boss-fill" style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} />
          </div>
          <span className="hud__boss-hp">
            {boss.hp}/{boss.maxHp}
          </span>
        </div>
      )}

      <button className="hud__pause" onClick={() => { sfx.click(); pause(); }} aria-label={t('hud.pause')}>
        ❚❚
      </button>

      {waveStatus !== 'active' && (
        <div className={`hud__banner ${waveStatus === 'complete' ? 'hud__banner--done' : ''} ${wave.boss && waveStatus === 'intro' ? 'hud__banner--boss' : ''}`}>
          <div className="hud__banner-title">{waveStatus === 'complete' ? t('hud.waveDone') : wave.label}</div>
          <div className="hud__banner-sub">{waveStatus === 'complete' ? t('hud.nextWave') : wave.objective}</div>
        </div>
      )}

      <div className="hud__messages">
        {messages.map((m) => (
          <div key={m.id} className={`hud__msg hud__msg--${m.tone}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="hud__effects">
        {effects.ammoUntil > now && <EffectChip label={t('effect.ammo')} icon="∞" remaining={(effects.ammoUntil - now) / AMMO_DURATION} tone="ammo" />}
        {effects.slowUntil > now && <EffectChip label={t('effect.slow')} icon="◔" remaining={(effects.slowUntil - now) / SLOW_DURATION} tone="slow" />}
        {effects.doubleUntil > now && <EffectChip label={t('effect.double')} icon="×2" remaining={(effects.doubleUntil - now) / DOUBLE_DURATION} tone="double" />}
      </div>

      <div className="hud__bottom">
        <div className="hud__weapons">
          {WEAPON_ORDER.map((id) => {
            const def = WEAPONS[id];
            const locked = !unlocked.includes(id);
            const name = t(`weapon.${id}`);
            return (
              <button
                key={id}
                className={`hud__weapon ${id === weaponId ? 'hud__weapon--active' : ''} ${locked ? 'hud__weapon--locked' : ''}`}
                style={{ '--accent': def.color } as CSSProperties}
                disabled={locked}
                onClick={() => {
                  sfx.click();
                  selectWeapon(id);
                }}
                aria-label={locked ? `${name} (${t('hud.unlock', { n: def.unlockWave })})` : name}
              >
                <span className="hud__weapon-name">{name}</span>
                <span className="hud__weapon-sub">{locked ? t('hud.unlock', { n: def.unlockWave }) : `${def.magazine} • ${def.auto ? t('hud.auto') : t('hud.semi')}`}</span>
              </button>
            );
          })}
        </div>

        <div className="hud__controls">
          <div className={`hud__ammo ${ammo === 0 && !infiniteAmmo ? 'hud__ammo--empty' : ''} ${infiniteAmmo ? 'hud__ammo--infinite' : ''}`}>
            <span className="hud__ammo-count">{reloading ? '…' : infiniteAmmo ? t('hud.infinite') : ammo}</span>
            <span className="hud__ammo-max">/ {weapon.magazine}</span>
            <span className="hud__ammo-name">{t(`weapon.${weaponId}`)}</span>
          </div>
          <button
            className="hud__reload"
            onClick={() => {
              runtime.reloadRequest = true;
            }}
            disabled={reloading || ammo === weapon.magazine}
            aria-label={t('hud.reload')}
          >
            ⟳
          </button>
          <FireButton label={weapon.auto ? t('hud.hold') : t('hud.fire')} />
        </div>
      </div>
    </div>
  );
}

function EffectChip({ label, icon, remaining, tone }: { label: string; icon: string; remaining: number; tone: string }) {
  return (
    <div className={`chip chip--${tone}`} style={{ '--p': Math.max(0, Math.min(1, remaining)) } as CSSProperties}>
      <span className="chip__icon">{icon}</span>
      <span className="chip__label">{label}</span>
      <span className="chip__bar" />
    </div>
  );
}

function FireButton({ label }: { label: string }) {
  const held = useRef(false);
  const down = (e: ReactPointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    held.current = true;
    runtime.fireTap = true;
    runtime.fireHeld = true;
  };
  const up = () => {
    held.current = false;
    runtime.fireHeld = false;
  };
  return (
    <button
      className="hud__fire"
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={up}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={label}
    >
      <span className="hud__fire-ring" />
      <span className="hud__fire-label">{label}</span>
    </button>
  );
}

/** anel de progresso da recarga em torno da mira */
function ReloadRing() {
  const ref = useRef<SVGCircleElement>(null);
  const reloading = useGameStore((s) => s.reloading);
  useEffect(() => {
    if (!reloading) return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const { reloadEndsAt, weaponId } = useGameStore.getState();
      const total = WEAPONS[weaponId].reloadTime;
      const frac = 1 - Math.max(0, reloadEndsAt - performance.now()) / total;
      if (ref.current) ref.current.style.strokeDashoffset = String(176 * (1 - frac));
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [reloading]);
  if (!reloading) return null;
  return (
    <svg className="reload-ring" viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="28" className="reload-ring__bg" />
      <circle ref={ref} cx="32" cy="32" r="28" className="reload-ring__fg" strokeDasharray="176" strokeDashoffset="176" />
    </svg>
  );
}
