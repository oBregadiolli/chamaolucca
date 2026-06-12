import { useEffect } from 'react';

export const DEFAULT_PAGE_TITLE = 'ChamaoLucca — Delivery de Mercado';

/** Atualiza document.title na rota atual (SPA). */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
