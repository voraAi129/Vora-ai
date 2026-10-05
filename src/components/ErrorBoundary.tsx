import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[VORA EARNING ErrorBoundary] Uncaught render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 w-full min-h-full flex flex-col items-center justify-center p-6 bg-[#07090e] text-white text-center space-y-4 select-none">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-950/30 animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {this.props.fallbackTitle || 'Display Recovery Mode'}
            </h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              A temporary display error was safely contained. Your wallet ledger, account balance, and session data remain 100% secure.
            </p>
          </div>

          {this.state.error && (
            <div className="w-full max-w-xs p-3 rounded-xl bg-slate-950 border border-slate-800 text-left font-mono text-[11px] text-rose-300 max-h-24 overflow-y-auto">
              <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">Diagnostic Signal:</span>
              {this.state.error.message || 'Unknown runtime exception'}
            </div>
          )}

          <div className="flex space-x-2 pt-2 w-full max-w-xs">
            <button
              onClick={this.handleGoHome}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95"
            >
              <Home className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset View</span>
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
