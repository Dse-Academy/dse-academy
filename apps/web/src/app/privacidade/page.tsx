import type { Metadata } from "next";
import Link from "next/link";
import { CONTATO_PRIVACIDADE, RESPONSAVEL_PELOS_DADOS, VERSAO_POLITICA, dataDaVersao } from "@/lib/privacidade";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Quais dados a DSE Academy trata, para quê, com quem compartilha, por quanto tempo guarda e como você exerce os seus direitos (LGPD).",
};

const H2 = "mt-10 font-display text-2xl font-semibold text-titulo";
const P = "mt-3 text-tinta";
const LI = "mt-1";
const TH = "border-b border-borda px-3 py-2 text-left font-semibold text-titulo";
const TD = "border-b border-borda px-3 py-2 align-top text-tinta";

type Linha = [string, string, string];

/** O que é coletado, para quê e com que fundamento (LGPD, art. 7º). */
const DADOS: Linha[] = [
  ["Conta: e-mail (e, no login com Google, o nome público e a foto que o Google compartilha; usamos só o e-mail e o nome)", "Entrar no site e identificar a sua conta", "Consentimento (ao criar a conta)"],
  ["Perfil: nome, área de interesse, nível e habilidades", "Calcular a aderência às vagas e sugerir o que estudar", "Consentimento"],
  ["Vagas que você salva e o seu progresso nas trilhas de estudo", "Guardar a sua lista e o seu andamento", "Consentimento"],
  ["Artigo enviado: nome, e-mail, perfil no Medium, LinkedIn, mini bio, título, subtítulo, resumo, tags, link do rascunho e data desejada", "Revisar e publicar o artigo no Medium da comunidade", "Consentimento (marcado no formulário)"],
  ["Cadastro de palestrante: nome, e-mail, cargo, empresa, mini bio, LinkedIn, site, temas, formatos, modalidade, cidade e UF, idiomas e palestras anteriores", "Avaliar o cadastro e organizar convites para eventos", "Consentimento (marcado no formulário)"],
  ["Relato de erro em uma vaga: a vaga, o tipo do problema, as tecnologias apontadas e o detalhe que você escrever, ligados à sua conta", "Corrigir a classificação das vagas e melhorar o site", "Legítimo interesse"],
  ["Dados técnicos de acesso (como o endereço IP e o tipo de navegador), registrados pelos serviços de hospedagem e de banco de dados", "Segurança, prevenção de abuso e funcionamento do site", "Legítimo interesse"],
];

export default function Pagina() {
  return (
    <article className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-titulo">Política de Privacidade</h1>
      <p className="mt-2 text-suave">Versão {VERSAO_POLITICA} · em vigor desde {dataDaVersao()}</p>

      <p className={P}>
        Aqui explicamos, em linguagem direta, quais dados pessoais o portal da DSE Academy trata, para quê, com quem os
        compartilha, por quanto tempo os guarda e como você exerce os seus direitos, conforme a Lei Geral de Proteção de
        Dados (LGPD, Lei nº 13.709/2018). Quem só navega pelas vagas e pelas trilhas, sem criar conta, não nos entrega
        dados pessoais.
      </p>

      <h2 className={H2} id="quem-somos">1. Quem é o responsável</h2>
      <p className={P}>
        O responsável pelos dados (controlador) é <strong>{RESPONSAVEL_PELOS_DADOS}</strong>. Para qualquer assunto sobre
        os seus dados, escreva para <a href={`mailto:${CONTATO_PRIVACIDADE}`} className="text-link underline">{CONTATO_PRIVACIDADE}</a>.
      </p>

      <h2 className={H2} id="dados">2. Quais dados tratamos, para quê e com que base legal</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <caption className="sr-only">Dados tratados, finalidade e base legal</caption>
          <thead>
            <tr><th scope="col" className={TH}>Dado</th><th scope="col" className={TH}>Para quê</th><th scope="col" className={TH}>Base legal</th></tr>
          </thead>
          <tbody>
            {DADOS.map(([dado, para, base]) => (
              <tr key={dado}><td className={TD}>{dado}</td><td className={TD}>{para}</td><td className={TD}>{base}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={P}>
        <strong>O que não fazemos:</strong> não vendemos dados, não fazemos perfis de publicidade, não usamos ferramentas de
        análise de comportamento nem cookies de rastreamento, e não pedimos documentos, CPF, telefone ou dados sensíveis.
      </p>
      <p className={P}>
        As <strong>vagas</strong> exibidas vêm de anúncios públicos de empresas no portal da Gupy. Não coletamos dados de
        recrutadores nem de candidatos de terceiros. Cada vaga leva ao anúncio original, que tem a própria política.
      </p>

      <h2 className={H2} id="compartilhamento">3. Com quem compartilhamos</h2>
      <p className={P}>Os dados ficam acessíveis a poucas pessoas da equipe (administração da DSE Academy) e aos serviços que fazem o portal funcionar, que tratam os dados em nosso nome:</p>
      <ul className="mt-2 list-disc pl-6 text-tinta">
        <li className={LI}><strong>Supabase:</strong> banco de dados e login.</li>
        <li className={LI}><strong>Vercel:</strong> hospedagem do site.</li>
        <li className={LI}><strong>Google:</strong> login com Google; e o e-mail e a agenda usados para avisar a equipe quando chega um artigo ou um cadastro de palestrante.</li>
        <li className={LI}><strong>Groq:</strong> modelo de linguagem usado só para organizar as trilhas de estudo. Ele recebe nomes de tecnologias e percentuais das vagas, <strong>nunca dados de pessoas</strong>.</li>
        <li className={LI}><strong>Medium:</strong> se o seu artigo for publicado, ele sai no Medium da comunidade com o nome e a mini bio que você informou, conforme você autorizou no formulário.</li>
      </ul>
      <p className={P}>
        No cadastro de palestrante, se você autorizar, exibimos na página pública o nome, a bio, os temas e os links. <strong>O seu e-mail nunca é exibido.</strong> Também podemos compartilhar dados se uma lei ou uma ordem de autoridade exigir.
      </p>

      <h2 className={H2} id="transferencia">4. Transferência para fora do Brasil</h2>
      <p className={P}>
        Os serviços acima podem armazenar e tratar dados em servidores localizados fora do Brasil. Escolhemos serviços que
        adotam medidas de segurança reconhecidas, e a transferência acontece para executar o serviço que você usa, conforme o art. 33 da LGPD.
      </p>

      <h2 className={H2} id="retencao">5. Por quanto tempo guardamos</h2>
      <ul className="mt-2 list-disc pl-6 text-tinta">
        <li className={LI}><strong>Conta, perfil, vagas salvas e progresso nas trilhas:</strong> enquanto a sua conta existir. Você pode apagar tudo a qualquer momento em <Link href="/perfil" className="text-link underline">Meu perfil</Link> &gt; <em>Excluir minha conta</em>.</li>
        <li className={LI}><strong>Artigos, cadastros de palestrante e relatos de erro:</strong> pelo tempo necessário à revisão, à publicação e ao banco de palestrantes. <strong>Ao excluir a conta, esses envios deixam de estar ligados a ela, mas continuam guardados</strong>; para apagá-los, peça pelo e-mail da seção 1.</li>
      </ul>

      <h2 className={H2} id="direitos">6. Os seus direitos</h2>
      <p className={P}>Você pode pedir, a qualquer momento e gratuitamente:</p>
      <ul className="mt-2 list-disc pl-6 text-tinta">
        <li className={LI}>confirmar se tratamos dados seus e ter acesso a eles;</li>
        <li className={LI}>corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li className={LI}>apagar ou anonimizar dados desnecessários ou tratados com base no seu consentimento;</li>
        <li className={LI}>receber os seus dados e pedir a portabilidade;</li>
        <li className={LI}>saber com quem compartilhamos os dados;</li>
        <li className={LI}>retirar o consentimento, sem prejuízo do que já foi tratado;</li>
        <li className={LI}>se opor a um tratamento feito com base no legítimo interesse.</li>
      </ul>
      <p className={P}>
        Escreva para <a href={`mailto:${CONTATO_PRIVACIDADE}`} className="text-link underline">{CONTATO_PRIVACIDADE}</a>. Respondemos em até 15 dias.
        Se não ficar satisfeita(o), você pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2 className={H2} id="navegador">7. Cookies e armazenamento no navegador</h2>
      <p className={P}>
        Usamos apenas o armazenamento do navegador que é <strong>essencial</strong>: manter a sua sessão depois do login,
        lembrar o tema claro ou escuro e lembrar quais vagas você já relatou. Não há cookies de publicidade nem de rastreamento
        entre sites. Você pode limpar esses dados nas configurações do navegador; isso apenas encerra a sua sessão. As regras de uso do portal estão nos <Link href="/termos" className="text-link underline">Termos de Uso</Link>.
      </p>

      <h2 className={H2} id="seguranca">8. Como protegemos os dados</h2>
      <p className={P}>
        A conexão é cifrada (HTTPS). Cada pessoa só enxerga os próprios dados: isso é garantido por regras no próprio banco,
        e não apenas na tela. Só a administração acessa os envios de formulários. Os formulários têm limite de envios para
        evitar abuso, e o código do projeto é aberto e passa por revisão e análise automática de segurança. Nenhum sistema
        é 100% seguro; se houver um incidente que possa trazer risco a você, avisaremos você e a ANPD, como a lei exige.
      </p>

      <h2 className={H2} id="menores">9. Crianças e adolescentes</h2>
      <p className={P}>O portal é destinado a pessoas com 18 anos ou mais. Se você souber de um cadastro de menor, avise-nos para que possamos removê-lo.</p>

      <h2 className={H2} id="mudancas">10. Mudanças nesta política</h2>
      <p className={P}>
        Quando o texto mudar de forma relevante, publicamos uma nova versão nesta página, com a data. Cada envio de formulário
        guarda a versão da política que estava em vigor quando você deu o aceite (hoje, a versão {VERSAO_POLITICA}).
      </p>

      <p className="mt-10 text-sm text-suave">
        Dúvidas? Veja também o <Link href="/contato" className="text-link underline">Fale conosco</Link>.
      </p>
    </article>
  );
}
