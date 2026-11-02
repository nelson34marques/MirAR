/**
 * Recolhe, desde o arranque da página, o que o navegador entrega em matéria
 * de sensores. Serve para perceber porque é que um telemóvel não entra em
 * modo giroscópio.
 */
export interface SensorDiagnostics {
  secureContext: boolean;
  userAgent: string;
  hasDeviceOrientationEvent: boolean;
  needsPermission: boolean;
  orientationEvents: number;
  orientationLast: { alpha: number | null; beta: number | null; gamma: number | null; absolute: boolean } | null;
  absoluteEvents: number;
  motionEvents: number;
  motionHasRotationRate: boolean;
  motionHasGravity: boolean;
  permissions: Record<string, string>;
}

export const diagnostics: SensorDiagnostics = {
  secureContext: typeof window !== 'undefined' && window.isSecureContext,
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  hasDeviceOrientationEvent: typeof DeviceOrientationEvent !== 'undefined',
  needsPermission:
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function',
  orientationEvents: 0,
  orientationLast: null,
  absoluteEvents: 0,
  motionEvents: 0,
  motionHasRotationRate: false,
  motionHasGravity: false,
  permissions: {},
};

let started = false;

export function startDiagnostics() {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener(
    'deviceorientation',
    (e) => {
      diagnostics.orientationEvents += 1;
      diagnostics.orientationLast = { alpha: e.alpha, beta: e.beta, gamma: e.gamma, absolute: e.absolute };
    },
    true,
  );
  window.addEventListener('deviceorientationabsolute', () => {
    diagnostics.absoluteEvents += 1;
  });
  window.addEventListener('devicemotion', (e) => {
    diagnostics.motionEvents += 1;
    const rr = e.rotationRate;
    if (rr && (rr.alpha !== null || rr.beta !== null || rr.gamma !== null)) diagnostics.motionHasRotationRate = true;
    const g = e.accelerationIncludingGravity;
    if (g && (g.x !== null || g.y !== null || g.z !== null)) diagnostics.motionHasGravity = true;
  });

  const names = ['accelerometer', 'gyroscope', 'magnetometer', 'camera'];
  for (const name of names) {
    try {
      navigator.permissions
        ?.query({ name: name as PermissionName })
        .then((st) => {
          diagnostics.permissions[name] = st.state;
          st.onchange = () => {
            diagnostics.permissions[name] = st.state;
          };
        })
        .catch(() => {
          diagnostics.permissions[name] = 'n/a';
        });
    } catch {
      diagnostics.permissions[name] = 'n/a';
    }
  }
}
