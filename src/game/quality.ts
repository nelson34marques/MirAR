import type { QualityLevel } from '../types';

export interface QualityPreset {
  /** limite de devicePixelRatio no telemóvel */
  dprMobile: number;
  /** limite de devicePixelRatio no desktop */
  dprDesktop: number;
  /** partículas em simultâneo */
  particles: number;
}

export const QUALITY: Record<QualityLevel, QualityPreset> = {
  high: { dprMobile: 1.25, dprDesktop: 2, particles: 400 },
  medium: { dprMobile: 1, dprDesktop: 1.5, particles: 220 },
  low: { dprMobile: 0.75, dprDesktop: 1, particles: 120 },
};

export const QUALITY_ORDER: QualityLevel[] = ['low', 'medium', 'high'];

export const isTouchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

/** devicePixelRatio efetivo para um nível de qualidade */
export function dprFor(level: QualityLevel): number {
  const preset = QUALITY[level];
  const device = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return Math.min(device, isTouchDevice ? preset.dprMobile : preset.dprDesktop);
}

/** limiares do ajuste automático */
export const AUTO_FPS_LOW = 42;
export const AUTO_FPS_HIGH = 57;
export const AUTO_STEP_UP_COOLDOWN_MS = 15000;
