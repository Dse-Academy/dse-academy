"use client";

/**
 * Última rede de segurança: erro no próprio layout raiz. Este arquivo substitui o layout, então não recebe os estilos do site;
 * por isso é autossuficiente (estilos embutidos, segue o tema claro ou escuro do sistema) e não depende de nenhum componente.
 */
const ESTILO = `
  :root { color-scheme: light dark; --fundo: #f6f8fc; --texto: #0b1b34; --suave: #46536b; --azul: #1d4ed8; }
  @media (prefers-color-scheme: dark) { :root { --fundo: #0b1220; --texto: #eef2f9; --suave: #aab6cb; --azul: #7aa7ff; } }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box;
         background: var(--fundo); color: var(--texto); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.5; }
  main { max-width: 32rem; text-align: center; }
  h1 { margin: 0 0 12px; font-size: 1.875rem; }
  p { margin: 0 0 24px; color: var(--suave); }
  a, button { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 8px 20px; margin: 4px;
              border-radius: 8px; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; }
  button { background: var(--azul); color: #fff; border: 0; }
  a { color: var(--azul); border: 1px solid var(--azul); }
  small { display: block; margin-top: 24px; color: var(--suave); }
`;

export default function ErroGlobal({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <title>Erro · DSE Academy</title>
        <style>{ESTILO}</style>
        <main>
          <h1>Algo deu errado</h1>
          <p>O site encontrou um problema inesperado. Tente de novo em instantes; se continuar, volte mais tarde.</p>
          <button type="button" onClick={() => retry()}>Tentar de novo</button>
          {/* <a> de propósito: o layout quebrou, então a saída precisa ser um recarregamento completo, não uma navegação do roteador. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Voltar ao início</a>
          {error.digest && <small>Código do erro (para a equipe): {error.digest}</small>}
        </main>
      </body>
    </html>
  );
}
