import { useEffect, useState } from 'react';
import { diagnostics } from '../sensors/diagnostics';
import { orientation } from '../sensors/orientation';
import { useGameStore } from '../state/gameStore';
import { runtime } from '../game/runtime';
import { clearErrors, errorLog } from '../diag/errors';
import { useT } from '../i18n';

const fmt = (v: number | null) => (v === null ? 'null' : v.toFixed(1));

/** Painel com o estado dos sensores, desempenho e erros, para despistar problemas no telemóvel. */
export function DiagnosticsPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [, tick] = useState(0);
  const sensorMode = useGameStore((s) => s.sensorMode);
  const cameraStatus = useGameStore((s) => s.cameraStatus);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  const d = diagnostics;
  const flow = orientation.flow;
  const rows: [string, string][] = [
    ['Modo de controlo', sensorMode],
    [
      'Fonte da orientação',
      orientation.source === 'sensor'
        ? `RelativeOrientationSensor (${orientation.sensorReadings} leituras)`
        : orientation.source === 'euler'
          ? 'deviceorientation (alpha/beta/gamma)'
          : `nenhuma${orientation.sensorError ? ` — sensor: ${orientation.sensorError}` : ''}`,
    ],
    ['Desempenho', `${Math.round(runtime.fps)} fps · qualidade ${runtime.qualityLevel} · ${runtime.particleCap} partículas`],
    ['Contexto seguro (HTTPS)', d.secureContext ? 'sim' : 'NÃO'],
    ['Câmera', cameraStatus],
    ['DeviceOrientationEvent', d.hasDeviceOrientationEvent ? 'existe' : 'não existe'],
    ['Pede permissão (iOS)', d.needsPermission ? 'sim' : 'não'],
    ['Eventos deviceorientation', String(d.orientationEvents)],
    [
      'Última leitura',
      d.orientationLast
        ? `α ${fmt(d.orientationLast.alpha)}  β ${fmt(d.orientationLast.beta)}  γ ${fmt(d.orientationLast.gamma)}  abs=${d.orientationLast.absolute}`
        : 'nenhuma',
    ],
    ['Eventos deviceorientationabsolute', String(d.absoluteEvents)],
    ['Eventos devicemotion', String(d.motionEvents)],
    ['Giroscópio (rotationRate)', d.motionHasRotationRate ? 'sim' : 'não'],
    ['Acelerómetro (gravidade)', d.motionHasGravity ? 'sim' : 'não'],
    ['Permissões', Object.entries(d.permissions).map(([k, v]) => `${k}: ${v}`).join(', ') || '…'],
    [
      'Fluxo ótico (câmera)',
      flow.active
        ? `ativo — frames ${flow.frames}, aceites ${flow.accepted}, rejeitados ${flow.rejected}, último dx ${flow.lastShift.dx.toFixed(2)} dy ${flow.lastShift.dy.toFixed(2)}, ${flow.lastCostMs.toFixed(1)} ms/frame`
        : 'inativo',
    ],
    ['Navegador', d.userAgent],
  ];

  return (
    <div className="screen screen--diag" onClick={(e) => e.stopPropagation()}>
      <div className="panel panel--wide">
        <h2>{t('menu.diag')}</h2>
        <dl className="diag">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          <div>
            <dt>Erros ({errorLog.length})</dt>
            <dd>
              {errorLog.length === 0
                ? 'nenhum'
                : errorLog
                    .slice(-5)
                    .reverse()
                    .map((e) => `${e.at.slice(11, 19)} [${e.source}] ${e.message}`)
                    .join('\n')}
            </dd>
          </div>
        </dl>
        <div className="panel__row">
          {errorLog.length > 0 && (
            <button className="btn btn--ghost" onClick={() => { clearErrors(); tick((n) => n + 1); }}>
              Limpar erros
            </button>
          )}
          <button className="btn btn--primary" onClick={onClose}>
            {t('set.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
