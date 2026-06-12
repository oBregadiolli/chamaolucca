import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const LEGACY_PASSWORD_RESET_NOTICE =
  'A recuperação de senha por e-mail ainda não está disponível. Entre na sua conta e altere a senha em Perfil, ou fale com o suporte da loja.';

/** Links antigos do Supabase Auth → home com aviso (BL-002: fora do MVP). */
export default function LegacyPasswordResetRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/', { replace: true, state: { authNotice: LEGACY_PASSWORD_RESET_NOTICE } });
  }, [navigate]);

  return null;
}
