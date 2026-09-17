import { Alert, AlertButton, Platform } from 'react-native';

/**
 * `Alert.alert` não faz NADA no React Native Web: nem mostra a mensagem, nem
 * chama o onPress dos botões. Toda confirmação ("Recusar?", "Excluir vídeo?")
 * e toda mensagem de erro do app sumiam no browser.
 *
 * Este polyfill troca a implementação no web por window.alert/window.confirm,
 * mantendo a mesma assinatura — os 15 arquivos que usam Alert.alert não mudam.
 * Importar uma vez, no _layout raiz. No celular não altera nada.
 */
export function installWebAlert() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = message ? `${title}\n\n${message}` : title;

    // Um botão (ou nenhum): é só um aviso.
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }

    // Dois ou mais: confirmação. OK = o botão que não é "cancel"; Cancelar = o "cancel".
    const cancel = buttons.find((b) => b.style === 'cancel');
    const confirm = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
    if (window.confirm(text)) confirm.onPress?.();
    else cancel?.onPress?.();
  };
}
