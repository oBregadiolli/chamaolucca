import { LegalPageLayout, LegalSection, LegalNotice } from './legal/LegalLayout';

export default function Terms() {
  return (
    <LegalPageLayout title="Termos de Uso">
      <LegalNotice>
        Versão MVP — junho/2026. Ao usar o ChamaOLucca, você concorda com estes termos.
      </LegalNotice>

      <LegalSection title="1. O serviço">
        <p>
          O ChamaOLucca é a plataforma de delivery do Lucca Mercado. Por meio dela você pode
          montar pedidos, agendar entregas e pagar online via Mercado Pago (Pix e cartão).
        </p>
      </LegalSection>

      <LegalSection title="2. Cadastro e conta">
        <p>
          Você deve informar dados verdadeiros no cadastro e manter sua senha em sigilo.
          A loja pode suspender contas em caso de uso indevido ou fraude.
        </p>
      </LegalSection>

      <LegalSection title="3. Pedidos e pagamentos">
        <p>
          Os preços exibidos na loja são os válidos no momento da confirmação do pedido.
          O pagamento é processado pelo Mercado Pago. A confirmação do pedido depende
          da aprovação do pagamento.
        </p>
      </LegalSection>

      <LegalSection title="4. Entregas">
        <p>
          As entregas ocorrem nos bairros e horários disponíveis no checkout.
          Endereço incorreto ou indisponibilidade no local podem atrasar ou impedir a entrega.
        </p>
      </LegalSection>

      <LegalSection title="5. Cancelamentos">
        <p>
          Pedidos já pagos e em preparação podem ser cancelados conforme política da loja.
          Entre em contato pelos canais oficiais do Lucca Mercado.
        </p>
      </LegalSection>

      <LegalSection title="6. Alterações">
        <p>
          Estes termos podem ser atualizados. A versão vigente estará sempre publicada nesta página.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
