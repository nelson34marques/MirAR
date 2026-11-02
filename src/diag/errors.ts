/**
 * Registo de erros em produção: guarda os últimos erros no localStorage (para
 * aparecerem no painel de diagnóstico mesmo depois de recarregar) e, se estiver
 * definido `VITE_ERROR_ENDPOINT`, envia-os para esse URL com sendBeacon.
 */
export interface ErrorEntry {
  at: string;
  source: 'error' | 'unhandledrejection' | 'react' | 'manual';
  message: string;
  stack?: string;
}

const KEY = 'ar-shooter:errors';
const MAX = 20;

function load(): ErrorEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ErrorEntry[]) : [];
  } catch {
    return [];
  }
}

export const errorLog: ErrorEntry[] = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(errorLog.slice(-10)));
  } catch {
    /* sem armazenamento */
  }
}

function endpoint(): string | undefined {
  try {
    return (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ERROR_ENDPOINT;
  } catch {
    return undefined;
  }
}

export function reportError(err: unknown, source: ErrorEntry['source'] = 'manual') {
  const entry: ErrorEntry = {
    at: new Date().toISOString(),
    source,
    message: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  };
  errorLog.push(entry);
  if (errorLog.length > MAX) errorLog.splice(0, errorLog.length - MAX);
  persist();

  const url = endpoint();
  if (url && typeof navigator !== 'undefined') {
    try {
      const body = JSON.stringify({ ...entry, url: location.href, ua: navigator.userAgent });
      if (!navigator.sendBeacon?.(url, body)) {
        void fetch(url, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => undefined);
      }
    } catch {
      /* não deixar o relato de erros causar outro erro */
    }
  }
}

export function clearErrors() {
  errorLog.length = 0;
  persist();
}

let installed = false;
export function installErrorReporting() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'error'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'unhandledrejection'));
}
