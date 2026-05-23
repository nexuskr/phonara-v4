import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-void)' }}>
          <div className="text-center p-8 max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-black text-[#FF6B35] mb-3">오류가 발생했습니다</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              예상치 못한 오류가 발생했습니다. 페이지를 새로고침해주세요.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="btn-primary px-6 py-3 text-sm">
              새로고침
            </button>
            <details className="mt-4 text-left">
              <summary className="text-xs text-[var(--text-muted)] cursor-pointer">오류 상세</summary>
              <pre className="mt-2 text-xs text-[#FF6B35] bg-[rgba(0,0,0,0.3)] p-3 rounded-lg overflow-auto max-h-40">
                {this.state.error?.message}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
