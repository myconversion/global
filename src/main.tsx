import { createRoot } from "react-dom/client";
import { Suspense } from "react";
import App from "./App.tsx";
import { GlobalErrorBoundary } from "@/components/shared/GlobalErrorBoundary.tsx";
import { SplashScreen } from "@/components/shared/SplashScreen.tsx";
import "./index.css";

// Quando o PWA atualiza silenciosamente (autoUpdate), o novo Service Worker
// ativa e assume o controle dos assets em cache. O bundle JS antigo ainda está
// rodando na aba — botões podem não ter handlers se chunks novos forem carregados.
// Recarregar automaticamente ao trocar de SW garante que o usuário sempre
// roda a versão mais recente sem precisar apertar F5.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(
  // GlobalErrorBoundary: captura ChunkLoadError (cache SW desatualizado)
  // e force-reload a página, evitando tela em branco após novos deploys.
  <GlobalErrorBoundary>
    {/* Suspense raiz: garante que qualquer lazy import pendente na inicialização
        mostre o SplashScreen em vez de tela branca. */}
    <Suspense fallback={<SplashScreen />}>
      <App />
    </Suspense>
  </GlobalErrorBoundary>
);
