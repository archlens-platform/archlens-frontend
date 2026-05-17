import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade | ArchLens",
  description: "Política de Privacidade e proteção de dados pessoais do ArchLens conforme a LGPD.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Política de Privacidade</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Última atualização: janeiro de 2025 · Em conformidade com a Lei nº 13.709/2018 (LGPD)
      </p>

      <section className="space-y-6">
        <div>
          <h2 className="mb-2 text-xl font-semibold">1. Controlador dos Dados</h2>
          <p className="text-muted-foreground">
            O ArchLens é o controlador dos dados pessoais coletados por meio desta plataforma.
            Para dúvidas, entre em contato pelo e-mail <strong>privacy@archlens.dev</strong>.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">2. Dados Pessoais Coletados</h2>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li><strong>Nome de usuário e e-mail</strong> — Cadastro e autenticação</li>
            <li><strong>Endereço IP</strong> — Logs de segurança e controle de rate limiting</li>
            <li><strong>Arquivos de diagrama (uploads)</strong> — Análise automatizada de arquitetura de software</li>
            <li><strong>Data e hora de acesso</strong> — Auditoria e segurança</li>
            <li><strong>Consentimento LGPD</strong> — Registro do aceite dos termos (data/hora)</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">3. Finalidade e Base Legal</h2>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Prestação do serviço de análise de arquitetura (Art. 7º, V — execução de contrato)</li>
            <li>Segurança da informação e prevenção a fraudes (Art. 7º, IX — interesse legítimo)</li>
            <li>Comunicações relacionadas ao serviço (Art. 7º, I — consentimento)</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">4. Uso de Inteligência Artificial</h2>
          <p className="text-muted-foreground">
            Os diagramas enviados são processados por provedores de IA (OpenAI, Google Gemini,
            Anthropic Claude). <strong>Apenas o conteúdo do diagrama é transmitido</strong> — nenhum
            dado pessoal identificável (nome, e-mail, IP) é incluído nas requisições às APIs de IA.
            Ao realizar o upload, você consente explicitamente com esse processamento conforme
            o Art. 20 da LGPD.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">5. Retenção de Dados</h2>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Dados de conta: mantidos enquanto a conta estiver ativa</li>
            <li>Uploads e relatórios: retidos por até 90 dias após o processamento</li>
            <li>Logs de acesso: retidos por até 30 dias</li>
            <li>Após exclusão de conta: dados são removidos permanentemente em até 30 dias</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">6. Seus Direitos (Art. 17–22 LGPD)</h2>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li><strong>Acesso</strong> — Solicite cópia dos seus dados via <code>GET /auth/me/data</code></li>
            <li><strong>Portabilidade</strong> — Exporte seus dados em formato JSON</li>
            <li><strong>Exclusão</strong> — Delete sua conta e todos os dados associados via <code>DELETE /auth/me</code></li>
            <li><strong>Revogação de consentimento</strong> — A qualquer momento, pelo painel da conta</li>
            <li><strong>Correção</strong> — Atualize seus dados no perfil</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Para exercer seus direitos, acesse as configurações da conta ou envie e-mail para{" "}
            <strong>privacy@archlens.dev</strong>.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">7. Segurança</h2>
          <p className="text-muted-foreground">
            Utilizamos criptografia TLS para dados em trânsito, hash bcrypt para senhas,
            cabeçalhos de segurança HTTP (CSP, HSTS, X-Frame-Options) e controle de acesso
            baseado em funções (RBAC). Logs não contêm e-mails em texto claro.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">8. Cookies</h2>
          <p className="text-muted-foreground">
            O ArchLens utiliza apenas cookies estritamente necessários para autenticação
            (token JWT armazenado em memória). Não utilizamos cookies de rastreamento ou publicidade.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">9. Alterações nesta Política</h2>
          <p className="text-muted-foreground">
            Notificaremos usuários sobre alterações relevantes. O uso continuado da plataforma
            após notificação implica aceitação das mudanças.
          </p>
        </div>
      </section>

      <div className="mt-10 border-t pt-6 text-sm text-muted-foreground">
        <Link href="/terms" className="font-medium text-primary hover:underline">
          Ver Termos de Uso
        </Link>
        {" · "}
        <Link href="/" className="hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
