import { LegalPageLayout, LegalSection, LegalNotice } from './legal/LegalLayout';

export default function Privacy() {
  return (
    <LegalPageLayout title="Política de Privacidade">
      <LegalNotice>
        Versão MVP — junho/2026. Esta política descreve como tratamos seus dados pessoais (LGPD).
      </LegalNotice>

      <LegalSection title="1. Dados que coletamos">
        <p>
          Coletamos nome, e-mail, telefone, endereço de entrega, histórico de pedidos e dados
          de pagamento processados pelo Mercado Pago (não armazenamos número completo de cartão).
        </p>
      </LegalSection>

      <LegalSection title="2. Finalidade">
        <p>
          Usamos seus dados para criar e entregar pedidos, autenticar sua conta, comunicar
          status do pedido e cumprir obrigações legais.
        </p>
      </LegalSection>

      <LegalSection title="3. Compartilhamento">
        <p>
          Compartilhamos dados apenas com prestadores necessários à operação: Supabase (infraestrutura),
          Mercado Pago (pagamentos) e Google Maps (endereços e rotas), sempre dentro da finalidade do serviço.
        </p>
      </LegalSection>

      <LegalSection title="4. Seus direitos">
        <p>
          Você pode solicitar acesso, correção ou exclusão de dados entrando em contato com a loja.
          Também pode revogar consentimentos de marketing quando aplicável.
        </p>
      </LegalSection>

      <LegalSection title="5. Segurança e retenção">
        <p>
          Adotamos medidas técnicas como autenticação, controle de acesso e criptografia em trânsito.
          Mantemos dados pelo tempo necessário para operação e obrigações legais.
        </p>
      </LegalSection>

      <LegalSection title="6. Contato">
        <p>
          Para dúvidas sobre privacidade, utilize os canais de atendimento do Lucca Mercado
          informados no site institucional.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
