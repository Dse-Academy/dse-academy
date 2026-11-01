import type { Metadata } from "next";
import Link from "next/link";
import { CONTATO_PRIVACIDADE, VERSAO_TERMOS, dataDaVersao } from "@/lib/privacidade";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "As regras de uso do portal da DSE Academy: o que oferecemos, o que esperamos de você, o que fica salvo no seu navegador e os limites da nossa responsabilidade.",
};

const H2 = "mt-10 font-display text-2xl font-semibold text-titulo";
const P = "mt-3 text-tinta";
const UL = "mt-3 list-disc space-y-1 pl-6 text-tinta";

export default function Pagina() {
  return (
    <article className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-titulo">Termos de Uso</h1>
      <p className="mt-2 text-suave">Versão {VERSAO_TERMOS} · em vigor desde {dataDaVersao(VERSAO_TERMOS)}</p>

      <p className={P}>
        Estes termos explicam como usar o portal da DSE Academy. Ao navegar, criar uma conta ou enviar um formulário, você
        concorda com eles. Se não concordar, é só não usar as partes que pedem conta ou envio: a navegação pelas vagas e
        pelas trilhas continua livre. Como tratamos seus dados está na <Link href="/privacidade" className="text-link underline">Política de Privacidade</Link>.
      </p>

      <h2 className={H2} id="o-que-e">1. O que é o portal</h2>
      <p className={P}>
        O portal é um projeto da comunidade DSE Academy, mantido por voluntários e gratuito. Ele reúne vagas da área de
        dados, trilhas de estudo, artigos e palestrantes. <strong>Não somos uma empresa de recrutamento</strong>: não
        intermediamos contratações, não garantimos entrevistas nem emprego e não cobramos nada de quem busca vaga.
      </p>

      <h2 className={H2} id="vagas">2. Sobre as vagas</h2>
      <ul className={UL}>
        <li>As vagas vêm de fontes públicas e são organizadas por processos automáticos. Elas podem estar <strong>desatualizadas, encerradas ou mal classificadas</strong> (área, nível ou tecnologias).</li>
        <li>A candidatura é feita sempre no site da empresa ou da plataforma de origem, que tem as próprias regras. Confira a vaga lá antes de se candidatar.</li>
        <li>A &quot;aderência&quot; e as sugestões de estudo são estimativas para ajudar você, não uma avaliação de competência nem uma promessa de aprovação.</li>
        <li>Nomes e marcas de empresas pertencem aos seus donos; aparecem apenas para identificar a vaga. Se você representa uma empresa e quer corrigir ou retirar uma vaga, escreva para <a href={`mailto:${CONTATO_PRIVACIDADE}`} className="text-link underline">{CONTATO_PRIVACIDADE}</a>.</li>
      </ul>

      <h2 className={H2} id="conta">3. Sua conta</h2>
      <ul className={UL}>
        <li>O portal é voltado a pessoas maiores de 18 anos.</li>
        <li>O acesso é por conta Google ou por link enviado ao seu e-mail. Você é responsável por manter o acesso ao seu e-mail e à sua conta Google em segurança.</li>
        <li>Informe dados verdadeiros. Você pode editar o perfil, <strong>baixar os seus dados</strong> e <strong>excluir a conta</strong> quando quiser, na página <Link href="/perfil" className="text-link underline">Meu perfil</Link>.</li>
      </ul>

      <h2 className={H2} id="envios">4. Artigos e cadastros de palestrante</h2>
      <ul className={UL}>
        <li>Quem envia um artigo continua <strong>dono do texto</strong>. Ao enviar, declara que o conteúdo é seu (ou que você tem autorização para usá-lo) e autoriza a comunidade a revisá-lo e, se aprovado, publicá-lo no Medium da DSE com o seu nome.</li>
        <li>Não aceitamos conteúdo copiado, ofensivo, discriminatório, enganoso ou que viole direitos de terceiros. A curadoria pode pedir ajustes, recusar ou retirar um conteúdo, e a decisão é da equipe voluntária.</li>
        <li>O cadastro de palestrante só aparece na página pública se você autorizar essa exibição no formulário e a equipe aprovar o cadastro. O seu e-mail nunca é exibido.</li>
      </ul>

      <h2 className={H2} id="condutas">5. O que não é permitido</h2>
      <ul className={UL}>
        <li>Enviar spam, informações falsas ou usar o nome de outra pessoa.</li>
        <li>Tentar acessar dados de outras pessoas, burlar os limites de envio, derrubar o site ou testar vulnerabilidades sem avisar. Para relatar uma falha de segurança de forma responsável, veja a <a href="https://github.com/Dse-Academy/dse-academy/security/policy" className="text-link underline" target="_blank" rel="noopener noreferrer">política de segurança</a>.</li>
        <li>Coletar o conteúdo do portal em massa de forma que prejudique o funcionamento para as outras pessoas.</li>
      </ul>
      <p className={P}>
        Para proteger a todos, os formulários têm <strong>limites de envio</strong> por pessoa. Contas usadas para abuso podem ter o acesso limitado ou encerrado.
      </p>

      <h2 className={H2} id="navegador">6. O que fica salvo no seu navegador</h2>
      <p className={P}>
        Guardamos no seu navegador apenas o que é essencial: a <strong>sessão de login</strong> (para você continuar logada), a{" "}
        <strong>escolha do tema</strong> claro ou escuro e <strong>quais vagas você já relatou</strong>. Não usamos cookies de publicidade
        nem de rastreamento. Você pode apagar esses dados quando quiser nas configurações do navegador; isso apenas encerra a sua sessão.
        Detalhes na <Link href="/privacidade#navegador" className="text-link underline">Política de Privacidade</Link>.
      </p>

      <h2 className={H2} id="codigo">7. Código aberto</h2>
      <p className={P}>
        O código do portal é aberto, sob a licença MIT, e está no <a href="https://github.com/Dse-Academy/dse-academy" className="text-link underline" target="_blank" rel="noopener noreferrer">GitHub</a>.
        A licença vale para o código; textos, logotipos e imagens da DSE Academy e das pessoas e empresas que aparecem no portal têm os seus próprios donos.
      </p>

      <h2 className={H2} id="responsabilidade">8. Limites da nossa responsabilidade</h2>
      <p className={P}>
        O portal é oferecido <strong>&quot;como está&quot;</strong>, por voluntários, sem garantia de disponibilidade contínua ou de que as informações
        estejam sempre corretas e atualizadas. Podemos corrigir, suspender ou encerrar partes do portal a qualquer momento. Na medida
        permitida pela lei, não respondemos por decisões tomadas com base nas vagas e nas sugestões, nem por prejuízos de processos
        seletivos de terceiros. Isso não afasta direitos que a lei garante a você, como os do Código de Defesa do Consumidor, quando aplicáveis.
      </p>

      <h2 className={H2} id="mudancas">9. Mudanças nestes termos</h2>
      <p className={P}>
        Podemos atualizar estes termos. A versão e a data de vigência aparecem no topo desta página; mudanças relevantes serão avisadas no portal.
        Continuar usando o portal depois da mudança significa concordar com a nova versão.
      </p>

      <h2 className={H2} id="lei">10. Lei aplicável e contato</h2>
      <p className={P}>
        Valem as leis do Brasil. Dúvidas ou pedidos: <a href={`mailto:${CONTATO_PRIVACIDADE}`} className="text-link underline">{CONTATO_PRIVACIDADE}</a>.
      </p>
    </article>
  );
}
