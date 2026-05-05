import { createRoot } from "react-dom/client";
import App from "./App.tsx";
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

createRoot(document.getElementById("root")!).render(<App />);
