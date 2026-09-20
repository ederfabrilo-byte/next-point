import { useWindowDimensions } from 'react-native';

/**
 * Responsividade — uso principal é celular, mas há gente no PC.
 *
 * Regra única: no PC, todo conteúdo vira uma coluna centralizada; no celular
 * ocupa a tela. Os `_layout` de cada perfil aplicam `sceneStyle` e
 * `tabBarStyle` com estes valores, então nenhuma tela precisa se preocupar.
 */
export const CONTENT_MAX_WIDTH = 720;
export const AUTH_MAX_WIDTH = 560;
export const WIDE_BREAKPOINT = 768;

/** Coluna centralizada — passa em `sceneStyle`, `tabBarStyle` ou num View raiz. */
export const column = { width: '100%' as const, maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' as const };

/** `isWide` = PC/tablet: grades de 2 colunas, etc. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, isWide: width >= WIDE_BREAKPOINT };
}
