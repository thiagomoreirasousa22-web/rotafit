import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
WebBrowser.maybeCompleteAuthSession();
// Link de volta para o app depois do login (esquema "rotafit://").
export const authRedirectUri = AuthSession.makeRedirectUri({
  scheme: 'rotafit',
  native: 'rotafit://auth-callback',
});
// Login com Google, delegado ao próprio Supabase: o app nunca vê um client
// secret do Google. O Supabase (configurado em Authentication → Providers →
// Google, com as chaves do Google Cloud) devolve uma URL de login; abrimos
// essa URL numa aba controlada (WebBrowser) e, ao voltar para o app pelo
// esquema "rotafit://", extraímos os tokens da própria URL de retorno.
let lastExchange: { code: string; completion: Promise<void> } | undefined;

export function completeGoogleSignIn(code: string): Promise<void> {
  // Android can deliver the same callback to both WebBrowser and Expo Router.
  if (lastExchange?.code === code) return lastExchange.completion;
  const completion = supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
    if (error) throw error;
  });
  lastExchange = { code, completion };
  return completion;
}

export async function signInWithGoogle(): Promise<void> {
  if (Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient') {
    throw new Error('Para entrar com Google, abra o RotaFit pela versão de desenvolvimento no Android.');
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirectUri, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Não foi possível iniciar o login com o Google.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUri);
  if (result.type !== 'success' || !result.url) {
    if (result.type === 'cancel' || result.type === 'dismiss') return; // usuário cancelou
    throw new Error('O login com o Google não foi concluído.');
  }
  const params = new URL(result.url).searchParams;
  const code = params.get('code');
  if (!code)
    throw new Error(
      params.get('error_description') ?? 'O Google não devolveu um código de login.',
    );
  await completeGoogleSignIn(code);
}
