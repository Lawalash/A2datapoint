import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Atualiza o state para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-2xl shadow-sm border border-[#E5E5E5] m-4 lg:m-8">
          <AlertTriangle className="w-16 h-16 text-[#DC3545] mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Ops, algo deu errado!</h2>
          <p className="text-[#666666] mb-6 max-w-md">
            Ocorreu uma falha ao carregar esta área. Recarregue a página. Se o problema persistir, acione o suporte.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-[#003D5C] text-white px-6 py-3 rounded-xl font-semibold transition-all hover:bg-[#002B42] shadow-md"
          >
            <RefreshCw className="w-5 h-5" />
            Recarregar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
