import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

/**
 * GlobalErrorBoundary — captura dois tipos de falha:
 *
 * 1. ChunkLoadError: o Service Worker serve o index.html do cache antigo,
 *    que referencia chunks JS com hashes que já não existem após um novo
 *    deploy. O dynamic import() rejeita → React.lazy() lança um erro →
 *    sem boundary, toda a árvore vira tela branca.
 *    Solução: detectar o erro e chamar window.location.reload() uma vez,
 *    forçando o browser a buscar o conteúdo novo da rede.
 *
 * 2. Qualquer outro erro de render: exibe uma tela de fallback simples
 *    em vez de tela completamente em branco.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  private reloadAttempted = false;

  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    const msg = error?.message ?? '';
    const name = error?.name ?? '';

    const isChunkError =
      name === 'ChunkLoadError' ||
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Loading CSS chunk') ||
      msg.includes('Importing a module script failed');

    return { hasError: true, isChunkError };
  }

  componentDidCatch(error: Error) {
    const msg = error?.message ?? '';
    const name = error?.name ?? '';

    const isChunkError =
      name === 'ChunkLoadError' ||
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Loading CSS chunk') ||
      msg.includes('Importing a module script failed');

    if (isChunkError && !this.reloadAttempted) {
      this.reloadAttempted = true;
      // Recarrega a página para buscar os novos assets do servidor.
      // O flag evita loop infinito caso o reload não resolva.
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError && !this.state.isChunkError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="text-center space-y-4 max-w-sm">
            <p className="text-2xl">⚠️</p>
            <h1 className="text-lg font-semibold text-foreground">
              Algo deu errado
            </h1>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    // Se for chunk error, está recarregando — mostra tela em branco brevemente
    if (this.state.hasError && this.state.isChunkError) {
      return null;
    }

    return this.props.children;
  }
}
