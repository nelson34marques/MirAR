import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../diag/errors';
import { t } from '../i18n';

interface State {
  error: Error | null;
}

/** Apanha erros de render e mostra um ecrã simples em vez de uma página branca. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(new Error(`${error.message}\n${info.componentStack ?? ''}`), 'react');
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen screen--error">
        <div className="panel">
          <h2>{t('error.title')}</h2>
          <p className="panel__sub">{t('error.text')}</p>
          <pre className="error__detail">{this.state.error.message}</pre>
          <button className="btn btn--primary" onClick={() => location.reload()}>
            {t('error.reload')}
          </button>
        </div>
      </div>
    );
  }
}
