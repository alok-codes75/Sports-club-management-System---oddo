import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { FirestoreErrorInfo } from '@/src/services/firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  firestoreDetails: FirestoreErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      firestoreDetails: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let parsed: FirestoreErrorInfo | null = null;
    try {
      const candidate = JSON.parse(error.message) as FirestoreErrorInfo;
      if (candidate && typeof candidate === 'object' && 'operationType' in candidate) {
        parsed = candidate;
      }
    } catch {
      parsed = null;
    }

    return {
      hasError: true,
      message: parsed ? parsed.error : error.message || 'An unexpected error occurred.',
      firestoreDetails: parsed,
    };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '', firestoreDetails: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-8">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Database Access Interrupted
              </h1>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {this.state.message}
            </p>
            {this.state.firestoreDetails && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-xs font-mono text-slate-700 space-y-1">
                <div>Operation: {this.state.firestoreDetails.operationType}</div>
                <div>Path: {this.state.firestoreDetails.path ?? 'unknown'}</div>
                <div>Account: {this.state.firestoreDetails.authInfo.email ?? 'unauthenticated'}</div>
              </div>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
