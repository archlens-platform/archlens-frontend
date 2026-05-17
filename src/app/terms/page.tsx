import Link from "next/link";

export const metadata = {
  title: "Termos de Uso | ArchLens",
  description: "Termos de Uso da plataforma ArchLens.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Termos de Uso</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Última atualização: janeiro de 2025
      </p>

      <section className="space-y-6">
        <div>
          <h2 className="mb-2 text-xl font-semibold">1. Aceitação dos Termos</h2>
          <p className="text-muted-foreground">
            Ao criar uma conta no ArchLens, você concorda com estes Termos de Uso e com nossa{" "}
            <Link href="/privacy-policy" className="font-medium text-primary hover:underline">
              Política de Privacidade
            </Link>
            . Se não concordar, não utilize o serviço.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">2. Descrição do Serviço</h2>
          <p className="text-muted-foreground">
            O ArchLens é uma plataforma de análise automatizada de arquitetura de software que
            utiliza inteligência artificial para avaliar diagramas arquiteturais e gerar relatórios
            de qualidade. O serviço é fornecido para fins educacionais e profissionais.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">3. Elegibilidade</h2>
          <p className="text-muted-foreground">
            O serviço é destinado a pessoas com pelo menos 18 anos ou que tenham consentimento
            de responsável legal. Ao se cadastrar, você declara ter capacidade legal para
            celebrar este acordo.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">4. Uso Aceitável</h2>
          <p className="mb-2 text-muted-foreground">Você concorda em não:</p>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Enviar diagramas contendo dados pessoais de terceiros sem consentimento</li>
            <li>Tentar comprometer a segurança da plataforma ou de outros usuários</li>
            <li>Utilizar o serviço para fins ilegais ou fraudulentos</li>
            <li>Automatizar requisições de forma abusiva (beyond rate limits)</li>
            <li>Fazer engenharia reversa ou copiar o código da plataforma</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">5. Conteúdo do Usuário e IA</h2>
          <p className="text-muted-foreground">
            Os diagramas que você envia são processados por modelos de IA de terceiros
            (OpenAI, Google, Anthropic). Você é responsável por garantir que os diagramas
            não contenham informações confidenciais ou dados pessoais de terceiros.
            O ArchLens não se responsabiliza pelo conteúdo gerado pelos modelos de IA.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">6. Propriedade Intelectual</h2>
          <p className="text-muted-foreground">
            Você retém os direitos sobre os diagramas que envia. Os relatórios gerados pelo
            ArchLens são de sua propriedade. O código e a interface da plataforma são
            propriedade do ArchLens.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">7. Disponibilidade do Serviço</h2>
          <p className="text-muted-foreground">
            O ArchLens é fornecido &quot;como está&quot;. Não garantimos disponibilidade contínua
            ou ausência de erros. Nos reservamos o direito de modificar ou descontinuar
            o serviço com aviso prévio razoável.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">8. Encerramento de Conta</h2>
          <p className="text-muted-foreground">
            Você pode encerrar sua conta a qualquer momento pelas configurações do perfil.
            Em conformidade com a LGPD, todos os seus dados serão excluídos permanentemente.
            Podemos suspender contas que violem estes termos.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">9. Limitação de Responsabilidade</h2>
          <p className="text-muted-foreground">
            O ArchLens não se responsabiliza por decisões de arquitetura tomadas com base
            nos relatórios gerados. Os relatórios são sugestões automatizadas e devem ser
            revisados por profissionais qualificados.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">10. Lei Aplicável</h2>
          <p className="text-muted-foreground">
            Estes termos são regidos pela legislação brasileira, em especial a LGPD
            (Lei nº 13.709/2018) e o Marco Civil da Internet (Lei nº 12.965/2014).
            Eventuais disputas serão resolvidas no foro da cidade de São Paulo, SP.
          </p>
        </div>
      </section>

      <div className="mt-10 border-t pt-6 text-sm text-muted-foreground">
        <Link href="/privacy-policy" className="font-medium text-primary hover:underline">
          Ver Política de Privacidade
        </Link>
        {" · "}
        <Link href="/" className="hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
